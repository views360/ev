// ===============================
// functions3.js
// Graphing Engine (Robust Version)
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
        const publicKwhAtM = Math.max(0, m - core.homeMiles) / core.efficiency;
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
        // Trust the rate currently selected in the UI/Box.
        // This ensures the graph and table are always in sync.
        const activeRate = p.rate;

        if (isNaN(activeRate)) return;

        const data = [];
        for (let i = 0; i <= steps; i++) {
            const m = (maxMiles * i) / steps;
            const publicKwhAtM = Math.max(0, m - core.homeMiles) / core.efficiency;
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
                legend: { labels: { color: getComputedStyle(document.body).getPropertyValue("--text").trim() } }
            }
        }
    });
}

function getProviderColor(name) {
    const colors = {
        "Be.EV": "#bef264",
        "Tesla": "#f87171",
        "BP Pulse": "#22c55e",
        "Shell Recharge": "#fbbf24",
        "Pod Point": "#38bdf8",
        "Ionity": "#a855f7"
    };
    for (const key in colors) {
        if (name.includes(key)) return colors[key];
    }
    return "#94a3b8";
}
