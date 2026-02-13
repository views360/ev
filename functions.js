// Load provider presets from external providers.json
let PRESETS = [];
let providerCount = 0;
let chart = null;

// Fetch presets from providers.json
fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        if (Array.isArray(data.providers)) {
            PRESETS = data.providers;
        } else {
            console.warn("providers.json missing 'providers' array");
        }
    })
    .finally(() => {
        addProvider();
        loadFromParams();
    });


// CREATE PROVIDER BOX (multi‑rate support)
function createProviderBox(preset) {
    providerCount++;
    const id = providerCount;

    const box = document.createElement("div");
    box.className = "provider-box";
    box.dataset.id = id;

    const presetOptions = ['Custom', ...PRESETS.map(p => p.name)]
        .map(name => `<option value="${name}">${name}</option>`)
        .join("");

    box.innerHTML = `
        <div class="provider-header">
            <span>Provider #${id}</span>
            <div style="display:flex; gap:6px;">
                <button type="button" onclick="duplicateProvider(${id})">Duplicate</button>
                <button type="button" onclick="removeProvider(${id})">Remove</button>
            </div>
        </div>

        <div class="input-group">
            <label>Preset</label>
            <select id="preset${id}">
                ${presetOptions}
            </select>
        </div>

        <div class="input-group">
            <label>Provider name</label>
            <input type="text" id="name${id}">
        </div>

        <div class="input-group">
            <label>Subscription cost (£ / month)</label>
            <input type="number" id="subCost${id}">
        </div>

        <div class="input-group" id="speedGroup${id}" style="display:none;">
            <label>Charging speed</label>
            <select id="speed${id}"></select>
        </div>

        <div class="input-group">
            <label>Discounted rate (pence per kWh)</label>
            <input type="number" id="discount${id}">
        </div>
    `;

    document.getElementById("providers").appendChild(box);

    // Event listeners
    document.getElementById(`preset${id}`).addEventListener("change", () => applyPreset(id));
    document.getElementById(`discount${id}`).addEventListener("input", calculate);

    if (preset) {
        applyPresetValues(id, preset);
    }
}


// Apply preset values (multi‑rate aware)
function applyPresetValues(id, preset) {
    document.getElementById(`name${id}`).value = preset.name;
    document.getElementById(`subCost${id}`).value = preset.subCost;

    const speedGroup = document.getElementById(`speedGroup${id}`);
    const speedSelect = document.getElementById(`speed${id}`);

    const speeds = Object.keys(preset.rates);

    if (speeds.length > 1) {
        speedGroup.style.display = "block";
        speedSelect.innerHTML = speeds
            .map(s => `<option value="${s}">${s} kW</option>`)
            .join("");

        speedSelect.onchange = () => {
            const selected = speedSelect.value;
            document.getElementById(`discount${id}`).value = preset.rates[selected];
            calculate();
        };

        // Default selection
        const defaultSpeed = speeds.includes("default") ? "default" : speeds[0];
        speedSelect.value = defaultSpeed;
        document.getElementById(`discount${id}`).value = preset.rates[defaultSpeed];

    } else {
        speedGroup.style.display = "none";
        const onlyRate = Object.values(preset.rates)[0];
        document.getElementById(`discount${id}`).value = onlyRate;
    }

    calculate();
}


// Called when user selects a preset
function applyPreset(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const preset = PRESETS.find(p => p.name === presetName);
    if (!preset) return;

    applyPresetValues(id, preset);
}


// Add provider
function addProvider() {
    createProviderBox();
    calculate();
}


// Duplicate provider
function duplicateProvider(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const name = document.getElementById(`name${id}`).value;
    const sub = document.getElementById(`subCost${id}`).value;
    const rate = document.getElementById(`discount${id}`).value;

    createProviderBox({
        name,
        subCost: sub,
        rates: { default: rate }
    });

    const newId = providerCount;

    document.getElementById(`preset${newId}`).value = presetName;
    document.getElementById(`name${newId}`).value = name;
    document.getElementById(`subCost${newId}`).value = sub;
    document.getElementById(`discount${newId}`).value = rate;

    calculate();
}


// Remove provider
function removeProvider(id) {
    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (box) box.remove();
    calculate();
}


// RESET ALL
function resetAll() {
    document.getElementById("journeyMiles").value = "";
    document.getElementById("batteryKwh").value = "";
    document.getElementById("soc").value = "";
    document.getElementById("efficiency").value = "";
    document.getElementById("adhoc").value = "";

    document.getElementById("providers").innerHTML = "";
    providerCount = 0;

    if (chart) chart.destroy();
    document.getElementById("results").style.display = "none";

    addProvider();
}


