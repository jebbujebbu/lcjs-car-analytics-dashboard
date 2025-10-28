import { Themes, AxisTickStrategies, FormattingFunctions } from "@lightningchart/lcjs";
import { useEffect, useContext, useId } from "react";
import { LCContext } from "../LC";

export default function Histogram({ samples = [], data = [], binCount = 12 }) {
  const id = useId();
  const lc = useContext(LCContext);

  useEffect(() => {
    const container = document.getElementById(id);
    if (!container || !lc) return;

    const hChart = lc
      .ChartXY({ theme: Themes.darkGold, container })
      .setTitle("Price histogram");

    // Simple axes
    const xAxis = hChart.getDefaultAxisX();
    const yAxis = hChart.getDefaultAxisY();
    xAxis.setTitle("Price");
    yAxis.setTitle("Count");
    xAxis.setTickStrategy(AxisTickStrategies.Numeric);

    // Theme based fill/stroke for bars (safe access)
    const theme = hChart.getTheme();
    const barFillStyle = (() => {
      const v = theme.pointSeriesFillStyle;
      return typeof v === "function" ? v(0) : v;
    })();
    const barStroke = theme.dataGridBorderStrokeStyle;

    // Create rectangle series safely (avoid chaining that may not exist)
    let rectSeries = null;
    if (typeof hChart.addRectangleSeries === "function") {
      try {
        rectSeries = hChart.addRectangleSeries();
        if (rectSeries && typeof rectSeries.setName === "function") {
          try { rectSeries.setName("Histogram series"); } catch (e) {}
        }
        const styleSetter =
          rectSeries && (rectSeries.setDefaultStyle || rectSeries.setDefaultFigureStyle || rectSeries.setStyle);
        if (styleSetter) {
          try {
            // Some setters expect a callback
            styleSetter.call(
              rectSeries,
              (figure) => figure.setFillStyle && figure.setFillStyle(barFillStyle).setStrokeStyle && figure.setStrokeStyle(barStroke)
            );
          } catch (e) {
            // ignore styling failures
          }
        }
      } catch (e) {
        console.warn("Histogram: addRectangleSeries failed", e);
        rectSeries = null;
      }
    } else {
      console.warn("Histogram: addRectangleSeries not available on this LCJS build");
    }

    // Helpers
    function summaryStats(values) {
      if (!values || values.length === 0) return { count: 0, mean: 0, median: 0, min: 0, max: 0 };
      const sorted = [...values].sort((a, b) => a - b);
      const count = sorted.length;
      const mean = sorted.reduce((s, v) => s + v, 0) / count;
      const median = count % 2 === 1 ? sorted[(count - 1) / 2] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
      return { count, mean, median, min: sorted[0], max: sorted[count - 1] };
    }

    function computeHistogram(values, bins = binCount, fixedRange = null) {
      if (!values || values.length === 0) return { centers: [], counts: [], min: 0, max: 0, binWidth: 0 };
      const min = fixedRange ? fixedRange.min : Math.min(...values);
      const max = fixedRange ? fixedRange.max : Math.max(...values);
      const range = max - min || 1;
      const binWidth = range / bins;
      const counts = new Array(bins).fill(0);
      values.forEach((v) => {
        const clamped = Math.max(min, Math.min(max, v));
        let idx = Math.floor((clamped - min) / binWidth);
        if (idx >= bins) idx = bins - 1;
        counts[idx]++;
      });
      const centers = Array.from({ length: bins }, (_, i) => min + (i + 0.5) * binWidth);
      return { centers, counts, min, max, binWidth };
    }

    // Keep global range for stable bins (computed from full data prop)
    const globalPriceRange = (data && data.length)
      ? { min: Math.min(...data.map((d) => d.Price)), max: Math.max(...data.map((d) => d.Price)) }
      : null;

    function updateHistogramFromSamples(selectedSamples) {
      if (!hChart || hChart.isDisposed()) return;

      if (!selectedSamples || selectedSamples.length === 0) {
        hChart.setTitle("Price histogram — no selection");
        try { rectSeries && typeof rectSeries.clear === "function" && rectSeries.clear(); } catch (e) {}
        return;
      }

      const prices = selectedSamples.map((s) => Number(s.Price)).filter((v) => Number.isFinite(v));
      const stats = summaryStats(prices);
      const hist = computeHistogram(prices, binCount, globalPriceRange || null);

      hChart.setTitle(
        `Price distribution — ${stats.count} items • mean $${Math.round(stats.mean)} • median $${Math.round(stats.median)}`
      );

      // Build rectangles { x0,x1,y0,y1 }
      const half = hist.binWidth / 2;
      const rects = hist.centers.map((c, i) => ({ x0: c - half, x1: c + half, y0: 0, y1: hist.counts[i] }));

      // Set axis intervals before drawing (prevents thickness calc issues)
      try {
        xAxis.setInterval({ start: hist.min - half, end: hist.max + half });
        yAxis.setInterval({ start: 0, end: Math.max(...hist.counts) * 1.2 || 1 });
      } catch (e) {}

      if (!rectSeries) {
        console.warn("Histogram: rectSeries not available; cannot draw histogram bars");
        return;
      }

      try {
        if (typeof rectSeries.setData === "function") {
          rectSeries.setData(rects);
        } else if (typeof rectSeries.replace === "function") {
          rectSeries.replace(rects);
        } else if (typeof rectSeries.clear === "function" && typeof rectSeries.add === "function") {
          rectSeries.clear();
          rects.forEach((r) => rectSeries.add(r));
        } else {
          console.warn("Histogram: RectangleSeries has no recognized data method", Object.keys(rectSeries));
        }
      } catch (e) {
        console.warn("Histogram: failed to set rectangle data", e);
      }
    }

    // initial render with prop samples
    updateHistogramFromSamples(samples);

    // react to prop changes
    const observer = new MutationObserver(() => {}); // placeholder if needed later
    // cleanup
    return () => {
      try { hChart.dispose(); } catch (e) {}
      try { rectSeries && typeof rectSeries.dispose === "function" && rectSeries.dispose(); } catch (e) {}
      observer.disconnect();
    };
  }, [id, lc]); // samples/data change handled by re-mount; for prop updates caller can remount or we can enhance effect deps later

  return <div id={id} style={{ width: "100%", height: "100%" }} />;
}