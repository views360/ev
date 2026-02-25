// ===============================
// functions3.js
// Graphing Engine
// ===============================

function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");
    if (chart) chart.destroy();

    const maxMiles = Math.max(core.journeyMiles, 500);
    const steps = 20;
    const labels = [];
    const adhocData = [];

    for (let i = 0; i <= steps; i++) {
        const m = (maxMiles * i) / steps;
        labels.push(m.toFixed(0));
        const publicKwhAtM = Math.max(0, m - core.homeRange) / core.efficiency;
        adhocData.push(core.startChargeCost + (publicKwhAtM * core.adhocRate / 100));
    }

    const datasets = [{
        label: "Ad‑hoc Total (£)",
        data: adhocData,
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.15)",
        tension: 0.2
    }];

    providers.forEach(p => {
        const activeRate = p.rate;
        if (isNaN(activeRate)) return;

        const data = [];
        for (let i = 0; i <= steps; i++) {
            const m = (maxMiles * i) / steps;
            const publicKwhAtM = Math.max(0, m - core.homeRange) / core.efficiency;
            data.push(p.subCost + core.startChargeCost + (publicKwhAtM * activeRate / 100));
        }

        datasets.push({
            label: `${p.name} (£)`,
            data,
            borderColor: getProviderColor(p.name),
            tension: 0.2
        });
    });

    chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: "Trip Miles", color: "#9ca3af" }, ticks: { color: "#9ca3af" } },
                y: { title: { display: true, text: "Total Cost (£)", color: "#9ca3af" }, ticks: { color: "#9ca3af" } }
            },
            plugins: {
                legend: { 
                    display: true, // Ensures the toggle legend is visible
                    labels: { 
                        color: getComputedStyle(document.body).getPropertyValue("--text").trim() 
                    },
                    // Chart.js default onClick handles the toggling of lines
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        if (ci.isDatasetVisible(index)) {
                            ci.hide(index);
                            legendItem.hidden = true;
                        } else {
                            ci.show(index);
                            legendItem.hidden = false;
                        }
                    }
                }
            }
        }
    });
}

function getProviderColor(name) {
    const colors = {
        "Be.EV": "#00d1ff",
        "Tesla": "#e81010",
        "BP Pulse": "#00a14b",
        "Shell Recharge": "#ffda00",
        "Osprey": "#f97316"
    };
    return colors[name] || `#${Math.floor(Math.random()*16777215).toString(16)}`;
}