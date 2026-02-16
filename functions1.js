// ===============================
// functions1.js
// UI + Provider Box Logic
// ===============================

// Global state shared across modules
let PRESETS = [];
let providerCount = 0;
let chart = null;

// -------------------------------
// THEME TOGGLE
// -------------------------------
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById("themeToggle");
    body.classList.toggle("light-mode");

    btn.textContent = body.classList.contains("light-mode")
        ? "Switch to Dark View"
        : "Switch to Light View";
}

// -------------------------------
// CREATE PROVIDER BOX
// -------------------------------
function createProviderBox(preset) {
    providerCount++;
    const id = providerCount;

    const box = document.createElement("div");
    box.className = "provider-box";
    box.dataset.id = id;

    // Sort presets: subscription first, then others
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

    // Explicitly: when preset changes, apply preset THEN recalc
    document.getElementById(`preset${id}`).addEventListener("change", () => {
        applyPreset(id);
        calculate();
    });

    document.getElementById(`speed${id}`).addEventListener("change", () => {
        updateRateFromSpeed(id);
    });

    // Other inputs still trigger calculate on change
    box.querySelectorAll("input, select").forEach(el => {
        if (el.id !== `preset${id}` && el.id !== `speed${id}`) {
            el.addEventListener("input", calculate);
        }
    });

    // Apply preset if provided
    if (preset) {
        document.getElementById(`preset${id}`).value = preset.name;
        applyPreset(id);
        calculate();
    }
}

// -------------------------------
// REMOVE PROVIDER
// -------------------------------
function removeProvider(id) {
    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (box) box.remove();
    calculate();
}

// -------------------------------
// ADD PROVIDER
// -------------------------------
function addProvider() {
    createProviderBox();
}

// -------------------------------
// ADD ALL PROVIDERS
// -------------------------------
function addAllProviders() {
    PRESETS.forEach(p => createProviderBox(p));
}

// -------------------------------
// DUPLICATE LAST PROVIDER
// -------------------------------
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

// -------------------------------
// APPLY PRESET
// -------------------------------
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
    if (!p) return;

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
        speedSelect.innerHTML = rateKeys
            .map(k => `<option value="${k}">${k} kW</option>`)
            .join("");
        updateRateFromSpeed(id);
    }
}

// -------------------------------
// UPDATE RATE WHEN SPEED CHANGES
// -------------------------------
function updateRateFromSpeed(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const speed = document.getElementById(`speed${id}`).value;
    const p = PRESETS.find(x => x.name === presetName);
    if (!p) return;

    document.getElementById(`rate${id}`).value = p.rates[speed];
    calculate();
}
