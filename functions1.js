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
            <select id="speed${id}" class="speed-select" style="display:none;"></select>
            <input id="speedStatic${id}" class="speed-static" style="display:block;" disabled value="Fastest available">
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

    document.getElementById(`preset${id}`).addEventListener("change", () => applyPreset(id));
    document.getElementById(`speed${id}`).addEventListener("change", () => updateRateFromSpeed(id));
    box.querySelectorAll("input, select").forEach(i => i.addEventListener("input", calculate));

    if (preset) {
        document.getElementById(`preset${id}`).value = preset.name;
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

function addAllProviders() {
    PRESETS.forEach(preset => createProviderBox(preset));
    calculate();
}

function duplicateLastProvider() {
    const boxes = document.querySelectorAll(".provider-box");
    if (boxes.length === 0) return;

    const last = boxes[boxes.length - 1];
    const idOld = last.dataset.id;

    const presetName = document.getElementById(`preset${idOld}`).value;
    const name = document.getElementById(`name${idOld}`).value;
    const subCost = document.getElementById(`subCost${idOld}`).value;
    const rate = document.getElementById(`rate${idOld}`).value;

    createProviderBox();
    const idNew = providerCount;
    document.getElementById(`preset${idNew}`).value = presetName;
    applyPreset(idNew);
    document.getElementById(`name${idNew}`).value = name;
    document.getElementById(`subCost${idNew}`).value = subCost;
    document.getElementById(`rate${idNew}`).value = rate;
    calculate();
}

function applyPreset(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const preset = PRESETS.find(p => p.name === presetName);
    if (!preset) return;

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
    document.querySelector(`.provider-box[data-id="${id}"]`).dataset.rates = JSON.stringify(rates);

    if (rateKeys.length <= 1) {
        speedSelect.style.display = "none";
        speedStatic.style.display = "block";
        speedStatic.value = "Fastest available";
        const key = rateKeys[0];
        rateInput.value = rates[key] || "";
    } else {
        speedStatic.style.display = "none";
        speedSelect.style.display = "block";
        speedSelect.innerHTML = rateKeys.map(k => `<option value="${k}">${k} kW</option>`).join("");
        const firstKey = rateKeys[0];
        speedSelect.value = firstKey;
        rateInput.value = rates[firstKey];
    }
    calculate();
}

function updateRateFromSpeed(id) {
    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (!box || !box.dataset.rates) return;
    const rates = JSON.parse(box.dataset.rates);
    const speedKey = document.getElementById(`speed${id}`).value;
    if (rates[speedKey] !== undefined) {
        document.getElementById(`rate${id}`).value = rates[speedKey];
        calculate();
    }
}

function resetAll() {
    ["journeyMiles","batteryKwh","soc","efficiency","adhoc","startChargeRate"].forEach(id => {
        document.getElementById(id).value = "";
    });
    document.getElementById("providers").innerHTML = "";
    providerCount = 0;
    if (chart) chart.destroy();
    document.getElementById("results").style.display = "none";
    addProvider();
}

function getCoreInputs() {
    const journeyMiles = parseFloat(document.getElementById("journeyMiles").value);
    const batteryKwh = parseFloat(document.getElementById("batteryKwh").value);
    const soc = parseFloat(document.getElementById("soc").value);
    const efficiency = parseFloat(document.getElementById("efficiency").value);
    const adhocPence = parseFloat(document.getElementById("adhoc").value);
    const startRatePence = parseFloat(document.getElementById("startChargeRate").value) || 0;

    if (!journeyMiles || !batteryKwh || isNaN(soc) || !efficiency || !adhocPence) return null;

    const usableKwhAtStart = batteryKwh * (soc / 100);
    const startChargeCost = usableKwhAtStart * (startRatePence / 100);
    const homeMiles = usableKwhAtStart * efficiency;
    const publicMiles = Math.max(0, journeyMiles - homeMiles);
    const publicKwh = publicMiles / efficiency;
    const adhocRate = adhocPence / 100;
    const adhocPublicCost = publicKwh * adhocRate;
    const totalAdhocCost = startChargeCost + adhocPublicCost;

    return {
        journeyMiles, batteryKwh, soc, efficiency, adhocPence, startRatePence,
        usableKwhAtStart, startChargeCost, homeMiles, publicMiles, publicKwh, adhocRate, totalAdhocCost
    };
}

function calculate() {
    const core = getCoreInputs();
    if (!core) {
        document.getElementById("results").style.display = "none";
        return;
    }

    const startType = document.getElementById("startChargeType").value === "home" ? "Home" : "Public";
    document.getElementById("preChargeLine").innerHTML = `Initial charge cost (${startType}): <span class="highlight">£${core.startChargeCost.toFixed(2)}</span>`;
    document.getElementById("homeRangeLine").innerHTML = `Estimated range from initial charge: <span class="highlight">${core.homeMiles.toFixed(0)} miles</span>`;
    document.getElementById("publicMilesLine").innerHTML = `Miles requiring public charging: <span class="highlight">${core.publicMiles.toFixed(0)} miles</span>`;
    document.getElementById("publicKwhLine").innerHTML = `Energy required from public charging: <span class="highlight">${core.publicKwh.toFixed(1)} kWh</span>`;
    document.getElementById("adhocCostLine").innerHTML = `Total journey cost (Ad-hoc): <span class="highlight">£${core.totalAdhocCost.toFixed(2)}</span>`;

    let providers = [];
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value.trim();
        const subCostRaw = document.getElementById(`subCost${id}`).value.trim();
        let subCost = parseFloat(subCostRaw) || 0;
        const ratePence = parseFloat(document.getElementById(`rate${id}`).value);
        if (!name || isNaN(ratePence)) return;

        const discountRate = ratePence / 100;
        const publicCostWithSub = subCost + (core.publicKwh * discountRate);
        const totalJourneyCost = core.startChargeCost + publicCostWithSub;
        
        const breakEvenKwh = (core.adhocRate > discountRate) ? subCost / (core.adhocRate - discountRate) : Infinity;
        const breakEvenTripMiles = breakEvenKwh === Infinity ? Infinity : (breakEvenKwh * core.efficiency) + core.homeMiles;

        providers.push({
            name, totalJourneyCost, breakEvenTripMiles, subCost, ratePence,
            savings: core.totalAdhocCost - totalJourneyCost
        });
    });

    if (providers.length === 0) {
        document.getElementById("results").style.display = "none";
        return;
    }

    // UPDATE SORTING LOGIC
    const sortMode = document.getElementById("sortResults")?.value || "cheapest";
    if (sortMode === "cheapest") {
        providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    } else if (sortMode === "az") {
        providers.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "za") {
        providers.sort((a, b) => b.name.localeCompare(a.name));
    }

    const providerResults = document.getElementById("providerResults");
    providerResults.innerHTML = "";
    providers.forEach(p => {
        const beText = p.breakEvenTripMiles === Infinity ? "Never" : `${p.breakEvenTripMiles.toFixed(0)} miles`;
        providerResults.innerHTML += `
            <div class="result-line">
                <span class="highlight">${p.name}</span> — 
                Total Journey Cost: £${p.totalJourneyCost.toFixed(2)} | 
                Break‑even Trip Distance: ${beText}
                <i class="info-icon">i
                    <span class="tooltip-text">The trip distance where savings from the discounted rate fully offset the subscription fee, making this plan cheaper than ad‑hoc.</span>
                </i> | 
                Savings vs Ad‑hoc: £${p.savings.toFixed(2)}
            </div>`;
    });

    document.getElementById("results").style.display = "block";
    
    // Determine the overall winner
    const bestProvider = providers.reduce((a, b) => (a.totalJourneyCost < b.totalJourneyCost ? a : b));
    const summaryBox = document.getElementById("summaryBox");
    const conclusionsBox = document.getElementById("conclusionsBox");

    let conclusionHTML = `<h3>Conclusions</h3>`;
    const locationDisclaimer = `<p class="disclaimer"><strong>Note:</strong> Please verify that your chosen provider has sufficient charging locations along your planned route. A subscription is only cost-effective if you can actually use their network!</p>`;

    if (bestProvider.totalJourneyCost < core.totalAdhocCost) {
        summaryBox.className = "summary good";
        summaryBox.textContent = `${bestProvider.name} is cheapest for this trip (saves £${bestProvider.savings.toFixed(2)} vs Ad‑hoc).`;
        
        conclusionHTML += `<div class="conclusion-card good">
            <p>For a trip of <strong>${core.journeyMiles} miles</strong>, taking a subscription with <strong>${bestProvider.name}</strong> is the most cost-effective option.</p>
            <p>The total cost including the subscription fee is <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>, saving you <strong>£${bestProvider.savings.toFixed(2)}</strong> compared to standard ad-hoc charging.</p>
        </div>`;
    } else {
        summaryBox.className = "summary bad";
        summaryBox.textContent = `Ad‑hoc charging is cheaper for this specific trip distance.`;
        
        conclusionHTML += `<div class="conclusion-card bad">
            <p>Standard <strong>Ad-hoc charging</strong> is the most cost-effective choice for this trip.</p>
            <p>With a trip distance of only ${core.journeyMiles} miles, the savings from any subscription discount do not yet cover the fixed monthly subscription fee.</p>
        </div>`;
    }

    conclusionHTML += locationDisclaimer;
    conclusionsBox.innerHTML = conclusionHTML;

    drawGraph(core, providers);
}