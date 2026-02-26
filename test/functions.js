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
    const body = document.body;
    const btn = document.getElementById("themeToggle");
    body.classList.toggle("light-mode");
    btn.textContent = "Light/Dark Mode"; 
}

function toggleTooltip(element) {
    event.stopPropagation();
    const container = element.parentElement;
    document.querySelectorAll('.tooltip-container.active').forEach(open => {
        if (open !== container) open.classList.remove('active');
    });
    container.classList.toggle('active');
    if (container.classList.contains('active')) {
        const closeTooltip = (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('active');
                document.removeEventListener('click', closeTooltip);
            }
        };
        document.addEventListener('click', closeTooltip);
    }
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

function updateProviderFields(id) {
    const presetName = document.getElementById(`preset${id}`).value;
    const nameInput = document.getElementById(`name${id}`);
    const subCostInput = document.getElementById(`subCost${id}`);
    const rateInput = document.getElementById(`rate${id}`);
    const speedRow = document.getElementById(`speedRow${id}`);
    const speedSelect = document.getElementById(`speed${id}`);

    if (presetName === 'Custom') {
        Object.assign(nameInput, {value: ''});
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
        const { minSpeed } = getInputs();
        const speeds = Object.keys(p.rates).filter(s => parseFloat(s) >= minSpeed);
        speedSelect.innerHTML = speeds.map(s => `<option value="${s}">${s}kW</option>`).join("");
        speedRow.style.display = "flex";
        if (speeds.length > 0) rateInput.value = p.rates[speeds[0]];
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
    if (p?.rates) document.getElementById(`rate${id}`).value = p.rates[speed];
    calculate();
}

function enforceSpeedRules() {
    const { minSpeed } = getInputs();
    const sortedPresets = getSortedPresets(minSpeed);
    const presetOptions = ['Custom', ...sortedPresets.map(p => p.name)]
        .map(name => `<option value="${name}">${name}</option>`).join("");
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        const presetSelect = document.getElementById(`preset${id}`);
        const currentPreset = presetSelect.value;
        presetSelect.innerHTML = presetOptions;
        const stillValid = sortedPresets.some(p => p.name === currentPreset) || currentPreset === 'Custom';
        presetSelect.value = stillValid ? currentPreset : 'Custom';
        updateProviderFields(id);
    });
}

function addAllProviders() {
    const { minSpeed } = getInputs();
    document.getElementById("providers").innerHTML = "";
    PRESETS.forEach(p => {
        const canSupport = p.rates.default || Object.keys(p.rates).some(s => Number(s) >= minSpeed);
        if (canSupport) createProviderBox(p);
    });
    calculate();
}

function setToggle(mode, btn) {
    const slider = document.getElementById('pill-slider');
    document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    slider.style.transform = mode === 'break-even' ? 'translateX(0)' : 'translateX(100%)';
    calculate();
}

// ===============================
// Core Calculation Engine
// ===============================

