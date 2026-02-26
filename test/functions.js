// ===============================
// Global State
// ===============================
let PRESETS = [];
let providerCount = 0;
let chart = null;

const getInputs = () => ({
    miles: parseFloat(document.getElementById("journeyMiles").value),
    battery: parseFloat(document.getElementById("batteryKwh").value),
    soc: parseFloat(document.getElementById("soc").value),
    efficiency: parseFloat(document.getElementById("efficiency").value),
    adhocRate: parseFloat(document.getElementById("adhoc").value),
    startRate: parseFloat(document.getElementById("startChargeRate").value),
    minSpeed: parseFloat(document.getElementById("minSpeed").value) || 0
});

// ===============================
// UI & Provider Management
// ===============================

function resetAll() {
    localStorage.removeItem("ev_calc_settings");
    window.location.href = window.location.pathname + "?mode=trip-savings";
}

function toggleTheme() {
    document.body.classList.toggle("light-mode");
}

function createProviderBox(preset) {
    providerCount++;
    const id = providerCount;
    const { minSpeed } = getInputs();
    const sortedPresets = getSortedPresets(minSpeed);
    const presetOptions = ['Custom', ...sortedPresets.map(p => p.name)]
        .map(name => `<option value="${name}">${name}</option>`).join("");

    const box = document.createElement("div");
    box.className = "provider-box";
    box.dataset.id = id;
    box.innerHTML = `
        <div class="provider-header">
            <input type="text" id="name${id}" placeholder="Provider Name" oninput="calculate()">
            <button class="remove-btn" onclick="this.parentElement.parentElement.remove(); calculate();">×</button>
        </div>
        <div class="input-group">
            <label>Preset</label>
            <select id="preset${id}" class="preset-select-pulse" onchange="updateProviderFields(${id})">${presetOptions}</select>
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
    calculate();
}

function addAllProviders() {
    const { minSpeed } = getInputs();
    document.getElementById("providers").innerHTML = "";
    PRESETS.forEach(p => {
        const canSupport = p.rates.default || Object.keys(p.rates).some(s => Number(s) >= minSpeed);
        if (canSupport) createProviderBox(p);
    });
}

function updateProviderFields(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const p = PRESETS.find(x => x.name === presetName);
    const speedRow = document.getElementById(`speedRow${id}`);
    
    if (presetName === 'Custom' || !p) {
        speedRow.style.display = "none";
        calculate();
        return;
    }

    document.getElementById(`name${id}`).value = p.name;
    document.getElementById(`subCost${id}`).value = p.subscription.monthlyCost;

    if (p.rates && !p.rates.default) {
        const { minSpeed } = getInputs();
        const speeds = Object.keys(p.rates).filter(s => parseFloat(s) >= minSpeed);
        const speedSelect = document.getElementById(`speed${id}`);
        speedSelect.innerHTML = speeds.map(s => `<option value="${s}">${s}kW</option>`).join("");
        speedRow.style.display = "flex";
        if (speeds.length > 0) document.getElementById(`rate${id}`).value = p.rates[speeds[0]];
    } else {
        document.getElementById(`rate${id}`).value = p.rates.default;
        speedRow.style.display = "none";
    }
    calculate();
}

function updateRateFromSpeed(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const speed = document.getElementById(`speed${id}`).value;
    const p = PRESETS.find(x => x.name === presetName);
    if (p?.rates) document.getElementById(`rate${id}`).value = p.rates[speed];
    calculate();
}

function getSortedPresets(minSpeed) {
    return PRESETS.filter(p => {
        if (p.rates?.default) return true;
        return Object.keys(p.rates).some(s => Number(s) >= minSpeed);
    }).sort((a, b) => {
        const aSub = a.subscription.hasSubscription;
        const bSub = b.subscription.hasSubscription;
        return (aSub === bSub) ? a.name.localeCompare(b.name) : aSub ? -1 : 1;
    });
}

function enforceSpeedRules() {
    const { minSpeed } = getInputs();
    const sortedPresets = getSortedPresets(minSpeed);
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        const presetSelect = document.getElementById(`preset${id}`);
        const current = presetSelect.value;
        presetSelect.innerHTML = ['Custom', ...sortedPresets.map(p => p.name)].map(n => `<option value="${n}">${n}</option>`).join("");
        presetSelect.value = (sortedPresets.some(p => p.name === current) || current === 'Custom') ? current : 'Custom';
        updateProviderFields(id);
    });
}

// ===============================
// Core Calculation & Graphing
// ===============================

function calculate() {
    const activePill = document.querySelector('.pill-btn.active');
    const isTripMode = activePill && activePill.textContent === "Trip Savings";
    
    // UI visibility based on mode
    document.querySelector(".grid").style.display = isTripMode ? "grid" : "none";
    document.querySelector(".results-heading").style.display = isTripMode ? "block" : "none";
    document.querySelector(".btn-row").style.display = isTripMode ? "flex" : "none";

    if (!isTripMode) return;

    const inputs = getInputs();
    const ui = {
        results: document.getElementById("results"),
        preText: document.getElementById("preConclusionsText"),
        share: document.getElementById("shareBtn"),
        pdf: document.getElementById("pdfBtn")
    };

    const tripIncomplete = Object.values(inputs).some(val => isNaN(val));
    const providerBoxes = document.querySelectorAll(".provider-box");

    // Sequential Validation Logic
    if (tripIncomplete) {
        ui.preText.innerHTML = "Please complete all fields in the <strong>Trip & Vehicle</strong> section.";
        ui.preText.style.display = "block";
        ui.results.style.display = "none";
        [ui.share, ui.pdf].forEach(el => el.style.display = "none");
        return;
    } 
    
    if (providerBoxes.length === 0) {
        ui.preText.innerHTML = "Before you may view a comparison, you must select at least one provider from the list of providers (above).";
        ui.preText.style.display = "block";
        ui.results.style.display = "none";
        [ui.share, ui.pdf].forEach(el => el.style.display = "none");
        return;
    }

    ui.preText.style.display = "none";
    ui.results.style.display = "block";
    [ui.share, ui.pdf].forEach(el => el.style.display = "");

    const startChargeKwh = (inputs.soc / 100) * inputs.battery;
    const startChargeCost = startChargeKwh * (inputs.startRate / 100);
    const initialRange = startChargeKwh * inputs.efficiency;
    const publicMiles = Math.max(0, inputs.miles - initialRange);
    const publicKwh = publicMiles / inputs.efficiency;
    const totalAdhocCost = startChargeCost + (publicKwh * (inputs.adhocRate / 100));

    document.getElementById("preChargeLine").innerHTML = `Pre-journey charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (£${startChargeCost.toFixed(2)})`;
    document.getElementById("homeRangeLine").innerHTML = `Range from start charge: <strong>${initialRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `Public charging miles needed: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `Public charging energy needed: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total cost (Standard PAYG @ ${inputs.adhocRate}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

    const providers = [];
    providerBoxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;
        const totalJourneyCost = subCost + startChargeCost + (publicKwh * (rate / 100));
        const pData = PRESETS.find(p => p.name === document.getElementById(`preset${id}`).value);

        providers.push({ 
            name, subCost, rate, totalJourneyCost, 
            savings: totalAdhocCost - totalJourneyCost,
            url: pData?.subscription?.url,
            comments: pData?.subscription?.comments || ""
        });
    });

    const sortVal = document.getElementById("sortResults").value;
    providers.sort((a, b) => sortVal === "cheapest" ? a.totalJourneyCost - b.totalJourneyCost : a.name.localeCompare(b.name));

    let html = `<div class="results-scroll"><table><thead><tr><th>Provider</th><th>Sub. Fee</th><th>Rate</th><th>Trip Cost</th><th>vs. PAYG</th></tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const displayName = p.url ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>` : p.name;
        html += `<tr class="${rowClass}">
            <td>${displayName}<div style="font-size: 0.75rem; opacity:0.8;">${p.comments}</div></td>
            <td>£${p.subCost.toFixed(2)}</td>
            <td>${p.rate.toFixed(1)}p</td>
            <td>£${p.totalJourneyCost.toFixed(2)}</td>
            <td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td>
        </tr>`;
    });
    document.getElementById("providerResults").innerHTML = html + `</tbody></table></div>`;

    drawGraph(inputs, providers);
}

