"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INDICATORS = ["RSI", "KD", "DMI", "VOL", "MACD"];
const KD_PERIOD = 9;
const DMI_PERIOD = 14;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function formatLargeNumber(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(number) >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(number) >= 1_000) {
    return `${(number / 1_000).toFixed(1)}K`;
  }
  return number.toLocaleString("zh-TW");
}

function buildIndicatorData(data) {
  let previousK = 50;
  let previousD = 50;
  let previousHigh = null;
  let previousLow = null;
  let previousClose = null;
  let emaFast = null;
  let emaSlow = null;
  let macdSignal = null;
  const trWindow = [];
  const plusDmWindow = [];
  const minusDmWindow = [];
  const dxWindow = [];

  return data.map((point, index) => {
    const close = toNumber(point.close ?? point.price);
    const high = toNumber(point.high);
    const low = toNumber(point.low);
    const volume = toNumber(point.volume);
    const nextPoint = {
      ...point,
      rsi14: toNumber(point.rsi14),
      volume,
      volume_ma20: toNumber(point.volume_ma20),
      k: null,
      d: null,
      plus_di: null,
      minus_di: null,
      adx: null,
      macd: toNumber(point.macd),
      macd_signal: toNumber(point.macd_signal),
      macd_histogram: toNumber(point.macd_histogram),
    };

    if (high !== null && low !== null && close !== null) {
      const start = Math.max(0, index - KD_PERIOD + 1);
      const kdWindow = data
        .slice(start, index + 1)
        .map((item) => ({
          high: toNumber(item.high),
          low: toNumber(item.low),
        }))
        .filter((item) => item.high !== null && item.low !== null);

      if (kdWindow.length === KD_PERIOD) {
        const highestHigh = Math.max(...kdWindow.map((item) => item.high));
        const lowestLow = Math.min(...kdWindow.map((item) => item.low));
        const rsv =
          highestHigh === lowestLow
            ? 50
            : ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
        previousK = (previousK * 2 + rsv) / 3;
        previousD = (previousD * 2 + previousK) / 3;
        nextPoint.k = round(previousK);
        nextPoint.d = round(previousD);
      }
    }

    if (
      high !== null &&
      low !== null &&
      previousHigh !== null &&
      previousLow !== null &&
      previousClose !== null
    ) {
      const upMove = high - previousHigh;
      const downMove = previousLow - low;
      const plusDm = upMove > downMove && upMove > 0 ? upMove : 0;
      const minusDm = downMove > upMove && downMove > 0 ? downMove : 0;
      const trueRange = Math.max(
        high - low,
        Math.abs(high - previousClose),
        Math.abs(low - previousClose)
      );

      trWindow.push(trueRange);
      plusDmWindow.push(plusDm);
      minusDmWindow.push(minusDm);
      if (trWindow.length > DMI_PERIOD) {
        trWindow.shift();
        plusDmWindow.shift();
        minusDmWindow.shift();
      }

      if (trWindow.length === DMI_PERIOD) {
        const trSum = trWindow.reduce((sum, value) => sum + value, 0);
        const plusDi =
          trSum === 0
            ? 0
            : (plusDmWindow.reduce((sum, value) => sum + value, 0) / trSum) * 100;
        const minusDi =
          trSum === 0
            ? 0
            : (minusDmWindow.reduce((sum, value) => sum + value, 0) / trSum) * 100;
        const dx =
          plusDi + minusDi === 0
            ? 0
            : (Math.abs(plusDi - minusDi) / (plusDi + minusDi)) * 100;

        dxWindow.push(dx);
        if (dxWindow.length > DMI_PERIOD) dxWindow.shift();

        nextPoint.plus_di = round(plusDi);
        nextPoint.minus_di = round(minusDi);
        nextPoint.adx =
          dxWindow.length === DMI_PERIOD
            ? round(dxWindow.reduce((sum, value) => sum + value, 0) / DMI_PERIOD)
            : null;
      }
    }

    if (close !== null) {
      const fastMultiplier = 2 / (MACD_FAST + 1);
      const slowMultiplier = 2 / (MACD_SLOW + 1);
      const signalMultiplier = 2 / (MACD_SIGNAL + 1);
      emaFast =
        emaFast === null ? close : close * fastMultiplier + emaFast * (1 - fastMultiplier);
      emaSlow =
        emaSlow === null ? close : close * slowMultiplier + emaSlow * (1 - slowMultiplier);
      const fallbackMacd = emaFast - emaSlow;
      macdSignal =
        macdSignal === null
          ? fallbackMacd
          : fallbackMacd * signalMultiplier + macdSignal * (1 - signalMultiplier);

      nextPoint.macd = nextPoint.macd ?? round(fallbackMacd);
      nextPoint.macd_signal = nextPoint.macd_signal ?? round(macdSignal);
      nextPoint.macd_histogram =
        nextPoint.macd_histogram ?? round(fallbackMacd - macdSignal);
    }

    previousHigh = high;
    previousLow = low;
    previousClose = close;
    return nextPoint;
  });
}