function calculate() {
    const ui = {
        grid: document.querySelector(".grid"),
        resultsHeading: document.querySelector(".results-heading"),
        btnRow: document.querySelector(".btn-row"),
        resultsDiv: document.getElementById("results"),
        preText: document.getElementById("preConclusionsText"),
        share: document.getElementById("shareBtn"),
        pdf: document.getElementById("pdfBtn"),
        reset: document.getElementById("resetAll"),
        sort: document.getElementById("sortGroup")
    };

    const inputs = getInputs();
    const activePill = document.querySelector('.pill-btn.active');
    const isActive = activePill && activePill.textContent === "Trip Savings";

    [ui.grid, ui.resultsHeading, ui.btnRow, ui.resultsDiv, ui.preText, ui.reset].forEach(el => {
        if(el) el.style.display = isActive ? "" : "none";
    });

    if (!isActive) return;

    // Check 1: Are vehicle fields complete?
    const tripIncomplete = Object.values(inputs).some(val => isNaN(val)) || isNaN(inputs.adhocRate);
    const providerBoxes = document.querySelectorAll(".provider-box");

    if (tripIncomplete) {
        ui.preText.innerHTML = "Please complete all fields in the <strong>Trip & Vehicle</strong> section.";
        ui.preText.style.display = "block";
        [ui.share, ui.pdf, ui.sort, ui.resultsDiv].forEach(el => el && (el.style.display = "none"));
        return;
    } 
    
    // Check 2: If vehicle complete, are there providers?
    if (providerBoxes.length === 0) {
        ui.preText.innerHTML = "Before you may view a comparison, you must select at least one provider from the list of providers (above).";
        ui.preText.style.display = "block";
        [ui.share, ui.pdf, ui.sort, ui.resultsDiv].forEach(el => el && (el.style.display = "none"));
        return;
    }

    // Both passed - proceed to calc
    ui.preText.style.display = "none";
    [ui.share, ui.pdf, ui.sort, ui.resultsDiv].forEach(el => el && (el.style.display = ""));

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
        
        let breakEvenPublicMiles = null, breakEvenTotalMiles = null;
        if (rate < inputs.adhocRate) {
            const savingsPerKwh = (inputs.adhocRate - rate) / 100;
            breakEvenPublicMiles = (subCost / savingsPerKwh) * inputs.efficiency;
            breakEvenTotalMiles = breakEvenPublicMiles + initialRange;
        }

        const totalJourneyCost = subCost + startChargeCost + (publicKwh * (rate / 100));
        const pData = PRESETS.find(p => p.name === document.getElementById(`preset${id}`).value);

        providers.push({ 
            id, name, subCost, rate, totalJourneyCost, 
            savings: totalAdhocCost - totalJourneyCost, 
            breakEvenPublicMiles, breakEvenTotalMiles,
            url: pData?.subscription?.url,
            comments: pData?.subscription?.comments || ""
        });
    });

    const sortVal = document.getElementById("sortResults").value;
    providers.sort((a, b) => {
        if (sortVal === "cheapest") return a.totalJourneyCost - b.totalJourneyCost;
        return sortVal === "az" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });

    // Note: Style inheritance for links is handled in the table HTML using inline color:inherit
    let html = `<div class="results-scroll"><table><thead><tr><th>Provider</th><th>Sub. Fee</th><th>Rate</th><th>Trip Cost</th><th>vs. PAYG</th><th>Break-even</th></tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const displayName = p.url ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>` : p.name;
        const breakEvenText = p.breakEvenPublicMiles !== null ? `${p.breakEvenPublicMiles.toFixed(0)} / ${p.breakEvenTotalMiles.toFixed(0)} mi` : "N/A";

        html += `<tr class="${rowClass}">
            <td>${displayName}<div style="font-size: 0.75rem; opacity:0.8;">${p.comments}</div></td>
            <td>£${p.subCost.toFixed(2)}</td>
            <td>${p.rate.toFixed(1)}p</td>
            <td>£${p.totalJourneyCost.toFixed(2)}</td>
            <td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td>
            <td>${breakEvenText}</td>
        </tr>`;
    });
    document.getElementById("providerResults").innerHTML = html + `</tbody></table></div>`;

    const conclusionsBox = document.getElementById("conclusionsBox");
    if (providers.length > 0) {
        const best = providers[0];
        const minLabel = document.getElementById("minSpeed").selectedOptions[0].text;
        conclusionsBox.innerHTML = `
            <div class="conclusion-card ${best.savings > 0 ? 'good' : 'bad'}">
                <p class="main-result"><strong>${best.savings > 0 ? best.name : 'PAYG charging'}</strong> is cheapest at ${minLabel}.</p>
                <p>Driving time: ${(inputs.miles/60).toFixed(1)}h</p>
            </div>`;
    }

    drawGraph(inputs, providers);
}

// ===============================
// Graphing, Sharing & PDF
// ===============================

