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
    window.location.href = window.location.pathname;
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
    const isTripMode = activePill && activePill.textContent.trim() === "Trip Savings";
    
    // UI visibility based on mode
    const tripGrid = document.querySelector(".grid");
    const resultsHeading = document.querySelector(".results-heading");
    const btnRow = document.querySelector(".btn-row");
    const uiResults = document.getElementById("results");
    const uiPreText = document.getElementById("preConclusionsText");

    if (tripGrid) tripGrid.style.display = isTripMode ? "grid" : "none";
    if (resultsHeading) resultsHeading.style.display = isTripMode ? "block" : "none";
    if (btnRow) btnRow.style.display = isTripMode ? "flex" : "none";

    // If not in Trip Savings mode, ensure Trip-specific messages and results are hidden
    if (!isTripMode) {
        if (uiPreText) uiPreText.style.display = "none";
        if (uiResults) uiResults.style.display = "none";
        return;
    }

    if (uiPreText) uiPreText.style.display = "block";
    if (uiResults) uiResults.style.display = "block";

    const inputs = getInputs();
    const uiShare = document.getElementById("shareBtn");
    const uiPdf = document.getElementById("pdfBtn");

    const tripIncomplete = Object.values(inputs).some(val => isNaN(val));
    const providerBoxes = document.querySelectorAll(".provider-box");

    // Sequential Validation Logic for Trip Mode
    if (tripIncomplete) {
        uiPreText.innerHTML = "Please complete all fields in the <strong>Trip & Vehicle</strong> section.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        return;
    } 
    
    if (providerBoxes.length === 0) {
        uiPreText.innerHTML = "Before you may view a comparison, you must select at least one provider from the list of providers (above).";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        return;
    }

    uiPreText.style.display = "none";
    uiResults.style.display = "block";
    if (uiShare) uiShare.style.display = "";
    if (uiPdf) uiPdf.style.display = "";

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
       
        const savingPerKwh = (inputs.adhocRate - rate) / 100;
        let breakEvenMiles = 0;
        if (savingPerKwh > 0) {
            const kwhNeeded = subCost / savingPerKwh;
            breakEvenMiles = kwhNeeded * inputs.efficiency;
        }
        const totalJourneyCost = subCost + startChargeCost + (publicKwh * (rate / 100));
        const pData = PRESETS.find(p => p.name === document.getElementById(`preset${id}`).value);

        providers.push({ 
            name, subCost, rate, totalJourneyCost, 
            breakEvenMiles,
            totalWithBattery: breakEvenMiles + initialRange,
            savings: totalAdhocCost - totalJourneyCost,
            url: pData?.subscription?.url,
            comments: pData?.subscription?.comments || ""
        });
    });

    const sortVal = document.getElementById("sortResults").value;
    providers.sort((a, b) => sortVal === "cheapest" ? a.totalJourneyCost - b.totalJourneyCost : a.name.localeCompare(b.name));

    let html = `<div class="results-scroll"><table><thead><tr>
        <th>Provider</th>
        <th>Sub. Fee</th>
        <th>Rate</th>
        <th>Trip Cost</th>
        <th>vs. PAYG</th>
        <th>Break Even (Public)</th>
        <th>Total Miles (Inc. Battery)</th>
        </tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const displayName = p.url ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>` : p.name;
        // Determine display text for providers more expensive than PAYG
        const breakEvenText = p.rate < inputs.adhocRate 
            ? `${p.breakEvenMiles.toFixed(0)} miles` 
            : "Never";
        const totalMilesText = p.rate < inputs.adhocRate 
            ? `${p.totalWithBattery.toFixed(0)} miles` 
            : "N/A";
        html += `<tr class="${rowClass}">
            <td>${displayName}<div style="font-size: 0.75rem; opacity:0.8;">${p.comments}</div></td>
            <td>£${p.subCost.toFixed(2)}</td>
            <td>${p.rate.toFixed(1)}p</td>
            <td>£${p.totalJourneyCost.toFixed(2)}</td>
            <td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td>
            <td><strong>${breakEvenText}</strong></td>
            <td><strong>${totalMilesText}</strong></td>
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
        
        // Handle explicit mode from URL
        if (urlParams.get("mode") === "trip-savings") {
            const btn = Array.from(document.querySelectorAll('.pill-btn')).find(b => b.textContent.trim() === "Trip Savings");
            if (btn) setToggle('trip-savings', btn);
        } else {
            // Default to Break Even if no specific mode or incognito
            const btn = Array.from(document.querySelectorAll('.pill-btn')).find(b => b.textContent.trim() === "Break Even");
            if (btn) setToggle('break-even', btn);
        }
        calculate();
    });

    ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", () => {
                if (id === "minSpeed") enforceSpeedRules();
                calculate();
            });
        }
    });
}

/* ============================================
   PDF EXPORT — OFF-SCREEN CLONE (NO FLASH)
   PURE B&W + MARGINS + FIT TO A4
   GRAPH REMOVED, SORT REMOVED, HEADER ADDED
   ============================================ */
function exportPdf() {
    const results = document.getElementById("results");
    const pdfBtn = document.getElementById("pdfBtn"); // Get the button element
    if (!results || !pdfBtn) return;
    const originalText = pdfBtn.textContent;
    pdfBtn.textContent = "Generating...";
    pdfBtn.style.pointerEvents = "none"; 
    pdfBtn.style.opacity = "0.7";

    // Create off-screen clone wrapper with random id
    const cloneWrapper = document.createElement("div");
    const cloneId = "pdfClone_" + Math.floor(Math.random() * 1000000);
    cloneWrapper.id = cloneId;
    cloneWrapper.style.position = "absolute";
    cloneWrapper.style.left = "-99999px";
    cloneWrapper.style.top = "0";
    cloneWrapper.style.width = results.offsetWidth + "px";

    // Clone results into wrapper
    const clone = results.cloneNode(true);
    cloneWrapper.appendChild(clone);
    document.body.appendChild(cloneWrapper);

    // Remove the "Sort results" input-group inside the clone
    const groups = cloneWrapper.querySelectorAll(".input-group");
    groups.forEach(group => {
        const label = group.querySelector("label");
        if (label && label.textContent.trim() === "Sort results") {
            group.remove();
        }
    });

    // Remove graph inside the clone
    const charts = cloneWrapper.querySelectorAll(".chart-wrapper");
    charts.forEach(el => el.remove());

    // Apply print-safe override ONLY to the clone
    const override = document.createElement("style");
    override.innerHTML = `
        #${cloneId}, #${cloneId} * {
            background: #ffffff !important;
            color: #000000 !important;
            border-color: #000000 !important;
            box-shadow: none !important;
        }
    `;
    document.head.appendChild(override);

    // Wait for layout, then capture the clone
    requestAnimationFrame(() => {
        html2canvas(cloneWrapper).then(canvas => {

            // Clean up clone + override
            cloneWrapper.remove();
            override.remove();

            // Convert to pure black & white
            const bwCanvas = document.createElement("canvas");
            const bctx = bwCanvas.getContext("2d");

            bwCanvas.width = canvas.width;
            bwCanvas.height = canvas.height;

            bctx.drawImage(canvas, 0, 0);

            const imgData = bctx.getImageData(0, 0, bwCanvas.width, bwCanvas.height);
            const pixels = imgData.data;

            const threshold = 160;
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];

                const grey = 0.299 * r + 0.587 * g + 0.114 * b;
                const bw = grey < threshold ? 0 : 255;

                pixels[i] = bw;
                pixels[i + 1] = bw;
                pixels[i + 2] = bw;
            }

            bctx.putImageData(imgData, 0, 0);

            const bwImg = bwCanvas.toDataURL("image/png");

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const margin = 10;
            const usableWidth = pageWidth - margin * 2;
            const usableHeight = pageHeight - margin * 2;

            const imgAspect = bwCanvas.width / bwCanvas.height;
            const pageAspect = usableWidth / usableHeight;

            let renderWidth, renderHeight;

            if (imgAspect > pageAspect) {
                renderWidth = usableWidth;
                renderHeight = usableWidth / imgAspect;
            } else {
                renderHeight = usableHeight;
                renderWidth = usableHeight * imgAspect;
            }

            // Header
            pdf.setFontSize(18);
            pdf.text("EV Public Charging Comparison", pageWidth / 2, margin, { align: "center" });

            // Image
            pdf.addImage(bwImg, "PNG", margin, margin + 10, renderWidth, renderHeight);

            pdf.save("ev-comparison.pdf");
        });
    });
}
window.addEventListener("DOMContentLoaded", init);

