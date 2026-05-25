#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, Iterator, Mapping, Sequence
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen

import finlab
import pandas as pd
import pymysql
from finlab import data


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = ROOT / ".env.local"
TWSE_ETF_PROFILE_URL = "https://openapi.twse.com.tw/v1/opendata/t187ap47_L"
ETFINFO_BASE_URL = "https://www.etfinfo.tw"
ETFINFO_SOURCE = "ETFINFO_PUBLIC_PAGE"
HOLDING_PATTERN = re.compile(
    r'\{"code":\d+,"name":\d+,"weight":\d+,"shares":\d+,"unit":\d+'
    r'(?:,"industry":\d+)?\},"([^"]+)","([^"]+)",([0-9.]+),([0-9]+)'
)


@dataclass(frozen=True)
class ETFProfile:
    stock_id: str
    fund_short_name: str | None = None
    fund_name: str | None = None
    fund_english_name: str | None = None
    issuer: str | None = None
    etf_category: str | None = None
    tracking_index: str | None = None
    is_custom_index: str | None = None
    has_foreign_components: bool | None = None
    benchmark_name: str | None = None
    benchmark_english_name: str | None = None
    inception_date: date | None = None
    listing_date: date | None = None
    fund_manager: str | None = None
    custodian: str | None = None
    units_outstanding: int | None = None
    mops_fund_id: str | None = None
    detail_url: str | None = None
    expense_ratio: float | None = None
    management_fee_rate: float | None = None
    custodian_fee_rate: float | None = None
    expense_ratio_period: str | None = None
    fee_source: str | None = None
    data_source: str = "FINLAB_TWSE_OPENAPI"
    source_as_of_date: date | None = None


@dataclass(frozen=True)
class ETFNavSnapshot:
    stock_id: str
    snapshot_date: date
    nav: float | None
    premium_discount: float | None
    data_source: str = "FINLAB"


@dataclass(frozen=True)
class ETFHolding:
    stock_id: str
    component_symbol: str
    component_name: str
    snapshot_date: date
    weight: float | None
    shares: int | None
    component_close_price: float | None = None
    component_change_pct: float | None = None
    contribution_pct: float | None = None
    component_industry: str | None = None
    holding_rank: int | None = None
    data_source: str = ETFINFO_SOURCE
    source_url: str | None = None


class EnvLoader:
    def __init__(self, env_file: Path) -> None:
        self.env_file = env_file

    def load(self) -> None:
        if not self.env_file.exists():
            return

        for raw_line in self.env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


class MySQLConnectionFactory:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def connect(self) -> pymysql.connections.Connection:
        parsed = urlparse(self.database_url)
        if parsed.scheme != "mysql":
            raise SystemExit("DATABASE_URL must start with mysql://")

        return pymysql.connect(
            host=parsed.hostname or "127.0.0.1",
            port=parsed.port or 3306,
            user=unquote(parsed.username or ""),
            password=unquote(parsed.password or ""),
            database=(parsed.path or "/").lstrip("/"),
            charset="utf8mb4",
            autocommit=False,
        )


