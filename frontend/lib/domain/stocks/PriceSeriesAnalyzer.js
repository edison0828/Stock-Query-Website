const RANGE_DAYS = {
  "5D": 5,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
  "5Y": 1825,
};

const RANGES = ["5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];
const MOVING_AVERAGE_WINDOWS = [5, 20, 60];

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function formatDateForSeries(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatDateForChart(date, range) {
  const d = new Date(date);

  if (range === "5D") {
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${month}/${day}`;
  }

  if (range === "MAX" || range === "5Y") {
    return d.toLocaleDateString("zh-TW", {
      year: "2-digit",
      month: "short",
    });
  }

  return d.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
}

function daysBetween(start, end) {
  if (!start || !end) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
  );
}

function round(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Number(Number(value).toFixed(digits));
}

export class PriceSeriesAnalyzer {
  constructor(priceRows, referenceLatestDate = null) {
    this.referenceLatestDate = referenceLatestDate;
    this.rows = [...priceRows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    this.points = this.withMovingAverages();
  }

  withMovingAverages() {
    const closeWindows = {};
    const sums = {};

    MOVING_AVERAGE_WINDOWS.forEach((window) => {
      closeWindows[window] = [];
      sums[window] = 0;
    });

    return this.rows.map((row) => {
      const close = toNumber(row.close_price);
      const point = {
        sourceDate: row.date,
        open: toNumber(row.open_price),
        high: toNumber(row.high_price),
        low: toNumber(row.low_price),
        close,
        volume: toNumber(row.volume),
        price: close || 0,
      };

      MOVING_AVERAGE_WINDOWS.forEach((window) => {
        const queue = closeWindows[window];

        if (close !== null) {
          queue.push(close);
          sums[window] += close;
        }

        if (queue.length > window) {
          sums[window] -= queue.shift();
        }

        point[`ma${window}`] =
          queue.length === window ? round(sums[window] / window) : null;
      });

      return point;
    });
  }

  get latestPoint() {
    return this.points[this.points.length - 1] || null;
  }

  get firstPoint() {
    return this.points[0] || null;
  }

  buildHistoricalData() {
    const latestPoint = this.latestPoint;
    const historicalData = {};

    if (!latestPoint) {
      RANGES.forEach((range) => {
        historicalData[range] = [];
      });
      return historicalData;
    }

    const latestDate = new Date(latestPoint.sourceDate);

    for (const range of RANGES) {
      let filtered = this.points;

      if (RANGE_DAYS[range]) {
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - RANGE_DAYS[range]);
        filtered = this.points.filter(
          (point) => new Date(point.sourceDate) >= startDate
        );
      } else if (range === "YTD") {
        const startOfYear = new Date(latestDate.getFullYear(), 0, 1);
        filtered = this.points.filter(
          (point) => new Date(point.sourceDate) >= startOfYear
        );
      }

      historicalData[range] = filtered.map((point) => ({
        date: formatDateForChart(point.sourceDate, range),
        time: formatDateForSeries(point.sourceDate),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
        price: point.price,
        ma5: point.ma5,
        ma20: point.ma20,
        ma60: point.ma60,
      }));
    }

    return historicalData;
  }

  buildQualitySummary() {
    const rowCount = this.rows.length;

    if (rowCount === 0) {
      return {
        status: "critical",
        row_count: 0,
        first_date: null,
        latest_date: null,
        reference_latest_date: this.referenceLatestDate
          ? formatDateForSeries(this.referenceLatestDate)
          : null,
        span_days: 0,
        density: null,
        issues: ["缺少歷史價格資料"],
      };
    }

    const firstDate = this.firstPoint.sourceDate;
    const latestDate = this.latestPoint.sourceDate;
    const spanDays = daysBetween(firstDate, latestDate);
    const latestLagDays = this.referenceLatestDate
      ? daysBetween(latestDate, this.referenceLatestDate)
      : 0;
    const density = spanDays > 0 ? rowCount / spanDays : 1;
    const issues = [];

    if (latestLagDays > 5 && latestLagDays <= 365) {
      issues.push(`最新價格落後全資料最新日 ${latestLagDays} 天`);
    }

    if (rowCount <= 30 && spanDays >= 365) {
      issues.push("歷史跨度很長但價格筆數偏少");
    }

    if (spanDays >= 365 && latestLagDays <= 30 && density < 0.2) {
      issues.push("近期仍有資料，但長期價格序列密度偏低");
    }

    return {
      status: issues.length > 0 ? "warning" : "ok",
      row_count: rowCount,
      first_date: formatDateForSeries(firstDate),
      latest_date: formatDateForSeries(latestDate),
      reference_latest_date: this.referenceLatestDate
        ? formatDateForSeries(this.referenceLatestDate)
        : null,
      span_days: spanDays,
      density: round(density, 4),
      latest_lag_days: latestLagDays,
      issues,
    };
  }

  buildTechnicalSummary() {
    const latestPoint = this.latestPoint;

    if (!latestPoint) {
      return {
        ma5: null,
        ma20: null,
        ma60: null,
      };
    }

    return {
      ma5: latestPoint.ma5,
      ma20: latestPoint.ma20,
      ma60: latestPoint.ma60,
    };
  }
}
