// Load provider presets from external providers.json
let PRESETS = [];
let providerCount = 0;
let chart = null;

// THEME TOGGLE
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById("themeToggle");
    body.classList.toggle("light-mode");
    
    if (body.classList.contains("light-mode")) {
        btn.textContent = "Switch to Dark View";
    } else {
        btn.textContent = "Switch to Light View";
    }
}

// CREATE PROVIDER BOX
function createProviderBox(preset) {
    providerCount++;
    const id = providerCount;

    const box = document.createElement("div");
    box.className = "provider-box";
    box.dataset.id = id;

    // SORT PRESETS: "Subscription >" first A-Z, then others (Ad-hoc) A-Z
    const sortedPresets = [...PRESETS].sort((a, b) => {
        const aSub = a.name.startsWith("Subscription >");
        const bSub = b.name.startsWith("Subscription >");
        if (aSub && !bSub) return -1;
        if (!aSub && bSub) return 1;
        return a.name.localeCompare(b.name);
    });

    const presetOptions = ['Custom', ...sortedPresets.map(p => p.name)]
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

function removeProvider(id) {
    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (box) box.remove();
    calculate();
}

function addProvider() {
    createProviderBox();
}

function addAllProviders() {
    PRESETS.forEach(p => createProviderBox(p));
}

function duplicateLastProvider() {
    const boxes = document.querySelectorAll(".provider-box");
    if (boxes.length === 0) return;
    const last = boxes[boxes.length - 1];
    const lastId = last.dataset.id;
    
    createProviderBox();
    const newId = providerCount;
    
    document.getElementById(`preset${newId}`).value = document.getElementById(`preset${lastId}`).value;
    document.getElementById(`name${newId}`).value = document.getElementById(`name${lastId}`).value;
    document.getElementById(`subCost${newId}`).value = document.getElementById(`subCost${lastId}`).value;
    document.getElementById(`rate${newId}`).value = document.getElementById(`rate${lastId}`).value;
    
    // Copy speed if applicable
    const speedSelect = document.getElementById(`speed${lastId}`);
    if (speedSelect.style.display !== "none") {
        const newSpeedSelect = document.getElementById(`speed${newId}`);
        newSpeedSelect.style.display = "block";
        document.getElementById(`speedStatic${newId}`).style.display = "none";
        newSpeedSelect.innerHTML = speedSelect.innerHTML;
        newSpeedSelect.value = speedSelect.value;
    }
    
    calculate();
}

function applyPreset(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const nameInput = document.getElementById(`name${id}`);
    const subInput = document.getElementById(`subCost${id}`);
    const rateInput = document.getElementById(`rate${id}`);
    const speedSelect = document.getElementById(`speed${id}`);
    const speedStatic = document.getElementById(`speedStatic${id}`);

    if (presetName === "Custom") {
        nameInput.value = "";
        subInput.value = "";
        rateInput.value = "";
        speedSelect.style.display = "none";
        speedStatic.style.display = "block";
        return;
    }

    const p = PRESETS.find(x => x.name === presetName);
    nameInput.value = p.name;
    subInput.value = p.subCost === 0 ? "N/A" : p.subCost;

    const rateKeys = Object.keys(p.rates);
    if (rateKeys.length === 1 && rateKeys[0] === "default") {
        rateInput.value = p.rates.default;
        speedSelect.style.display = "none";
        speedStatic.style.display = "block";
    } else {
        speedSelect.style.display = "block";
        speedStatic.style.display = "none";
        speedSelect.innerHTML = rateKeys.map(k => `<option value="${k}">${k} kW</option>`).join("");
        updateRateFromSpeed(id);
    }
}

function updateRateFromSpeed(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const speed = document.getElementById(`speed${id}`).value;
    const p = PRESETS.find(x => x.name === presetName);
    document.getElementById(`rate${id}`).value = p.rates[speed];
    calculate();
}

function calculate() {
    const miles = parseFloat(document.getElementById("journeyMiles").value);
    const battery = parseFloat(document.getElementById("batteryKwh").value);
    const soc = parseFloat(document.getElementById("soc").value);
    const efficiency = parseFloat(document.getElementById("efficiency").value);
    const adhocRate = parseFloat(document.getElementById("adhoc").value);
    const startRate = parseFloat(document.getElementById("startChargeRate").value);
    const startType = document.getElementById("startChargeType").value;

    if (isNaN(miles) || isNaN(battery) || isNaN(soc) || isNaN(efficiency) || isNaN(adhocRate)) {
        document.getElementById("results").style.display = "none";
        return;
    }

    // Standard calcs
    const startChargeKwh = (soc / 100) * battery;
    const startChargeCost = (startChargeKwh * (startRate / 100));
    const initialRange = startChargeKwh * efficiency;
    
    const publicMiles = Math.max(0, miles - initialRange);
    const publicKwh = publicMiles / efficiency;
    const totalAdhocCost = startChargeCost + (publicKwh * (adhocRate / 100));

    // Update basic lines
    document.getElementById("preChargeLine").innerHTML = `Initial charge in battery: <span class="highlight">${startChargeKwh.toFixed(1)} kWh</span> (Cost: £${startChargeCost.toFixed(2)})`;
    document.getElementById("homeRangeLine").innerHTML = `Distance covered by initial charge: <span class="highlight">${initialRange.toFixed(0)} miles</span>`;
    document.getElementById("publicMilesLine").innerHTML = `Public charging distance needed: <span class="highlight">${publicMiles.toFixed(0)} miles</span>`;
    document.getElementById("publicKwhLine").innerHTML = `Public charging energy needed: <span class="highlight">${publicKwh.toFixed(1)} kWh</span>`;
    document.getElementById("adhocCostLine").innerHTML = `Total journey cost at your <span class="highlight">standard ad-hoc rate</span>: <span class="highlight">£${totalAdhocCost.toFixed(2)}</span>`;

    // Process providers
    const providers = [];
    const boxes = document.querySelectorAll(".provider-box");
    boxes.forEach(box => {
        const bid = box.dataset.id;
        const name = document.getElementById(`name${bid}`).value || `Provider #${bid}`;
        let sub = document.getElementById(`subCost${bid}`).value;
        sub = (sub === "N/A" || sub === "") ? 0 : parseFloat(sub);
        const rate = parseFloat(document.getElementById(`rate${bid}`).value);

        if (!isNaN(rate)) {
            const costWithSub = startChargeCost + sub + (publicKwh * (rate / 100));
            const savings = totalAdhocCost - costWithSub;
            
            // Break even trip miles: SubCost = (AdHocRate - SubRate) * (Miles / Efficiency)
            // Miles = (SubCost * Efficiency) / (AdHocRate - SubRate)
            let breakEvenTripMiles = Infinity;
            if (adhocRate > rate && sub > 0) {
                breakEvenTripMiles = (sub * efficiency) / ((adhocRate - rate) / 100);
            }

            providers.push({ name, totalJourneyCost: costWithSub, savings, breakEvenTripMiles });
        }
    });

    if (providers.length === 0) {
        document.getElementById("providerResults").innerHTML = "";
        document.getElementById("results").style.display = "block";
        drawGraph({ journeyMiles: miles, homeMiles: initialRange, efficiency, adhocRate, startChargeCost, totalAdhocCost }, []);
        return;
    }

    const sortMode = document.getElementById("sortResults").value;
    if (sortMode === "cheapest") {
        providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    } else if (sortMode === "az") {
        providers.sort((a, b) => a.name.localeCompare(b.name));
    } else {
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
    const bestProvider = providers.reduce((a, b) => (a.totalJourneyCost < b.totalJourneyCost ? a : b));
    const summaryBox = document.getElementById("summaryBox");
    const conclusionsBox = document.getElementById("conclusionsBox");
    
    let conclusionHTML = "";
    const core = { journeyMiles: miles, homeMiles: initialRange, efficiency, adhocRate, startChargeCost, totalAdhocCost };
    
    const locationDisclaimer = `<p class="disclaimer">Note: While pricing is important, remember to check charger locations. A subscription is only cost-effective if you can actually use their network!</p>`;

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

function resetAll() {
    window.location.href = window.location.pathname;
}