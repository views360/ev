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

    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
    
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

    let options = `<option value="custom">-- Custom Provider --</option>`;
    sortedPresets.forEach(p => {
        options += `<option value="${p.id}">${p.name}</option>`;
    });

    box.innerHTML = `
        <div class="provider-header">
            <select id="preset${id}" onchange="applyPreset(${id})">${options}</select>
            <button class="remove-btn" onclick="removeProvider(${id})">×</button>
        </div>
        <div class="provider-inputs">
            <div class="input-group">
                <label>Display Name</label>
                <input type="text" id="name${id}" placeholder="e.g. Tesla Supercharger" oninput="calculate()">
            </div>
            <div class="input-group">
                <label>Monthly Cost (£)</label>
                <input type="number" id="subCost${id}" value="0" step="0.01" oninput="calculate()">
            </div>
            <div class="input-group" id="speedRow${id}" style="display:none;">
                <label>Charging Speed</label>
                <select id="speed${id}" onchange="updateRateFromSpeed(${id})"></select>
            </div>
            <div class="input-group">
                <label>Rate (pence/kWh)</label>
                <input type="number" id="rate${id}" value="0" oninput="calculate()">
            </div>
        </div>
    `;

    document.getElementById("providers").appendChild(box);

    if (preset) {
        document.getElementById(`preset${id}`).value = preset.id;
        applyPreset(id);
    } else {
        calculate();
    }
}

function removeProvider(id) {
    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (box) box.remove();
    calculate();
}

function applyPreset(id) {
    const presetId = document.getElementById(`preset${id}`).value;
    const nameInput = document.getElementById(`name${id}`);
    const subInput = document.getElementById(`subCost${id}`);
    const rateInput = document.getElementById(`rate${id}`);
    const speedRow = document.getElementById(`speedRow${id}`);
    const speedSelect = document.getElementById(`speed${id}`);

    if (presetId === "custom") {
        speedRow.style.display = "none";
        return;
    }

    const p = PRESETS.find(x => x.id === presetId);
    if (!p) return;

    nameInput.value = p.name;
    subInput.value = p.subscription.monthlyCost;

    if (p.rates.default) {
        speedRow.style.display = "none";
        rateInput.value = p.rates.default;
    } else {
        speedRow.style.display = "block";
        const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
        const availableSpeeds = Object.keys(p.rates)
            .map(Number)
            .filter(s => s >= minSpeed)
            .sort((a, b) => a - b);

        speedSelect.innerHTML = "";
        availableSpeeds.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent = s + " kW";
            speedSelect.appendChild(opt);
        });

        if (availableSpeeds.length > 0) {
            speedSelect.value = availableSpeeds[0];
            rateInput.value = p.rates[availableSpeeds[0]];
        }
    }
    calculate();
}

function updateRateFromSpeed(id) {
    const presetId = document.getElementById(`preset${id}`).value;
    const speed = document.getElementById(`speed${id}`).value;
    const rateInput = document.getElementById(`rate${id}`);
    const p = PRESETS.find(x => x.id === presetId);
    if (p && p.rates[speed]) {
        rateInput.value = p.rates[speed];
    }
    calculate();
}

function enforceSpeedRules() {
    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const presetId = document.getElementById(`preset${id}`).value;
        if (presetId === "custom") return;

        const p = PRESETS.find(x => x.id === presetId);
        if (!p || p.rates.default) return;

        const speeds = Object.keys(p.rates).map(Number);
        const canSupport = speeds.some(s => s >= minSpeed);

        if (!canSupport) {
            box.style.border = "2px solid #ef4444";
            box.style.opacity = "0.5";
        } else {
            box.style.border = "1px solid var(--border)";
            box.style.opacity = "1";
            applyPreset(id); 
        }
    });
}

function addAllProviders() {
    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
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
        document.getElementById(`speedRow${newId}`).style.display = "block";
        newSpeed.innerHTML = lastSpeed.innerHTML;
        newSpeed.value = lastSpeed.value;
    }
    calculate();
}