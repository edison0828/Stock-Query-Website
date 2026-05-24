const RANGE_DAYS = {
  "5D": 5,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
  "5Y": 1825,
};

const RANGES = ["5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];
const MOVING_AVERAGE_WINDOWS = [5, 20, 60];
const RSI_PERIOD = 14;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;
const VOLUME_MA_WINDOW = 20;
const YEAR_TRADING_DAYS = 252;
const RETURN_PERIODS = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  YTD: null,
  "1Y": 365,
};

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

function percentChange(start, end) {
  if (
    start === null ||
    start === undefined ||
    end === null ||
    end === undefined ||
    Number(start) === 0
  ) {
    return null;
  }

  return round(((Number(end) - Number(start)) / Number(start)) * 100);
}

function trendDirection(value, positiveLabel = "偏多", negativeLabel = "偏空") {
  if (value === null || value === undefined) {
    return "資料不足";
  }

  if (Number(value) > 0) {
    return positiveLabel;
  }

  if (Number(value) < 0) {
    return negativeLabel;
  }

  return "中性";
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
    const volumeWindow = [];
    let volumeSum = 0;
    let avgGain = null;
    let avgLoss = null;
    let gainSeed = 0;
    let lossSeed = 0;
    let previousClose = null;
    let emaFast = null;
    let emaSlow = null;
    let macdSignal = null;
    let closeCount = 0;
    const fastMultiplier = 2 / (MACD_FAST + 1);
    const slowMultiplier = 2 / (MACD_SLOW + 1);
    const signalMultiplier = 2 / (MACD_SIGNAL + 1);

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

      if (point.volume !== null) {
        volumeWindow.push(point.volume);
        volumeSum += point.volume;
      }

      if (volumeWindow.length > VOLUME_MA_WINDOW) {
        volumeSum -= volumeWindow.shift();
      }

      point.volume_ma20 =
        volumeWindow.length === VOLUME_MA_WINDOW
          ? round(volumeSum / VOLUME_MA_WINDOW, 0)
          : null;

      if (close !== null) {
        closeCount += 1;

        if (previousClose !== null) {
          const change = close - previousClose;
          const gain = Math.max(change, 0);
          const loss = Math.max(-change, 0);

          if (avgGain === null || avgLoss === null) {
            gainSeed += gain;
            lossSeed += loss;

            if (closeCount > RSI_PERIOD) {
              avgGain = gainSeed / RSI_PERIOD;
              avgLoss = lossSeed / RSI_PERIOD;
            }
          } else {
            avgGain = (avgGain * (RSI_PERIOD - 1) + gain) / RSI_PERIOD;
            avgLoss = (avgLoss * (RSI_PERIOD - 1) + loss) / RSI_PERIOD;
          }

          if (avgGain !== null && avgLoss !== null) {
            if (avgLoss === 0) {
              point.rsi14 = 100;
            } else {
              const rs = avgGain / avgLoss;
              point.rsi14 = round(100 - 100 / (1 + rs));
            }
          } else {
            point.rsi14 = null;
          }
        } else {
          point.rsi14 = null;
        }

        emaFast =
          emaFast === null
            ? close
            : close * fastMultiplier + emaFast * (1 - fastMultiplier);
        emaSlow =
          emaSlow === null
            ? close
            : close * slowMultiplier + emaSlow * (1 - slowMultiplier);
        point.macd = round(emaFast - emaSlow);
        macdSignal =
          macdSignal === null
            ? point.macd
            : point.macd * signalMultiplier + macdSignal * (1 - signalMultiplier);
        point.macd_signal = round(macdSignal);
        point.macd_histogram = round(point.macd - point.macd_signal);
        previousClose = close;
      } else {
        point.rsi14 = null;
        point.macd = null;
        point.macd_signal = null;
        point.macd_histogram = null;
      }

      point.bias_ma20 =
        close !== null && point.ma20
          ? round(((close - point.ma20) / point.ma20) * 100)
          : null;
      point.bias_ma60 =
        close !== null && point.ma60
          ? round(((close - point.ma60) / point.ma60) * 100)
          : null;

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
        rsi14: point.rsi14,
        macd: point.macd,
        macd_signal: point.macd_signal,
        macd_histogram: point.macd_histogram,
        volume_ma20: point.volume_ma20,
        bias_ma20: point.bias_ma20,
        bias_ma60: point.bias_ma60,
        price_index: null,
      }));

      const firstClose = filtered.find((point) => point.close !== null)?.close;
      if (firstClose) {
        historicalData[range] = historicalData[range].map((point) => ({
          ...point,
          price_index:
            point.close === null ? null : round((point.close / firstClose) * 100),
        }));
      }
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
        rsi14: null,
        macd: null,
        macd_signal: null,
        macd_histogram: null,
        macd_status: "資料不足",
        ma_trend: "資料不足",
        volume_ma20: null,
        bias_ma20: null,
        bias_ma60: null,
        week52_high: null,
        week52_low: null,
        distance_to_52w_high: null,
        distance_to_52w_low: null,
      };
    }

    const maTrend =
      latestPoint.ma5 && latestPoint.ma20 && latestPoint.ma60
        ? latestPoint.ma5 > latestPoint.ma20 && latestPoint.ma20 > latestPoint.ma60
          ? "多頭排列"
          : latestPoint.ma5 < latestPoint.ma20 && latestPoint.ma20 < latestPoint.ma60
            ? "空頭排列"
            : "整理"
        : "資料不足";
    const recentPoints = this.points.slice(-YEAR_TRADING_DAYS);
    const recentCloses = recentPoints
      .map((point) => point.close)
      .filter((close) => close !== null);
    const week52High = recentCloses.length ? Math.max(...recentCloses) : null;
    const week52Low = recentCloses.length ? Math.min(...recentCloses) : null;

    return {
      ma5: latestPoint.ma5,
      ma20: latestPoint.ma20,
      ma60: latestPoint.ma60,
      rsi14: latestPoint.rsi14,
      macd: latestPoint.macd,
      macd_signal: latestPoint.macd_signal,
      macd_histogram: latestPoint.macd_histogram,
      macd_status: trendDirection(latestPoint.macd_histogram),
      ma_trend: maTrend,
      volume_ma20: latestPoint.volume_ma20,
      bias_ma20: latestPoint.bias_ma20,
      bias_ma60: latestPoint.bias_ma60,
      week52_high: round(week52High),
      week52_low: round(week52Low),
      distance_to_52w_high:
        week52High && latestPoint.close
          ? round(((latestPoint.close - week52High) / week52High) * 100)
          : null,
      distance_to_52w_low:
        week52Low && latestPoint.close
          ? round(((latestPoint.close - week52Low) / week52Low) * 100)
          : null,
    };
  }

  findPointOnOrAfter(targetDate) {
    return this.points.find(
      (point) => point.close !== null && new Date(point.sourceDate) >= targetDate
    );
  }

  buildReturnSummary() {
    const latestPoint = this.latestPoint;

    if (!latestPoint?.close) {
      return {};
    }

    const latestDate = new Date(latestPoint.sourceDate);
    const result = {};

    for (const [label, days] of Object.entries(RETURN_PERIODS)) {
      let startDate;

      if (label === "YTD") {
        startDate = new Date(latestDate.getFullYear(), 0, 1);
      } else {
        startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - days);
      }

      const startPoint = this.findPointOnOrAfter(startDate);
      result[label] = startPoint
        ? percentChange(startPoint.close, latestPoint.close)
        : null;
    }

    return result;
  }

  buildMaximumDrawdown() {
    let peak = null;
    let maxDrawdown = 0;

    for (const point of this.points) {
      if (point.close === null) {
        continue;
      }

      if (peak === null || point.close > peak) {
        peak = point.close;
      }

      const drawdown = peak ? ((point.close - peak) / peak) * 100 : 0;
      maxDrawdown = Math.min(maxDrawdown, drawdown);
    }

    return round(maxDrawdown);
  }

  buildPerformanceSummary() {
    return {
      returns: this.buildReturnSummary(),
      max_drawdown: this.buildMaximumDrawdown(),
    };
  }
}
