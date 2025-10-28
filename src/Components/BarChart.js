import { Themes, BarChartTypes } from "@lightningchart/lcjs";
import { useEffect, useState, useContext, useId } from "react";
import { LCContext } from "../LC";

export default function BarChart({ samples = [] }) {
    const id = useId();
    const lc = useContext(LCContext);
    const [chart, setChart] = useState(null);

    useEffect(() => {
        const container = document.getElementById(id);
        if (!container || !lc) return;

        const bChart = lc.BarChart({
            theme: Themes.darkGold,
            container,
            legend: { addEntriesAutomatically: false },
            type: BarChartTypes.Horizontal,
        });

        bChart.setTitle("By Manufacturer (split by Fuel type)").setValueLabels(undefined);

        setChart(bChart);
        return () => {
            try { bChart.dispose(); } catch (e) {}
        };
    }, [id, lc]);

    useEffect(() => {
        if (!chart || chart.isDisposed()) return;

        if (!samples || samples.length === 0) {
            chart.setDataGrouped(["No selection"], [{ subCategory: "Count", values: [0] }]);
            return;
        }

        const manufacturers = Array.from(new Set(samples.map((s) => s.Manufacturer)));
        const fuels = Array.from(new Set(samples.map((s) => s.Fuel)));

        const valuesByFuel = fuels.map((fuel) =>
            manufacturers.map((m) => samples.filter((s) => s.Manufacturer === m && s.Fuel === fuel).length),
        );

        const stacked = fuels.map((fuel, i) => ({ subCategory: fuel, values: valuesByFuel[i] }));
        chart.setDataStacked(manufacturers, stacked);
    }, [chart, samples]);

    return <div id={id} style={{ width: "100%", height: "100%" }}></div>;
}