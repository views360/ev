// Load provider presets from external providers.json
let PRESETS = [];
let providerCount = 0;
let chart = null;

// CREATE PROVIDER BOX
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
            <button type="button" onclick="removeProvider(${id})">Remove</button>
        </div>

        <div class="input-group">
            <label>Preset</label>
            <select id="preset${id}">
                ${presetOptions}
            </select>
        </div>

        <div class="input-group">
            <label>Provider name</label>
            <input type="text" id="name${id}" placeholder="e.g., BP Pulse">
        </div>

        <div class="input-group">
            <label>Subscription cost (£ / month)</label>
            <input type="number" id="subCost${id}" placeholder="e.g., 7.99">
        </div>

        <div class="input-group">
            <label>Discounted rate (pence per kWh)</label>
            <input type="number" id="discount${id}" placeholder="e.g., 49">
        </div>
    `;

    document.getElementById("providers").appendChild(box);

    const presetSelect = document.getElementById(`preset${id}`);
    presetSelect.addEventListener("change", () => applyPreset(id));

    box.querySelectorAll("input").forEach(i => i.addEventListener("input", calculate));

    if (preset) {
        presetSelect.value = preset.name;
        document.getElementById(`name${id}`).value = preset.name;
        document.getElementById(`subCost${id}`).value = preset.subCost;
        document.getElementById(`discount${id}`).value = preset.rate;
    }
}

function addProvider() {
    createProviderBox();
    calculate();
}

function removeProvider(id) {
    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (box) box.remove();
    calculate();
}

function applyPreset(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const preset = PRESETS.find(p => p.name === presetName);
    if (!preset) return;

    document.getElementById(`name${id}`).value = preset.name;
    document.getElementById(`subCost${id}`).value = preset.subCost;
    document.getElementById(`discount${id}`).value = preset.rate;

    calculate();
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
        homeRangeLine.textContent = "Enter all trip, battery, efficiency and ad‑hoc fields to see calculations.";
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
        const breakEvenMiles = (breakEvenKwh === Infinity)
            ? Infinity
            : breakEvenKwh * core.efficiency;
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
            ? "No break‑even (discounted rate ≥ ad‑hoc rate)"
            : `${breakEvenMiles.toFixed(0)} miles`;

        providerResults.innerHTML += `
            <div class="result-line">
                <span class="highlight">${name}</span> —
                Cost: £${costWithSub.toFixed(2)},
                Break‑even: ${beText},
                Savings vs ad‑hoc: £${savings.toFixed(2)}
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
            `${best.name} is currently the cheapest option for this trip (saving £${(core.adhocCost - best.costWithSub).toFixed(2)} vs ad‑hoc).`;
    } else {
        summaryBox.className = "summary bad";
        summaryBox.textContent =
            `Ad‑hoc charging is cheaper than any subscription for this trip distance.`;
    }

    drawGraph(core, providers);
}