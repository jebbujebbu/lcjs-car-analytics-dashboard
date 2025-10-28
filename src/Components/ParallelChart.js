import { Themes, ParallelCoordinateChart, LUT, regularColorSteps } from "@lightningchart/lcjs";
import { useEffect, useState, useContext, useId } from "react";
import { LCContext } from "../LC";

export default function ParallelChart(props) {
  const data = props.data;
  console.log("ParallelChart data:", props.data);
  const id = useId();
  const lc = useContext(LCContext);
  const [chartState, setChartState] = useState();

  useEffect(() => {
    const container = document.getElementById(id);
    if (!container || !lc) {
      return;
    }
    const chart = lc.ParallelCoordinateChart({
      theme: Themes.darkGold,
      container,
    }).setTitle('Parallel Coordinate Chart with Filters');

    // Set chart data
    const theme = chart.getTheme();
    const Axes = {
      Price: 0,
      Horsepower: 1,
      Weight: 2,
      FuelEfficiency: 3,
    };
    chart.setAxes(Axes);
    chart.getAxis(Axes.FuelEfficiency).setInterval({ start: 5, end: 35 });
    chart.setLUT({
      axis: chart.getAxis(Axes.FuelEfficiency),
      lut: new LUT({
        interpolate: true,
        steps: regularColorSteps(5, 35, theme.examples.badGoodColorPalette),
      }),
    });
    // Add predefined range selector to Fuel Efficiency axis
    chart.getAxis(Axes.FuelEfficiency).addRangeSelector().setInterval(30, 35);

    data.forEach((sample) => chart.addSeries().setName(`${sample.Manufacturer} ${sample.Model}`).setData(sample));

    // fetch('/assets/cars.json')
    // .then((r) => r.json())
    // .then((data) => {
    //     const theme = chart.getTheme()
    //     const Axes = {
    //         Price: 0,
    //         Horsepower: 1,
    //         Weight: 2,
    //         FuelEfficiency: 3,
    //     }
    //     chart.setAxes(Axes)
    //     chart.getAxis(Axes.FuelEfficiency).setInterval({ start: 5, end: 35 })
    //     chart.setLUT({
    //         axis: chart.getAxis(Axes.FuelEfficiency),
    //         lut: new LUT({
    //             interpolate: true,
    //             steps: regularColorSteps(5, 35, theme.examples.badGoodColorPalette),
    //         }),
    //     })
    //     // Add predefined range selector to Fuel Efficiency axis
    //     chart.getAxis(Axes.FuelEfficiency).addRangeSelector().setInterval(30, 35)
    //     data.forEach((sample) => chart.addSeries().setData(sample))
    // })

    // const lineSeries = chart.addLineSeries({
    //   schema: {
    //     y: { pattern: null },
    //     x: { auto: true },
    //   },
    // });
    setChartState({ chart });
    return () => {
      chart.dispose();
    };
  }, [id, lc]);

  useEffect(() => {
    if (!chartState || chartState.chart.isDisposed()) {
      return;
    }
    chartState.chart.setSamples({ y: data });
  }, [chartState, data]);

  return <div id={id} className="chart"></div>;
}

