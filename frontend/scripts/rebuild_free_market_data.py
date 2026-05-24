#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, unquote, urlparse
from urllib.request import Request, urlopen

import pymysql


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = ROOT / ".env.local"
COMPANY_JSON_FILE = ROOT / "data" / "company.json"

FINMIND_API_URL = "https://api.finmindtrade.com/api/v4/data"
FINMIND_STOCK_INFO_DATASET = "TaiwanStockInfo"
FINMIND_FINANCIAL_DATASET = "TaiwanStockFinancialStatements"
FINMIND_DIVIDEND_DATASET = "TaiwanStockDividend"

TWSE_DAILY_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
TPEX_DAILY_URL = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"

MARKET_TYPE_MAP = {
    "twse": "上市",
    "tpex": "上櫃",
}

FINANCIAL_TYPE_MAP = {
    "eps": "EPS",
    "revenue": "Revenue",
    "Income": "OperatingIncome",
    "non_operating_income_expense": "TotalNonoperatingIncomeAndExpense",
    "net_income": "EquityAttributableToOwnersOfParent",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Rebuild market data from free sources. Uses FinMind stock info and "
            "fundamentals plus TWSE/TPEx official latest daily quotes."
        )
    )
    parser.add_argument(
        "--env-file",
        default=str(DEFAULT_ENV_FILE),
        help="Environment file containing DATABASE_URL and optional FINMIND_API_TOKEN.",
    )
    parser.add_argument(
        "--scope",
        choices=["TSE_OTC", "ETF", "ALL"],
        default="TSE_OTC",
        help="Universe scope to import.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5000,
        help="MySQL executemany batch size.",
    )
    parser.add_argument("--skip-stocks", action="store_true")
    parser.add_argument("--skip-prices", action="store_true")
    parser.add_argument("--skip-financials", action="store_true")
    parser.add_argument("--skip-dividends", action="store_true")
    parser.add_argument(
        "--fundamental-limit",
        type=int,
        default=120,
        help=(
            "Maximum number of stocks to update from per-stock FinMind "
            "financial/dividend APIs. Use 0 to skip per-stock fundamentals."
        ),
    )
    parser.add_argument(
        "--fundamental-start-date",
        default=str(date.today().replace(month=1, day=1) - timedelta(days=370)),
        help="Start date for per-stock FinMind fundamentals.",
    )
    parser.add_argument(
        "--request-sleep",
        type=float,
        default=0.25,
        help="Seconds to sleep between per-stock FinMind requests.",
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
    required_tables = {
        "stocks",
        "historicalprices",
        "financialreports",
        "dividends",
        "stocksplits",
    }

    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        existing = {row[0] for row in cursor.fetchall()}

    missing = sorted(required_tables - existing)
    if missing:
        raise SystemExit(
            f"Missing tables: {', '.join(missing)}. Run `npx prisma db push` first."
        )


def fetch_json(url: str, params: Optional[dict] = None, token: Optional[str] = None):
    request_url = f"{url}?{urlencode(params)}" if params else url
    headers = {
        "Accept": "application/json",
        "User-Agent": "Stock-Query-Website/1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        request = Request(request_url, headers=headers)
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} from {request_url}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"Failed to fetch {request_url}: {error}") from error


def finmind_data(dataset: str, token: Optional[str], **params) -> list:
    payload = fetch_json(
        FINMIND_API_URL,
        params={"dataset": dataset, **{k: v for k, v in params.items() if v}},
        token=token,
    )
    if payload.get("status") != 200:
        raise RuntimeError(payload.get("msg") or f"FinMind {dataset} failed")
    return payload.get("data") or []


def load_company_data() -> Dict[str, dict]:
    if not COMPANY_JSON_FILE.exists():
        return {}
    return json.loads(COMPANY_JSON_FILE.read_text(encoding="utf-8"))


def normalize_market_scope(records: Sequence[dict], scope: str) -> List[dict]:
    allowed_types = {"twse", "tpex"}
    rows = []

    for record in records:
        stock_id = str(record.get("stock_id") or "").strip()
        source_type = str(record.get("type") or "").strip().lower()
        industry_category = str(record.get("industry_category") or "").strip().upper()
        is_etf = industry_category == "ETF"

        if not stock_id or not re.match(r"^\d{4,6}[A-Z]?$", stock_id):
            continue
        if source_type not in allowed_types:
            continue
        if scope == "TSE_OTC" and is_etf:
            continue
        if scope == "ETF" and not is_etf:
            continue
        rows.append(record)

    return rows