// CORE INPUTS
function getCoreInputs() {
    const journeyMiles = parseFloat(document.getElementById("journeyMiles").value);
    const batteryKwh = parseFloat(document.getElementById("batteryKwh").value);
    const soc = parseFloat(document.getElementById("soc").value);
    const efficiency = parseFloat(document.getElementById("efficiency").value);
    const adhocPence = parseFloat(document.getElementById("adhoc").value);

    if (!journeyMiles || !batteryKwh || !soc || !efficiency || !adhocPence) return null;

    const usableKwhAtStart = batteryKwh * (soc / 100);
    const homeMiles = usableKwhAtStart * efficiency;
    const publicMiles = Math.max(0, journeyMiles - homeMiles);
    const publicKwh = publicMiles / efficiency;
    const adhocRate = adhocPence / 100;
    const adhocCost = publicKwh * adhocRate;

    return {
        journeyMiles,
        batteryKwh,
        soc,
        efficiency,
        adhocPence,
        usableKwhAtStart,
        homeMiles,
        publicMiles,
        publicKwh,
        adhocRate,
        adhocCost
    };
}


// MAIN CALCULATION
function calculate() {
    const core = getCoreInputs();

    const homeRangeLine = document.getElementById("homeRangeLine");
    const publicMilesLine = document.getElementById("publicMilesLine");
    const publicKwhLine = document.getElementById("publicKwhLine");
    const adhocCostLine = document.getElementById("adhocCostLine");

    if (!core) {
        homeRangeLine.textContent = "Enter all trip, battery, efficiency and ad‑hoc fields.";
        publicMilesLine.textContent = "";
        publicKwhLine.textContent = "";
        adhocCostLine.textContent = "";
        document.getElementById("results").style.display = "none";
        if (chart) chart.destroy();
        return;
    }

    homeRangeLine.innerHTML =
        `Estimated range from home charge: <span class="highlight">${core.homeMiles.toFixed(0)} miles</span>`;
    publicMilesLine.innerHTML =
        `Miles requiring public charging: <span class="highlight">${core.publicMiles.toFixed(0)} miles</span>`;
    publicKwhLine.innerHTML =
        `Energy from public charging: <span class="highlight">${core.publicKwh.toFixed(1)} kWh</span>`;
    adhocCostLine.innerHTML =
        `Cost using ad‑hoc only: <span class="highlight">£${core.adhocCost.toFixed(2)}</span>`;

    const providerResults = document.getElementById("providerResults");
    providerResults.innerHTML = "";

    const providers = [];
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value.trim();
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value);
        const discountPence = parseFloat(document.getElementById(`discount${id}`).value);

        if (!name || isNaN(subCost) || isNaN(discountPence)) return;

        const discountRate = discountPence / 100;

        const costWithSub = subCost + (core.publicKwh * discountRate);
        const breakEvenKwh = (core.adhocRate > discountRate)
            ? subCost / (core.adhocRate - discountRate)
            : Infinity;
        const breakEvenMiles = breakEvenKwh * core.efficiency;
        const savings = core.adhocCost - costWithSub;

        providers.push({
            name,
            costWithSub,
            breakEvenMiles,
            savings,
            subCost,
            discountPence
        });

        const beText = (breakEvenMiles === Infinity)
            ? "No break‑even"
            : `${breakEvenMiles.toFixed(0)} miles`;

        providerResults.innerHTML += `
            <div class="result-line">
                <span class="highlight">${name}</span> —
                Cost: £${costWithSub.toFixed(2)},
                Break‑even: ${beText},
                Savings: £${savings.toFixed(2)}
            </div>
        `;
    });

    if (providers.length === 0) {
        document.getElementById("results").style.display = "none";
        if (chart) chart.destroy();
        return;
    }

    document.getElementById("results").style.display = "block";

    const best = providers.reduce((a, b) => (a.costWithSub < b.costWithSub ? a : b));
    const summaryBox = document.getElementById("summaryBox");

    if (best.costWithSub < core.adhocCost) {
        summaryBox.className = "summary good";
        summaryBox.textContent =
            `${best.name} is the cheapest option (saving £${(core.adhocCost - best.costWithSub).toFixed(2)}).`;
    } else {
        summaryBox.className = "summary bad";
        summaryBox.textContent =
            `Ad‑hoc charging is cheaper for this trip.`;
    }

    drawGraph(core, providers);
}


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

        createProviderBox({
            name,
            subCost: sub,
            rates: { default: rate }
        });

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
