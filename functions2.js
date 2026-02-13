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
        adhocData.push(core.startChargeCost + (publicKwhAtM * core.adhocRate));
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

        for (let i = 0; i <= steps; i++) {
            const m = (maxMiles * i) / steps;
            const publicMilesAtM = Math.max(0, m - core.homeMiles);
            const publicKwhAtM = publicMilesAtM / core.efficiency;
            data.push(core.startChargeCost + p.subCost + (publicKwhAtM * (p.ratePence / 100)));
        }

        datasets.push({
            label: `${p.name} Total (£)`,
            data,
            borderColor: color,
            backgroundColor: "transparent",
            tension: 0.2
        });
    });

    chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            interaction: { mode: "index", intersect: false },
            scales: {
                x: { title: { display: true, text: "Trip distance (miles)" } },
                y: { title: { display: true, text: "Total Journey Cost (£)" }, beginAtZero: true }
            }
        }
    });
}

// SHAREABLE LINK (Updated to include new starting charge params)
function shareLink() {
    const core = getCoreInputs();
    if (!core) { alert("Please fill in inputs first."); return; }

    const params = new URLSearchParams();
    params.set("jm", core.journeyMiles);
    params.set("bk", core.batteryKwh);
    params.set("soc", core.soc);
    params.set("eff", core.efficiency);
    params.set("adhoc", core.adhocPence);
    params.set("src", core.startRatePence);
    params.set("st", document.getElementById("startChargeType").value);

    let idx = 0;
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value.trim();
        const subCost = document.getElementById(`subCost${id}`).value;
        const rate = document.getElementById(`rate${id}`).value;
        if (!name || !subCost || !rate) return;
        params.set(`p${idx}n`, name);
        params.set(`p${idx}s`, subCost);
        params.set(`p${idx}r`, rate);
        idx++;
    });

    const url = `${window.location.href.split("?")[0]}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
}

// LOAD FROM URL
function loadFromParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("jm")) return;

    document.getElementById("journeyMiles").value = params.get("jm");
    document.getElementById("batteryKwh").value = params.get("bk");
    document.getElementById("soc").value = params.get("soc");
    document.getElementById("efficiency").value = params.get("eff");
    document.getElementById("adhoc").value = params.get("adhoc");
    document.getElementById("startChargeRate").value = params.get("src") || "";
    document.getElementById("startChargeType").value = params.get("st") || "home";

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
    const canvas = await html2canvas(document.body, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    pdf.addImage(imgData, "PNG", 0, 0, width, (canvas.height * width) / canvas.width);
    pdf.save("ev-calc.pdf");
}

// INITIALISE
["journeyMiles","batteryKwh","soc","efficiency","adhoc","startChargeRate","startChargeType"].forEach(id => {
    document.getElementById(id).addEventListener("input", calculate);
});

fetch("providers.json")
    .then(r => r.json())
    .then(data => { if (Array.isArray(data.providers)) PRESETS = data.providers; })
    .finally(() => { 
        if (!window.location.search) addProvider(); 
        loadFromParams(); 
    });
