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

function createProviderBox(preset) {
    providerCount++;
    const id = providerCount;
    const box = document.createElement("div");
    box.className = "provider-box";
    box.dataset.id = id;

    const sortedPresets = [...PRESETS].sort((a, b) => {
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
        document.getElementById(`preset${id}`).value = preset.name;
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
    subCostInput.value = p.subCost;

    if (p.rates && !p.rates.default) {
        const speeds = Object.keys(p.rates);
        speedSelect.innerHTML = speeds.map(s => `<option value="${s}">${s}kW</option>`).join("");
        speedRow.style.display = "flex";
        rateInput.value = p.rates[speeds[0]];
        
        // Apply speed limits immediately
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
        if (speedSelect.selectedOptions[0]?.disabled && firstValidValue !== null) {
            speedSelect.value = firstValidValue;
            updateRateFromSpeed(id);
        }
    });
}