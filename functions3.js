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
                legend: { labels: { color: getComputedStyle(document.body).getPropertyValue("--text").trim() } }
            }
        }
    });
}

function getProviderColor(name) {
    const colors = ["#38bdf8", "#818cf8", "#c084fc", "#fb7185", "#34d399", "#fbbf24"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}