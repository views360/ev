// ===============================
// functions3.js
// Graphing Engine (Corrected)
// ===============================

function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");
    if (chart) chart.destroy();

    const maxMiles = Math.max(core.journeyMiles, 500);
    const steps = 20;

    const labels = [];
    const adhocData = [];

    // -------------------------------
    // BUILD AD-HOC LINE
    // -------------------------------
    for (let i = 0; i <= steps; i++) {
        const m = (maxMiles * i) / steps;
        labels.push(m.toFixed(0));

        const publicMilesAtM = Math.max(0, m - core.homeMiles);
        const publicKwhAtM = publicMilesAtM / core.efficiency;

        adhocData.push(
            core.startChargeCost +
            (publicKwhAtM * core.adhocRate / 100)
        );
    }

    const datasets = [{
        label: "Ad‑hoc Total (£)",
        data: adhocData,
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.15)",
        tension: 0.2
    }];

    // -------------------------------
    // PROVIDER LINES (PURE DATA — NO DOM LOOKUPS)
    // -------------------------------
    providers.forEach((p, idx) => {
        const colors = [
            "#38bdf8", "#4ade80", "#a855f7",
            "#facc15", "#f472b6", "#22c55e"
        ];
        const color = colors[idx % colors.length];

        const data = [];
        const sub = p.sub || 0;
        const rate = p.rate;

        for (let i = 0; i <= steps; i++) {
            const m = (maxMiles * i) / steps;

            const publicMilesAtM = Math.max(0, m - core.homeMiles);
            const publicKwhAtM = publicMilesAtM / core.efficiency;

            data.push(
                core.startChargeCost +
                sub +
                (publicKwhAtM * rate / 100)
            );
        }

        datasets.push({
            label: `${p.name} (£)`,
            data,
            borderColor: color,
            tension: 0.2
        });
    });

    // -------------------------------
    // RENDER CHART
    // -------------------------------
    chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.body)
                            .getPropertyValue("--text")
                            .trim()
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Trip Miles",
                        color: "#9ca3af"
                    },
                    ticks: { color: "#9ca3af" },
                    grid: { color: "rgba(31, 41, 55, 0.5)" }
                },
                y: {
                    title: {
                        display: true,
                        text: "Total Cost (£)",
                        color: "#9ca3af"
                    },
                    ticks: { color: "#9ca3af" },
                    grid: { color: "rgba(31, 41, 55, 0.5)" }
                }
            }
        }
    });
}