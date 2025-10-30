import { Themes, LUT, regularColorSteps, BarChartTypes, SolidFill, ColorHEX, PieChartTypes, SliceLabelFormatters, htmlTextRenderer } from "@lightningchart/lcjs"
import { useEffect, useContext, useId } from "react"
import { LCContext } from "./LC"


// Charts:
// Parallel Coordinate Chart: “What are the characteristics of the selected cars?”
// Horizontal Bar Chart: “How many models does each manufacturer have, broken down by fuel type?”
// Vertical Bar Chart: “What is the average price per fuel type?”
// Scatter Chart: “What is the relationship between weight and fuel efficiency?”
// Pie Chart: "What price range categories do the cars fall into?"


// TODO: PieChart: korjaa labelit + rajaus pois legendistä
// TODO: Remove decimals from chart labels
// TODO: IE version (no LCContext, data fetching in Charts)



export default function Charts() {
  const idParallel = useId()
  const idModels = useId()
  const idFuelPrice = useId()
  const idWeightFE = useId()
  const idRange = useId()
  const lc = useContext(LCContext)

  useEffect(() => {
    const pContainer = document.getElementById(idParallel)
    const mContainer = document.getElementById(idModels)
    const fContainer = document.getElementById(idFuelPrice)
    const wfContainer = document.getElementById(idWeightFE)
    const rContainer = document.getElementById(idRange)
    if (!pContainer || !mContainer || !fContainer || !wfContainer || !rContainer || !lc) return

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

    // Power-to-Weight Ratio Categories (Horsepower per metric ton)
    const priceRanges = [
      { label: '<120 HP/t', min: 0, max: 120 },
      { label: '120–160 HP/t', min: 120, max: 160 },
      { label: '160–200 HP/t', min: 160, max: 200 },
      { label: '>200 HP/t', min: 200, max: Infinity },
    ]

    // Price Range Colors for Pie Chart
    const rangePalette = {
      Low: ColorHEX('#E6C4C0'),  
      Medium: ColorHEX('#B6C7B2'),  
      High: ColorHEX('#CBBBE2'), 
      VeryHigh: ColorHEX('#A4C7C4'),  
    }

    // Parallel Coordinate Chart - Car Characteristics
    const parallelChart = lc
      .ParallelCoordinateChart({ 
        theme: Themes.darkGold, 
        container: pContainer,
        textRenderer: htmlTextRenderer, 
      })
      .setTitle("Car Characteristics - Double Click on Axis to Filter")

    // Horizontal Bar Chart - Models by Manufacturer
    const modelsChart = lc
      .BarChart({
        theme: Themes.darkGold,
        container: mContainer,
        legend: { addEntriesAutomatically: false },
        type: BarChartTypes.Horizontal,
        textRenderer: htmlTextRenderer, 
      })
      .setTitle("Models by Manufacturer")
      .setValueLabels(undefined)
      .setCornerRadius(undefined) 
      .setPadding({ left: 20, right: 30, top: 0, bottom: 10 })

    // Vertical Bar Chart - Average Price per Fuel Type
    const fuelPriceChart = lc
      .BarChart({
        theme: Themes.darkGold,
        container: fContainer,
        legend: { addEntriesAutomatically: false },
        type: BarChartTypes.Vertical,
        textRenderer: htmlTextRenderer, 
      })
      .setTitle("Average Price per Fuel Type")
      .setValueLabels({
        formatter: (info) => `$${(info.value).toFixed(0)}k`,
      })
      .setPadding({ left: 10, right: 10, top: 0, bottom: 10 })

    // Scatter Chart - Weight vs Fuel Efficiency
    const weightFEChart = lc
      .ChartXY({ 
        theme: Themes.darkGold, 
        container: wfContainer, 
        textRenderer: htmlTextRenderer, 
      })
      .setTitle("Weight vs Fuel Efficiency")
      .setCursorMode('show-nearest')
      .setPadding({ left: 10, right: 10, top: 10, bottom: 10 })

    const axisX_WE = weightFEChart.getDefaultAxisX().setTitle("Weight (kg)")
    const axisY_WE = weightFEChart.getDefaultAxisY().setTitle("Fuel Efficiency (km/L)")

    const scatterByFuel = {}
    const getScatterForFuel = (fuel) => {
      if (scatterByFuel[fuel]) return scatterByFuel[fuel]
      const series = weightFEChart.addPointSeries({ 
        pointShape: "Circle" 
      })
        .setPointSize(9)
        .setName(fuel)
      series.setPointFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
      scatterByFuel[fuel] = series
      return series
    }

    // Pie Chart - Price Range Categories
    const rangeChart = lc
    .Pie({
      theme: Themes.darkGold,
      container: rContainer,
      type: PieChartTypes.LabelsInsideSlices,
      textRenderer: htmlTextRenderer,
      // legend: { addEntriesAutomatically: false },
      // legend: { visible: false },
    })
      .setTitle("Power-to-Weight Ratio Categories")
      .setMultipleSliceExplosion(true)
      .setPadding({ left: 20, right: 20, top: 0, bottom: 10 })

    let disposed = false

    // Data fetch
    fetch("/assets/cars.json")
      .then((r) => r.json())
      .then((data) => {
        if (disposed) return

        // Parallel Coordinate Chart setup
        const theme = parallelChart.getTheme()
        const Axes = { 
          Price: 0, 
          Horsepower: 1,
          Weight: 2, 
          FuelEfficiency: 3 
        }
        parallelChart.setAxes(Axes)
        parallelChart.setLUT({
          axis: parallelChart.getAxis(Axes.FuelEfficiency),
          lut: new LUT({
            interpolate: true,
            steps: regularColorSteps(5, 35, theme.examples.badGoodColorPalette),
          }),
        })
        parallelChart.getAxis(Axes.FuelEfficiency).addRangeSelector().setInterval(25, 35)

        data.forEach((sample) =>
          parallelChart.addSeries().setName(`${sample.Manufacturer} ${sample.Model}`).setData(sample)
        )

        // Update horizontal bar chart
        function updateModelsChart(samples) {
          if (!modelsChart || modelsChart.isDisposed()) return
          if (!samples?.length) {
            modelsChart.setDataGrouped(["No selection"], [{ subCategory: "Count", values: [0] }])
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
          modelsChart.setDataStacked(manufacturers, stacked)

          // Apply colors to each fuel sub-bar
          manufacturers.forEach((m) => {
            fuels.forEach((fuel) => {
              const bar = modelsChart.getBar(m, fuel)
              if (bar) bar.setFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
            })
          })
        }

        // Update vertical bar chart
        function updateAvgPriceChart(samples) {
          if (!fuelPriceChart || fuelPriceChart.isDisposed()) return
          if (!samples?.length) {
            fuelPriceChart.setDataGrouped(["No selection"], [{ subCategory: "Average Price", values: [0] }])
            return
          }

          const fuels = [...new Set(samples.map((s) => s.Fuel))]
          const averages = fuels.map((fuel) => {
            const subset = samples.filter((s) => s.Fuel === fuel)
            return subset.reduce((sum, s) => sum + Number(s.Price || 0), 0) / Math.max(1, subset.length)
          })

          fuelPriceChart.setDataGrouped(fuels, [{ subCategory: "Avg Price", values: averages }])

          // Color each bar by fuel type
          fuels.forEach((fuel) => {
            const bar = fuelPriceChart.getBar(fuel, "Avg Price")
            if (bar) bar.setFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
          })
        }

        // Update scatter chart
        function updateScatterChart(samples) {
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

        // Update pie chart
        function updatePriceRangeChart(samples) {
          if (!rangeChart || rangeChart.isDisposed()) return
          if (!samples?.length) {
            rangeChart.setDataGrouped(["No selection"], [{ subCategory: "Count", values: [0] }])
            return
          }

          const slices = rangeChart.getSlices();

          // Count cars per power-to-weight ratio range
          const counts = priceRanges.map((r) =>
            samples.filter((s) => {
              const hp = Number(s.Horsepower)
              const w = Number(s.Weight)
              if (!Number.isFinite(hp) || !Number.isFinite(w) || w <= 0) return false
              const ratio = hp / (w / 1000) // HP per metric ton
              return ratio >= r.min && ratio < r.max
            }).length
          )

          Object.entries(counts).forEach(([i, count]) => {
            const label = priceRanges[i].label
            let slice = slices.find((s) => s.getName() === label)
            if (!slice) {
              slice = rangeChart.addSlice(label, count)
            } else {
              slice.setValue(count)
            }
          })

          rangeChart.setSliceFillStyle((index) => {
            const range = slices[index].getName()
            switch (range) {
              case '<120 HP/t':
                return new SolidFill({ color: rangePalette.Low })
              case '120–160 HP/t':
                return new SolidFill({ color: rangePalette.Medium })
              case '160–200 HP/t':
                return new SolidFill({ color: rangePalette.High })
              case '>200 HP/t':
                return new SolidFill({ color: rangePalette.VeryHigh })
              default:
                return new SolidFill({ color: fuelPalette.default })
            }
          })

          // rangeChart.setLabelFormatter(SliceLabelFormatters.NamePlusRelativeValue)
          rangeChart.setLabelFormatter((slice, relativeValue) => slice.getName() + `: ${(relativeValue * 100).toFixed(1)}%`)
        }

        // Initial selection
        const [rsStart, rsEnd] = [30, 35]
        const initialSelected = data.filter(
          (d) => d.FuelEfficiency >= rsStart && d.FuelEfficiency <= rsEnd
        )

        safeUpdate("models", () => updateModelsChart(initialSelected))
        safeUpdate("avgPrice", () => updateAvgPriceChart(initialSelected))
        safeUpdate("scatter", () => updateScatterChart(initialSelected))
        safeUpdate("pie", () => updatePriceRangeChart(initialSelected))

        // Parallel Coordinates selection handling
        parallelChart.addEventListener("seriesselect", (event) => {
          const selectedSeries = event.selectedSeries || []
          const selectedSamples = selectedSeries.map((s) => s.getData())
          safeUpdate("models", () => updateModelsChart(selectedSamples))
          safeUpdate("avgPrice", () => updateAvgPriceChart(selectedSamples))
          safeUpdate("scatter", () => updateScatterChart(selectedSamples))
          safeUpdate("pie", () => updatePriceRangeChart(selectedSamples))
        })
      })
      .catch((e) => console.error("Failed to load cars.json", e))

    return () => {
      disposed = true
      try { parallelChart.dispose() } catch {}
      try { modelsChart.dispose() } catch {}
      try { fuelPriceChart.dispose() } catch {}
      try { weightFEChart.dispose() } catch {}
      try { rangeChart.dispose() } catch {}
    }
  }, [idParallel, idModels, idFuelPrice, idWeightFE, idRange, lc])

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.5fr 1fr 1.5fr 1fr",
        gridTemplateRows: "1.75fr 1fr",
        width: "100%",
        height: "100%",
      }}
    >
      <div id={idParallel} style={{ gridRow: "1", gridColumn: "span 4" }} />
      <div id={idModels} style={{ gridRow: "2", gridColumn: "1" }} />
      <div id={idFuelPrice} style={{ gridRow: "2", gridColumn: "2" }} />
      <div id={idWeightFE} style={{ gridRow: "2", gridColumn: "3" }} />
      <div id={idRange} style={{ gridRow: "2", gridColumn: "4" }} />
    </div>
  )
}
