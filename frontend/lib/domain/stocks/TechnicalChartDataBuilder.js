const MOVING_AVERAGE_WINDOWS = [5, 20, 60];
const KD_PERIOD = 9;
const RSI_PERIOD = 14;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;

export function toChartNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(digits));
}

function average(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export class TechnicalChartDataBuilder {
  constructor({ visibleData = [], fullData = visibleData, isEtf = false } = {}) {
    this.visibleData = Array.isArray(visibleData) ? visibleData : [];
    this.fullData = Array.isArray(fullData) ? fullData : [];
    this.isEtf = isEtf;
    this.windows = new Map(
      MOVING_AVERAGE_WINDOWS.map((windowSize) => [windowSize, []])
    );
    this.kdWindow = [];
    this.rsiGains = [];
    this.rsiLosses = [];
    this.previousClose = null;
    this.previousK = 50;
    this.previousD = 50;
    this.avgGain = null;
    this.avgLoss = null;
    this.emaFast = null;
    this.emaSlow = null;
    this.macdSignal = null;
    this.computedByTime = new Map();
  }

  static build(options) {
    return new TechnicalChartDataBuilder(options).build();
  }

  build() {
    const visibleTimes = new Set(this.visibleData.map((point) => point.time));

    this.fullData.forEach((point) => this.addPoint(point));

    return this.fullData
      .filter((point) => visibleTimes.has(point.time))
      .map((point) => this.computedByTime.get(point.time))
      .filter(Boolean);
  }

  addPoint(point) {
    if (!point.time) return;

    const open = toChartNumber(point.open);
    const high = toChartNumber(point.high);
    const low = toChartNumber(point.low);
    const close = toChartNumber(point.close ?? point.price);
    const volume = toChartNumber(point.volume);
    const chartPrice = this.resolveChartPrice(point, close);
    const overlaySource = chartPrice ?? close;

    this.updateMovingAverageWindows(overlaySource);

    const ma5 = this.getMovingAverage(5);
    const ma20 = this.getMovingAverage(20);
    const ma60 = this.getMovingAverage(60);
    const stdDev = this.getBollingerStdDev(ma20);

    const nextPoint = {
      ...point,
      open,
      high,
      low,
      close,
      volume,
      chartPrice,
      previousClose: this.previousClose,
      lineMa5: toChartNumber(point.ma5) ?? ma5,
      lineMa20: toChartNumber(point.ma20) ?? ma20,
      lineMa60: toChartNumber(point.ma60) ?? ma60,
      bollingerUpper:
        toChartNumber(point.bollinger_upper) ??
        (ma20 !== null && stdDev !== null ? ma20 + stdDev * 2 : null),
      bollingerMiddle: toChartNumber(point.bollinger_middle) ?? ma20,
      bollingerLower:
        toChartNumber(point.bollinger_lower) ??
        (ma20 !== null && stdDev !== null ? ma20 - stdDev * 2 : null),
      rsi14: toChartNumber(point.rsi14),
      macd: toChartNumber(point.macd),
      macd_signal: toChartNumber(point.macd_signal),
      macd_histogram: toChartNumber(point.macd_histogram),
      volume_ma20: toChartNumber(point.volume_ma20),
      k: null,
      d: null,
    };

    this.applyRsi(nextPoint, close);
    this.applyKd(nextPoint, { high, low, close });
    this.applyMacd(nextPoint, close);

    this.computedByTime.set(point.time, nextPoint);
    this.previousClose = close ?? this.previousClose;
  }

  resolveChartPrice(point, close) {
    return toChartNumber(
      this.isEtf
        ? point.price_index ?? point.price ?? point.close
        : point.price ?? point.close ?? close
    );
  }

  updateMovingAverageWindows(value) {
    if (value === null) return;

    for (const [windowSize, values] of this.windows.entries()) {
      values.push(value);
      if (values.length > windowSize) values.shift();
    }
  }

  getMovingAverage(windowSize) {
    const values = this.windows.get(windowSize) || [];
    return values.length === windowSize ? average(values) : null;
  }

  getBollingerStdDev(ma20) {
    const values = this.windows.get(20) || [];
    if (values.length !== 20 || ma20 === null) return null;
    return Math.sqrt(average(values.map((value) => (value - ma20) ** 2)));
  }

  applyRsi(point, close) {
    if (this.previousClose === null || close === null) return;

    const change = close - this.previousClose;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    this.rsiGains.push(gain);
    this.rsiLosses.push(loss);
    if (this.rsiGains.length > RSI_PERIOD) this.rsiGains.shift();
    if (this.rsiLosses.length > RSI_PERIOD) this.rsiLosses.shift();

    if (
      this.rsiGains.length !== RSI_PERIOD ||
      this.rsiLosses.length !== RSI_PERIOD
    ) {
      return;
    }

    if (this.avgGain === null || this.avgLoss === null) {
      this.avgGain = average(this.rsiGains);
      this.avgLoss = average(this.rsiLosses);
    } else {
      this.avgGain = (this.avgGain * (RSI_PERIOD - 1) + gain) / RSI_PERIOD;
      this.avgLoss = (this.avgLoss * (RSI_PERIOD - 1) + loss) / RSI_PERIOD;
    }

    point.rsi14 =
      point.rsi14 ??
      (this.avgLoss === 0
        ? 100
        : round(100 - 100 / (1 + this.avgGain / this.avgLoss)));
  }

  applyKd(point, { high, low, close }) {
    if (high === null || low === null || close === null) {
      this.kdWindow.length = 0;
      return;
    }

    this.kdWindow.push({ high, low, close });
    if (this.kdWindow.length > KD_PERIOD) this.kdWindow.shift();
    if (this.kdWindow.length !== KD_PERIOD) return;

    const highestHigh = Math.max(...this.kdWindow.map((item) => item.high));
    const lowestLow = Math.min(...this.kdWindow.map((item) => item.low));
    const rsv =
      highestHigh === lowestLow
        ? 50
        : ((close - lowestLow) / (highestHigh - lowestLow)) * 100;

    this.previousK = (this.previousK * 2 + rsv) / 3;
    this.previousD = (this.previousD * 2 + this.previousK) / 3;
    point.k = round(this.previousK);
    point.d = round(this.previousD);
  }

  applyMacd(point, close) {
    if (close === null) return;

    const fastMultiplier = 2 / (MACD_FAST + 1);
    const slowMultiplier = 2 / (MACD_SLOW + 1);
    const signalMultiplier = 2 / (MACD_SIGNAL + 1);
    this.emaFast =
      this.emaFast === null
        ? close
        : close * fastMultiplier + this.emaFast * (1 - fastMultiplier);
    this.emaSlow =
      this.emaSlow === null
        ? close
        : close * slowMultiplier + this.emaSlow * (1 - slowMultiplier);

    const fallbackMacd = this.emaFast - this.emaSlow;
    this.macdSignal =
      this.macdSignal === null
        ? fallbackMacd
        : fallbackMacd * signalMultiplier + this.macdSignal * (1 - signalMultiplier);

    point.macd = point.macd ?? round(fallbackMacd);
    point.macd_signal = point.macd_signal ?? round(this.macdSignal);
    point.macd_histogram =
      point.macd_histogram ?? round(fallbackMacd - this.macdSignal);
  }
}