class FinLabETFDataSource:
    def __init__(self, api_token: str | None) -> None:
        self.api_token = api_token

    def login(self) -> None:
        if self.api_token:
            finlab.login(self.api_token)

    def fetch_profiles(self) -> dict[str, ETFProfile]:
        frame = data.get("tw_etf_basic_info").reset_index(drop=True)
        profiles: dict[str, ETFProfile] = {}

        for record in frame.to_dict("records"):
            stock_id = normalize_text(record.get("stock_id") or record.get("symbol"))
            if not stock_id:
                continue

            profiles[stock_id] = ETFProfile(
                stock_id=stock_id,
                fund_short_name=normalize_text(record.get("證券簡稱")),
                fund_name=normalize_text(record.get("MOPS基金名稱")),
                issuer=normalize_text(record.get("發行人")),
                tracking_index=normalize_tracking_index(record.get("標的指數")),
                listing_date=parse_date(record.get("上市日期")),
                detail_url=normalize_text(record.get("ETF詳情頁")),
                data_source="FINLAB",
            )

        return profiles

    def fetch_nav_snapshots(self, allowed_stock_ids: set[str]) -> list[ETFNavSnapshot]:
        nav_frame = data.get("tw_etf_nav_daily:淨值")
        premium_frame = data.get("tw_etf_nav_daily:折溢價(%)")
        columns = [
            stock_id
            for stock_id in allowed_stock_ids
            if stock_id in nav_frame.columns or stock_id in premium_frame.columns
        ]
        rows: list[ETFNavSnapshot] = []

        for stock_id in columns:
            stock_nav = nav_frame[stock_id] if stock_id in nav_frame.columns else None
            stock_premium = (
                premium_frame[stock_id] if stock_id in premium_frame.columns else None
            )
            stock_dates = set()
            if stock_nav is not None:
                stock_dates.update(stock_nav.dropna().index)
            if stock_premium is not None:
                stock_dates.update(stock_premium.dropna().index)

            for raw_date in sorted(stock_dates):
                nav = stock_nav.get(raw_date) if stock_nav is not None else None
                premium = (
                    stock_premium.get(raw_date) if stock_premium is not None else None
                )
                rows.append(
                    ETFNavSnapshot(
                        stock_id=stock_id,
                        snapshot_date=pd.Timestamp(raw_date).date(),
                        nav=to_float(nav),
                        premium_discount=to_float(premium),
                    )
                )

        return rows