function renderIndicatorChart(selectedIndicator, chartData) {
  const commonAxisProps = {
    dataKey: "date",
    stroke: "#94A3B8",
    tick: { fontSize: 10 },
    minTickGap: 34,
    interval: "preserveStartEnd",
    height: 22,
  };

  const tooltipProps = {
    contentStyle: {
      backgroundColor: "rgba(30, 41, 59, 0.94)",
      border: "1px solid #475569",
      borderRadius: "0.375rem",
    },
    labelStyle: { color: "#CBD5E1", fontWeight: "bold" },
    itemStyle: { color: "#CBD5E1" },
    formatter: (value, name) => {
      const number = Number(value);
      if (!Number.isFinite(number)) return ["--", name];
      return name === "Volume" || name === "VOL MA20"
        ? [formatLargeNumber(number), name]
        : [number.toFixed(2), name];
    },
  };

  if (selectedIndicator === "VOL") {
    return (
      <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
        <XAxis {...commonAxisProps} />
        <YAxis
          stroke="#94A3B8"
          tick={{ fontSize: 10 }}
          tickFormatter={formatLargeNumber}
          width={70}
        />
        <Tooltip {...tooltipProps} />
        <Legend wrapperStyle={{ color: "#E2E8F0", fontSize: 12 }} />
        <Bar dataKey="volume" name="Volume" fill="#64748b" barSize={5} />
        <Line
          type="monotone"
          dataKey="volume_ma20"
          name="VOL MA20"
          stroke="#f59e0b"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    );
  }

  if (selectedIndicator === "MACD") {
    return (
      <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
        <XAxis {...commonAxisProps} />
        <YAxis stroke="#94A3B8" tick={{ fontSize: 10 }} width={62} />
        <Tooltip {...tooltipProps} />
        <Legend wrapperStyle={{ color: "#E2E8F0", fontSize: 12 }} />
        <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
        <Bar dataKey="macd_histogram" name="Histogram" fill="#64748b" barSize={5} />
        <Line type="monotone" dataKey="macd" name="MACD" stroke="#38bdf8" dot={false} />
        <Line
          type="monotone"
          dataKey="macd_signal"
          name="Signal"
          stroke="#f59e0b"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    );
  }

  const chartConfig = {
    RSI: {
      domain: [0, 100],
      lines: [["rsi14", "RSI 14", "#38bdf8"]],
      guides: [30, 70],
    },
    KD: {
      domain: [0, 100],
      lines: [
        ["k", "K", "#38bdf8"],
        ["d", "D", "#f59e0b"],
      ],
      guides: [20, 80],
    },
    DMI: {
      domain: [0, "auto"],
      lines: [
        ["plus_di", "+DI", "#22c55e"],
        ["minus_di", "-DI", "#ef4444"],
        ["adx", "ADX", "#a78bfa"],
      ],
      guides: [],
    },
  }[selectedIndicator];

  return (
    <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 4, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
      <XAxis {...commonAxisProps} />
      <YAxis
        stroke="#94A3B8"
        tick={{ fontSize: 10 }}
        width={62}
        domain={chartConfig.domain}
      />
      <Tooltip {...tooltipProps} />
      <Legend wrapperStyle={{ color: "#E2E8F0", fontSize: 12 }} />
      {chartConfig.guides.map((value) => (
        <ReferenceLine key={value} y={value} stroke="#64748b" strokeDasharray="3 3" />
      ))}
      {chartConfig.lines.map(([dataKey, name, stroke]) => (
        <Line
          key={dataKey}
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={stroke}
          strokeWidth={1.7}
          dot={false}
          connectNulls
        />
      ))}
    </ComposedChart>
  );
}

export default function TechnicalIndicatorChart({ data = [], fullData = data }) {
  const [selectedIndicator, setSelectedIndicator] = useState("RSI");
  const chartData = useMemo(() => {
    const visibleTimes = new Set(data.map((point) => point.time));
    return buildIndicatorData(fullData).filter((point) =>
      visibleTimes.has(point.time)
    );
  }, [data, fullData]);

  return (
    <Card className="bg-slate-800 border-slate-700 text-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl font-semibold text-slate-100">
            Technical Indicators
          </CardTitle>
          <div className="flex flex-wrap gap-1 rounded-md border border-slate-600 bg-slate-900/40 p-1">
            {INDICATORS.map((indicator) => (
              <Button
                key={indicator}
                type="button"
                variant={selectedIndicator === indicator ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedIndicator(indicator)}
                className={
                  selectedIndicator === indicator
                    ? "h-8 bg-blue-600 px-3 text-white hover:bg-blue-700"
                    : "h-8 px-3 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                }
              >
                {indicator}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[260px] p-2 md:h-[320px] md:p-4">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No indicator data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderIndicatorChart(selectedIndicator, chartData)}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
