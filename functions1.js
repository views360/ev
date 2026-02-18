// ===============================
// functions1.js
// UI + Provider Box Logic (Full Version)
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

// Global helper to distinguish hardware types
function getSpeedCategory(speed) {
    const s = parseFloat(speed);
    if (isNaN(s)) return "Generic";
    if (s <= 22) return "AC (Fast)";
    if (s <= 50) return "DC (Rapid)";
    return "Ultra-Rapid";
}

function createProviderBox(preset = null) {
    providerCount++;
    const id = providerCount;
    const box = document.createElement("div");
    box.className = "provider-box";
    box.dataset.id = id;

    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;

    // Filter presets based on new structure: p.chargingSpeeds.ac/dc
    const filteredPresets = PRESETS.filter(p => {
        if (p.rates && p.rates.default) return true;
        const ac = (p.chargingSpeeds && p.chargingSpeeds.ac) || [];
        const dc = (p.chargingSpeeds && p.chargingSpeeds.dc) || [];
        const combined = [...ac, ...dc];
        return combined.length === 0 || combined.some(s => s >= minSpeed);
    });

    const presetOptions = filteredPresets.map(p => 
        `<option value="${p.name}" ${preset && preset.name === p.name ? 'selected' : ''}>${p.name}</option>`
    ).join("");

    box.innerHTML = `
        <div class="providers-header-row">
            <strong style="color:var(--accent)">Provider #${id}</strong>
            <button type="button" class="btn secondary" style="padding:4px 12px; font-size:11px;" onclick="this.closest('.provider-box').remove(); calculate();">Remove</button>
        </div>
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px;">
            <div class="input-group">
                <label>Preset</label>
                <select id="preset${id}" onchange="applyPreset(${id})">
                    <option value="">-- Custom --</option>
                    ${presetOptions}
                </select>
            </div>
            <div class="input-group">
                <label>Name</label>
                <input type="text" id="name${id}" oninput="calculate()" placeholder="e.g. Tesla">
            </div>
            <div class="input-group">
                <label>Monthly Fee (£)</label>
                <input type="number" id="subCost${id}" step="0.01" oninput="calculate()" value="0">
            </div>
            <div class="input-group">
                <label>Hardware/Speed</label>
                <select id="speed${id}" onchange="updateRateFromSpeed(${id})"></select>
            </div>
            <div class="input-group">
                <label>Rate (p/kWh)</label>
                <input type="number" id="rate${id}" step="0.1" oninput="calculate()" value="0">
            </div>
        </div>
    `;

    document.getElementById("providers").appendChild(box);
    
    // If no preset, add a default option to the speed dropdown
    if (!preset) {
        const speedSelect = document.getElementById(`speed${id}`);
        const opt = document.createElement("option");
        opt.value = "default";
        opt.textContent = "Custom/Any Speed";
        speedSelect.appendChild(opt);
    } else {
        applyPreset(id, preset);
    }
}

function applyPreset(id, presetData = null) {
    const presetName = document.getElementById(`preset${id}`).value;
    const p = presetData || PRESETS.find(x => x.name === presetName);
    if (!p) return;

    document.getElementById(`name${id}`).value = p.name;
    document.getElementById(`subCost${id}`).value = (p.subscription && p.subscription.monthlyCost) ? p.subscription.monthlyCost : 0;

    const speedSelect = document.getElementById(`speed${id}`);
    speedSelect.innerHTML = "";

    if (p.rates.default) {
        const opt = document.createElement("option");
        opt.value = "default";
        opt.textContent = "All Speeds (Universal)";
        speedSelect.appendChild(opt);
        document.getElementById(`rate${id}`).value = p.rates.default;
    } else {
        const speeds = Object.keys(p.rates).sort((a, b) => parseFloat(a) - parseFloat(b));
        speeds.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent = `${s}kW (${getSpeedCategory(s)})`;
            speedSelect.appendChild(opt);
        });
        document.getElementById(`rate${id}`).value = p.rates[speeds[0]];
    }
    calculate();
}

function updateRateFromSpeed(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const p = PRESETS.find(x => x.name === presetName);
    if (!p || !p.rates) return;

    const speedVal = document.getElementById(`speed${id}`).value;
    if (p.rates[speedVal]) {
        document.getElementById(`rate${id}`).value = p.rates[speedVal];
    }
    calculate();
}

function addAllPresets() {
    const minSpeed = parseFloat(document.getElementById("minSpeed").value) || 0;
    document.getElementById("providers").innerHTML = "";
    
    PRESETS.forEach(preset => {
        let canSupport = false;
        if (preset.rates.default) {
            canSupport = true;
        } else {
            const ac = (preset.chargingSpeeds && preset.chargingSpeeds.ac) || [];
            const dc = (preset.chargingSpeeds && preset.chargingSpeeds.dc) || [];
            canSupport = [...ac, ...dc].some(s => s >= minSpeed);
        }
        if (canSupport) createProviderBox(preset);
    });
}
