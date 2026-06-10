#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import warnings
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Sequence, Tuple
from urllib.parse import unquote, urlparse

import pandas as pd
import pymysql
import finlab
from finlab import data


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = ROOT / ".env.local"
COMPANY_JSON_FILE = ROOT / "data" / "company.json"

PRICE_DATASETS = {
    "open_price": "price:開盤價",
    "high_price": "price:最高價",
    "low_price": "price:最低價",
    "close_price": "price:收盤價",
    "volume": "price:成交股數",
    "number_of_trades": "price:成交筆數",
    "trading_value": "price:成交金額",
}

FINANCIAL_DATASETS = {
    "eps": "financial_statement:每股盈餘",
    "revenue": "financial_statement:營業收入淨額",
    "Income": "financial_statement:營業利益",
    "non_operating_income_expense": "financial_statement:營業外收入及支出",
    "net_income": "financial_statement:歸屬母公司淨利_損",
}

TSE_DIVIDEND_DATASETS = {
    "pre_ex_dividend_close": "dividend_tse:除權息前收盤價",
    "reference_price": "dividend_tse:除權息參考價",
    "dividend_value": "dividend_tse:權值+息值",
    "ex_type": "dividend_tse:權息",
    "opening_reference_price": "dividend_tse:開盤競價基準",
    "adjusted_price": "dividend_tse:減除股利參考價",
}

OTC_DIVIDEND_DATASETS = {
    "pre_ex_dividend_close": "dividend_otc:除權息前收盤價",
    "reference_price": "dividend_otc:除權息參考價",
    "dividend_value": "dividend_otc:現金股利",
    "dividend_value_fallback": "dividend_otc:權+息值",
    "ex_type": "dividend_otc:權息",
    "opening_reference_price": "dividend_otc:開盤競價基準",
    "adjusted_price": "dividend_otc:減除股利參考價",
}

