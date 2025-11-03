import { Themes, LUT, regularColorSteps, BarChartTypes, SolidFill, ColorHEX, AxisTickStrategies, htmlTextRenderer, SolidLine, emptyLine } from "@lightningchart/lcjs"
import { useEffect, useContext, useId } from "react"
import { LCContext } from "./LC"

export default function Charts() {
  const idParallel = useId()
  const idModels = useId()
  const idFuelPrice = useId()
  const idWeightFE = useId()
  const idHorsepower = useId()
  const lc = useContext(LCContext)

  useEffect(() => {
    const pContainer = document.getElementById(idParallel)
    const mContainer = document.getElementById(idModels)
    const fContainer = document.getElementById(idFuelPrice)
    const wfContainer = document.getElementById(idWeightFE)
    const hContainer = document.getElementById(idHorsepower)
    if (!pContainer || !mContainer || !fContainer || !wfContainer || !hContainer || !lc) return

    // Color palette for bottom row charts
    const fuelPalette = {
      Petrol: ColorHEX('#C66BAA'),  
      Diesel: ColorHEX('#4EA3FF'),  
      Electric: ColorHEX('#B58BFF'), 
      Hybrid: ColorHEX('#38C6A6'),  
      default: ColorHEX('#f0e29eff'),  
    }

    // Initial range selector values
    const [feStart, feEnd] = [20, 35]
    const [pStart, pEnd] = [18, 100]
    
    // Parallel coordinate chart - car characteristics
    const parallelChart = lc
      .ParallelCoordinateChart({ 
        theme: Themes.darkGold, 
        container: pContainer,
        textRenderer: htmlTextRenderer, 
      })
      .setTitle("Car Characteristics - Double Click on Axis to Filter")
      .setPadding({ left: 20, right: 30, top: 0, bottom: 20 })

      const theme = parallelChart.getTheme()
      const Axes = { 
        Price: 0, 
        Horsepower: 1,
        Weight: 2, 
        FuelEfficiency: 3 
      }
      parallelChart
        .setAxes(Axes)
        .setLUT({
          axis: parallelChart.getAxis(Axes.FuelEfficiency),
          lut: new LUT({
            interpolate: true,
            steps: regularColorSteps(5, 35, theme.examples.badGoodColorPalette),
          }),
        })
      // Initial range selector
      parallelChart.getAxis(Axes.FuelEfficiency).addRangeSelector().setInterval(feStart, feEnd)
      parallelChart.getAxis(Axes.Price).addRangeSelector().setInterval(pStart, pEnd)

    // Horizontal bar chart - Models by manufacturer
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
      .setPadding({ left: 20, right: 20, top: 0, bottom: 10 })

      modelsChart.valueAxis.setTickStrategy(AxisTickStrategies.Numeric, ticks => ticks
        .setMajorFormattingFunction((value) => `${value.toFixed(1)}`)
      )

    // Vertical bar chart - Average price per fuel type
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
      .setTitleMargin({ bottom: 20 })
      
      fuelPriceChart.valueAxis.setTickStrategy(AxisTickStrategies.Numeric, ticks => ticks
        .setMajorFormattingFunction((value) => `${value.toFixed(0)}`)
      )

    // Scatter chart - Weight vs fuel efficiency
    const weightFEChart = lc
      .ChartXY({ 
        theme: Themes.darkGold, 
        container: wfContainer, 
        textRenderer: htmlTextRenderer, 
      })
      .setTitle("Weight vs Fuel Efficiency")
      .setCursorMode('show-nearest')
      .setPadding({ left: 10, right: 10, top: 10, bottom: 10 })
      .setTitleMargin({ bottom: 10 })

      const wAxisX = weightFEChart.getDefaultAxisX().setTitle("Weight (kg)")
      const wAxisY = weightFEChart.getDefaultAxisY().setTitle("Fuel Efficiency (km/L)")
      wAxisY.setTickStrategy(AxisTickStrategies.Numeric, ticks => ticks
        .setMajorFormattingFunction((value) => `${value.toFixed(0)}`)
      )
    
      // Get or create series per fuel type
      const scatterByFuel = {}

      const getScatterForFuel = (fuel) => {
        if (scatterByFuel[fuel]) return scatterByFuel[fuel]
        const series = weightFEChart.addPointSeries({ pointShape: "Circle" })
        series
          .setPointSize(9)
          .setName(fuel)
          .setPointFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
        scatterByFuel[fuel] = series
        return series
      }

    // Box and whiskers chart - horsepower distribution per fuel type
    const horsepowerChart = lc
      .ChartXY({
        theme: Themes.darkGold,
        container: hContainer,
        textRenderer: htmlTextRenderer,
        legend: { addEntriesAutomatically: false },
      })
      .setTitle("Horsepower Distribution per Fuel Type")
      .setCursorMode(undefined)
      .setPadding({ left: 10, right: 10, top: 10, bottom: 10 })
      .setTitleMargin({ bottom: 10 })

    const hpAxisX = horsepowerChart
      .getDefaultAxisX()
      .setTickStrategy(AxisTickStrategies.Empty)
      .setTitlePosition("center")

    const hpAxisY = horsepowerChart
      .getDefaultAxisY()
      .setTitle("Horsepower (hp)")
      .setScrollStrategy(undefined)
      .setInterval({ start: 70, end: 700, stopAxisAfter: false })

      // Get or create box and point series per fuel type
      const boxByFuel = {}
      const pointsByFuel = {}
      const hpTicksByFuel = {} 
      const fuelsOrdered = ["Electric", "Petrol", "Hybrid", "Diesel"]

      fuelsOrdered.forEach((fuel, i) => {
        const tick = hpAxisX.addCustomTick()  
        tick.setValue(i + 0.5) 
        tick.setTextFormatter(() => fuel)
        tick.setGridStrokeLength(0)
        hpTicksByFuel[fuel] = tick  
      })

    function getBoxForFuel(fuel) {
      if (boxByFuel[fuel]) return boxByFuel[fuel]

      const boxSeries = horsepowerChart
        .addBoxSeries()
        .setDefaultStyle((figure) => figure
          .setBodyWidth(0.8)
          .setTailWidth(0.7)
          .setBodyFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
          .setStrokeStyle(new SolidLine({ thickness: 1, fillStyle: new SolidFill({ color: fuelPalette.default }) }))
        )
      boxByFuel[fuel] = boxSeries
      return boxSeries
    }

    function getPointsForFuel(fuel) {
      if (pointsByFuel[fuel]) return pointsByFuel[fuel]
      const pointSeries = horsepowerChart
        .addPointSeries({})
        .setStrokeStyle(emptyLine)
        .setPointSize(10)
        .setPointFillStyle(new SolidFill({ color: fuelPalette[fuel] || fuelPalette.default }))
      pointsByFuel[fuel] = pointSeries
      return pointSeries
    }

    let disposed = false

    // Data fetch
    fetch("/assets/cars.json")
      .then((r) => r.json())
      .then((data) => {
        if (disposed) return

        // Update parallel chart 
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

          // Compute counts per manufacturer and fuel
          const manufacturers = [...new Set(samples.map((s) => s.Manufacturer))]
          const fuels = [...new Set(samples.map((s) => s.Fuel))]
          const valuesByFuel = fuels.map((fuel) =>
            manufacturers.map((m) => samples.filter((s) => s.Manufacturer === m && s.Fuel === fuel).length)
          )

          // Set data
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

          // Compute average price per fuel
          const fuels = [...new Set(samples.map((s) => s.Fuel))]
          const averages = fuels.map((fuel) => {
            const subset = samples.filter((s) => s.Fuel === fuel)
            return subset.reduce((sum, s) => sum + Number(s.Price || 0), 0) / Math.max(1, subset.length)
          })

          // Set data
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

          // Group samples by fuel
          const byFuel = samples.reduce((grouped, s) => {
            const f = s.Fuel || "Unknown"
            if (!grouped[f]) grouped[f] = { x: [], y: [] }
            const x = Number(s.Weight)
            const y = Number(s.FuelEfficiency)
            if (Number.isFinite(x) && Number.isFinite(y)) {
              grouped[f].x.push(x)
              grouped[f].y.push(y)
            }
            return grouped
          }, {})

          // Append samples per fuel
          Object.entries(byFuel).forEach(([fuel, { x, y }]) => {
            if (x.length) getScatterForFuel(fuel).appendSamples({ x: x, y: y })
          })

          // Adjust axes ranges dynamically
          const allX = samples.map((s) => Number(s.Weight)).filter(Number.isFinite)
          const allY = samples.map((s) => Number(s.FuelEfficiency)).filter(Number.isFinite)
          if (allX.length && allY.length) {
            wAxisX.setInterval({ start: Math.min(...allX), end: Math.max(...allX) })
            wAxisY.setInterval({ start: Math.min(...allY), end: Math.max(...allY) })
          }
        }

        // Update box and whiskers chart
        function updateHorsepowerChart(samples) {
          if (!horsepowerChart || horsepowerChart.isDisposed()) return
          if (!samples?.length) {
            Object.values(boxByFuel).forEach((s) => s.clear())
            Object.values(pointsByFuel).forEach((s) => s.clear())
            return
          }

          // Group horsepower per fuel
          const byFuel = fuelsOrdered.reduce((grouped, fuel) => {
            grouped[fuel] = samples
              .filter((s) => s.Fuel === fuel)
              .map((s) => Number(s.Horsepower))
              .filter(Number.isFinite)
              .sort((a, b) => a - b)
            return grouped
          }, {})

          const allHP = samples.map((s) => Number(s.Horsepower)).filter(Number.isFinite)
          if (!allHP.length) return

          // Update series per fuel
          fuelsOrdered.forEach((fuel, i) => {
            const values = byFuel[fuel]
            if (!values || values.length === 0) {
                if (boxByFuel[fuel]) boxByFuel[fuel].clear()
                if (pointsByFuel[fuel]) pointsByFuel[fuel].clear()
                return
              }
            const box = getBoxForFuel(fuel)
            const points = getPointsForFuel(fuel)

            box.clear()
            points.clear()

            // Compute quartiles and whiskers
            const q1 = values[Math.floor(0.25 * (values.length - 1))]
            const median = values[Math.floor(0.5 * (values.length - 1))]
            const q3 = values[Math.floor(0.75 * (values.length - 1))]
            const iqr = q3 - q1
            const lowerExtreme = Math.max(Math.min(...values), q1 - 1.5 * iqr)
            const upperExtreme = Math.min(Math.max(...values), q3 + 1.5 * iqr)
            const outliers = values.filter((v) => v < lowerExtreme || v > upperExtreme)

            // Add box and whiskers data
            const start = i
            const end = i + 1
            const middle = (start + end) / 2

            box.add({
              start,
              end,
              lowerExtreme,
              lowerQuartile: q1,
              median,
              upperQuartile: q3,
              upperExtreme,
            })

            outliers.forEach((o) => points.appendSample({ x: middle, y: o }))
          })

          // Adjust Y range dynamically
          hpAxisY.setInterval({
            start: Math.min(...allHP) * 0.7,
            end: Math.max(...allHP) * 1.1,
            stopAxisAfter: false,
          })
        }

        // Initial selection
        const initialSelected = data.filter((d) => d.FuelEfficiency >= feStart && d.FuelEfficiency <= feEnd && d.Price >= pStart && d.Price <= pEnd)
        updateModelsChart(initialSelected)
        updateAvgPriceChart(initialSelected)
        updateScatterChart(initialSelected)
        updateHorsepowerChart(initialSelected)

        // Range selector event
        parallelChart.addEventListener("seriesselect", (event) => {
          const selectedSeries = event.selectedSeries || []
          const selectedSamples = selectedSeries.map((s) => s.getData())
          updateModelsChart(selectedSamples)
          updateAvgPriceChart(selectedSamples)
          updateScatterChart(selectedSamples)
          updateHorsepowerChart(selectedSamples)
        })
      })
      .catch((e) => console.error("Failed to load cars.json", e))

    // Cleanup on unmount
    return () => {
      disposed = true
      try { parallelChart.dispose() } catch {}
      try { modelsChart.dispose() } catch {}
      try { fuelPriceChart.dispose() } catch {}
      try { weightFEChart.dispose() } catch {}
      try { horsepowerChart.dispose() } catch {}
    }
  }, [idParallel, idModels, idFuelPrice, idWeightFE, idHorsepower, lc])

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", gap: 0 }}>
      <div id={idParallel} style={{ flex: "1.75" }} />
      <div style={{ display: "flex", flex: "1", gap: 0 }}>  
        <div id={idModels} style={{ flex: "1.5" }} />
        <div id={idFuelPrice} style={{ flex: "1" }} />
        <div id={idWeightFE} style={{ flex: "1.5" }} />
        <div id={idHorsepower} style={{ flex: "1.5" }} />
      </div>
    </div>
  )
}