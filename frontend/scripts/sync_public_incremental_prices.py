#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, Set, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, unquote, urlparse
from urllib.request import Request, urlopen

import pymysql


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = ROOT / ".env.local"

TWSE_STOCK_DAY_URL = "https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY"
TPEX_TRADING_STOCK_URL = "https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingStock"

MARKET_TWSE = "上市"
MARKET_TPEX = "上櫃"
CHECKPOINT_DIR = ROOT / "tmp" / "public_incremental_checkpoints"


def log(message: str) -> None:
    print(message, flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Incrementally backfill historicalprices from public TWSE/TPEx "
            "monthly endpoints based on each stock's latest DB date."
        )
    )
    parser.add_argument(
        "--env-file",
        default=str(DEFAULT_ENV_FILE),
        help="Environment file containing DATABASE_URL.",
    )
    parser.add_argument(
        "--scope",
        choices=["TSE_OTC", "ETF", "ALL"],
        default="TSE_OTC",
        help="Universe scope selected from the existing stocks table.",
    )
    parser.add_argument(
        "--stock-id",
        action="append",
        default=[],
        help="Limit sync to one stock id. Can be provided multiple times.",
    )
    parser.add_argument(
        "--start-date",
        default=None,
        help="Optional lower bound for all symbols, YYYY-MM-DD.",
    )
    parser.add_argument(
        "--force-start-date",
        default=None,
        help=(
            "Ignore each symbol's latest DB date and refetch from this date. "
            "Useful for repairing a known historical gap window."
        ),
    )
    parser.add_argument(
        "--end-date",
        default=None,
        help="Optional upper bound, YYYY-MM-DD. Defaults to today.",
    )
    parser.add_argument(
        "--bootstrap-start-date",
        default=None,
        help=(
            "Start date for symbols that have no historicalprices rows. "
            "If omitted, symbols without any price rows are skipped."
        ),
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="MySQL executemany batch size.",
    )
    parser.add_argument(
        "--request-sleep",
        type=float,
        default=0.2,
        help="Seconds to sleep between public endpoint requests.",
    )
    parser.add_argument(
        "--backoff-base",
        type=float,
        default=2.0,
        help="Base seconds for exponential backoff after transient public endpoint errors.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=4,
        help="Number of retries per public endpoint request.",
    )
    parser.add_argument(
        "--checkpoint-file",
        default=None,
        help=(
            "JSONL checkpoint path. Defaults to tmp/public_incremental_checkpoints/"
            "<run-key>.jsonl. Use an empty string to disable checkpointing."
        ),
    )
    parser.add_argument(
        "--restart",
        action="store_true",
        help="Ignore and overwrite an existing checkpoint for this run.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit number of symbols for testing. 0 means no limit.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and report planned rows without writing to MySQL.",
    )
    return parser.parse_args()


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def connect_mysql(database_url: str) -> pymysql.connections.Connection:
    parsed = urlparse(database_url)
    if parsed.scheme != "mysql":
        raise SystemExit("DATABASE_URL must start with mysql://")

    database = parsed.path.lstrip("/")
    if not database:
        raise SystemExit("DATABASE_URL must include a database name.")

    return pymysql.connect(
        host=parsed.hostname or "127.0.0.1",
        port=parsed.port or 3306,
        user=unquote(parsed.username or ""),
        password=unquote(parsed.password or ""),
        database=database,
        charset="utf8mb4",
        autocommit=False,
    )


def ensure_schema_exists(connection: pymysql.connections.Connection) -> None:
    required_tables = {"stocks", "historicalprices"}
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        existing = {row[0] for row in cursor.fetchall()}

    missing = sorted(required_tables - existing)
    if missing:
        raise SystemExit(
            f"Missing tables: {', '.join(missing)}. Run `npx prisma db push` first."
        )


def fetch_json(url: str, params: dict, retries: int, backoff_base: float) -> dict:
    request_url = f"{url}?{urlencode(params)}"
    headers = {
        "Accept": "application/json,text/plain,*/*",
        "User-Agent": "Stock-Query-Website/1.0 public incremental sync",
    }

    last_error: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            request = Request(request_url, headers=headers)
            with urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8-sig")
            return json.loads(body)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
            if attempt < retries:
                wait_seconds = backoff_base * (2**attempt)
                status = getattr(error, "code", None)
                if status in {308, 429}:
                    wait_seconds *= 2
                log(
                    f"[public-incremental] retry {attempt + 1}/{retries} "
                    f"after {wait_seconds:.1f}s: {request_url} error={error}"
                )
                time.sleep(wait_seconds)

    raise RuntimeError(f"Failed to fetch {request_url}: {last_error}")


