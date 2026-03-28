// graph.js
// Extracted from your original functions.js with no logic changes

import { chart } from './state.js';

export function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");
    if (chart) chart.destroy();

    const maxMiles = Math.max(core.journeyMiles * 1.2, 300);
    const labels = Array.from({length: 11}, (_, i) => Math.round((maxMiles * i) / 10));

    const adhocData = labels.map(m => {
        const pKwh = Math.max(0, m - (core.soc/100 * core.batteryKwh * core.efficiency)) / core.efficiency;
        return (core.soc/100 * core.batteryKwh * core.startChargeRate/100) + (pKwh * core.adhoc/100);
    });

    const datasets = [{
        label: "Standard PAYG",
        data: adhocData,
        borderColor: "#f97316",
        borderWidth: 3,
        pointRadius: 0,
        fill: false
    }];

    providers.forEach((p, idx) => {
        const data = labels.map(m => {
            const pKwh = Math.max(0, m - (core.soc/100 * core.batteryKwh * core.efficiency)) / core.efficiency;
            return p.subCost + (core.soc/100 * core.batteryKwh * core.startChargeRate/100) + (pKwh * p.rate/100);
        });

        datasets.push({
            label: p.name,
            data: data,
            borderColor: getProviderColor(p.name, idx),
            borderWidth: 2,
            pointRadius: 0,
            fill: false
        });
    });

    window.chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { title: { display: true, text: 'Total Journey Cost (£)' } },
                x: { title: { display: true, text: 'Distance (Miles)' } }
            },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
        }
    });
}

export function getProviderColor(name, index) {
    const colors = {
        "Be.EV": "#00d1ff",
        "Tesla": "#e81010",
        "BP Pulse": "#00a14b",
        "Shell Recharge": "#ffda00",
        "Osprey": "#f97316"
    };

    if (colors[name]) return colors[name];

    const palette = ["#38bdf8", "#22c55e", "#a855f7", "#ec4899", "#eab308"];
    return palette[index % palette.length];
}