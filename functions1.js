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
            <label>Speed</label>
            <select id="speed${id}" style="display:none;"></select>
            <span id="speedStatic${id}" style="display:none; font-size:0.8rem; color:#9ca3af;">Fastest available</span>
        </div>

        <div class="input-group">
            <label>Subscription cost (£ / month)</label>
            <input type="text" id="subCost${id}" placeholder="e.g., 7.99 or N/A">
        </div>

        <div class="input-group">
            <label id="rateLabel${id}">Subscription discounted rate (pence per kWh)</label>
            <input type="number" id="rate${id}" placeholder="e.g., 49">
        </div>
   `;

    document.getElementById("providers").appendChild(box);

    const presetSelect = document.getElementById(`preset${id}`);
    presetSelect.addEventListener("change", () => applyPreset(id));

    const speedSelect = document.getElementById(`speed${id}`);
    speedSelect.addEventListener("change", () => updateRateFromSpeed(id));

    box.querySelectorAll("input").forEach(i => i.addEventListener("input", calculate));

    if (preset) {
        presetSelect.value = preset.name;
        applyPreset(id);
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

    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (!box) return;

    const nameInput = document.getElementById(`name${id}`);
    const subInput = document.getElementById(`subCost${id}`);
    const rateLabel = document.getElementById(`rateLabel${id}`);
    const speedSelect = document.getElementById(`speed${id}`);
    const speedStatic = document.getElementById(`speedStatic${id}`);
    const rateInput = document.getElementById(`rate${id}`);

    nameInput.value = preset.name;

    if (preset.subCost && preset.subCost > 0) {
        subInput.value = preset.subCost;
        rateLabel.textContent = "Subscription discounted rate (pence per kWh)";
    } else {
        subInput.value = "N/A";
        rateLabel.textContent = "Regular rate (pence per kWh)";
    }

    const rates = preset.rates || {};
    const rateKeys = Object.keys(rates);
    box.dataset.rates = JSON.stringify(rates);

    if (rateKeys.length === 1) {
        // Single rate → no dropdown, show "Fastest available"
        speedSelect.style.display = "none";
        speedStatic.style.display = "inline";
        speedStatic.textContent = "Fastest available";

        const key = rateKeys[0];
        rateInput.value = rates[key];
    } else if (rateKeys.length > 1) {
        // Multiple speeds → dropdown
        speedStatic.style.display = "none";
        speedSelect.style.display = "block";
        speedSelect.innerHTML = rateKeys
            .map(k => `<option value="${k}">${k} kW</option>`)
            .join("");

        const firstKey = rateKeys[0];
        speedSelect.value = firstKey;
        rateInput.value = rates[firstKey];
    } else {
        // No rates defined (fallback)
        speedSelect.style.display = "none";
        speedStatic.style.display = "none";
        rateInput.value = "";
    }

    calculate();
}

function updateRateFromSpeed(id) {
    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (!box || !box.dataset.rates) return;

    let rates;
    try {
        rates = JSON.parse(box.dataset.rates);
    } catch {
        return;
    }

    const speedSelect = document.getElementById(`speed${id}`);
    const rateInput = document.getElementById(`rate${id}`);
    if (!speedSelect || !rateInput) return;

    const speedKey = speedSelect.value;
    if (rates && Object.prototype.hasOwnProperty.call(rates, speedKey)) {
        rateInput.value = rates[speedKey];
        calculate();
    }
}

// RESET ALL
function resetAll() {
    // Clear core inputs
    document.getElementById("journeyMiles").value = "";
    document.getElementById("batteryKwh").value = "";
    document.getElementById("soc").value = "";
    document.getElementById("efficiency").value = "";
    document.getElementById("adhoc").value = "";

    // Clear providers
    document.getElementById("providers").innerHTML = "";
    providerCount = 0;

    // Reset results and chart
    if (chart) chart.destroy();
    document.getElementById("results").style.display = "none";

    // Add a fresh empty provider row
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

        const subCostRaw = document.getElementById(`subCost${id}`).value.trim();
        let subCost = parseFloat(subCostRaw);
        if (!subCostRaw || subCostRaw.toUpperCase() === "N/A" || isNaN(subCost)) {
            subCost = 0;
        }

        const ratePence = parseFloat(document.getElementById(`rate${id}`).value);

        if (!name || isNaN(ratePence)) return;

        const discountRate = ratePence / 100;

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
            ratePence
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