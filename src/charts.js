import { Themes, LUT, regularColorSteps, BarChartTypes, SolidFill, ColorHEX } from "@lightningchart/lcjs"
import { useEffect, useContext, useId } from "react"
import { LCContext } from "./LC"


// Charts:
// Parallel Coordinates: “What are the characteristics of the selected cars?”
// Horizontal Bar Chart: “How many models does each manufacturer have, broken down by fuel type?”
// Vertical Bar Chart: “What is the average price per fuel type?”
// Scatter Chart: “What is the relationship between weight and fuel efficiency?”
// Histogram: “What is the distribution of car prices?”


// TODO: Scatter Chart & Histogram: no updating in x-axis min and max on new data
// TODO: Scatter Chart: remove cursor text box
// TODO: Fuel types should be in the same order on all charts
// TODO: Remove decimals from chart labels
// TODO: Link charts with brushing/selection: selecting points on scatter highlights lines in parallel coords and updates histogram.
// TODO: For skewed prices, consider log scale or show both linear + log toggle.
// TODO: Show sample size on every chart; for small selections (<5) prefer list/detail view over distributions.
// TODO: IE version (no LCContext, data fetching in Charts)



export default function Charts() {
  const idParallel = useId()
  const idBar = useId()
  const idFuelPrice = useId()
  const idScatterWE = useId()
  const idHistogram = useId()
  const lc = useContext(LCContext)

  useEffect(() => {
    const pContainer = document.getElementById(idParallel)
    const bContainer = document.getElementById(idBar)
    const fContainer = document.getElementById(idFuelPrice)
    const weContainer = document.getElementById(idScatterWE)
    const hContainer = document.getElementById(idHistogram)
    if (!pContainer || !bContainer || !fContainer || !weContainer || !hContainer || !lc) return

    const safeUpdate = (name, fn) => {
      try {
        fn()
      } catch (e) {
        console.error(`[Updater "${name}" failed]`, e)
      }
    }

    // Shared color palette for all non-parallel charts
    const fuelPalette = {
      Petrol: ColorHEX('#C66BAA'),  
      Diesel: ColorHEX('#4EA3FF'),  
      Electric: ColorHEX('#B58BFF'), 
      Hybrid: ColorHEX('#38C6A6'),  
      default: ColorHEX('#f0e29eff'),  
    }

    // Parallel Coordinates
    const pChart = lc
      .ParallelCoordinateChart({ theme: Themes.darkGold, container: pContainer })
      .setTitle("Car Characteristics Parallel Coordinates - Double click on axis to filter")

    // Horizontal Bar Chart
    const bChart = lc.BarChart({
      theme: Themes.darkGold,
      container: bContainer,
      legend: { addEntriesAutomatically: false },
      type: BarChartTypes.Horizontal,
    }).setTitle("Models by Manufacturer (stacked by Fuel)")
      .setValueLabels(undefined)
      .setCornerRadius(undefined) 

    // Vertical Bar Chart
    const fChart = lc.BarChart({
      theme: Themes.darkGold,
      container: fContainer,
      legend: { addEntriesAutomatically: false },
      type: BarChartTypes.Vertical,
    }).setTitle("Average Price per Fuel ($k)")
      .setValueLabels((info) => {
        const v = typeof info === "number" ? info : info?.value
        return `$${Number(v || 0).toFixed(0)}k`
      })

    // Scatter Chart
    const weChart = lc.ChartXY({ theme: Themes.darkGold, container: weContainer })
      .setTitle("Weight vs Fuel Efficiency")
    const axisX_WE = weChart.getDefaultAxisX().setTitle("Weight (kg)")
    const axisY_WE = weChart.getDefaultAxisY().setTitle("Fuel Efficiency (mpg)")

    const scatterByFuel = {}
    const getScatterForFuel = (fuel) => {
      if (scatterByFuel[fuel]) return scatterByFuel[fuel]
      const s = weChart.addPointSeries({ pointShape: "Circle" }).setPointSize(7).setName(fuel)
      s.setPointFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
      scatterByFuel[fuel] = s
      return s
    }

    // Histogram
    const hBar = lc.BarChart({
      theme: Themes.darkGold,
      container: hContainer,
      legend: { addEntriesAutomatically: false },
      type: BarChartTypes.Vertical,
    }).setTitle("Price Distribution")
      .setValueLabels(undefined)
      .setCornerRadius(undefined) 

    let globalBins = null
    let disposed = false

    // Data fetch
    fetch("/assets/cars.json")
      .then((r) => r.json())
      .then((data) => {
        if (disposed) return

        // Parallel Coordinates setup
        const theme = pChart.getTheme()
        const Axes = { Price: 0, Horsepower: 1, Weight: 2, FuelEfficiency: 3 }
        pChart.setAxes(Axes)
        pChart.setLUT({
          axis: pChart.getAxis(Axes.FuelEfficiency),
          lut: new LUT({
            interpolate: true,
            steps: regularColorSteps(5, 35, theme.examples.badGoodColorPalette),
          }),
        })
        pChart.getAxis(Axes.FuelEfficiency).addRangeSelector().setInterval(25, 35)

        data.forEach((sample) =>
          pChart.addSeries().setName(`${sample.Manufacturer} ${sample.Model}`).setData(sample)
        )

        // Build stable histogram bins
        const allPrices = data.map((d) => Number(d.Price)).filter(Number.isFinite)
        const minP = Math.min(...allPrices)
        const maxP = Math.max(...allPrices)
        const binCount = 12
        const step = (maxP - minP) / binCount
        const boundaries = Array.from({ length: binCount + 1 }, (_, i) => minP + i * step)
        const labels = Array.from({ length: binCount }, (_, i) =>
          `$${Math.round(boundaries[i])}–${Math.round(boundaries[i + 1])}k`
        )
        globalBins = { labels, boundaries }

        // Updaters
        function updateBarChartFromSamples(samples) {
          if (!bChart || bChart.isDisposed()) return
          if (!samples?.length) {
            bChart.setDataGrouped(["No selection"], [{ subCategory: "Count", values: [0] }])
            return
          }

          const manufacturers = [...new Set(samples.map((s) => s.Manufacturer))]
          const fuels = [...new Set(samples.map((s) => s.Fuel))]
          const valuesByFuel = fuels.map((fuel) =>
            manufacturers.map((m) => samples.filter((s) => s.Manufacturer === m && s.Fuel === fuel).length)
          )

          const stacked = fuels.map((fuel, i) => ({
            subCategory: fuel,
            values: valuesByFuel[i],
          }))
          bChart.setDataStacked(manufacturers, stacked)

          // Apply colors to each fuel sub-bar
          manufacturers.forEach((m) => {
            fuels.forEach((fuel) => {
              const bar = bChart.getBar(m, fuel)
              if (bar) bar.setFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
            })
          })
        }

        function updateFuelPriceChart(samples) {
          if (!fChart || fChart.isDisposed()) return
          if (!samples?.length) {
            fChart.setDataGrouped(["No selection"], [{ subCategory: "Average Price", values: [0] }])
            return
          }

          const fuels = [...new Set(samples.map((s) => s.Fuel))]
          const averages = fuels.map((fuel) => {
            const subset = samples.filter((s) => s.Fuel === fuel)
            return subset.reduce((sum, s) => sum + Number(s.Price || 0), 0) / Math.max(1, subset.length)
          })

          fChart.setDataGrouped(fuels, [{ subCategory: "Avg Price", values: averages }])

          // Color each bar by fuel type
          fuels.forEach((fuel) => {
            const bar = fChart.getBar(fuel, "Avg Price")
            if (bar) bar.setFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
          })
        }

        function updateScatterWE(samples) {
          Object.values(scatterByFuel).forEach((s) => s.clear())
          if (!samples?.length) return

          const byFuel = samples.reduce((acc, s) => {
            const f = s.Fuel || "Unknown"
            ;(acc[f] ||= { x: [], y: [] })
            const x = Number(s.Weight)
            const y = Number(s.FuelEfficiency)
            if (Number.isFinite(x) && Number.isFinite(y)) {
              acc[f].x.push(x)
              acc[f].y.push(y)
            }
            return acc
          }, {})

          Object.entries(byFuel).forEach(([fuel, { x, y }]) => {
            if (x.length) getScatterForFuel(fuel).appendSamples({ xValues: x, yValues: y })
          })

          const allX = samples.map((s) => Number(s.Weight)).filter(Number.isFinite)
          const allY = samples.map((s) => Number(s.FuelEfficiency)).filter(Number.isFinite)
          if (allX.length && allY.length) {
            axisX_WE.setInterval({ start: Math.min(...allX), end: Math.max(...allX) })
            axisY_WE.setInterval({ start: Math.min(...allY), end: Math.max(...allY) })
          }
        }

        function updateHistogram(samples) {
          if (!hBar || hBar.isDisposed() || !globalBins) return
          const { labels, boundaries } = globalBins
          const counts = Array(boundaries.length - 1).fill(0)
          samples.forEach((s) => {
            const v = Number(s.Price)
            for (let i = 0; i < boundaries.length - 1; i++) {
              if (v >= boundaries[i] && v < boundaries[i + 1]) {
                counts[i]++
                break
              }
            }
          })
          hBar.setDataGrouped(labels, [{ subCategory: "Count", values: counts }])

          // Set histogram color
          labels.forEach((label) => {
            const bar = hBar.getBar(label, "Count")
            if (bar) bar.setFillStyle(new SolidFill({ color: fuelPalette.default }))
          })
        }

        // Initial selection
        const [rsStart, rsEnd] = [30, 35]
        const initialSelected = data.filter(
          (d) => d.FuelEfficiency >= rsStart && d.FuelEfficiency <= rsEnd
        )

        safeUpdate("bar", () => updateBarChartFromSamples(initialSelected))
        safeUpdate("fuelPrice", () => updateFuelPriceChart(initialSelected))
        safeUpdate("scatterWE", () => updateScatterWE(initialSelected))
        safeUpdate("histogram", () => updateHistogram(initialSelected))

        // Parallel Coordinates selection handling
        pChart.addEventListener("seriesselect", (event) => {
          const selectedSeries = event.selectedSeries || []
          const selectedSamples = selectedSeries.map((s) => s.getData())
          safeUpdate("bar", () => updateBarChartFromSamples(selectedSamples))
          safeUpdate("fuelPrice", () => updateFuelPriceChart(selectedSamples))
          safeUpdate("scatterWE", () => updateScatterWE(selectedSamples))
          safeUpdate("histogram", () => updateHistogram(selectedSamples))
        })
      })
      .catch((e) => console.error("Failed to load cars.json", e))

    return () => {
      disposed = true
      try { pChart.dispose() } catch {}
      try { bChart.dispose() } catch {}
      try { fChart.dispose() } catch {}
      try { weChart.dispose() } catch {}
      try { hBar.dispose() } catch {}
    }
  }, [idParallel, idBar, idFuelPrice, idScatterWE, idHistogram, lc])

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gridTemplateRows: "2fr 1fr",
        width: "100%",
        height: "100%",
      }}
    >
      <div id={idParallel} style={{ gridRow: "1", gridColumn: "span 4" }} />
      <div id={idBar} style={{ gridRow: "2", gridColumn: "1" }} />
      <div id={idFuelPrice} style={{ gridRow: "2", gridColumn: "2" }} />
      <div id={idScatterWE} style={{ gridRow: "2", gridColumn: "3" }} />
      <div id={idHistogram} style={{ gridRow: "2", gridColumn: "4" }} />
    </div>
  )
}
