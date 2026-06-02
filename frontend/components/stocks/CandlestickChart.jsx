"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  TechnicalChartDataBuilder,
  toChartNumber,
} from "@/lib/domain/stocks/TechnicalChartDataBuilder";

const INDICATORS = ["RSI", "KD", "MACD", "VOL"];

const COLORS = {
  background: "#0f172a",
  grid: "rgba(71, 85, 105, 0.34)",
  axis: "#334155",
  text: "#cbd5e1",
  muted: "#94a3b8",
  up: "#22c55e",
  down: "#ef4444",
  price: "#60a5fa",
  ma5: "#f59e0b",
  ma20: "#38bdf8",
  ma60: "#a78bfa",
  rsi: "#38bdf8",
  macd: "#38bdf8",
  signal: "#f59e0b",
  k: "#38bdf8",
  d: "#f59e0b",
};

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

function formatNumber(value, digits = 2) {
  const number = toChartNumber(value);
  if (number === null) return "--";
  return number.toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatLargeNumber(value) {
  const number = toChartNumber(value);
  if (number === null) return "--";
  if (Math.abs(number) >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
  return number.toLocaleString("zh-TW");
}

function barColor(point) {
  if (!point) return COLORS.muted;
  if (point.open !== null && point.close !== null) {
    return point.close >= point.open ? COLORS.up : COLORS.down;
  }
  if (point.previousClose !== null && point.close !== null) {
    return point.close >= point.previousClose ? COLORS.up : COLORS.down;
  }
  return COLORS.muted;
}

function lineData(data, key) {
  return data
    .filter((point) => point[key] !== null && point[key] !== undefined)
    .map((point) => ({ time: point.time, value: point[key] }));
}

function addGuideLines(series, values, LineStyle) {
  values.forEach((price) => {
    series.createPriceLine({
      price,
      color: "rgba(148, 163, 184, 0.45)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });
  });
}

function InfoLine({ title, items }) {
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded border border-slate-800/80 bg-slate-950/75 px-2 py-1 text-[11px] font-medium leading-none text-slate-300">
      <span className="text-slate-100">{title}</span>
      {items.map((item) => (
        <span key={item.label} style={{ color: item.color || COLORS.text }}>
          {item.label}: {item.value}
        </span>
      ))}
    </div>
  );
}

function indicatorValue(point, indicator) {
  if (!point) return null;
  if (indicator === "RSI") return point.rsi14;
  if (indicator === "KD") return point.k;
  if (indicator === "MACD") return point.macd;
  if (indicator === "VOL") return point.volume;
  return null;
}

export default function CandlestickChart({
  data = [],
  fullData = data,
  chartType = "candlestick",
  overlayType = "movingAverage",
  isEtf = false,
}) {
  const priceContainerRef = useRef(null);
  const indicatorContainerRef = useRef(null);
  const [selectedIndicator, setSelectedIndicator] = useState("RSI");
  const [hovered, setHovered] = useState(null);
  const [renderError, setRenderError] = useState(null);

  const chartData = useMemo(
    () =>
      TechnicalChartDataBuilder.build({
        visibleData: data,
        fullData,
        isEtf,
      }),
    [data, fullData, isEtf]
  );

  const dataByTime = useMemo(() => {
    const map = new Map();
    chartData.forEach((point) => map.set(formatTimeKey(point.time), point));
    return map;
  }, [chartData]);

  useEffect(() => {
    if (
      !priceContainerRef.current ||
      !indicatorContainerRef.current ||
      chartData.length === 0
    ) {
      setHovered(null);
      return;
    }

    let disposed = false;
    let priceChart = null;
    let indicatorChart = null;
    let priceResizeObserver = null;
    let indicatorResizeObserver = null;
    let isSyncingRange = false;

    async function renderCharts() {
      try {
        const {
          CandlestickSeries,
          ColorType,
          CrosshairMode,
          HistogramSeries,
          LineSeries,
          LineStyle,
          createChart,
        } = await import("lightweight-charts");

        if (disposed || !priceContainerRef.current || !indicatorContainerRef.current) {
          return;
        }

        const commonOptions = {
          autoSize: false,
          layout: {
            background: { type: ColorType.Solid, color: COLORS.background },
            textColor: COLORS.text,
            fontSize: 12,
          },
          grid: {
            vertLines: { color: COLORS.grid },
            horzLines: { color: COLORS.grid },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              color: "rgba(226, 232, 240, 0.55)",
              width: 1,
              style: LineStyle.Dashed,
              labelBackgroundColor: "#1e293b",
            },
            horzLine: {
              color: "rgba(226, 232, 240, 0.35)",
              width: 1,
              style: LineStyle.Dashed,
              labelBackgroundColor: "#1e293b",
            },
          },
          rightPriceScale: {
            borderColor: COLORS.axis,
            scaleMargins: { top: 0.12, bottom: 0.14 },
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
        };

        const priceRect = priceContainerRef.current.getBoundingClientRect();
        const indicatorRect = indicatorContainerRef.current.getBoundingClientRect();

        priceChart = createChart(priceContainerRef.current, {
          ...commonOptions,
          width: Math.max(320, priceRect.width),
          height: Math.max(300, priceRect.height),
          timeScale: {
            borderColor: COLORS.axis,
            timeVisible: false,
            secondsVisible: false,
            barSpacing: 4.6,
            minBarSpacing: 2.4,
            rightOffset: 0,
            fixLeftEdge: true,
            fixRightEdge: true,
            lockVisibleTimeRangeOnResize: true,
          },
        });

        indicatorChart = createChart(indicatorContainerRef.current, {
          ...commonOptions,
          width: Math.max(320, indicatorRect.width),
          height: Math.max(180, indicatorRect.height),
          timeScale: {
            borderColor: COLORS.axis,
            timeVisible: false,
            secondsVisible: false,
            barSpacing: 4.6,
            minBarSpacing: 2.4,
            rightOffset: 0,
            fixLeftEdge: true,
            fixRightEdge: true,
            lockVisibleTimeRangeOnResize: true,
          },
        });

        const candleSeriesData = chartData
          .filter(
            (point) =>
              point.open !== null &&
              point.high !== null &&
              point.low !== null &&
              point.close !== null
          )
          .map((point) => ({
            time: point.time,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
          }));

        let primaryPriceSeries = null;
        if (chartType === "line" || candleSeriesData.length === 0) {
          primaryPriceSeries = priceChart.addSeries(LineSeries, {
            color: COLORS.price,
            lineWidth: 2,
            priceLineVisible: true,
            lastValueVisible: true,
            title: isEtf ? "Price Index" : "Price",
          });
          primaryPriceSeries.setData(lineData(chartData, "chartPrice"));
        } else {
          primaryPriceSeries = priceChart.addSeries(CandlestickSeries, {
            upColor: COLORS.up,
            downColor: COLORS.down,
            borderUpColor: COLORS.up,
            borderDownColor: COLORS.down,
            wickUpColor: COLORS.up,
            wickDownColor: COLORS.down,
            priceLineVisible: true,
            lastValueVisible: true,
            title: "OHLC",
          });
          primaryPriceSeries.setData(candleSeriesData);
        }

        const overlayLines =
          overlayType === "bollinger"
            ? [
                ["bollingerUpper", COLORS.ma5, "BOLL Upper"],
                ["bollingerMiddle", COLORS.ma20, "BOLL Mid"],
                ["bollingerLower", COLORS.ma5, "BOLL Lower"],
              ]
            : [
                ["lineMa5", COLORS.ma5, "MA5"],
                ["lineMa20", COLORS.ma20, "MA20"],
                ["lineMa60", COLORS.ma60, "MA60"],
              ];

        overlayLines.forEach(([key, color, title]) => {
          const values = lineData(chartData, key);
          if (values.length === 0) return;
          const series = priceChart.addSeries(LineSeries, {
            color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            title,
          });
          series.setData(values);
        });

        let primaryIndicatorSeries = null;
        if (selectedIndicator === "RSI") {
          primaryIndicatorSeries = indicatorChart.addSeries(LineSeries, {
            color: COLORS.rsi,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            title: "RSI 14",
          });
          primaryIndicatorSeries.setData(lineData(chartData, "rsi14"));
          primaryIndicatorSeries.priceScale().applyOptions({ autoScale: false });
          primaryIndicatorSeries.priceScale().setVisibleRange({ from: 0, to: 100 });
          addGuideLines(primaryIndicatorSeries, [30, 70], LineStyle);
        }

        if (selectedIndicator === "KD") {
          primaryIndicatorSeries = indicatorChart.addSeries(LineSeries, {
            color: COLORS.k,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            title: "K",
          });
          primaryIndicatorSeries.setData(lineData(chartData, "k"));
          primaryIndicatorSeries.priceScale().applyOptions({ autoScale: false });
          primaryIndicatorSeries.priceScale().setVisibleRange({ from: 0, to: 100 });
          addGuideLines(primaryIndicatorSeries, [20, 80], LineStyle);

          const dSeries = indicatorChart.addSeries(LineSeries, {
            color: COLORS.d,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            title: "D",
          });
          dSeries.setData(lineData(chartData, "d"));
        }

        if (selectedIndicator === "MACD") {
          const histogramSeries = indicatorChart.addSeries(HistogramSeries, {
            priceLineVisible: false,
            lastValueVisible: false,
            title: "Histogram",
          });
          histogramSeries.setData(
            chartData
              .filter((point) => point.macd_histogram !== null)
              .map((point) => ({
                time: point.time,
                value: point.macd_histogram,
                color: point.macd_histogram >= 0 ? COLORS.up : COLORS.down,
              }))
          );
          histogramSeries.createPriceLine({
            price: 0,
            color: "rgba(148, 163, 184, 0.55)",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: false,
            title: "",
          });

          primaryIndicatorSeries = indicatorChart.addSeries(LineSeries, {
            color: COLORS.macd,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            title: "MACD",
          });
          primaryIndicatorSeries.setData(lineData(chartData, "macd"));

          const signalSeries = indicatorChart.addSeries(LineSeries, {
            color: COLORS.signal,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            title: "Signal",
          });
          signalSeries.setData(lineData(chartData, "macd_signal"));
        }

        if (selectedIndicator === "VOL") {
          primaryIndicatorSeries = indicatorChart.addSeries(HistogramSeries, {
            priceFormat: { type: "volume" },
            priceLineVisible: false,
            lastValueVisible: false,
            title: "Volume",
          });
          primaryIndicatorSeries.setData(
            chartData
              .filter((point) => point.volume !== null)
              .map((point) => ({
                time: point.time,
                value: point.volume,
                color: barColor(point),
              }))
          );

          const volumeMaSeries = indicatorChart.addSeries(LineSeries, {
            color: COLORS.ma5,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            title: "VOL MA20",
          });
          volumeMaSeries.setData(lineData(chartData, "volume_ma20"));
        }

        function syncRange(sourceChart, targetChart) {
          return (range) => {
            if (!range || isSyncingRange) return;
            isSyncingRange = true;
            targetChart.timeScale().setVisibleLogicalRange(range);
            isSyncingRange = false;
          };
        }

        const syncPriceToIndicator = syncRange(priceChart, indicatorChart);
        const syncIndicatorToPrice = syncRange(indicatorChart, priceChart);
        priceChart.timeScale().subscribeVisibleLogicalRangeChange(syncPriceToIndicator);
        indicatorChart.timeScale().subscribeVisibleLogicalRangeChange(syncIndicatorToPrice);

        function syncCrosshair(sourcePoint, targetChart, targetSeries, price) {
          if (sourcePoint && targetSeries && price !== null && price !== undefined) {
            targetChart.setCrosshairPosition(price, sourcePoint.time, targetSeries);
          } else {
            targetChart.clearCrosshairPosition();
          }
        }

        priceChart.subscribeCrosshairMove((param) => {
          const key = formatTimeKey(param.time);
          const point = dataByTime.get(key) || null;
          setHovered(point || chartData[chartData.length - 1]);
          syncCrosshair(
            point,
            indicatorChart,
            primaryIndicatorSeries,
            indicatorValue(point, selectedIndicator)
          );
        });

        indicatorChart.subscribeCrosshairMove((param) => {
          const key = formatTimeKey(param.time);
          const point = dataByTime.get(key) || null;
          setHovered(point || chartData[chartData.length - 1]);
          syncCrosshair(
            point,
            priceChart,
            primaryPriceSeries,
            chartType === "line" ? point?.chartPrice : point?.close
          );
        });

        priceChart.timeScale().fitContent();
        const range = priceChart.timeScale().getVisibleLogicalRange();
        if (range) indicatorChart.timeScale().setVisibleLogicalRange(range);

        setHovered(chartData[chartData.length - 1]);
        setRenderError(null);

        priceResizeObserver = new ResizeObserver(([entry]) => {
          if (!priceChart || !entry) return;
          priceChart.applyOptions({
            width: Math.max(320, entry.contentRect.width),
            height: Math.max(300, entry.contentRect.height),
          });
        });
        indicatorResizeObserver = new ResizeObserver(([entry]) => {
          if (!indicatorChart || !entry) return;
          indicatorChart.applyOptions({
            width: Math.max(320, entry.contentRect.width),
            height: Math.max(180, entry.contentRect.height),
          });
        });
        priceResizeObserver.observe(priceContainerRef.current);
        indicatorResizeObserver.observe(indicatorContainerRef.current);
      } catch (error) {
        console.error("Failed to render stock chart:", error);
        setRenderError(error.message || "Unable to render chart.");
      }
    }

    renderCharts();

    return () => {
      disposed = true;
      priceResizeObserver?.disconnect();
      indicatorResizeObserver?.disconnect();
      priceChart?.remove();
      indicatorChart?.remove();
    };
  }, [chartData, chartType, dataByTime, isEtf, overlayType, selectedIndicator]);

  const activePoint = hovered || chartData[chartData.length - 1] || null;

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No price data available.
      </div>
    );
  }

  if (renderError) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-red-300">
        Chart render error: {renderError}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-slate-950">
      <div className="relative min-h-0 flex-[7] overflow-hidden border-y border-slate-700 bg-slate-950">
        <div ref={priceContainerRef} className="h-full w-full" />
        {activePoint && (
          <InfoLine
            title={activePoint.date || activePoint.time}
            items={[
              { label: "O", value: formatNumber(activePoint.open) },
              { label: "H", value: formatNumber(activePoint.high) },
              { label: "L", value: formatNumber(activePoint.low) },
              { label: "C", value: formatNumber(activePoint.close), color: barColor(activePoint) },
              { label: "Vol", value: formatLargeNumber(activePoint.volume), color: barColor(activePoint) },
            ]}
          />
        )}
      </div>

      <div className="min-h-0 flex-[3] overflow-hidden border-b border-slate-700 bg-slate-950">
        <div className="flex h-9 items-center justify-between border-b border-slate-800 px-3">
          <div className="flex rounded-md border border-slate-700 bg-slate-900/70 p-1">
            {INDICATORS.map((indicator) => (
              <Button
                key={indicator}
                type="button"
                variant={selectedIndicator === indicator ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedIndicator(indicator)}
                className={
                  selectedIndicator === indicator
                    ? "h-6 bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                    : "h-6 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }
              >
                {indicator}
              </Button>
            ))}
          </div>
        </div>
        <div className="relative h-[calc(100%-2.25rem)]">
          <div ref={indicatorContainerRef} className="h-full w-full" />
          {activePoint && (
            <InfoLine
              title={selectedIndicator}
              items={
                selectedIndicator === "RSI"
                  ? [{ label: "14", value: formatNumber(activePoint.rsi14), color: COLORS.rsi }]
                  : selectedIndicator === "KD"
                    ? [
                        { label: "K", value: formatNumber(activePoint.k), color: COLORS.k },
                        { label: "D", value: formatNumber(activePoint.d), color: COLORS.d },
                      ]
                    : selectedIndicator === "MACD"
                      ? [
                          { label: "MACD", value: formatNumber(activePoint.macd), color: COLORS.macd },
                          { label: "Signal", value: formatNumber(activePoint.macd_signal), color: COLORS.signal },
                          {
                            label: "Hist",
                            value: formatNumber(activePoint.macd_histogram),
                            color:
                              activePoint.macd_histogram !== null &&
                              activePoint.macd_histogram >= 0
                                ? COLORS.up
                                : COLORS.down,
                          },
                        ]
                      : [
                          { label: "Vol", value: formatLargeNumber(activePoint.volume), color: barColor(activePoint) },
                          { label: "MA20", value: formatLargeNumber(activePoint.volume_ma20), color: COLORS.ma5 },
                        ]
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