def parse_iso_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    return date.fromisoformat(value)


def parse_roc_date(value: object) -> date:
    text = str(value or "").strip()
    year, month, day = text.split("/")
    return date(int(year) + 1911, int(month), int(day))


def month_starts(start_date: date, end_date: date) -> Iterator[date]:
    current = start_date.replace(day=1)
    end_month = end_date.replace(day=1)
    while current <= end_month:
        yield current
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)


def to_decimal(value: object) -> object:
    text = str(value or "").strip().replace(",", "")
    if not text or text in {"--", "---", "X0.00", "除權息"}:
        return None
    return round(float(text), 6)


def to_bigint(value: object, multiplier: int = 1) -> object:
    text = str(value or "").strip().replace(",", "")
    if not text or text in {"--", "---"}:
        return None
    return int(round(float(text) * multiplier))


def load_symbols(
    connection: pymysql.connections.Connection,
    scope: str,
    stock_ids: Sequence[str],
    limit: int,
) -> List[Tuple[str, str, str, Optional[date]]]:
    where = ["market_type IN (%s, %s)"]
    params: List[object] = [MARKET_TWSE, MARKET_TPEX]

    if scope == "TSE_OTC":
        where.append("asset_type <> %s")
        params.append("ETF")
    elif scope == "ETF":
        where.append("asset_type = %s")
        params.append("ETF")

    if stock_ids:
        placeholders = ", ".join(["%s"] * len(stock_ids))
        where.append(f"s.stock_id IN ({placeholders})")
        params.extend(stock_ids)

    sql = f"""
        SELECT
            s.stock_id,
            s.market_type,
            s.asset_type,
            MAX(h.date) AS latest_price_date
        FROM stocks s
        LEFT JOIN historicalprices h ON h.stock_id = s.stock_id
        WHERE {" AND ".join(where)}
        GROUP BY s.stock_id, s.market_type, s.asset_type
        ORDER BY s.stock_id
    """

    if limit > 0:
        sql += " LIMIT %s"
        params.append(limit)

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return [
            (str(stock_id), str(market_type), str(asset_type), latest_date)
            for stock_id, market_type, asset_type, latest_date in cursor.fetchall()
        ]


class Checkpoint:
    def __init__(self, path: Optional[Path], restart: bool = False) -> None:
        self.path = path
        self.completed: Set[str] = set()
        self.failed: Set[str] = set()

        if not path:
            return

        path.parent.mkdir(parents=True, exist_ok=True)
        if restart and path.exists():
            path.unlink()
        if not path.exists():
            return

        for raw_line in path.read_text(encoding="utf-8").splitlines():
            try:
                record = json.loads(raw_line)
            except json.JSONDecodeError:
                continue
            stock_id = str(record.get("stock_id") or "")
            if not stock_id:
                continue
            status = record.get("status")
            if status == "completed":
                self.completed.add(stock_id)
                self.failed.discard(stock_id)
            elif status == "failed":
                self.failed.add(stock_id)

    def record(self, payload: dict) -> None:
        stock_id = str(payload.get("stock_id") or "")
        status = payload.get("status")
        if stock_id and status == "completed":
            self.completed.add(stock_id)
            self.failed.discard(stock_id)
        elif stock_id and status == "failed":
            self.failed.add(stock_id)

        if not self.path:
            return

        with self.path.open("a", encoding="utf-8") as file:
            file.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")


