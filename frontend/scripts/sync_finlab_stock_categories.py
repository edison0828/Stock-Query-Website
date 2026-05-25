#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterator, Sequence, Tuple
from urllib.parse import unquote, urlparse

import finlab
import pymysql
from finlab import data


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = ROOT / ".env.local"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync TW stock / ETF industry categories from FinLab security_categories."
    )
    parser.add_argument(
        "--env-file",
        default=str(DEFAULT_ENV_FILE),
        help="Environment file containing DATABASE_URL / FINLAB_API_TOKEN.",
    )
    parser.add_argument("--batch-size", type=int, default=1000)
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


def connect_mysql(database_url: str) -> pymysql.connections.Connection:
    parsed = urlparse(database_url)
    return pymysql.connect(
        host=parsed.hostname or "127.0.0.1",
        port=parsed.port or 3306,
        user=unquote(parsed.username or ""),
        password=unquote(parsed.password or ""),
        database=(parsed.path or "/").lstrip("/"),
        charset="utf8mb4",
        autocommit=False,
    )


def batched(
    rows: Sequence[Tuple[str, str, str]], batch_size: int
) -> Iterator[Sequence[Tuple[str, str, str]]]:
    for start in range(0, len(rows), batch_size):
        yield rows[start : start + batch_size]


def login_finlab(token: str | None) -> None:
    if token:
        finlab.login(token)


def load_finlab_categories() -> list[Tuple[str, str, str]]:
    categories = data.get("security_categories").reset_index(drop=True)
    required = {"stock_id", "category", "market"}
    if not required.issubset(categories.columns):
        missing = ", ".join(sorted(required - set(categories.columns)))
        raise RuntimeError(f"FinLab security_categories missing columns: {missing}")

    rows: list[Tuple[str, str, str]] = []
    for record in categories.itertuples(index=False):
        stock_id = str(getattr(record, "stock_id", "") or "").strip()
        category = str(getattr(record, "category", "") or "").strip()
        market = str(getattr(record, "market", "") or "").strip().lower()

        if stock_id and category:
            rows.append((stock_id, category, "ETF" if market == "etf" else "STOCK"))

    return rows


def main() -> int:
    args = parse_args()
    load_env_file(Path(args.env_file))

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", flush=True)
        return 1

    login_finlab(os.environ.get("FINLAB_API_TOKEN"))
    rows = load_finlab_categories()
    connection = connect_mysql(database_url)

    try:
        with connection.cursor() as cursor:
            total_updated = 0
            etf_updated = 0
            stock_updated = 0

            for batch in batched(rows, args.batch_size):
                cursor.executemany(
                    """
                    UPDATE stocks
                    SET industry_category = %s,
                        asset_type = CASE WHEN %s = 'ETF' THEN 'ETF' ELSE asset_type END
                    WHERE stock_id = %s
                    """,
                    [(category, asset_type, stock_id) for stock_id, category, asset_type in batch],
                )
                total_updated += cursor.rowcount
                etf_updated += sum(1 for _, _, asset_type in batch if asset_type == "ETF")
                stock_updated += sum(1 for _, _, asset_type in batch if asset_type != "ETF")

        connection.commit()
        print(
            "[finlab-categories] "
            f"source_rows={len(rows)} updated={total_updated} "
            f"source_stock_rows={stock_updated} source_etf_rows={etf_updated}",
            flush=True,
        )
        return 0
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
