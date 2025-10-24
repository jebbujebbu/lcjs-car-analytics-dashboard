import { Themes } from "@lightningchart/lcjs";
import { useEffect, useState, useContext, useId } from "react";
import { LCContext } from "../LC";

export default function BarChart() {
  const data = [];
  const id = useId();  
  const lc = useContext(LCContext);
  const [barChart, setBarChart] = useState(undefined);
  
  // Create chart just once during lifecycle of component.
  useEffect(() => {
    const container = document.getElementById(id);
    if (!container) return
    if (!lc) {
      console.log("LC context not ready yet");
      return
    }

    const chart = lc.BarChart({
        theme: Themes.darkGold,
        container,
        legend: {
          addEntriesAutomatically: false,
        },
    })
    chart
    .setTitle('Bar Chart')
    .setValueLabels(undefined)
    setBarChart(chart);
    return () => {
      // Destroy chart when component lifecycle ends.
      chart.dispose();
    };
  }, [id, lc]); 

  // Update cart data whenever data prop changes
  useEffect(() => {
    if (!barChart || data === undefined || barChart.isDisposed()) return    
    barChart
    .setDataStacked(
      [''],
      [
          { subCategory: 'Today', values: [5000] },
          { subCategory: '25k', values: [25000 - 5000] },
      ],
    )
  }, [barChart, data]); 

  return <div id={id} style={{ width: "100%", height: "100%" }}></div>;

}