def build_run_key(args: argparse.Namespace, end_date: date) -> str:
    payload = {
        "scope": args.scope,
        "stock_id": sorted(args.stock_id),
        "start_date": args.start_date,
        "force_start_date": args.force_start_date,
        "end_date": end_date.isoformat(),
        "bootstrap_start_date": args.bootstrap_start_date,
        "limit": args.limit,
    }
    digest = hashlib.sha1(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()[:12]
    return f"{args.scope.lower()}_{end_date.isoformat()}_{digest}"


def resolve_checkpoint_path(args: argparse.Namespace, run_key: str) -> Optional[Path]:
    if args.checkpoint_file == "":
        return None
    if args.checkpoint_file:
        return Path(args.checkpoint_file)
    return CHECKPOINT_DIR / f"{run_key}.jsonl"


def fetch_twse_month(
    stock_id: str,
    month_start: date,
    retries: int,
    backoff_base: float,
) -> List[Tuple[str, date, object, object, object, object, object, object, object]]:
    payload = fetch_json(
        TWSE_STOCK_DAY_URL,
        {
            "date": month_start.strftime("%Y%m%d"),
            "stockNo": stock_id,
            "response": "json",
        },
        retries,
        backoff_base,
    )
    if payload.get("stat") != "OK":
        return []

    rows = []
    for record in payload.get("data") or []:
        if len(record) < 9:
            continue
        rows.append(
            (
                stock_id,
                parse_roc_date(record[0]),
                to_decimal(record[3]),
                to_decimal(record[4]),
                to_decimal(record[5]),
                to_decimal(record[6]),
                to_bigint(record[1]),
                to_bigint(record[8]),
                to_bigint(record[2]),
            )
        )
    return rows


def fetch_tpex_month(
    stock_id: str,
    month_start: date,
    retries: int,
    backoff_base: float,
) -> List[Tuple[str, date, object, object, object, object, object, object, object]]:
    payload = fetch_json(
        TPEX_TRADING_STOCK_URL,
        {
            "date": month_start.strftime("%Y/%m/%d"),
            "code": stock_id,
            "response": "json",
        },
        retries,
        backoff_base,
    )
    tables = payload.get("tables") or []
    if not tables:
        return []

    rows = []
    for record in tables[0].get("data") or []:
        if len(record) < 9:
            continue
        rows.append(
            (
                stock_id,
                parse_roc_date(record[0]),
                to_decimal(record[3]),
                to_decimal(record[4]),
                to_decimal(record[5]),
                to_decimal(record[6]),
                to_bigint(record[1], multiplier=1000),
                to_bigint(record[8]),
                to_bigint(record[2], multiplier=1000),
            )
        )
    return rows


def fetch_public_month(
    stock_id: str,
    market_type: str,
    month_start: date,
    retries: int,
    backoff_base: float,
) -> List[Tuple[str, date, object, object, object, object, object, object, object]]:
    if market_type == MARKET_TPEX:
        return fetch_tpex_month(stock_id, month_start, retries, backoff_base)
    return fetch_twse_month(stock_id, month_start, retries, backoff_base)


def execute_batches(
    connection: pymysql.connections.Connection,
    sql: str,
    symbol_results: Iterable[dict],
    batch_size: int,
    label: str,
    dry_run: bool,
    checkpoint: Checkpoint,
) -> int:
    total = 0
    batch: List[Tuple] = []
    pending_records: List[dict] = []

    def flush_batch(cursor) -> None:
        nonlocal total, batch, pending_records
        if not batch and not pending_records:
            return
        if batch and not dry_run:
            cursor.executemany(sql, batch)
            connection.commit()
        total += len(batch)
        if not dry_run:
            for record in pending_records:
                checkpoint.record(record)
        log(f"[{label}] {'planned' if dry_run else 'committed'} {total}")
        batch = []
        pending_records = []

    with connection.cursor() as cursor:
        for result in symbol_results:
            rows = result.get("rows") or []
            batch.extend(rows)
            pending_records.append(result["checkpoint"])
            if len(batch) >= batch_size:
                flush_batch(cursor)

        flush_batch(cursor)

    return total


def iter_incremental_results(
    symbols: Sequence[Tuple[str, str, str, Optional[date]]],
    start_bound: Optional[date],
    force_start_date: Optional[date],
    end_date: date,
    bootstrap_start_date: Optional[date],
    request_sleep: float,
    retries: int,
    backoff_base: float,
    checkpoint: Checkpoint,
) -> Iterator[dict]:
    for index, (stock_id, market_type, _asset_type, latest_date) in enumerate(
        symbols, start=1
    ):
        if stock_id in checkpoint.completed:
            log(f"[public-incremental] {index}/{len(symbols)} {stock_id} checkpoint-skip")
            continue

        if force_start_date:
            start_date = force_start_date
        elif latest_date:
            start_date = latest_date + timedelta(days=1)
        elif bootstrap_start_date:
            start_date = bootstrap_start_date
        else:
            log(f"[public-incremental] {index}/{len(symbols)} {stock_id} skipped: no existing price rows")
            yield {
                "rows": [],
                "checkpoint": {
                    "stock_id": stock_id,
                    "status": "completed",
                    "reason": "no_existing_price_rows",
                    "rows": 0,
                    "finished_at": datetime.now().isoformat(timespec="seconds"),
                },
            }
            continue

        if start_bound and start_date < start_bound:
            start_date = start_bound

        if start_date > end_date:
            log(f"[public-incremental] {index}/{len(symbols)} {stock_id} up-to-date latest={latest_date}")
            yield {
                "rows": [],
                "checkpoint": {
                    "stock_id": stock_id,
                    "status": "completed",
                    "reason": "up_to_date",
                    "rows": 0,
                    "finished_at": datetime.now().isoformat(timespec="seconds"),
                },
            }
            continue

        fetched = 0
        rows_to_write: List[Tuple[str, date, object, object, object, object, object, object, object]] = []
        failures: List[str] = []
        for month_start in month_starts(start_date, end_date):
            try:
                month_rows = fetch_public_month(
                    stock_id,
                    market_type,
                    month_start,
                    retries,
                    backoff_base,
                )
            except RuntimeError as error:
                message = f"{month_start:%Y-%m}: {error}"
                failures.append(message)
                log(f"[public-incremental] {stock_id} {month_start:%Y-%m} failed: {error}")
                continue

            fetched += len(month_rows)
            for row in month_rows:
                trade_date = row[1]
                if start_date <= trade_date <= end_date:
                    rows_to_write.append(row)

            if request_sleep:
                time.sleep(request_sleep)

        if failures:
            status = "failed"
        elif rows_to_write:
            status = "completed"
        else:
            status = "empty"
        log(
            f"[public-incremental] {index}/{len(symbols)} {stock_id} "
            f"range={start_date.isoformat()}..{end_date.isoformat()} "
            f"fetched={fetched} yielded={len(rows_to_write)}"
        )
        yield {
            "rows": rows_to_write,
            "checkpoint": {
                "stock_id": stock_id,
                "status": status,
                "rows": len(rows_to_write),
                "fetched": fetched,
                "failures": failures,
                "started_from": start_date.isoformat(),
                "ended_at": end_date.isoformat(),
                "finished_at": datetime.now().isoformat(timespec="seconds"),
            },
        }


def get_latest_price_date(connection: pymysql.connections.Connection) -> object:
    with connection.cursor() as cursor:
        cursor.execute("SELECT MAX(date) FROM historicalprices")
        row = cursor.fetchone()
    return row[0] if row else None


def main() -> int:
    args = parse_args()
    load_env_file(Path(args.env_file))
    database_url = require_env("DATABASE_URL")
    start_bound = parse_iso_date(args.start_date)
    force_start_date = parse_iso_date(args.force_start_date)
    end_date = parse_iso_date(args.end_date) or date.today()
    bootstrap_start_date = parse_iso_date(args.bootstrap_start_date)

    connection = connect_mysql(database_url)
    try:
        ensure_schema_exists(connection)
        symbols = load_symbols(connection, args.scope, args.stock_id, args.limit)
        if not symbols:
            raise SystemExit("No symbols found in stocks table for the requested scope.")

        run_key = build_run_key(args, end_date)
        checkpoint_path = resolve_checkpoint_path(args, run_key)
        checkpoint = Checkpoint(checkpoint_path, restart=args.restart)

        log(
            f"[public-incremental] symbols={len(symbols)} scope={args.scope} "
            f"end_date={end_date.isoformat()} dry_run={args.dry_run} "
            f"checkpoint={checkpoint_path or 'disabled'} "
            f"checkpoint_completed={len(checkpoint.completed)}"
        )

        historical_sql = """
            INSERT INTO historicalprices (
                stock_id,
                date,
                open_price,
                high_price,
                low_price,
                close_price,
                volume,
                number_of_trades,
                trading_value
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                open_price = VALUES(open_price),
                high_price = VALUES(high_price),
                low_price = VALUES(low_price),
                close_price = VALUES(close_price),
                volume = VALUES(volume),
                number_of_trades = VALUES(number_of_trades),
                trading_value = VALUES(trading_value)
        """

        historical_count = execute_batches(
            connection,
            historical_sql,
            iter_incremental_results(
                symbols,
                start_bound,
                force_start_date,
                end_date,
                bootstrap_start_date,
                args.request_sleep,
                args.retries,
                args.backoff_base,
                checkpoint,
            ),
            args.batch_size,
            "historicalprices:public-incremental",
            args.dry_run,
            checkpoint,
        )
        latest_price_date = get_latest_price_date(connection)
        log(
            "[summary] "
            + json.dumps(
                {
                    "source": "PUBLIC_INCREMENTAL",
                    "scope": args.scope,
                    "stocks": 0,
                    "historicalprices": historical_count,
                    "financialreports": 0,
                    "dividends": 0,
                    "symbols": len(symbols),
                    "checkpoint_file": str(checkpoint_path) if checkpoint_path else None,
                    "checkpoint_completed": len(checkpoint.completed),
                    "checkpoint_failed": len(checkpoint.failed),
                    "latest_price_date": latest_price_date.isoformat()
                    if latest_price_date
                    else None,
                    "dry_run": args.dry_run,
                },
                ensure_ascii=False,
            )
        )
        log("[done] Public incremental price sync completed.")
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    sys.exit(main())
