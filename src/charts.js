import { Themes, LUT, regularColorSteps, BarChartTypes, AxisTickStrategies, FormattingFunctions } from "@lightningchart/lcjs";
import { useEffect, useContext, useId } from "react";
import { LCContext } from "./LC";

// Charts:
// Bar chart: “Which manufacturer and fuel type are the selected cars?”
// Histogram: “How expensive are the selected cars?”
// Scatter: “Is there a correlation between horsepower and price?”


// TODO: fetch in here OR in App.js and pass data as prop?
// TODO: histogram doesn't show data
// TODO: weight
// TODO: Use the same colorKey across charts (Fuel or Manufacturer) for visual linking and add a toggle to switch.
// TODO: Keep bin boundaries stable (use globalPriceRange) so user comparisons across selections are valid.
// TODO: Link charts with brushing/selection: selecting points on scatter highlights lines in parallel coords and updates histogram.
// TODO: For skewed prices, consider log scale or show both linear + log toggle.
// TODO: Show sample size on every chart; for small selections (<5) prefer list/detail view over distributions.
// TODO: IE version (no LCContext, data fetching in Charts)


export default function Charts() {
  console.log("Charts component rendered");
  const idParallel = useId();
  const idBar = useId();
  const idHistogram = useId();
  const lc = useContext(LCContext);

  useEffect(() => {
    const pContainer = document.getElementById(idParallel);
    const bContainer = document.getElementById(idBar);
    const hContainer = document.getElementById(idHistogram);

    if (!pContainer || !bContainer || !hContainer || !lc) return;

    // Parallel Coordinate Chart
    const pChart = lc
      .ParallelCoordinateChart({ theme: Themes.darkGold, container: pContainer })
      .setTitle("Parallel Coordinates with Filters");

    // Bar Chart
    const bChart = lc.BarChart({
      theme: Themes.darkGold,
      container: bContainer,
      legend: { addEntriesAutomatically: false },
      type: BarChartTypes.Horizontal,
    });
    bChart.setTitle("By Manufacturer (split by Fuel type)").setValueLabels(undefined)

    // Histogram Chart
    const hChart = lc
      .ChartXY({ theme: Themes.darkGold, container: hContainer })
      .setTitle("Price histogram")
      .setCursorMode('show-pointed')
      .setUserInteractions({
        rectangleZoom: {
            y: false,
        },
        zoom: {
            y: false,
        },
      })

    // Configure axes 
    let bins = [];
    hChart.axisX.setTitle('Price')
    hChart.axisY.setTitle('Count')
    hChart.axisX.setTickStrategy(AxisTickStrategies.Numeric, (strategy) =>
        strategy.setCursorFormatter((x) => {
            const bin = bins.find((bin) => x >= bin.binStart && x <= bin.binEnd)
            if (!bin) return ''
            return `[${FormattingFunctions.Numeric(bin.binStart, hChart.axisX.getInterval())}, ${FormattingFunctions.Numeric(
                bin.binEnd,
                hChart.axisX.getInterval(),
            )}]`
        }),
    )
    const barFillStyle = (() => {
        const v = hChart.getTheme().pointSeriesFillStyle
        return typeof v === 'function' ? v(0) : v
    })()
    const barStroke = hChart.getTheme().dataGridBorderStrokeStyle

    // ...

    const rectSeries = hChart
        .addRectangleSeries({})
        .setName('Histogram series')
        .setDefaultStyle((figure) => figure.setFillStyle(barFillStyle).setStrokeStyle(barStroke))
    
    // Summary & histogram computation
    function summaryStats(values) {
      if (!values || values.length === 0) return { count: 0, mean: 0, median: 0, min: 0, max: 0 };
      const sorted = [...values].sort((a, b) => a - b);
      const count = sorted.length;
      const mean = sorted.reduce((s, v) => s + v, 0) / count;
      const median = count % 2 === 1 ? sorted[(count - 1) / 2] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
      const min = sorted[0];
      const max = sorted[count - 1];
      return { count, mean, median, min, max };
    }

    function computeHistogram(values, binCount = 12, fixedRange = null) {
      if (!values || values.length === 0) {
        return { centers: [], counts: [], labels: [], min: 0, max: 0, binWidth: 0 };
      }
      const min = fixedRange ? fixedRange.min : Math.min(...values);
      const max = fixedRange ? fixedRange.max : Math.max(...values);
      const range = max - min || 1;
      const binWidth = range / binCount;
      const counts = new Array(binCount).fill(0);

      values.forEach((v) => {
        const clamped = Math.max(min, Math.min(max, v));
        let idx = Math.floor((clamped - min) / binWidth);
        if (idx >= binCount) idx = binCount - 1;
        counts[idx]++;
      });

      const centers = Array.from({ length: binCount }, (_, i) => min + (i + 0.5) * binWidth);
      const labels = centers.map((c, i) => {
        const start = Math.round(min + i * binWidth);
        const end = Math.round(min + (i + 1) * binWidth);
        return `$${start}–${end}`;
      });

      return { centers, counts, labels, min, max, binWidth };
    }

    let globalPriceRange = null;

    function updateHistogramFromSamples(samples, binCount = 12) {
      if (!hChart || hChart.isDisposed()) return;

      if (!samples || samples.length === 0) {
        hChart.setTitle("Price histogram — no selection");
        if (rectSeries && typeof rectSeries.clear === "function") rectSeries.clear();
        return;
      }

      const prices = samples.map((s) => s.Price).filter((v) => typeof v === "number" && !Number.isNaN(v));
      const stats = summaryStats(prices);
      const histogram = computeHistogram(prices, binCount, globalPriceRange || null);

      hChart.setTitle(
        `Price distribution — ${stats.count} items • mean $${Math.round(stats.mean)} • median $${Math.round(stats.median)}`
      );

      // Build rectangle points: { x0, x1, y0, y1 } for each bin
      const half = histogram.binWidth / 2;
      const rects = histogram.centers.map((center, i) => ({
        x0: center - half,
        x1: center + half,
        y0: 0,
        y1: histogram.counts[i],
      }));
 
      hChart.axisX.setInterval({ start: histogram.min - half, end: histogram.max + half });
      hChart.axisY.setInterval({ start: 0, end: Math.max(...histogram.counts) * 1.2 });

      // Set rectangle data
      try {
        if (typeof rectSeries.setData === "function") {
          rectSeries.setData(rects);
        } else if (typeof rectSeries.replace === "function") {
          rectSeries.replace(rects);
        } else if (typeof rectSeries.clear === "function" && typeof rectSeries.add === "function") {
          rectSeries.clear();
          rects.forEach((r) => rectSeries.add(r));
        } else {
          console.warn("RectangleSeries API not recognized; inspect rectangleSeries methods:", Object.keys(rectSeries));
        }
      } catch (e) {
        console.warn("Failed to set rectangle series data", e);
      }
    }
    // ...


    let disposed = false;

    fetch("/assets/cars.json")
      .then((r) => r.json())
      .then((data) => {
        if (disposed) return;
        const theme = pChart.getTheme();
        const Axes = {
          Price: 0,
          Horsepower: 1,
          Weight: 2,
          FuelEfficiency: 3,
        };
        pChart.setAxes(Axes);

        pChart.getAxis(Axes.FuelEfficiency).setInterval({ start: 5, end: 35 });
        pChart.setLUT({
          axis: pChart.getAxis(Axes.FuelEfficiency),
          lut: new LUT({
            interpolate: true,
            steps: regularColorSteps(5, 35, theme.examples.badGoodColorPalette),
          }),
        });

  // Add a predefined range selector on FuelEfficiency
  pChart.getAxis(Axes.FuelEfficiency).addRangeSelector().setInterval(25, 35);

        // Add series (one series per sample)
        data.forEach((sample) => pChart.addSeries().setName(`${sample.Manufacturer} ${sample.Model}`).setData(sample));

        // Update bar chart from selected samples
        function updateBarChartFromSamples(samples) {
          if (!bChart || bChart.isDisposed()) return;
          if (!samples || samples.length === 0) {
            bChart.setDataGrouped(["No selection"], [{ subCategory: "Count", values: [0] }]);
            return;
          }

          const manufacturers = Array.from(new Set(samples.map((s) => s.Manufacturer)));
          const fuels = Array.from(new Set(samples.map((s) => s.Fuel)));

          // For each fuel, compute counts per manufacturer
          const valuesByFuel = fuels.map((fuel) =>
            manufacturers.map((m) => samples.filter((s) => s.Manufacturer === m && s.Fuel === fuel).length),
          );

          // ...

          // After loading data and computing initial selection:
          globalPriceRange = { min: Math.min(...data.map(d => d.Price)), max: Math.max(...data.map(d => d.Price)) };
          updateHistogramFromSamples(initialSelected);

          // ...

          const stacked = fuels.map((fuel, i) => ({ subCategory: fuel, values: valuesByFuel[i] }));
          bChart.setDataStacked(manufacturers, stacked);
        }

        // Initial bar chart based on preset selector interval
        const [start, end] = [30, 35];
        const initialSelected = data.filter((d) => d.FuelEfficiency >= start && d.FuelEfficiency <= end);
        updateBarChartFromSamples(initialSelected);

        // React to selection changes (range selectors)
        pChart.addEventListener("seriesselect", (event) => {
          const selectedSeries = event.selectedSeries || [];
          const selectedSamples = selectedSeries.map((s) => s.getData());
          updateBarChartFromSamples(selectedSamples);
          updateHistogramFromSamples(selectedSamples);
        });
      })
      .catch((e) => console.error("Failed to load cars.json", e));

    return () => {
      disposed = true;
      try { pChart.dispose(); } catch (e) {}
      try { bChart.dispose(); } catch (e) {}
      try { hChart.dispose(); } catch (e) {}
    };
  }, [idParallel, idBar, idHistogram, lc]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr", width: "100%", height: "100%" }}>
      <div id={idParallel} className="chart" style={{ gridColumn: "1 / 2", gridRow: "1 / 3" }}></div>
      <div id={idBar} className="chart" style={{ gridColumn: "2 / 3", gridRow: "1 / 2" }}></div>
      <div id={idHistogram} className="chart" style={{ gridColumn: "2 / 3", gridRow: "2 / 3" }}></div>
    </div>
  );
}
