"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function formatTimeKey(time) {
  if (!time) return "";
  if (typeof time === "string") return time;
  if (typeof time === "object" && time.year && time.month && time.day) {
    const month = String(time.month).padStart(2, "0");
    const day = String(time.day).padStart(2, "0");
    return `${time.year}-${month}-${day}`;
  }
  return String(time);
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return Number(value).toFixed(2);
}

function formatVolume(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return number.toLocaleString("zh-TW");
}

export default function CandlestickChart({ data = [] }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  const candleData = useMemo(
    () =>
      data
        .filter(
          (point) =>
            point.time &&
            point.open !== null &&
            point.high !== null &&
            point.low !== null &&
            point.close !== null
        )
        .map((point) => ({
          time: point.time,
          open: Number(point.open),
          high: Number(point.high),
          low: Number(point.low),
          close: Number(point.close),
          volume: Number(point.volume || 0),
        })),
    [data]
  );

  const candleByTime = useMemo(() => {
    const map = new Map();
    candleData.forEach((point) => map.set(formatTimeKey(point.time), point));
    return map;
  }, [candleData]);

  useEffect(() => {
    if (!containerRef.current || candleData.length === 0) {
      setHovered(null);
      return;
    }

    let disposed = false;
    let chart = null;
    let resizeObserver = null;

    async function renderChart() {
      const {
        CandlestickSeries,
        ColorType,
        CrosshairMode,
        HistogramSeries,
        createChart,
      } = await import("lightweight-charts");

      if (disposed || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      chart = createChart(container, {
        width: Math.max(320, rect.width),
        height: Math.max(260, rect.height),
        autoSize: false,
        layout: {
          background: { type: ColorType.Solid, color: "#0f172a" },
          textColor: "#cbd5e1",
          fontSize: 12,
        },
        grid: {
          vertLines: { color: "rgba(71, 85, 105, 0.35)" },
          horzLines: { color: "rgba(71, 85, 105, 0.35)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: "#334155",
          scaleMargins: {
            top: 0.08,
            bottom: 0.24,
          },
        },
        timeScale: {
          borderColor: "#334155",
          timeVisible: false,
          secondsVisible: false,
        },
      });

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      candlestickSeries.setData(candleData);

      const volumeData = candleData
        .filter((point) => point.volume > 0)
        .map((point) => ({
          time: point.time,
          value: point.volume,
          color:
            point.close >= point.open
              ? "rgba(34, 197, 94, 0.28)"
              : "rgba(239, 68, 68, 0.28)",
        }));

      if (volumeData.length > 0) {
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.82,
            bottom: 0,
          },
        });
        volumeSeries.setData(volumeData);
      }

      chart.subscribeCrosshairMove((param) => {
        const key = formatTimeKey(param.time);
        setHovered(candleByTime.get(key) || candleData[candleData.length - 1]);
      });

      chart.timeScale().fitContent();
      setHovered(candleData[candleData.length - 1]);

      resizeObserver = new ResizeObserver(([entry]) => {
        if (!chart || !entry) return;
        chart.applyOptions({
          width: Math.max(320, entry.contentRect.width),
          height: Math.max(260, entry.contentRect.height),
        });
      });
      resizeObserver.observe(container);
    }

    renderChart();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.remove();
    };
  }, [candleByTime, candleData]);

  if (candleData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        目前沒有可用的開高低收資料。
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-x-3 gap-y-1 rounded border border-slate-700 bg-slate-900/85 px-3 py-2 text-xs text-slate-300 shadow-lg">
          <span className="text-slate-100">{formatTimeKey(hovered.time)}</span>
          <span>開 {formatNumber(hovered.open)}</span>
          <span>高 {formatNumber(hovered.high)}</span>
          <span>低 {formatNumber(hovered.low)}</span>
          <span>收 {formatNumber(hovered.close)}</span>
          <span>量 {formatVolume(hovered.volume)}</span>
        </div>
      )}
    </div>
  );
}
