// ===============================
// functions1.js
// UI + Provider Box Logic
// ===============================

let PRESETS = [];
let providerCount = 0;
let chart = null;

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById("themeToggle");
    body.classList.toggle("light-mode");
    btn.textContent = body.classList.contains("light-mode") ? "Switch to Dark View" : "Switch to Light View";
}

/**
 * Creates a provider input box. 
 * If a preset is passed, it populates the fields automatically.
 */
function createProviderBox(preset) {
    providerCount++;
    const id = providerCount;
    const box = document.createElement("div");
    box.className = "provider-box";
    box.dataset.id = id;

    // Filter and sort presets based on minimum speed before showing in the dropdown
    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
    
    const filteredPresets = PRESETS.filter(p => {
        if (p.rates && p.rates.default) return true;
        const speeds = Object.keys(p.rates).map(Number);
        return speeds.some(s => s >= minSpeed);
    });

    const sortedPresets = [...filteredPresets].sort((a, b) => {
        const aSub = a.name.startsWith("Subscription >");
        const bSub = b.name.startsWith("Subscription >");
        if (aSub && !bSub) return -1;
        if (!aSub && bSub) return 1;
        return a.name.localeCompare(b.name);
    });

    const presetOptions = ['Custom', ...sortedPresets.map(p => p.name)]
        .map(name => `<option value="${name}">${name}</option>`).join("");

    box.innerHTML = `
        <div class="provider-header">
            <input type="text" id="name${id}" placeholder="Provider Name" oninput="calculate()">
            <button class="remove-btn" onclick="removeProvider(${id})">×</button>
        </div>
        
        <div class="grid-3">
            <div class="input-group">
                <label>Preset</label>
                <select id="preset${id}" onchange="applyPreset(${id})">
                    ${presetOptions}
                </select>
            </div>
            <div class="input-group">
                <label>Monthly Fee (£)</label>
                <input type="number" id="subCost${id}" value="0" step="0.01" oninput="calculate()">
            </div>
            <div class="input-group">
                <label>Rate (p/kWh)</label>
                <input type="number" id="rate${id}" value="79" oninput="calculate()">
            </div>
        </div>

        <div id="speedRow${id}" class="input-group" style="display:none; margin-top:10px;">
            <label>Charger Speed</label>
            <select id="speed${id}" onchange="updateRateFromSpeed(${id})"></select>
        </div>
    `;

    document.getElementById("providers").appendChild(box);

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

function applyPreset(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const nameInput = document.getElementById(`name${id}`);
    const subInput = document.getElementById(`subCost${id}`);
    const rateInput = document.getElementById(`rate${id}`);
    const speedRow = document.getElementById(`speedRow${id}`);
    const speedSelect = document.getElementById(`speed${id}`);

    if (presetName === "Custom") {
        speedRow.style.display = "none";
        calculate();
        return;
    }

    const p = PRESETS.find(x => x.name === presetName);
    if (!p) return;

    nameInput.value = p.name;
    subInput.value = p.subCost;

    if (p.rates && !p.rates.default) {
        speedRow.style.display = "block";
        speedSelect.innerHTML = Object.keys(p.rates)
            .map(s => `<option value="${s}">${s}kW</option>`)
            .join("");
        
        // Trigger speed enforcement immediately
        enforceSpeedRules();
    } else {
        rateInput.value = p.rates.default;
        speedRow.style.display = "none";
    }
    calculate();
}

function updateRateFromSpeed(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const speed = document.getElementById(`speed${id}`).value;
    const p = PRESETS.find(x => x.name === presetName);
    if (p && p.rates) {
        document.getElementById(`rate${id}`).value = p.rates[speed];
    }
    calculate();
}

function enforceSpeedRules() {
    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const speedSelect = document.getElementById(`speed${id}`);
        if (!speedSelect || speedSelect.offsetParent === null) return;

        let firstValidValue = null;
        [...speedSelect.options].forEach(opt => {
            const val = parseFloat(opt.value);
            const isInvalid = val < minSpeed;
            opt.disabled = isInvalid;
            if (!isInvalid && firstValidValue === null) firstValidValue = opt.value;
        });

        // If current selection is now disabled, switch to first valid speed
        if (speedSelect.selectedOptions[0].disabled && firstValidValue !== null) {
            speedSelect.value = firstValidValue;
            updateRateFromSpeed(id);
        }
    });
}

function addSubscriptionPresets() {
    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;

    PRESETS.forEach(preset => {
        if (!preset.name.startsWith("Subscription >")) return;

        let canSupportSpeed = false;
        if (preset.rates.default) {
            canSupportSpeed = true; 
        } else {
            const speeds = Object.keys(preset.rates).map(Number);
            canSupportSpeed = speeds.some(s => s >= minSpeed);
        }

        if (canSupportSpeed) {
            createProviderBox(preset);
        }
    });
    calculate();
}

function duplicateLastProvider() {
    const boxes = document.querySelectorAll(".provider-box");
    if (boxes.length === 0) return;

    const lastBox = boxes[boxes.length - 1];
    const lastId = lastBox.dataset.id;
    
    createProviderBox();
    const newId = providerCount;

    document.getElementById(`name${newId}`).value = document.getElementById(`name${lastId}`).value;
    document.getElementById(`preset${newId}`).value = document.getElementById(`preset${lastId}`).value;
    document.getElementById(`subCost${newId}`).value = document.getElementById(`subCost${lastId}`).value;
    document.getElementById(`rate${newId}`).value = document.getElementById(`rate${lastId}`).value;
    
    const lastSpeed = document.getElementById(`speed${lastId}`);
    if (lastSpeed && lastSpeed.offsetParent !== null) {
        const newSpeed = document.getElementById(`speed${newId}`);
        document.getElementById(`speedRow${newId}`).style.display = "block";
        newSpeed.innerHTML = lastSpeed.innerHTML;
        newSpeed.value = lastSpeed.value;
    }
    calculate();
}