def build_stock_rows(
    records: Sequence[dict], company_data: Dict[str, dict]
) -> List[Tuple[str, str, str, str, str, str, str]]:
    rows = []

    for record in records:
        stock_id = str(record.get("stock_id")).strip()
        source_type = str(record.get("type") or "").strip().lower()
        industry_category = str(record.get("industry_category") or "").strip().upper()
        asset_type = "ETF" if industry_category == "ETF" else "STOCK"
        profile = company_data.get(stock_id, {})
        company_name = (
            profile.get("company_name")
            or record.get("stock_name")
            or record.get("name")
            or stock_id
        )
        market_type = MARKET_TYPE_MAP.get(source_type, "其他")

        rows.append(
            (
                stock_id,
                str(company_name),
                market_type,
                asset_type,
                "正常",
                "待補充",
                "TWD",
            )
        )

    print(f"[stocks:free] total={len(rows)}")
    return rows


def parse_roc_date(value: object) -> Optional[date]:
    text = str(value or "").strip()
    if not text:
        return None

    match = re.match(r"^(\d{3})(\d{2})(\d{2})$", text)
    if match:
        year, month, day = match.groups()
        return date(int(year) + 1911, int(month), int(day))

    match = re.match(r"^(\d{3})/(\d{2})/(\d{2})$", text)
    if match:
        year, month, day = match.groups()
        return date(int(year) + 1911, int(month), int(day))

    return date.fromisoformat(text[:10])


def to_decimal(value: object, places: int = 6) -> object:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if not text or text in {"--", "---", "N/A", "X0.00"}:
        return None
    return round(float(text), places)


def to_bigint(value: object) -> object:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if not text or text in {"--", "---", "N/A"}:
        return None
    return int(round(float(text)))


def iter_twse_price_rows(allowed_stock_ids: set[str]) -> Iterator[Tuple]:
    records = fetch_json(TWSE_DAILY_URL)
    for record in records:
        stock_id = str(record.get("Code") or "").strip()
        trade_date = parse_roc_date(record.get("Date"))
        if stock_id not in allowed_stock_ids or not trade_date:
            continue
        yield (
            stock_id,
            trade_date,
            to_decimal(record.get("OpeningPrice")),
            to_decimal(record.get("HighestPrice")),
            to_decimal(record.get("LowestPrice")),
            to_decimal(record.get("ClosingPrice")),
            to_bigint(record.get("TradeVolume")),
            to_bigint(record.get("Transaction")),
            to_bigint(record.get("TradeValue")),
        )


def iter_tpex_price_rows(allowed_stock_ids: set[str]) -> Iterator[Tuple]:
    records = fetch_json(TPEX_DAILY_URL)
    for record in records:
        stock_id = str(record.get("SecuritiesCompanyCode") or "").strip()
        trade_date = parse_roc_date(record.get("Date"))
        if stock_id not in allowed_stock_ids or not trade_date:
            continue
        yield (
            stock_id,
            trade_date,
            to_decimal(record.get("Open")),
            to_decimal(record.get("High")),
            to_decimal(record.get("Low")),
            to_decimal(record.get("Close")),
            to_bigint(record.get("TradingShares")),
            to_bigint(record.get("TransactionNumber")),
            to_bigint(record.get("TransactionAmount")),
        )