function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");
    if (chart) chart.destroy();

    const maxMiles = Math.max(core.miles * 1.2, 300);
    const labels = Array.from({length: 11}, (_, i) => Math.round((maxMiles * i) / 10));
    
    const adhocData = labels.map(m => {
        const pKwh = Math.max(0, m - (core.soc/100 * core.battery * core.efficiency)) / core.efficiency;
        return (core.soc/100 * core.battery * core.startRate/100) + (pKwh * core.adhocRate/100);
    });

    const datasets = [{
        label: "Standard PAYG",
        data: adhocData,
        borderColor: "#f97316",
        borderWidth: 3,
        pointRadius: 0,
        fill: false
    }];

    providers.forEach((p, idx) => {
        const data = labels.map(m => {
            const pKwh = Math.max(0, m - (core.soc/100 * core.battery * core.efficiency)) / core.efficiency;
            return p.subCost + (core.soc/100 * core.battery * core.startRate/100) + (pKwh * p.rate/100);
        });
        datasets.push({
            label: p.name,
            data: data,
            borderColor: getProviderColor(p.name, idx),
            borderWidth: 2,
            pointRadius: 0,
            fill: false
        });
    });

    chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { title: { display: true, text: 'Total Trip Cost (£)' } },
                x: { title: { display: true, text: 'Distance (Miles)' } }
            },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
        }
    });
}

function getProviderColor(name, index) {
    const colors = { "Be.EV": "#00d1ff", "Tesla": "#e81010", "BP Pulse": "#00a14b", "Shell Recharge": "#ffda00", "Osprey": "#f97316" };
    if (colors[name]) return colors[name];
    const palette = ["#38bdf8", "#22c55e", "#a855f7", "#ec4899", "#eab308"];
    return palette[index % palette.length];
}

function setToggle(mode, btn) {
    const slider = document.getElementById('pill-slider');
    document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    slider.style.transform = mode === 'break-even' ? 'translateX(0)' : 'translateX(100%)';
    calculate();
}

function init() {
    fetch("providers.json").then(r => r.json()).then(data => {
        PRESETS = data.providers;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("mode") === "trip-savings") {
            const btn = Array.from(document.querySelectorAll('.pill-btn')).find(b => b.textContent === "Trip Savings");
            if (btn) setToggle('trip-savings', btn);
        }
        calculate();
    });

    ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"].forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            if (id === "minSpeed") enforceSpeedRules();
            calculate();
        });
    });
}

window.addEventListener("DOMContentLoaded", init);
