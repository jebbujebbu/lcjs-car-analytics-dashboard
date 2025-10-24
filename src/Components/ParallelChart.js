import { Themes, ParallelCoordinateChart, LUT, regularColorSteps } from "@lightningchart/lcjs";
import { useEffect, useState, useContext, useId } from "react";
import { LCContext } from "../LC";

export default function ParallelChart() {
//   const data = [];
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
    }).setTitle('Parallel Coordinate Chart with Value based coloring');

    fetch('/assets/machine-learning-accuracy-data.json')
    .then((r) => r.json())
    .then((data) => {
        const theme = chart.getTheme()
        const Axes = {
            batch_size: 0,
            channels_one: 1,
            learning_rate: 2,
            accuracy: 3,
        }
        chart.setAxes(Axes)
        chart.getAxis(Axes.accuracy).setInterval({ start: 0, end: 1 })
        chart.setLUT({
            axis: chart.getAxis(Axes.accuracy),
            lut: new LUT({
                interpolate: true,
                steps: regularColorSteps(0, 1, theme.examples.badGoodColorPalette),
            }),
        })
        data.forEach((sample) => chart.addSeries().setData(sample))
    })

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
    // chartState.chart.setSamples({ y: data });
  }, [chartState]);

  return <div id={id} className="chart"></div>;
}