class TwseOpenApiETFDataSource:
    def __init__(self, url: str = TWSE_ETF_PROFILE_URL) -> None:
        self.url = url

    def fetch_profiles(self) -> dict[str, ETFProfile]:
        request = Request(self.url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(request, timeout=30) as response:
            records = json.loads(response.read().decode("utf-8"))

        profiles: dict[str, ETFProfile] = {}
        for record in records:
            stock_id = normalize_text(record.get("基金代號"))
            if not stock_id:
                continue

            profiles[stock_id] = ETFProfile(
                stock_id=stock_id,
                fund_short_name=normalize_text(record.get("基金簡稱")),
                fund_name=normalize_text(record.get("基金中文名稱")),
                fund_english_name=normalize_text(record.get("基金英文名稱")),
                etf_category=normalize_text(record.get("基金類型")),
                tracking_index=normalize_tracking_index(
                    record.get("標的指數/追蹤指數名稱")
                ),
                is_custom_index=normalize_text(
                    record.get("標的指數是否為客製化或需揭露相關資訊之指數")
                ),
                has_foreign_components=parse_bool(record.get("是否包含國外成分股")),
                benchmark_name=normalize_text(record.get("績效指標中文名稱")),
                benchmark_english_name=normalize_text(record.get("績效指標英文名稱")),
                inception_date=parse_minguo_date(record.get("成立日期")),
                listing_date=parse_minguo_date(record.get("上市日期")),
                fund_manager=normalize_text(record.get("基金經理人")),
                custodian=normalize_text(record.get("保管機構")),
                units_outstanding=to_int(record.get("發行單位數/轉換數")),
                mops_fund_id=normalize_text(record.get("基金統一編號")),
                data_source="TWSE_OPENAPI",
                source_as_of_date=parse_minguo_date(record.get("出表日期")),
            )

        return profiles


class ETFInfoHoldingRowParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_row = False
        self.current_row: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "tr":
            return
        attrs_by_name = dict(attrs)
        class_name = attrs_by_name.get("class") or ""
        if "holding-row" in class_name:
            self.in_row = True
            self.current_row = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "tr" and self.in_row:
            self.in_row = False
            self.rows.append([item for item in self.current_row if item])

    def handle_data(self, data: str) -> None:
        if not self.in_row:
            return
        text = data.strip()
        if text:
            self.current_row.append(text)


class ETFInfoPublicDataSource:
    def __init__(self, base_url: str = ETFINFO_BASE_URL) -> None:
        self.base_url = base_url.rstrip("/")

    def fetch_profile_fees(self, stock_id: str) -> ETFProfile | None:
        url = f"{self.base_url}/etf/{stock_id}"
        content = self._fetch_text(url)
        if not content:
            return None

        text = html.unescape(re.sub(r"<[^>]+>", " ", content))
        text = re.sub(r"\s+", " ", text)
        management_fee = find_percent_after_label(text, "管理費")
        custodian_fee = find_percent_after_label(text, "保管費")

        if management_fee is None and custodian_fee is None:
            return None

        return ETFProfile(
            stock_id=stock_id,
            management_fee_rate=management_fee,
            custodian_fee_rate=custodian_fee,
            fee_source=ETFINFO_SOURCE,
        )

    def fetch_holdings(self, stock_id: str) -> list[ETFHolding]:
        url = f"{self.base_url}/etf/{stock_id}/holdings"
        content = self._fetch_text(url)
        if not content:
            return []

        snapshot_date = self._parse_snapshot_date(content)
        if snapshot_date is None:
            return []

        holdings = self._parse_serialized_holdings(stock_id, snapshot_date, content, url)
        if holdings:
            return holdings

        return self._parse_visible_holdings(stock_id, snapshot_date, content, url)

    def _fetch_text(self, url: str) -> str | None:
        request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urlopen(request, timeout=30) as response:
                return response.read().decode("utf-8")
        except Exception as exc:
            print(f"[etfinfo] fetch failed url={url} error={exc}", flush=True)
            return None

    def _parse_snapshot_date(self, content: str) -> date | None:
        match = re.search(r"快照\s*(\d{4}-\d{2}-\d{2})", content)
        if match:
            return parse_date(match.group(1))
        match = re.search(r"持股快照：\s*(\d{4}-\d{2}-\d{2})", content)
        if match:
            return parse_date(match.group(1))
        return None

    def _parse_serialized_holdings(
        self, stock_id: str, snapshot_date: date, content: str, source_url: str
    ) -> list[ETFHolding]:
        rows: list[ETFHolding] = []
        seen_symbols: set[str] = set()

        for rank, match in enumerate(HOLDING_PATTERN.finditer(content), start=1):
            component_symbol, component_name, weight, shares = match.groups()
            component_symbol = html.unescape(component_symbol)
            component_name = html.unescape(component_name)
            if component_symbol in seen_symbols:
                continue
            seen_symbols.add(component_symbol)
            rows.append(
                ETFHolding(
                    stock_id=stock_id,
                    component_symbol=component_symbol,
                    component_name=component_name,
                    snapshot_date=snapshot_date,
                    weight=to_float(weight),
                    shares=to_int(shares),
                    holding_rank=rank,
                    source_url=source_url,
                )
            )

        return rows

    def _parse_visible_holdings(
        self, stock_id: str, snapshot_date: date, content: str, source_url: str
    ) -> list[ETFHolding]:
        parser = ETFInfoHoldingRowParser()
        parser.feed(content)
        rows: list[ETFHolding] = []

        for rank, row in enumerate(parser.rows, start=1):
            if len(row) < 5:
                continue
            rows.append(
                ETFHolding(
                    stock_id=stock_id,
                    component_symbol=row[0],
                    component_name=row[1],
                    snapshot_date=snapshot_date,
                    component_change_pct=parse_percent_text(row[2]),
                    component_close_price=to_float(row[3]),
                    weight=parse_percent_text(row[4]),
                    shares=to_int(row[5]) if len(row) > 5 else None,
                    contribution_pct=parse_percent_text(row[6]) if len(row) > 6 else None,
                    holding_rank=rank,
                    source_url=source_url,
                )
            )

        return rows


class ETFProfileMerger:
    def merge(
        self,
        finlab_profiles: Mapping[str, ETFProfile],
        twse_profiles: Mapping[str, ETFProfile],
    ) -> list[ETFProfile]:
        merged: list[ETFProfile] = []
        stock_ids = sorted(set(finlab_profiles) | set(twse_profiles))

        for stock_id in stock_ids:
            finlab_profile = finlab_profiles.get(stock_id)
            twse_profile = twse_profiles.get(stock_id)
            merged.append(self._merge_one(stock_id, finlab_profile, twse_profile))

        return merged

    def _merge_one(
        self,
        stock_id: str,
        finlab_profile: ETFProfile | None,
        twse_profile: ETFProfile | None,
    ) -> ETFProfile:
        return ETFProfile(
            stock_id=stock_id,
            fund_short_name=pick(
                twse_profile.fund_short_name if twse_profile else None,
                finlab_profile.fund_short_name if finlab_profile else None,
            ),
            fund_name=pick(
                twse_profile.fund_name if twse_profile else None,
                finlab_profile.fund_name if finlab_profile else None,
            ),
            fund_english_name=twse_profile.fund_english_name
            if twse_profile
            else None,
            issuer=finlab_profile.issuer if finlab_profile else None,
            etf_category=twse_profile.etf_category if twse_profile else None,
            tracking_index=pick(
                twse_profile.tracking_index if twse_profile else None,
                finlab_profile.tracking_index if finlab_profile else None,
            ),
            is_custom_index=twse_profile.is_custom_index if twse_profile else None,
            has_foreign_components=twse_profile.has_foreign_components
            if twse_profile
            else None,
            benchmark_name=twse_profile.benchmark_name if twse_profile else None,
            benchmark_english_name=twse_profile.benchmark_english_name
            if twse_profile
            else None,
            inception_date=twse_profile.inception_date if twse_profile else None,
            listing_date=pick(
                twse_profile.listing_date if twse_profile else None,
                finlab_profile.listing_date if finlab_profile else None,
            ),
            fund_manager=twse_profile.fund_manager if twse_profile else None,
            custodian=twse_profile.custodian if twse_profile else None,
            units_outstanding=twse_profile.units_outstanding if twse_profile else None,
            mops_fund_id=twse_profile.mops_fund_id if twse_profile else None,
            detail_url=finlab_profile.detail_url if finlab_profile else None,
            management_fee_rate=pick(
                twse_profile.management_fee_rate if twse_profile else None,
                finlab_profile.management_fee_rate if finlab_profile else None,
            ),
            custodian_fee_rate=pick(
                twse_profile.custodian_fee_rate if twse_profile else None,
                finlab_profile.custodian_fee_rate if finlab_profile else None,
            ),
            fee_source=pick(
                twse_profile.fee_source if twse_profile else None,
                finlab_profile.fee_source if finlab_profile else None,
            ),
            data_source="FINLAB_TWSE_OPENAPI",
            source_as_of_date=twse_profile.source_as_of_date if twse_profile else None,
        )


class ETFAdvancedDataRepository:
    def __init__(self, connection: pymysql.connections.Connection) -> None:
        self.connection = connection

    def load_current_etf_ids(self) -> set[str]:
        with self.connection.cursor() as cursor:
            cursor.execute("SELECT stock_id FROM stocks WHERE asset_type = 'ETF'")
            return {str(row[0]) for row in cursor.fetchall()}

    def ensure_required_tables(self) -> None:
        required = {"stocks", "etfprofiles", "etfnavsnapshots", "etfholdings"}
        with self.connection.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            existing = {row[0] for row in cursor.fetchall()}
        missing = sorted(required - existing)
        if missing:
            raise SystemExit(
                "Missing tables: "
                + ", ".join(missing)
                + ". Run `npx prisma db push` in /frontend first."
            )

    def upsert_profiles(self, profiles: Sequence[ETFProfile], batch_size: int) -> int:
        sql = """
            INSERT INTO etfprofiles (
                stock_id,
                fund_short_name,
                fund_name,
                fund_english_name,
                issuer,
                etf_category,
                tracking_index,
                is_custom_index,
                has_foreign_components,
                benchmark_name,
                benchmark_english_name,
                inception_date,
                listing_date,
                fund_manager,
                custodian,
                units_outstanding,
                mops_fund_id,
                detail_url,
                expense_ratio,
                management_fee_rate,
                custodian_fee_rate,
                expense_ratio_period,
                fee_source,
                data_source,
                source_as_of_date
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                fund_short_name = VALUES(fund_short_name),
                fund_name = VALUES(fund_name),
                fund_english_name = VALUES(fund_english_name),
                issuer = VALUES(issuer),
                etf_category = VALUES(etf_category),
                tracking_index = VALUES(tracking_index),
                is_custom_index = VALUES(is_custom_index),
                has_foreign_components = VALUES(has_foreign_components),
                benchmark_name = VALUES(benchmark_name),
                benchmark_english_name = VALUES(benchmark_english_name),
                inception_date = VALUES(inception_date),
                listing_date = VALUES(listing_date),
                fund_manager = VALUES(fund_manager),
                custodian = VALUES(custodian),
                units_outstanding = VALUES(units_outstanding),
                mops_fund_id = VALUES(mops_fund_id),
                detail_url = VALUES(detail_url),
                expense_ratio = COALESCE(VALUES(expense_ratio), expense_ratio),
                management_fee_rate = COALESCE(VALUES(management_fee_rate), management_fee_rate),
                custodian_fee_rate = COALESCE(VALUES(custodian_fee_rate), custodian_fee_rate),
                expense_ratio_period = COALESCE(VALUES(expense_ratio_period), expense_ratio_period),
                fee_source = COALESCE(VALUES(fee_source), fee_source),
                data_source = VALUES(data_source),
                source_as_of_date = VALUES(source_as_of_date)
        """
        return self._execute_batches(sql, [profile_to_row(item) for item in profiles], batch_size)

    def update_profile_fees(self, profiles: Sequence[ETFProfile], batch_size: int) -> int:
        sql = """
            UPDATE etfprofiles
            SET management_fee_rate = COALESCE(%s, management_fee_rate),
                custodian_fee_rate = COALESCE(%s, custodian_fee_rate),
                fee_source = COALESCE(%s, fee_source)
            WHERE stock_id = %s
        """
        rows = [
            (
                profile.management_fee_rate,
                profile.custodian_fee_rate,
                profile.fee_source,
                profile.stock_id,
            )
            for profile in profiles
            if profile.management_fee_rate is not None
            or profile.custodian_fee_rate is not None
        ]
        return self._execute_batches(sql, rows, batch_size)

    def upsert_nav_snapshots(
        self, snapshots: Sequence[ETFNavSnapshot], batch_size: int
    ) -> int:
        sql = """
            INSERT INTO etfnavsnapshots (
                stock_id,
                date,
                nav,
                premium_discount,
                data_source
            ) VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                nav = VALUES(nav),
                premium_discount = VALUES(premium_discount),
                data_source = VALUES(data_source)
        """
        return self._execute_batches(
            sql, [nav_snapshot_to_row(item) for item in snapshots], batch_size
        )

    def upsert_holdings(self, holdings: Sequence[ETFHolding], batch_size: int) -> int:
        sql = """
            INSERT INTO etfholdings (
                stock_id,
                component_symbol,
                component_name,
                snapshot_date,
                weight,
                shares,
                component_close_price,
                component_change_pct,
                contribution_pct,
                component_industry,
                holding_rank,
                data_source,
                source_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                component_name = VALUES(component_name),
                weight = VALUES(weight),
                shares = VALUES(shares),
                component_close_price = VALUES(component_close_price),
                component_change_pct = VALUES(component_change_pct),
                contribution_pct = VALUES(contribution_pct),
                component_industry = VALUES(component_industry),
                holding_rank = VALUES(holding_rank),
                data_source = VALUES(data_source),
                source_url = VALUES(source_url)
        """
        return self._execute_batches(
            sql, [holding_to_row(item) for item in holdings], batch_size
        )

    def _execute_batches(self, sql: str, rows: Sequence[tuple], batch_size: int) -> int:
        total = 0
        with self.connection.cursor() as cursor:
            for batch in batched(rows, batch_size):
                cursor.executemany(sql, batch)
                self.connection.commit()
                total += len(batch)
        return total


class ETFAdvancedDataSyncService:
    def __init__(
        self,
        finlab_source: FinLabETFDataSource,
        twse_source: TwseOpenApiETFDataSource,
        etfinfo_source: ETFInfoPublicDataSource,
        repository: ETFAdvancedDataRepository,
        merger: ETFProfileMerger,
    ) -> None:
        self.finlab_source = finlab_source
        self.twse_source = twse_source
        self.etfinfo_source = etfinfo_source
        self.repository = repository
        self.merger = merger

    def sync(
        self,
        batch_size: int,
        skip_nav: bool,
        skip_holdings: bool,
        holdings_limit: int | None,
    ) -> dict[str, int]:
        self.repository.ensure_required_tables()
        self.finlab_source.login()

        current_etf_ids = self.repository.load_current_etf_ids()
        finlab_profiles = self.finlab_source.fetch_profiles()
        twse_profiles = self.twse_source.fetch_profiles()
        merged_profiles = [
            profile
            for profile in self.merger.merge(finlab_profiles, twse_profiles)
            if profile.stock_id in current_etf_ids
        ]
        profile_count = self.repository.upsert_profiles(merged_profiles, batch_size)

        nav_count = 0
        if not skip_nav:
            nav_snapshots = self.finlab_source.fetch_nav_snapshots(current_etf_ids)
            nav_count = self.repository.upsert_nav_snapshots(nav_snapshots, batch_size)

        fee_profiles: list[ETFProfile] = []
        holding_rows: list[ETFHolding] = []
        holdings_ids = sorted(current_etf_ids)
        if holdings_limit is not None:
            holdings_ids = holdings_ids[:holdings_limit]

        if not skip_holdings:
            for index, stock_id in enumerate(holdings_ids, start=1):
                fee_profile = self.etfinfo_source.fetch_profile_fees(stock_id)
                if fee_profile:
                    fee_profiles.append(fee_profile)
                holdings = self.etfinfo_source.fetch_holdings(stock_id)
                holding_rows.extend(holdings)
                if index % 25 == 0:
                    print(
                        f"[etfinfo] fetched {index}/{len(holdings_ids)} etfs "
                        f"holdings={len(holding_rows)} fees={len(fee_profiles)}",
                        flush=True,
                    )

        fee_count = self.repository.update_profile_fees(fee_profiles, batch_size)
        holding_count = self.repository.upsert_holdings(holding_rows, batch_size)

        return {
            "current_etfs": len(current_etf_ids),
            "finlab_profiles": len(finlab_profiles),
            "twse_profiles": len(twse_profiles),
            "profiles_upserted": profile_count,
            "nav_snapshots_upserted": nav_count,
            "fee_profiles_upserted": fee_count,
            "holdings_upserted": holding_count,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync ETF profile, index, category, NAV and premium data."
    )
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_FILE))
    parser.add_argument("--batch-size", type=int, default=5000)
    parser.add_argument("--skip-nav", action="store_true")
    parser.add_argument("--skip-holdings", action="store_true")
    parser.add_argument(
        "--holdings-limit",
        type=int,
        default=None,
        help="Limit ETFInfo holding fetches for smoke tests.",
    )
    return parser.parse_args()


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def normalize_text(value: object) -> str | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    return text


