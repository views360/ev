// GRAPH
function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");
    if (chart) chart.destroy();

    const maxMiles = Math.max(core.journeyMiles, 500); // Chart at least 500 miles
    const steps = 20;
    const labels = [];
    const adhocData = [];

    for (let i = 0; i <= steps; i++) {
        const m = (maxMiles * i) / steps;
        labels.push(m.toFixed(0));
        const publicMilesAtM = Math.max(0, m - core.homeMiles);
        const publicKwhAtM = publicMilesAtM / core.efficiency;
        adhocData.push(core.startChargeCost + (publicKwhAtM * core.adhocRate / 100));
    }

    const datasets = [{
        label: "Ad‑hoc Total (£)",
        data: adhocData,
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.15)",
        tension: 0.2
    }];

    providers.forEach((p, idx) => {
        const colors = ["#38bdf8", "#4ade80", "#a855f7", "#facc15", "#f472b6", "#22c55e"];
        const color = colors[idx % colors.length];
        const data = [];
        
        // We need sub cost and rate from somewhere. 
        // For simple graphing, we recalculate using the same logic as the table.
        // But since we pass provider objects, let's look for matching elements in the DOM.
        const box = Array.from(document.querySelectorAll(".provider-box")).find(b => {
            return document.getElementById(`name${b.dataset.id}`).value === p.name;
        });

        if (box) {
            const bid = box.dataset.id;
            let sub = document.getElementById(`subCost${bid}`).value;
            sub = (sub === "N/A" || sub === "") ? 0 : parseFloat(sub);
            const rate = parseFloat(document.getElementById(`rate${bid}`).value);

            for (let i = 0; i <= steps; i++) {
                const m = (maxMiles * i) / steps;
                const publicMilesAtM = Math.max(0, m - core.homeMiles);
                const publicKwhAtM = publicMilesAtM / core.efficiency;
                data.push(core.startChargeCost + sub + (publicKwhAtM * rate / 100));
            }

            datasets.push({
                label: `${p.name} (£)`,
                data: data,
                borderColor: color,
                tension: 0.2
            });
        }
    });

    chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text').trim() } }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Trip Miles', color: '#9ca3af' },
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(31, 41, 55, 0.5)' }
                },
                y: {
                    title: { display: true, text: 'Total Cost (£)', color: '#9ca3af' },
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(31, 41, 55, 0.5)' }
                }
            }
        }
    });
}

function shareLink() {
    const params = new URLSearchParams();
    ["journeyMiles","batteryKwh","soc","efficiency","adhoc","startChargeRate","startChargeType"].forEach(id => {
        params.set(id, document.getElementById(id).value);
    });

    const boxes = document.querySelectorAll(".provider-box");
    boxes.forEach((box, i) => {
        const id = box.dataset.id;
        params.set(`p${i}n`, document.getElementById(`name${id}`).value);
        params.set(`p${i}s`, document.getElementById(`subCost${id}`).value);
        params.set(`p${i}r`, document.getElementById(`rate${id}`).value);
    });

    const url = window.location.origin + window.location.pathname + "?" + params.toString();
    navigator.clipboard.writeText(url).then(() => alert("Shareable link copied!"));
}

function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("journeyMiles")) return;

    ["journeyMiles","batteryKwh","soc","efficiency","adhoc","startChargeRate","startChargeType"].forEach(id => {
        if (params.has(id)) document.getElementById(id).value = params.get(id);
    });

    const resultsEl = document.getElementById("results");
    resultsEl.style.display = "none";

    let idx = 0;
    document.getElementById("providers").innerHTML = "";
    while (params.has(`p${idx}n`)) {
        createProviderBox();
        const id = providerCount;
        document.getElementById(`name${id}`).value = params.get(`p${idx}n`);
        document.getElementById(`subCost${id}`).value = params.get(`p${idx}s`);
        document.getElementById(`rate${id}`).value = params.get(`p${idx}r`);
        idx++;
    }
    calculate();
}

async function exportPdf() {
    const resultsEl = document.getElementById("results");
    if (!resultsEl || resultsEl.style.display === "none") {
        alert("Enter data first."); return;
    }
    const { jsPDF } = window.jspdf;
    
    // Scale body slightly for better capture
    const canvas = await html2canvas(document.body, { 
        scale: 2,
        backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg').trim()
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    pdf.addImage(imgData, "PNG", 0, 0, width, (canvas.height * width) / canvas.width);
    pdf.save("ev-charging-comparison.pdf");
}

// INITIALISE
["journeyMiles","batteryKwh","soc","efficiency","adhoc","startChargeRate","startChargeType"].forEach(id => {
    document.getElementById(id).addEventListener("input", calculate);
});

fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        PRESETS = data.providers;
        loadFromUrl();
    });