QUARTER_PATTERN = re.compile(r"^(?P<year>\d{4})-Q(?P<quarter>[1-4])$")
FINLAB_GET_RETRIES = 5


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rebuild core market tables from FinLab into the existing MySQL schema."
    )
    parser.add_argument(
        "--env-file",
        default=str(DEFAULT_ENV_FILE),
        help="Environment file containing DATABASE_URL / FINLAB_API_TOKEN.",
    )
    parser.add_argument(
        "--scope",
        choices=["TSE_OTC", "ETF", "ALL"],
        default="TSE_OTC",
        help="FinLab universe scope to import. Use ETF to refresh ETF history without rebuilding the full ALL universe.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5000,
        help="MySQL executemany batch size.",
    )
    parser.add_argument(
        "--skip-stocks",
        action="store_true",
        help="Skip inserting the stocks table.",
    )
    parser.add_argument(
        "--skip-prices",
        action="store_true",
        help="Skip inserting historicalprices.",
    )
    parser.add_argument(
        "--skip-financials",
        action="store_true",
        help="Skip inserting financialreports.",
    )
    parser.add_argument(
        "--skip-dividends",
        action="store_true",
        help="Skip inserting dividends.",
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
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


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


def login_finlab(api_token: str) -> None:
    warnings.filterwarnings(
        "ignore",
        message="Passing api_token to finlab.login\\(\\) is deprecated",
        category=DeprecationWarning,
    )
    finlab.login(api_token)


def get_finlab_dataset(dataset: str) -> pd.DataFrame:
    last_error: Exception | None = None

    for attempt in range(1, FINLAB_GET_RETRIES + 1):
        try:
            return data.get(dataset)
        except Exception as error:
            last_error = error
            if attempt >= FINLAB_GET_RETRIES:
                break
            wait_seconds = min(60, 5 * attempt)
            print(
                f"[finlab] retrying {dataset} after error "
                f"({attempt}/{FINLAB_GET_RETRIES}): {error}"
            )
            time.sleep(wait_seconds)

    raise last_error or RuntimeError(f"Failed to load FinLab dataset: {dataset}")


def load_company_data() -> Dict[str, dict]:
    if not COMPANY_JSON_FILE.exists():
        return {}
    return json.loads(COMPANY_JSON_FILE.read_text(encoding="utf-8"))


def load_existing_company_names(
    connection: pymysql.connections.Connection,
) -> Dict[str, str]:
    with connection.cursor() as cursor:
        cursor.execute("SELECT stock_id, company_name FROM stocks")
        return {
            str(stock_id): str(company_name)
            for stock_id, company_name in cursor.fetchall()
            if company_name and str(company_name) != str(stock_id)
        }


def get_universe_ids(market: str) -> List[str]:
    with data.universe(market=market):
        close = get_finlab_dataset("price:收盤價")
    return list(close.columns)


def get_market_id_sets() -> Dict[str, set[str]]:
    return {
        "TSE": set(get_universe_ids("TSE")),
        "OTC": set(get_universe_ids("OTC")),
        "ETF": set(get_universe_ids("ETF")),
    }


def get_finlab_categories() -> Dict[str, str]:
    categories = get_finlab_dataset("security_categories").reset_index(drop=True)
    if "stock_id" not in categories.columns or "category" not in categories.columns:
        return {}

    return {
        str(row.stock_id).strip(): str(row.category).strip()
        for row in categories.itertuples(index=False)
        if getattr(row, "stock_id", None) and getattr(row, "category", None)
    }


def build_stock_rows(
    scope: str,
    company_data: Dict[str, dict],
    existing_company_names: Dict[str, str],
    market_id_sets: Dict[str, set[str]],
    finlab_categories: Dict[str, str],
) -> List[Tuple[str, str, str, str, str | None, str, str, str]]:
    scope_ids = get_universe_ids(scope)
    tse_ids = market_id_sets["TSE"]
    otc_ids = market_id_sets["OTC"]
    etf_ids = market_id_sets["ETF"]

    rows = []
    missing_company_names = 0

    for stock_id in scope_ids:
        profile = company_data.get(stock_id, {})
        company_name = (
            profile.get("company_name")
            or existing_company_names.get(stock_id)
            or stock_id
        )

        if company_name == stock_id:
            missing_company_names += 1

        asset_type = "ETF" if stock_id in etf_ids else "STOCK"

        if stock_id in tse_ids or stock_id in etf_ids:
            market_type = "上市"
        elif stock_id in otc_ids:
            market_type = "上櫃"
        else:
            market_type = "其他"

        rows.append(
            (
                stock_id,
                company_name,
                market_type,
                asset_type,
                finlab_categories.get(stock_id) or profile.get("industry"),
                "正常",
                "待補充",
                "TWD",
            )
        )

    print(
        f"[stocks] scope={scope} total={len(rows)} company_name_missing={missing_company_names}"
    )
    return rows


def get_price_frames(scope: str) -> Dict[str, pd.DataFrame]:
    frames: Dict[str, pd.DataFrame] = {}
    with data.universe(market=scope):
        for column, dataset in PRICE_DATASETS.items():
            print(f"[finlab] loading {dataset}")
            frames[column] = get_finlab_dataset(dataset)
    return frames


def iter_historical_rows(
    stock_ids: Sequence[str], frames: Dict[str, pd.DataFrame]
) -> Iterator[Tuple[str, object, object, object, object, object, object, object, object]]:
    base_index = frames["close_price"].index

    for stock_id in stock_ids:
        stock_frame = pd.DataFrame(index=base_index)

        for column, frame in frames.items():
            stock_frame[column] = frame[stock_id] if stock_id in frame.columns else pd.NA

        stock_frame = stock_frame.dropna(how="all")
        if stock_frame.empty:
            continue

        for row in stock_frame.itertuples():
            yield (
                stock_id,
                pd.Timestamp(row.Index).date(),
                to_decimal(row.open_price),
                to_decimal(row.high_price),
                to_decimal(row.low_price),
                to_decimal(row.close_price),
                to_bigint(row.volume),
                to_bigint(row.number_of_trades),
                to_bigint(row.trading_value),
            )


def get_financial_frames() -> Dict[str, pd.DataFrame]:
    frames: Dict[str, pd.DataFrame] = {}
    for column, dataset in FINANCIAL_DATASETS.items():
        print(f"[finlab] loading {dataset}")
        frames[column] = get_finlab_dataset(dataset)
    return frames


def iter_financial_rows(
    stock_ids: Sequence[str], frames: Dict[str, pd.DataFrame]
) -> Iterator[Tuple[str, int, str, object, object, object, object, object]]:
    base_index = frames["revenue"].index

    for stock_id in stock_ids:
        stock_frame = pd.DataFrame(index=base_index)

        for column, frame in frames.items():
            stock_frame[column] = frame[stock_id] if stock_id in frame.columns else pd.NA

        stock_frame = stock_frame.dropna(how="all")
        if stock_frame.empty:
            continue

        for row in stock_frame.itertuples():
            year, period_type = parse_quarter_label(str(row.Index))
            yield (
                stock_id,
                year,
                period_type,
                to_decimal(row.eps, places=4),
                to_bigint(row.revenue),
                to_bigint(getattr(row, "Income")),
                to_bigint(row.non_operating_income_expense),
                to_bigint(row.net_income),
            )


def build_dividend_rows(
    datasets: Dict[str, str], allowed_stock_ids: Sequence[str]
) -> List[Tuple[str, object, object, object, object, object, object, object]]:
    stacked = {}
    allowed_stock_ids_set = set(allowed_stock_ids)

    for column, dataset in datasets.items():
        print(f"[finlab] loading {dataset}")
        frame = get_finlab_dataset(dataset)
        columns = [stock_id for stock_id in allowed_stock_ids if stock_id in frame.columns]
        if not columns:
            continue
        stacked[column] = frame[columns].stack().dropna()

    if not stacked:
        return []

    combined = pd.concat(stacked, axis=1).reset_index()
    combined.rename(columns={"date": "dividend_date", "symbol": "stock_id"}, inplace=True)

    if "level_0" in combined.columns:
        combined.rename(columns={"level_0": "dividend_date"}, inplace=True)
    if "level_1" in combined.columns:
        combined.rename(columns={"level_1": "stock_id"}, inplace=True)

    rows = []
    for record in combined.to_dict("records"):
        stock_id = record["stock_id"]
        if stock_id not in allowed_stock_ids_set:
            continue

        dividend_value = record.get("dividend_value")
        if pd.isna(dividend_value):
            dividend_value = record.get("dividend_value_fallback")

        rows.append(
            (
                stock_id,
                pd.Timestamp(record["dividend_date"]).date(),
                to_decimal(record.get("pre_ex_dividend_close")),
                to_decimal(record.get("reference_price")),
                to_decimal(dividend_value),
                normalize_text(record.get("ex_type")),
                to_decimal(record.get("opening_reference_price")),
                to_decimal(record.get("adjusted_price")),
            )
        )

    return rows


def parse_quarter_label(value: str) -> Tuple[int, str]:
    match = QUARTER_PATTERN.match(value)
    if not match:
        raise ValueError(f"Unexpected financial statement index format: {value}")
    return int(match.group("year")), f"Q{match.group('quarter')}"


def to_decimal(value: object, places: int = 6) -> object:
    if value is None or pd.isna(value):
        return None
    return round(float(value), places)


def to_bigint(value: object) -> object:
    if value is None or pd.isna(value):
        return None
    return int(round(float(value)))


def normalize_text(value: object) -> object:
    if value is None or pd.isna(value):
        return None
    return str(value).strip() or None


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
        joined = ", ".join(missing)
        raise SystemExit(
            "Missing tables: "
            f"{joined}. Run `npx prisma db push` in /frontend first."
        )


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
    finlab_api_token = require_env("FINLAB_API_TOKEN")

    connection = connect_mysql(database_url)
    try:
        ensure_schema_exists(connection)
        login_finlab(finlab_api_token)

        market_id_sets = get_market_id_sets()
        finlab_categories = get_finlab_categories()
        company_data = load_company_data()
        existing_company_names = load_existing_company_names(connection)
        stock_rows = build_stock_rows(
            args.scope,
            company_data,
            existing_company_names,
            market_id_sets,
            finlab_categories,
        )
        stock_ids = [row[0] for row in stock_rows]

        stock_sql = """
            INSERT INTO stocks (
                stock_id,
                company_name,
                market_type,
                asset_type,
                industry_category,
                security_status,
                transfer_agent,
                currency
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                company_name = VALUES(company_name),
                market_type = VALUES(market_type),
                asset_type = VALUES(asset_type),
                industry_category = VALUES(industry_category),
                security_status = VALUES(security_status),
                transfer_agent = VALUES(transfer_agent),
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
                pre_ex_dividend_close = VALUES(pre_ex_dividend_close),
                reference_price = VALUES(reference_price),
                dividend_value = VALUES(dividend_value),
                ex_type = VALUES(ex_type),
                opening_reference_price = VALUES(opening_reference_price),
                adjusted_price = VALUES(adjusted_price)
        """

        if args.skip_stocks:
            print("[stocks] skipped")
            stock_count = 0
        else:
            stock_count = execute_batches(
                connection, stock_sql, stock_rows, args.batch_size, "stocks"
            )

        if args.skip_prices:
            print("[historicalprices] skipped")
            historical_count = 0
        else:
            price_frames = get_price_frames(args.scope)
            historical_count = execute_batches(
                connection,
                historical_sql,
                iter_historical_rows(stock_ids, price_frames),
                args.batch_size,
                "historicalprices",
            )

        if args.skip_financials:
            print("[financialreports] skipped")
            financial_count = 0
        else:
            financial_frames = get_financial_frames()
            financial_count = execute_batches(
                connection,
                financial_sql,
                iter_financial_rows(stock_ids, financial_frames),
                args.batch_size,
                "financialreports",
            )

        if args.skip_dividends:
            print("[dividends] skipped")
            dividend_count = 0
        else:
            tse_ids = [stock_id for stock_id in stock_ids if stock_id in market_id_sets["TSE"]]
            otc_ids = [stock_id for stock_id in stock_ids if stock_id in market_id_sets["OTC"]]

            tse_dividend_rows = build_dividend_rows(TSE_DIVIDEND_DATASETS, tse_ids)
            otc_dividend_rows = build_dividend_rows(OTC_DIVIDEND_DATASETS, otc_ids)

            tse_dividend_count = execute_batches(
                connection,
                dividend_sql,
                tse_dividend_rows,
                args.batch_size,
                "dividends_tse",
            )
            otc_dividend_count = execute_batches(
                connection,
                dividend_sql,
                otc_dividend_rows,
                args.batch_size,
                "dividends_otc",
            )
            dividend_count = tse_dividend_count + otc_dividend_count

        print(
            "[stocksplits] skipped. FinLab currently exposes ETF split data only, which does not map cleanly to the current generic stocksplits schema."
        )
        latest_price_date = get_latest_price_date(connection)
        print(
            "[summary] "
            + json.dumps(
                {
                    "source": "FINLAB",
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
        print("[done] FinLab market data rebuild completed.")
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    sys.exit(main())