def normalize_tracking_index(value: object) -> str | None:
    text = normalize_text(value)
    if text in {None, "不適用"}:
        return None
    return text


def parse_bool(value: object) -> bool | None:
    text = normalize_text(value)
    if text is None or text == "不適用":
        return None
    if text in {"是", "Y", "Yes", "yes", "true", "True"}:
        return True
    if text in {"否", "N", "No", "no", "false", "False"}:
        return False
    return None


def parse_date(value: object) -> date | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date()
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    text = normalize_text(value)
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def parse_minguo_date(value: object) -> date | None:
    text = normalize_text(value)
    if not text:
        return None
    digits = "".join(character for character in text if character.isdigit())
    if len(digits) != 7:
        return parse_date(text)
    year = int(digits[:3]) + 1911
    month = int(digits[3:5])
    day = int(digits[5:7])
    return date(year, month, day)


def to_int(value: object) -> int | None:
    text = normalize_text(value)
    if text is None:
        return None
    number_text = text.replace(",", "")
    try:
        return int(float(number_text))
    except ValueError:
        return None


def to_float(value: object) -> float | None:
    if value is None or pd.isna(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_percent_text(value: object) -> float | None:
    text = normalize_text(value)
    if not text:
        return None
    return to_float(text.replace("%", "").replace("+", "").replace(",", ""))


def find_percent_after_label(text: str, label: str) -> float | None:
    match = re.search(rf"{re.escape(label)}\s*([0-9.]+)%", text)
    if not match:
        return None
    return to_float(match.group(1))


def pick(*values):
    for value in values:
        if value is not None:
            return value
    return None


def profile_to_row(profile: ETFProfile) -> tuple:
    return (
        profile.stock_id,
        profile.fund_short_name,
        profile.fund_name,
        profile.fund_english_name,
        profile.issuer,
        profile.etf_category,
        profile.tracking_index,
        profile.is_custom_index,
        profile.has_foreign_components,
        profile.benchmark_name,
        profile.benchmark_english_name,
        profile.inception_date,
        profile.listing_date,
        profile.fund_manager,
        profile.custodian,
        profile.units_outstanding,
        profile.mops_fund_id,
        profile.detail_url,
        profile.expense_ratio,
        profile.management_fee_rate,
        profile.custodian_fee_rate,
        profile.expense_ratio_period,
        profile.fee_source,
        profile.data_source,
        profile.source_as_of_date,
    )


def nav_snapshot_to_row(snapshot: ETFNavSnapshot) -> tuple:
    return (
        snapshot.stock_id,
        snapshot.snapshot_date,
        snapshot.nav,
        snapshot.premium_discount,
        snapshot.data_source,
    )


def holding_to_row(holding: ETFHolding) -> tuple:
    return (
        holding.stock_id,
        holding.component_symbol,
        holding.component_name,
        holding.snapshot_date,
        holding.weight,
        holding.shares,
        holding.component_close_price,
        holding.component_change_pct,
        holding.contribution_pct,
        holding.component_industry,
        holding.holding_rank,
        holding.data_source,
        holding.source_url,
    )


def batched(rows: Sequence[tuple], batch_size: int) -> Iterator[Sequence[tuple]]:
    for start in range(0, len(rows), batch_size):
        yield rows[start : start + batch_size]


def main() -> int:
    args = parse_args()
    EnvLoader(Path(args.env_file)).load()

    connection = MySQLConnectionFactory(require_env("DATABASE_URL")).connect()
    service = ETFAdvancedDataSyncService(
        finlab_source=FinLabETFDataSource(os.environ.get("FINLAB_API_TOKEN")),
        twse_source=TwseOpenApiETFDataSource(),
        etfinfo_source=ETFInfoPublicDataSource(),
        repository=ETFAdvancedDataRepository(connection),
        merger=ETFProfileMerger(),
    )

    try:
        summary = service.sync(
            batch_size=args.batch_size,
            skip_nav=args.skip_nav,
            skip_holdings=args.skip_holdings,
            holdings_limit=args.holdings_limit,
        )
        print("[etf-advanced] " + json.dumps(summary, ensure_ascii=False), flush=True)
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    sys.exit(main())
