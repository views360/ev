// GRAPH
function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");

    if (chart) chart.destroy();

    const maxMiles = Math.max(core.journeyMiles, core.homeMiles + core.publicMiles);
    const steps = 20;

    const labels = [];
    const adhocData = [];

    for (let i = 0; i <= steps; i++) {
        const m = (maxMiles * i) / steps;
        labels.push(m.toFixed(0));

        const publicMilesAtM = Math.max(0, m - core.homeMiles);
        const publicKwhAtM = publicMilesAtM / core.efficiency;
        const costAdhocAtM = publicKwhAtM * core.adhocRate;

        adhocData.push(costAdhocAtM);
    }

    const datasets = [{
        label: "Ad‑hoc only (£)",
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
            const costSubAtM = p.subCost + (publicKwhAtM * (p.discountPence / 100));

            data.push(costSubAtM);
        }

        datasets.push({
            label: `${p.name} (£)`,
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
                y: { title: { display: true, text: "Total charging cost (£)" }, beginAtZero: true }
            }
        }
    });
}


// SHAREABLE LINK
function shareLink() {
    const core = getCoreInputs();
    if (!core) {
        alert("Please fill in all main inputs first.");
        return;
    }

    const params = new URLSearchParams();

    params.set("jm", core.journeyMiles);
    params.set("bk", core.batteryKwh);
    params.set("soc", core.soc);
    params.set("eff", core.efficiency);
    params.set("adhoc", core.adhocPence);

    let idx = 0;
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;

        const name = document.getElementById(`name${id}`).value.trim();
        const subCost = document.getElementById(`subCost${id}`).value;
        const discount = document.getElementById(`discount${id}`).value;

        if (!name || !subCost || !discount) return;

        params.set(`p${idx}n`, name);
        params.set(`p${idx}s`, subCost);
        params.set(`p${idx}r`, discount);

        idx++;
    });

    const base = window.location.href.split("?")[0];
    const url = `${base}?${params.toString()}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
            () => alert("Link copied to clipboard."),
            () => prompt("Copy this link:", url)
        );
    } else {
        prompt("Copy this link:", url);
    }
}


// LOAD FROM URL
function loadFromParams() {
    const params = new URLSearchParams(window.location.search);

    if (!params.has("jm")) return;

    const setVal = (id, key) => {
        const v = params.get(key);
        if (v !== null) document.getElementById(id).value = v;
    };

    setVal("journeyMiles", "jm");
    setVal("batteryKwh", "bk");
    setVal("soc", "soc");
    setVal("efficiency", "eff");
    setVal("adhoc", "adhoc");

    let idx = 0;
    while (true) {
        const name = params.get(`p${idx}n`);
        const sub = params.get(`p${idx}s`);
        const rate = params.get(`p${idx}r`);

        if (!name || !sub || !rate) break;

        createProviderBox();
        const id = providerCount;

        document.getElementById(`name${id}`).value = name;
        document.getElementById(`subCost${id}`).value = sub;
        document.getElementById(`discount${id}`).value = rate;

        idx++;
    }

    calculate();
}


// PDF EXPORT
async function exportPdf() {
    const resultsEl = document.getElementById("results");
    if (!resultsEl || resultsEl.style.display === "none") {
        alert("Please enter inputs and providers so results are visible before exporting.");
        return;
    }

    resultsEl.scrollIntoView();
    await new Promise(r => setTimeout(r, 300));

    const { jsPDF } = window.jspdf;

    const canvas = await html2canvas(document.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = canvas.height * imgWidth / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    pdf.save("ev-charging-comparison.pdf");
}


// INITIALISE
["journeyMiles","batteryKwh","soc","efficiency","adhoc"].forEach(id => {
    document.getElementById(id).addEventListener("input", calculate);
});

// Load presets THEN create first provider
fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        if (Array.isArray(data.providers)) {
            PRESETS = data.providers;
        }
    })
    .finally(() => {
        addProvider();
        loadFromParams();
    });