def period_from_finmind_date(value: str) -> Tuple[int, str]:
    parsed = datetime.strptime(value[:10], "%Y-%m-%d").date()
    quarter = ((parsed.month - 1) // 3) + 1
    return parsed.year, f"Q{quarter}"


def fetch_financial_rows(
    stock_ids: Sequence[str],
    token: Optional[str],
    start_date: str,
    request_sleep: float,
) -> Iterator[Tuple[str, int, str, object, object, object, object, object]]:
    for index, stock_id in enumerate(stock_ids, start=1):
        try:
            records = finmind_data(
                FINMIND_FINANCIAL_DATASET,
                token,
                data_id=stock_id,
                start_date=start_date,
            )
        except RuntimeError as error:
            print(f"[financialreports:free] {stock_id} skipped: {error}")
            continue

        grouped: Dict[Tuple[int, str], dict] = {}
        for record in records:
            year, period_type = period_from_finmind_date(record["date"])
            grouped.setdefault((year, period_type), {})[record["type"]] = record.get(
                "value"
            )

        for (year, period_type), values in grouped.items():
            yield (
                stock_id,
                year,
                period_type,
                to_decimal(values.get(FINANCIAL_TYPE_MAP["eps"]), places=4),
                to_bigint(values.get(FINANCIAL_TYPE_MAP["revenue"])),
                to_bigint(values.get(FINANCIAL_TYPE_MAP["Income"])),
                to_bigint(
                    values.get(FINANCIAL_TYPE_MAP["non_operating_income_expense"])
                ),
                to_bigint(values.get(FINANCIAL_TYPE_MAP["net_income"])),
            )

        print(f"[financialreports:free] {index}/{len(stock_ids)} {stock_id}")
        if request_sleep:
            time.sleep(request_sleep)


def fetch_dividend_rows(
    stock_ids: Sequence[str],
    token: Optional[str],
    start_date: str,
    request_sleep: float,
) -> Iterator[Tuple[str, object, object, object, object, object, object, object]]:
    for index, stock_id in enumerate(stock_ids, start=1):
        try:
            records = finmind_data(
                FINMIND_DIVIDEND_DATASET,
                token,
                data_id=stock_id,
                start_date=start_date,
            )
        except RuntimeError as error:
            print(f"[dividends:free] {stock_id} skipped: {error}")
            continue

        for record in records:
            dividend_date = record.get("CashExDividendTradingDate") or record.get(
                "date"
            )
            if not dividend_date:
                continue
            cash_dividend = to_decimal(record.get("CashEarningsDistribution"))
            stock_dividend = to_decimal(record.get("StockEarningsDistribution"))
            dividend_value = None
            if cash_dividend is not None or stock_dividend is not None:
                dividend_value = (cash_dividend or 0) + (stock_dividend or 0)

            ex_type = None
            if cash_dividend and stock_dividend:
                ex_type = "權息"
            elif cash_dividend:
                ex_type = "息"
            elif stock_dividend:
                ex_type = "權"

            yield (
                stock_id,
                date.fromisoformat(str(dividend_date)[:10]),
                None,
                None,
                dividend_value,
                ex_type,
                None,
                None,
            )

        print(f"[dividends:free] {index}/{len(stock_ids)} {stock_id}")
        if request_sleep:
            time.sleep(request_sleep)


def get_existing_priority_stock_ids(
    connection: pymysql.connections.Connection, stock_ids: Sequence[str], limit: int
) -> List[str]:
    if limit <= 0:
        return []

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT stock_id
            FROM (
                SELECT stock_id FROM transactions
                UNION
                SELECT stock_id FROM watchlistitems
                UNION
                SELECT stock_id FROM historicalprices
            ) candidates
            ORDER BY stock_id
            LIMIT %s
            """,
            (limit,),
        )
        existing = [row[0] for row in cursor.fetchall()]

    selected = []
    seen = set()
    for stock_id in [*existing, *stock_ids]:
        if stock_id in seen:
            continue
        seen.add(stock_id)
        selected.append(stock_id)
        if len(selected) >= limit:
            break

    return selected


def execute_batches(
    connection: pymysql.connections.Connection,
    sql: str,
    rows: Iterable[Tuple],
    batch_size: int,
    label: str,
) -> int:
    total = 0
    batch: List[Tuple] = []

    with connection.cursor() as cursor:
        for row in rows:
            batch.append(row)
            if len(batch) >= batch_size:
                cursor.executemany(sql, batch)
                connection.commit()
                total += len(batch)
                print(f"[{label}] committed {total}")
                batch.clear()

        if batch:
            cursor.executemany(sql, batch)
            connection.commit()
            total += len(batch)
            print(f"[{label}] committed {total}")

    return total


def get_latest_price_date(connection: pymysql.connections.Connection) -> object:
    with connection.cursor() as cursor:
        cursor.execute("SELECT MAX(date) FROM historicalprices")
        row = cursor.fetchone()
    return row[0] if row else None


def main() -> int:
    args = parse_args()
    load_env_file(Path(args.env_file))
    database_url = require_env("DATABASE_URL")
    finmind_token = os.environ.get("FINMIND_API_TOKEN") or None

    connection = connect_mysql(database_url)
    try:
        ensure_schema_exists(connection)

        company_data = load_company_data()
        stock_info = normalize_market_scope(
            finmind_data(FINMIND_STOCK_INFO_DATASET, finmind_token),
            args.scope,
        )
        stock_rows = build_stock_rows(stock_info, company_data)
        stock_ids = [row[0] for row in stock_rows]
        allowed_stock_ids = set(stock_ids)

        stock_sql = """
            INSERT INTO stocks (
                stock_id,
                company_name,
                market_type,
                asset_type,
                security_status,
                transfer_agent,
                currency
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                company_name = VALUES(company_name),
                market_type = VALUES(market_type),
                asset_type = VALUES(asset_type),
                security_status = VALUES(security_status),
                currency = VALUES(currency)
        """

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

        financial_sql = """
            INSERT INTO financialreports (
                stock_id,
                year,
                period_type,
                eps,
                revenue,
                Income,
                non_operating_income_expense,
                net_income
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                eps = VALUES(eps),
                revenue = VALUES(revenue),
                Income = VALUES(Income),
                non_operating_income_expense = VALUES(non_operating_income_expense),
                net_income = VALUES(net_income)
        """

        dividend_sql = """
            INSERT INTO dividends (
                stock_id,
                dividend_date,
                pre_ex_dividend_close,
                reference_price,
                dividend_value,
                ex_type,
                opening_reference_price,
                adjusted_price
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                dividend_value = VALUES(dividend_value),
                ex_type = VALUES(ex_type)
        """

        if args.skip_stocks:
            print("[stocks:free] skipped")
            stock_count = 0
        else:
            stock_count = execute_batches(
                connection, stock_sql, stock_rows, args.batch_size, "stocks:free"
            )

        if args.skip_prices:
            print("[historicalprices:free] skipped")
            historical_count = 0
        else:
            price_rows = list(iter_twse_price_rows(allowed_stock_ids))
            price_rows.extend(iter_tpex_price_rows(allowed_stock_ids))
            historical_count = execute_batches(
                connection,
                historical_sql,
                price_rows,
                args.batch_size,
                "historicalprices:free",
            )

        fundamental_stock_ids = get_existing_priority_stock_ids(
            connection, stock_ids, args.fundamental_limit
        )
        print(
            f"[fundamentals:free] selected={len(fundamental_stock_ids)} "
            f"start_date={args.fundamental_start_date}"
        )

        if args.skip_financials or not fundamental_stock_ids:
            print("[financialreports:free] skipped")
            financial_count = 0
        else:
            financial_count = execute_batches(
                connection,
                financial_sql,
                fetch_financial_rows(
                    fundamental_stock_ids,
                    finmind_token,
                    args.fundamental_start_date,
                    args.request_sleep,
                ),
                args.batch_size,
                "financialreports:free",
            )

        if args.skip_dividends or not fundamental_stock_ids:
            print("[dividends:free] skipped")
            dividend_count = 0
        else:
            dividend_count = execute_batches(
                connection,
                dividend_sql,
                fetch_dividend_rows(
                    fundamental_stock_ids,
                    finmind_token,
                    args.fundamental_start_date,
                    args.request_sleep,
                ),
                args.batch_size,
                "dividends:free",
            )

        print(
            "[stocksplits:free] skipped. Free fallback keeps the existing optional "
            "stocksplits table unchanged."
        )
        latest_price_date = get_latest_price_date(connection)
        print(
            "[summary] "
            + json.dumps(
                {
                    "source": "FREE",
                    "scope": args.scope,
                    "stocks": stock_count,
                    "historicalprices": historical_count,
                    "financialreports": financial_count,
                    "dividends": dividend_count,
                    "latest_price_date": latest_price_date.isoformat()
                    if latest_price_date
                    else None,
                },
                ensure_ascii=False,
            )
        )
        print("[done] Free market data rebuild completed.")
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    sys.exit(main())
