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

    box.innerHTML = `
        <div class="provider-header">
            <input type="text" id="name${id}" value="${preset ? preset.name : 'New Provider'}" oninput="calculate()">
            <button class="btn-remove" onclick="removeProvider(${id})">×</button>
        </div>

        <div class="input-row">
            <div class="input-group">
                <label>Preset</label>
                <select id="preset${id}" onchange="applyPreset(${id})">
                    <option value="">-- Custom --</option>
                    ${sortedPresets.map(p => `<option value="${p.id}" ${preset && p.id === preset.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="input-group">
                <label>Monthly Sub (£)</label>
                <input type="number" id="subCost${id}" value="${preset ? preset.subscription.monthlyCost : 0}" oninput="calculate()">
            </div>
        </div>

        <div class="input-row">
            <div class="input-group" id="speedRow${id}" style="${preset && !preset.rates.default ? '' : 'display:none'}">
                <label>Specific Speed</label>
                <select id="speed${id}" onchange="updateRateFromSpeed(${id})">
                    ${preset && !preset.rates.default ? Object.keys(preset.rates).map(s => `<option value="${s}">${s}kW</option>`).join('') : ''}
                </select>
            </div>
            <div class="input-group">
                <label>Rate (p/kWh)</label>
                <input type="number" id="rate${id}" value="${preset ? (preset.rates.default || 0) : 0}" oninput="calculate()">
            </div>
        </div>

        <div class="input-group">
            <label>Discount (%)</label>
            <input type="number" id="discount${id}" placeholder="e.g., 8 for 8% discount with Electroverse" value="0" oninput="calculate()">
        </div>
    `;

    document.getElementById("providers").appendChild(box);
    if (!preset) calculate();
}

function removeProvider(id) {
    const box = document.querySelector(`.provider-box[data-id="${id}"]`);
    if (box) {
        box.remove();
        calculate();
    }
}

function applyPreset(id) {
    const presetId = document.getElementById(`preset${id}`).value;
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    document.getElementById(`name${id}`).value = preset.name;
    document.getElementById(`subCost${id}`).value = preset.subscription.monthlyCost;
    
    const speedRow = document.getElementById(`speedRow${id}`);
    const speedSelect = document.getElementById(`speed${id}`);
    
    if (preset.rates.default) {
        document.getElementById(`rate${id}`).value = preset.rates.default;
        speedRow.style.display = "none";
    } else {
        speedRow.style.display = "block";
        speedSelect.innerHTML = Object.keys(preset.rates).map(s => `<option value="${s}">${s}kW</option>`).join('');
        updateRateFromSpeed(id);
    }
    calculate();
}

function updateRateFromSpeed(id) {
    const presetId = document.getElementById(`preset${id}`).value;
    const preset = PRESETS.find(p => p.id === presetId);
    const speed = document.getElementById(`speed${id}`).value;
    if (preset && preset.rates[speed]) {
        document.getElementById(`rate${id}`).value = preset.rates[speed];
    }
    calculate();
}

function enforceSpeedRules() {
    const minSpeed = parseFloat(document.getElementById("minSpeed").value);
    const boxes = document.querySelectorAll(".provider-box");
    
    boxes.forEach(box => {
        const id = box.dataset.id;
        const presetId = document.getElementById(`preset${id}`).value;
        const preset = PRESETS.find(p => p.id === presetId);
        
        if (preset && !preset.rates.default) {
            const speeds = Object.keys(preset.rates).map(Number);
            const validSpeeds = speeds.filter(s => s >= minSpeed);
            
            if (validSpeeds.length === 0) {
                box.style.border = "2px solid var(--danger)";
            } else {
                box.style.border = "1px solid var(--border)";
                const currentSpeed = Number(document.getElementById(`speed${id}`).value);
                if (!validSpeeds.includes(currentSpeed)) {
                    document.getElementById(`speed${id}`).value = Math.min(...validSpeeds);
                    updateRateFromSpeed(id);
                }
            }
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
    document.getElementById(`discount${newId}`).value = document.getElementById(`discount${lastId}`).value;
    
    const lastSpeedRow = document.getElementById(`speedRow${lastId}`);
    if (lastSpeedRow.style.display !== "none") {
        const newSpeedRow = document.getElementById(`speedRow${newId}`);
        newSpeedRow.style.display = "block";
        const newSpeedSelect = document.getElementById(`speed${newId}`);
        newSpeedSelect.innerHTML = document.getElementById(`speed${lastId}`).innerHTML;
        newSpeedSelect.value = document.getElementById(`speed${lastId}`).value;
    }
    calculate();
}