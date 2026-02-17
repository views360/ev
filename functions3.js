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
    // PROVIDER LINES (PURE DATA — NO DOM LOOKUP)
    // -------------------------------
    providers.forEach(p => {
        const color = getProviderColor(p.name);
        const data = [];

        // We need to look at the PRESETS to see if they have tiered rates
        const preset = PRESETS.find(pr => pr.name === p.name);

        let activeRate = p.rate;

        // If it's a known preset with tiered speeds (like Pod Point)
        // we check if their highest available speed matches our minimum.
        if (!preset || !preset.rates || preset.rates.default) {
            // Use the rate provided in the object (Be.EV / Custom)
            activeRate = p.rate;
        } else {
            // Logic for Tiered Providers (Pod Point, BP Pulse, etc.)
            const speeds = Object.keys(preset.rates)
                .map(Number)
                .filter(s => s >= core.minSpeed) // FIX: Changed from > to >=
                .sort((a, b) => a - b);

            if (speeds.length === 0) return; // Skip if provider can't meet min speed

            // Use the lowest available rate that meets or exceeds min speed
            activeRate = preset.rates[speeds[0]];
        }

        for (let i = 0; i <= steps; i++) {
            const m = (maxMiles * i) / steps;
            const publicMilesAtM = Math.max(0, m - core.homeMiles);
            const publicKwhAtM = publicMilesAtM / core.efficiency;

            data.push(
                p.subCost +
                core.startChargeCost +
                (publicKwhAtM * activeRate / 100)
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

function getProviderColor(name) {
    if (name.includes("Be.EV")) return "#bef264";
    if (name.includes("Tesla")) return "#f87171";
    if (name.includes("BP Pulse")) return "#22c55e";
    if (name.includes("Shell Recharge")) return "#fbbf24";
    if (name.includes("Pod Point")) return "#38bdf8";
    if (name.includes("Ionity")) return "#a855f7";
    if (name.includes("Osprey")) return "#f472b6";
    if (name.includes("Instavolt")) return "#fb923c";
    return "#94a3b8";
}