function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");
    if (chart) chart.destroy();
    const maxMiles = Math.max(core.miles, 500);
    const steps = 20;
    const labels = Array.from({length: steps + 1}, (_, i) => ((maxMiles * i) / steps).toFixed(0));
    const datasets = [{
        label: "Ad‑hoc Total (£)",
        data: labels.map(m => core.startChargeCost + (Math.max(0, m - (core.soc/100*core.battery*core.efficiency)) / core.efficiency * core.adhocRate / 100)),
        borderColor: "#f97316",
        tension: 0.2
    }];
    providers.forEach(p => {
        datasets.push({
            label: `${p.name} (£)`,
            data: labels.map(m => p.subCost + core.startChargeCost + (Math.max(0, m - (core.soc/100*core.battery*core.efficiency)) / core.efficiency * p.rate / 100)),
            borderColor: getProviderColor(p.name),
            tension: 0.2
        });
    });
    chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function getProviderColor(name) {
    const colors = { "Be.EV": "#00d1ff", "Tesla": "#e81010", "BP Pulse": "#00a14b", "Shell Recharge": "#ffda00", "Osprey": "#f97316" };
    return colors[name] || `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

function shareLink() {
    const params = new URLSearchParams();
    ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"].forEach(id => {
        params.set(id, document.getElementById(id).value);
    });
    const providers = [];
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        providers.push({
            preset: document.getElementById(`preset${id}`).value,
            name: document.getElementById(`name${id}`).value,
            sub: document.getElementById(`subCost${id}`).value,
            rate: document.getElementById(`rate${id}`).value,
            speed: document.getElementById(`speed${id}`)?.value || ""
        });
    });
    params.set("providers", JSON.stringify(providers));
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => alert("Shareable link copied to clipboard!"));
}

async function exportPdf() {
    const { jsPDF } = window.jspdf;
    const app = document.querySelector(".app");
    html2canvas(app, { scale: 2, useCORS: true }).then(canvas => {
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imgData, 0, 0);
        const bwImg = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const usableWidth = pageWidth - (margin * 2);
        const usableHeight = pageHeight - (margin * 3);
        const imgAspect = canvas.width / canvas.height;
        const pageAspect = usableWidth / usableHeight;
        let rWidth = usableWidth, rHeight = usableWidth / imgAspect;
        if (imgAspect < pageAspect) {
            rHeight = usableHeight;
            rWidth = usableHeight * imgAspect;
        }
        pdf.setFontSize(18);
        pdf.text("EV Public Charging Comparison", pageWidth / 2, margin + 5, { align: "center" });
        pdf.addImage(bwImg, "PNG", margin, margin + 15, rWidth, rHeight);
        pdf.save("ev-comparison.pdf");
    });
}

function saveToLocalStorage() {
    const data = {};
    ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"].forEach(id => {
        data[id] = document.getElementById(id).value;
    });
    localStorage.setItem("ev_calc_settings", JSON.stringify(data));
}

function init() {
    ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"].forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            if (id === "minSpeed") enforceSpeedRules();
            calculate();
            saveToLocalStorage();
        });
    });

    fetch("providers.json")
        .then(r => r.json())
        .then(data => {
            PRESETS = data.providers;
            const urlParams = new URLSearchParams(window.location.search);
            const saved = localStorage.getItem("ev_calc_settings");

            if (urlParams.get("mode") === "trip-savings") {
                const tripBtn = Array.from(document.querySelectorAll('.pill-btn')).find(b => b.textContent === "Trip Savings");
                if (tripBtn) setToggle('trip-savings', tripBtn);
            }

            if (urlParams.has("journeyMiles")) {
                urlParams.forEach((val, key) => {
                    const el = document.getElementById(key);
                    if (el && !["providers", "mode"].includes(key)) el.value = val;
                });
                const providers = JSON.parse(urlParams.get("providers") || "[]");
                providers.forEach(p => {
                    createProviderBox();
                    const id = providerCount;
                    document.getElementById(`preset${id}`).value = p.preset;
                    updateProviderFields(id);
                    document.getElementById(`name${id}`).value = p.name;
                    document.getElementById(`subCost${id}`).value = p.sub;
                    document.getElementById(`rate${id}`).value = p.rate;
                    if (p.speed) document.getElementById(`speed${id}`).value = p.speed;
                });
            } else if (saved) {
                const parsed = JSON.parse(saved);
                Object.keys(parsed).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = parsed[id];
                });
            }
            calculate();
        });
}

window.addEventListener("DOMContentLoaded", init);
