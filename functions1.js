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
    btn.textContent = body.classList.contains("light-mode") ? "Switch to Light View" : "Switch to Light View";
}

function createProviderBox(preset) {
    providerCount++;
    const id = providerCount;
    const box = document.createElement("div");
    box.className = "provider-box";
    box.dataset.id = id;

    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
    
    // Filter: Show provider if it has a default rate (assumed ultra-fast) 
    // OR if it has at least one specific speed >= minSpeed
    const filteredPresets = PRESETS.filter(p => {
        if (p.rates && p.rates.default) return true;
        const speeds = Object.keys(p.rates).map(Number);
        return speeds.some(s => s >= minSpeed);
    });

    const sortedPresets = [...filteredPresets].sort((a, b) => {
        const aSub = a.subscription.hasSubscription;
        const bSub = b.subscription.hasSubscription;
        if (aSub && !bSub) return -1;
        if (!aSub && bSub) return 1;
        return a.name.localeCompare(b.name);
    });

    const presetOptions = ['Custom', ...sortedPresets.map(p => p.name)]
        .map(name => `<option value="${name}">${name}</option>`).join("");

    box.innerHTML = `
        <div class="provider-header">
            <input type="text" id="name${id}" placeholder="Provider Name" oninput="calculate()">
            <button class="remove-btn" onclick="this.parentElement.parentElement.remove(); calculate();">×</button>
        </div>
        <div class="input-group">
            <label>Preset</label>
            <select id="preset${id}" onchange="updateProviderFields(${id})">${presetOptions}</select>
        </div>
        <div class="input-row">
            <div class="input-group">
                <label>Monthly Sub (£)</label>
                <input type="number" id="subCost${id}" step="0.01" value="0" oninput="calculate()">
            </div>
            <div class="input-group">
                <label>Rate (p/kWh)</label>
                <input type="number" id="rate${id}" step="0.1" value="0" oninput="calculate()">
            </div>
        </div>
        <div class="input-group" id="speedRow${id}" style="display:none">
            <label>Charging Speed</label>
            <select id="speed${id}" onchange="updateRateFromSpeed(${id})"></select>
        </div>
    `;

    document.getElementById("providers").appendChild(box);
    
    if (preset) {
        const select = document.getElementById(`preset${id}`);
        select.value = preset.name;
        updateProviderFields(id);
    }
}

function updateProviderFields(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const nameInput = document.getElementById(`name${id}`);
    const subCostInput = document.getElementById(`subCost${id}`);
    const rateInput = document.getElementById(`rate${id}`);
    const speedRow = document.getElementById(`speedRow${id}`);
    const speedSelect = document.getElementById(`speed${id}`);

    if (presetName === 'Custom') {
        nameInput.value = '';
        subCostInput.value = '0';
        rateInput.value = '0';
        speedRow.style.display = "none";
        calculate();
        return;
    }

    const p = PRESETS.find(x => x.name === presetName);
    if (!p) return;

    nameInput.value = p.name;
    subCostInput.value = p.subscription.monthlyCost;

    if (p.rates && !p.rates.default) {
        const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
        const speeds = Object.keys(p.rates).filter(s => parseFloat(s) >= minSpeed);
        
        speedSelect.innerHTML = speeds.map(s => `<option value="${s}">${s}kW</option>`).join("");
        speedRow.style.display = "flex";
        
        if (speeds.length > 0) {
            rateInput.value = p.rates[speeds[0]];
        }
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
        const presetSelect = document.getElementById(`preset${id}`);
        const currentPreset = presetSelect.value;

        // Re-generate the preset dropdown options based on the new minSpeed
        const filteredPresets = PRESETS.filter(p => {
            if (p.rates && p.rates.default) return true;
            const speeds = Object.keys(p.rates).map(Number);
            return speeds.some(s => s >= minSpeed);
        });

        const sortedPresets = [...filteredPresets].sort((a, b) => {
            const aSub = a.subscription.hasSubscription;
            const bSub = b.subscription.hasSubscription;
            if (aSub && !bSub) return -1;
            if (!aSub && bSub) return 1;
            return a.name.localeCompare(b.name);
        });

        const presetOptions = ['Custom', ...sortedPresets.map(p => p.name)]
            .map(name => `<option value="${name}">${name}</option>`).join("");
        
        presetSelect.innerHTML = presetOptions;

        // If the previously selected provider is no longer valid, revert to Custom
        const stillValid = sortedPresets.some(p => p.name === currentPreset) || currentPreset === 'Custom';
        if (stillValid) {
            presetSelect.value = currentPreset;
            // Also refresh the speed options for the currently selected provider
            if (currentPreset !== 'Custom') {
                updateProviderFields(id);
            }
        } else {
            presetSelect.value = 'Custom';
            updateProviderFields(id);
        }
    });
}

function addProvider() {
    createProviderBox();
}

function addAllProviders() {
    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
    document.getElementById("providers").innerHTML = "";

    PRESETS.forEach(preset => {
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
        document.getElementById(`speedRow${newId}`).style.display = "flex";
        newSpeed.innerHTML = lastSpeed.innerHTML;
        newSpeed.value = lastSpeed.value;
    }

    calculate();
}