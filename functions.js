// Load provider presets from external providers.json
let PRESETS = [];
let providerCount = 0;
let chart = null;

// Fetch presets from providers.json
fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        if (Array.isArray(data.providers)) {
            PRESETS = data.providers;
        }
    })
    .finally(() => {
        addProvider();
        loadFromParams();
    });


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
            <div style="display:flex; gap:6px;">
                <button type="button" onclick="duplicateProvider(${id})">Duplicate</button>
                <button type="button" onclick="removeProvider(${id})">Remove</button>
            </div>
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
            <label>Subscription cost (£ / month)</label>
            <input type="number" id="subCost${id}" placeholder="e.g., 7.99">
        </div>

        <div class="input-group">
            <label>Discounted rate (pence per kWh)</label>
            <input type="number" id="discount${id}" placeholder="e.g., 49">
        </div>
    `;

    document.getElementById("providers").appendChild(box);

    const presetSelect = document.getElementById(`preset${id}`);
    presetSelect.addEventListener("change", () => applyPreset(id));

    box.querySelectorAll("input").forEach(i => i.addEventListener("input", calculate));

    if (preset) {
        presetSelect.value = preset.name;
        document.getElementById(`name${id}`).value = preset.name;
        document.getElementById(`subCost${id}`).value = preset.subCost;
        document.getElementById(`discount${id}`).value = preset.rate;
    }
}

function addProvider() {
    createProviderBox();
    calculate();
}

function duplicateProvider(id) {
    const name = document.getElementById(`name${id}`).value;
    const sub = document.getElementById(`subCost${id}`).value;
    const rate = document.getElementById(`discount${id}`).value;
    const presetName = document.getElementById(`preset${id}`).value;

    createProviderBox({
        name,
        subCost: sub,
        rate
    });

    const newId = providerCount;
    document.getElementById(`preset${newId}`).value = presetName;
    document.getElementById(`name${newId}`).value = name;
    document.getElementById(`subCost${newId}`).value = sub;
    document.getElementById(`discount${newId}`).value = rate;

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

    document.getElementById(`name${id}`).value = preset.name;
    document.getElementById(`subCost${id}`).value = preset.subCost;

    const defaultRate = preset.rates.default ?? Object.values(preset.rates)[0];
    document.getElementById(`discount${id}`).value = defaultRate;

    calculate();
}


// RESET ALL
function resetAll() {
    document.getElementById("journeyMiles").value = "";
    document.getElementById("batteryKwh").value = "";
    document.getElementById("soc").value = "";
    document.getElementById("efficiency").value = "";
    document.getElementById("adhoc").value = "";

    document.getElementById("providers").innerHTML = "";
    providerCount = 0;

    if (chart) chart.destroy();
    document.getElementById("results").style.display = "none";

    addProvider();
}
