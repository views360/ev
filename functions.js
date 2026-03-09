const setCookie = (name, value) => {
    const date = new Date();
    date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
    const cookieValue = encodeURIComponent(JSON.stringify(value));
    document.cookie = `${name}=${cookieValue};expires=${date.toUTCString()};path=/;SameSite=Lax`;
};

const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) {
            try {
                return JSON.parse(decodeURIComponent(c.substring(nameEQ.length)));
            } catch (e) {
                return null;
            }
        }
    }
    return null;
};

let PRESETS = [];
let providerCount = 0;
let chart = null;

function getInputs() {
    return {
        journeyMiles: parseFloat(document.getElementById("journeyMiles").value) || 0,
        batteryKwh: parseFloat(document.getElementById("batteryKwh").value) || 0,
        soc: parseFloat(document.getElementById("soc").value) || 0,
        efficiency: parseFloat(document.getElementById("efficiency").value) || 0,
        adhoc: parseFloat(document.getElementById("adhoc").value) || 0,
        startChargeRate: parseFloat(document.getElementById("startChargeRate").value) || 0,
        minSpeed: parseFloat(document.getElementById("minSpeed").value) || 0
    };
}

function resetAll() {
    localStorage.clear();

    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }

    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        if (input.type === 'number' || input.type === 'text') {
            input.value = '';
        }
    });

    const providersContainer = document.getElementById("providers");
    if (providersContainer) {
        providersContainer.innerHTML = "";
    }
    window.location.href = "index.html";
}

function shareLink() {
    const params = new URLSearchParams();
    params.set("mode", "trip-savings");

    const tripIds = ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"];
    
    tripIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) params.set(id, el.value);
    });

    const providers = [];
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        providers.push({
            name: document.getElementById(`name${id}`).value,
            sub: document.getElementById(`subCost${id}`).value,
            rate: document.getElementById(`rate${id}`).value,
            preset: document.getElementById(`preset${id}`).value
        });
    });
    params.set("p", JSON.stringify(providers));

    const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    navigator.clipboard.writeText(newUrl).then(() => {
        const btn = document.getElementById("shareBtn");
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.add("good");
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove("good");
        }, 2000);
    });
}

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle("light-mode");
    setCookie('themePref', isLight ? 'light' : 'dark');
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
            <div style="display: flex; align-items: center; gap: 12px; margin-left: 8px;">
                <a href="#resultsHeader" class="jump-btn-pulse" title="Jump to results">↓</a>
                <button class="remove-btn" onclick="this.parentElement.parentElement.parentElement.remove(); calculate();">×</button>
            </div>
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
    const providersContainer = document.getElementById("providers");
    const addAllBtn = document.getElementById("addAllBtn"); 
    const collapseBtn = document.getElementById("toggleProvidersBtn");

    providersContainer.innerHTML = "";
    PRESETS.forEach(p => {
        const canSupport = p.rates.default || Object.keys(p.rates).some(s => Number(s) >= minSpeed);
        if (canSupport) createProviderBox(p);
    });

    if (addAllBtn) {
        addAllBtn.classList.remove("empty-pulse");
    }
    
    if (collapseBtn) {
        collapseBtn.classList.add("empty-pulse");
    }
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

function calculate() {
    const activePill = document.querySelector('.pill-btn.active');
    const isTripMode = activePill && activePill.textContent.trim() === "Trip Savings";
    const conclusionsBox = document.getElementById("conclusionsBox");
    const beCard = document.getElementById("breakEvenCard");
    if (beCard) beCard.style.display = isTripMode ? "none" : "block";
    
    const tripGrid = document.querySelector(".grid");
    const resultsHeader = document.getElementById("resultsHeader");
    const btnRow = document.querySelector(".btn-row");
    const uiResults = document.getElementById("results");
    const uiPreText = document.getElementById("preConclusionsText");
    const sortContainer = document.getElementById("sortContainer");

    if (sortContainer) sortContainer.style.display = isTripMode ? "block" : "none";
    if (tripGrid) tripGrid.style.display = isTripMode ? "grid" : "none";
    if (resultsHeader) resultsHeader.style.display = isTripMode ? "flex" : "none";
    if (uiResults) uiResults.style.display = isTripMode ? "flex" : "none";
    if (btnRow) btnRow.style.display = isTripMode ? "flex" : "none";

    const fieldIds = [
        "journeyMiles", "batteryKwh", "soc", "efficiency", 
        "adhoc", "startChargeRate", "efficiencyBE", "adhocBE"
    ];

    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const val = parseFloat(el.value);
            if (!el.value || isNaN(val) || val <= 0) {
                el.classList.add('empty-pulse');
            } else {
                el.classList.remove('empty-pulse');
            }
        }
    });

    document.querySelectorAll(".provider-box input[type='number'], .provider-box input[type='text']").forEach(input => {
        if (!input.value || input.value === "0") {
            input.classList.add('empty-pulse');
        } else {
            input.classList.remove('empty-pulse');
        }
    });

    if (!isTripMode) {
        conclusionsBox.style.display = "none";
        const efficiency = parseFloat(document.getElementById("efficiencyBE").value);
        const adhocRate = parseFloat(document.getElementById("adhocBE").value) || 0;
        const minSpeedSelection = parseFloat(document.getElementById("minSpeedBE").value) || 0;

        if (isNaN(efficiency) || efficiency <= 0 || isNaN(adhocRate) || adhocRate <= 0) {
            uiPreText.innerHTML = "Please enter valid <strong>Efficiency</strong> and <strong>PAYG Rate</strong> values, or use the toggle at the top to switch to TRIP SAVINGS calculation type.";
            uiPreText.style.display = "block";
            uiResults.style.display = "none";
            return;
        }

        uiPreText.style.display = "none";
        uiResults.style.display = "block";
        
        document.querySelector(".calc-lines").style.display = "none";
        document.querySelector(".chart-wrapper").style.display = "none";

        let beData = [];

        PRESETS.forEach(p => {
            const sub = p.subscription.monthlyCost;
            const rates = p.rates;
            const speedKeys = Object.keys(rates);
            
            speedKeys.forEach(speed => {
                const numericSpeed = speed === 'default' ? 0 : parseFloat(speed);
                
                if (speed !== 'default' && numericSpeed < minSpeedSelection) {
                    return; 
                }

                const rate = rates[speed];
                const speedDisplay = speed === 'default' ? "Max. available" : `${speed}kW`;
                
                let breakEvenMiles = null; 
                let displayMiles = "";

                if (rate < adhocRate) {
                    const savingPerKwh = (adhocRate - rate) / 100;
                    const kwhNeeded = sub / savingPerKwh;
                    breakEvenMiles = Math.round(kwhNeeded * efficiency);
                    displayMiles = breakEvenMiles + " miles";
                } else if (sub > 0) {
                    displayMiles = "Never (Rate ≥ PAYG)";
                } else {
                    breakEvenMiles = 0;
                    displayMiles = "0 (Free/No Sub)";
                }

                beData.push({
                    name: p.name,
                    url: p.subscription?.url,
                    comments: p.subscription?.comments || "",
                    speedDisplay: speedDisplay,
                    subCost: sub,
                    rate: rate,
                    miles: breakEvenMiles,
                    displayText: displayMiles
                });
            });
        });

        beData.sort((a, b) => {
            if (a.miles !== null && b.miles !== null) return a.miles - b.miles;
            if (a.miles !== null) return -1;
            if (b.miles !== null) return 1;
            return a.name.localeCompare(b.name);
        });

        let html = `<h2 class="results-heading" style="text-align: center">BREAK-EVEN ANALYSIS</h2>
                    <div class="mobile-only-text" style="font-size: 0.8em; margin-left: 10px">Slide table left to view hidden columns.</div>
                    <div class="results-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Provider (click hyperlink to view subscription info)</th>
                                <th>Speed<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down">If the provider's discounted charge rate is tied to a charging speed (selected in the form above), it will be specified in this column. If the provider offers more than one speed at the same discounted charge rate, you will see <strong>'Max. available'</strong>.</div></th>
                                <th>Sub. Fee<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down">This is the provider's subscription fee, which gives you access to their discounted charge rate for ONE MONTH.</div></th>
                                <th>Disc. Rate<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down">This is the provider's discounted charge rate (per kWh) that is available after subscribing for one month. Note that some providers have variable charge rates depending on location and time of day.</div></th>
                                <th>Break Even Miles<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down tooltip-reset-offset">This is the number of miles you must drive on the provider's discounted charge rate to pay off the subscription fee. <strong>Important! This is not the total miles of your journey</strong> — it is the number of miles you must drive from your first charge with this provider. Remember, a subscription lasts for an entire month.</div></th>
                            </tr>
                        </thead>
                        <tbody>`;

        beData.forEach(row => {
            const providerLink = row.url 
                ? `<a href="${row.url}" target="_blank" style="color:inherit; text-decoration:underline;">${row.name}</a>` 
                : row.name;

            html += `<tr>
                <td>
                    ${providerLink}
                    <div style="font-size: 0.75rem; opacity:0.8;">${row.comments}</div>
                </td>
                <td>${row.speedDisplay}</td>
                <td>£${row.subCost.toFixed(2)}</td>
                <td>${row.rate.toFixed(1)}p</td>
                <td><strong>${row.displayText}</strong></td>
            </tr>`;
        });

        document.getElementById("providerResults").innerHTML = html + `</tbody></table></div>`;
        return; 
    }

    if (uiPreText) uiPreText.style.display = "block";
    if (uiResults) uiResults.style.display = "block";

    const inputs = getInputs();
    const uiShare = document.getElementById("shareBtn");
    const uiPdf = document.getElementById("pdfBtn");

    const tripIncomplete = 
        inputs.journeyMiles <= 0 || 
        inputs.batteryKwh <= 0 || 
        inputs.soc <= 0 ||
        inputs.efficiency <= 0 || 
        inputs.adhoc <= 0 ||
        inputs.startChargeRate <= 0;
    
    const providerBoxes = document.querySelectorAll(".provider-box");

    if (tripIncomplete) {
        uiPreText.innerHTML = "Please complete all fields in the <strong>Trip & Vehicle</strong> section.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (resultsHeader) resultsHeader.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        return; 
    }
    
    if (providerBoxes.length === 0) {
        uiPreText.innerHTML = "Before you may view a comparison, you must select at least one provider from the list of providers (above).";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (resultsHeader) resultsHeader.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        return;
    }

    uiPreText.style.display = "none";
    uiResults.style.display = "block";
    conclusionsBox.style.display = "block";
    if (uiShare) uiShare.style.display = "";
    if (uiPdf) uiPdf.style.display = "";
    document.querySelector(".calc-lines").style.display = "block";
    document.querySelector(".chart-wrapper").style.display = "block";

    const startChargeKwh = (inputs.soc / 100) * inputs.batteryKwh;
    const startChargeCost = startChargeKwh * (inputs.startChargeRate / 100);
    const initialRange = startChargeKwh * inputs.efficiency;
    const publicMiles = Math.max(0, inputs.journeyMiles - initialRange);
    const publicKwh = publicMiles / inputs.efficiency;
    const totalAdhocCost = startChargeCost + (publicKwh * (inputs.adhoc / 100));
    
    document.getElementById("preChargeLine").innerHTML = `<h3>PAYG SUMMARY</h3>Pre-journey starting charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (£${startChargeCost.toFixed(2)})`;
    document.getElementById("homeRangeLine").innerHTML = `Range from pre-journey starting charge: <strong>${initialRange.toFixed(0)} miles</strong> <div class="tooltip-container">
                            <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down tooltip-reset-offset">This is the distance you can expect to drive before your first public charge along your route.</div>`;
    document.getElementById("publicMilesLine").innerHTML = `PAYG public charging miles needed: <strong>${publicMiles.toFixed(0)} miles</strong> <div class="tooltip-container">
                            <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down tooltip-reset-offset">This is how many miles of your trip will need to be covered by public charging.</div>`;
    document.getElementById("publicKwhLine").innerHTML = `PAYG public charging energy needed: <strong>${publicKwh.toFixed(1)} kWh @ ${inputs.adhoc}p</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total journey cost (pre-charge + standard PAYG): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;
    
    const providers = [];
    providerBoxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;
       
        const savingPerKwh = (inputs.adhoc - rate) / 100;
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
    providers.sort((a, b) => {
        if (sortVal === "cheapest") {
            return a.totalJourneyCost - b.totalJourneyCost;
        } 
        if (sortVal === "breakeven") {
            const aNever = a.rate >= inputs.adhoc;
            const bNever = b.rate >= inputs.adhoc;
            if (aNever && !bNever) return 1;
            if (!aNever && bNever) return -1;
            return a.breakEvenMiles - b.breakEvenMiles;
        }
        if (sortVal === "az") return a.name.localeCompare(b.name);
        if (sortVal === "za") return b.name.localeCompare(a.name);
        return 0;
    });
    let html = `<div class="mobile-only-text" style="font-size: 0.8em; margin-left: 10px">Slide table left to view hidden columns.</div><div class="results-scroll"><table><thead><tr>
        <th>Provider (click hyperlink to view subscription info)</th>
        <th>Sub. Fee<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down">This is the provider's subscription fee, which gives you access to their discounted charge rate for ONE MONTH.</div></th>
        <th>Disc. Rate<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down">This is the provider's discounted charge rate (per kWh) that is available after subscribing for one month. Note that some providers have variable charge rates depending on location and time of day.</div></th>
        <th>Trip Cost<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down">This is the expected total cost of your trip using this provider (including your specified battery pre-charge). If it is displayed in green, it is cheaper than the equivalent journey using PAYG charging at the rate you entered above.</div></th>
        </th>
        <th>vs. PAYG<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down">This is the amount by which the discounted charge rate will either be cheaper or more expensive than your average PAYG rate for the same distance. Green means cheaper; red means more expensive. Bear in mind that you can continue to use a provider's subscription for one full month.</div></th>
        </th>
        <th>Break Even Miles<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down">This is the number of miles you must drive on the provider's discounted charge rate to pay off the subscription fee. <strong>Important! This is not the total miles of your journey</strong> — it is the number of miles you must drive from your first charge with this provider. Remember, a subscription lasts for an entire month.</div></th>
        <th>Break Even + Battery<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box tooltip-down tooltip-reset-offset">This is the break-even miles PLUS the number of miles your car can drive in its precharged state.</div></th>
        </th>
        </tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const jumpArrow = `<a href="#resultsHeader" title="Jump to results" style="text-decoration:none; margin-right:8px; color:var(--accent); font-size:1.1rem;">↓</a>`;
        const providerLink = p.url 
            ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>` 
            : p.name;
        const displayName = `${providerLink}`;        
        const breakEvenText = p.rate < inputs.adhoc 
            ? `${p.breakEvenMiles.toFixed(0)} miles` 
            : "Never";
        const totalMilesText = p.rate < inputs.adhoc 
            ? `${p.totalWithBattery.toFixed(0)} miles` 
            : "N/A";
        html += `<tr class="${rowClass}">
            <td>${displayName}<div style="font-size: 0.75rem; opacity:0.8;">${p.comments}</div></td>
            <td>£${p.subCost.toFixed(2)}</td>
            <td>${p.rate.toFixed(1)}p</td>
            <td><strong>£${p.totalJourneyCost.toFixed(2)}</strong></td>
            <td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td>
            <td><strong>${breakEvenText}</strong></td>
            <td><strong>${totalMilesText}</strong></td>
        </tr>`;
    });
    document.getElementById("providerResults").innerHTML = html + `</tbody></table></div>`;


    if (providers.length > 0) {
        const bestProvider = providers[0];
        const timeLine = `<p class="approxTime">Approximate driving time for ${inputs.journeyMiles} miles at 60mph is <strong>${(inputs.journeyMiles / 60).toFixed(1)} hours</strong>.</p>`;
        
        const minSpeedSelect = document.getElementById("minSpeed");
        const minSpeedLabel = minSpeedSelect.options[minSpeedSelect.selectedIndex].text;
    
        const speedTableHtml = `
            <div class="speed-comparison-container">
                <table class="mini-table">
                    <thead>
                        <tr><th>Charging Speed</th><th>Journey Charging Time</th></tr>
                    </thead>
                    <tbody>
                        <tr style="${inputs.minSpeed == 7 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>7kW (AC)</td><td>${(publicKwh / 7).toFixed(1)} hours</td></tr>
                        <tr style="${inputs.minSpeed == 22 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>22kW (AC)</td><td>${(publicKwh / 22).toFixed(1)} hours</td></tr>
                        <tr style="${inputs.minSpeed == 35 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>35kW (AC)</td><td>${(publicKwh / 35).toFixed(1)} hours</td></tr>
                        <tr style="${inputs.minSpeed == 50 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>50kW (Rapid)</td><td>${((publicKwh / 50) * 60).toFixed(0)} minutes</td></tr>
                        <tr style="${inputs.minSpeed == 75 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>75kW (Rapid)</td><td>${((publicKwh / 75) * 60).toFixed(0)} minutes</td></tr>
                        <tr style="${inputs.minSpeed == 100 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>100kW (Ultra)</td><td>${((publicKwh / 100) * 60).toFixed(0)} minutes</td></tr>
                        <tr style="${inputs.minSpeed == 150 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>150kW (Ultra)</td><td>${((publicKwh / 150) * 60).toFixed(0)} minutes</td></tr>
                        <tr style="${inputs.minSpeed == 200 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>200kW (Ultra)</td><td>${((publicKwh / 200) * 60).toFixed(0)} minutes</td></tr>
                        <tr style="${inputs.minSpeed == 300 ? 'font-weight:bold; color:var(--accent);' : ''}"><td>300kW (Ultra)</td><td>${((publicKwh / 300) * 60).toFixed(0)} minutes</td></tr>
                    </tbody>
                </table>
            </div>`;
        
        const locationDisclaimer = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8;">* Charging times exclude the "80-100%" charging slowdown. Also, you will need to ensure that this provider has charging stations in your planned area of travel.</p>`;
    
            let conclusionHTML = `<div class="conclusion-white-border">`; 
            
            if (bestProvider.savings > 0) {
                conclusionHTML += `<h3>PAYG vs SUBSCRIPTION CONCLUSION</h3><p class="main-result">For a trip of <strong>${inputs.journeyMiles} miles</strong>, a one-month subscription with <strong>${bestProvider.name}</strong> is cheaper than PAYG based on the selected minimum charging rate of <strong>${minSpeedLabel}</strong> and the other information entered. The total journey cost will be <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>, which represents a saving of <strong>£${bestProvider.savings.toFixed(2)}</strong> over PAYG rates.</p>`;
            } else {
                conclusionHTML += `<h3>PAYG vs SUBSCRIPTION CONCLUSION</h3><p class="main-result"><strong>Standard PAYG</strong> rates are cheaper than a subscription at the selected minimum charging rate of <strong>${minSpeedLabel}</strong> and the other information entered. The total journey cost will be <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>`;
            }
            
            conclusionHTML += `${timeLine}${speedTableHtml}${locationDisclaimer}</div>`;
            conclusionsBox.innerHTML = conclusionHTML;
        } else {
            conclusionsBox.innerHTML = "";
        }
    
    drawGraph(inputs, providers);

    const dataToSave = getInputs();
    setCookie("ev_trip_values", dataToSave);
}

function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");
    if (chart) chart.destroy();

    const maxMiles = Math.max(core.journeyMiles * 1.2, 300); 
    const labels = Array.from({length: 11}, (_, i) => Math.round((maxMiles * i) / 10));
    
    const adhocData = labels.map(m => {
        const pKwh = Math.max(0, m - (core.soc/100 * core.batteryKwh * core.efficiency)) / core.efficiency; 
        return (core.soc/100 * core.batteryKwh * core.startChargeRate/100) + (pKwh * core.adhoc/100); 
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
        const pKwh = Math.max(0, m - (core.soc/100 * core.batteryKwh * core.efficiency)) / core.efficiency; 
        return p.subCost + (core.soc/100 * core.batteryKwh * core.startChargeRate/100) + (pKwh * p.rate/100); 
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
    if(slider) {
        slider.style.transform = mode === 'break-even' ? 'translateX(0)' : 'translateX(100%)';
    }
    setCookie('calcMode', mode);
    setCookie('comparisonMode', mode);
    calculate();
}

function init() {
    const savedValues = getCookie("ev_trip_values");
    const urlParams = new URLSearchParams(window.location.search);
    
    const speedTrip = document.getElementById("minSpeed");
    const speedBE = document.getElementById("minSpeedBE");

    const syncAndCalc = (e) => {
        const newValue = e.target.value;
        speedTrip.value = newValue;
        speedBE.value = newValue;
        calculate(); 
    };

    if (speedTrip && speedBE) {
        speedTrip.addEventListener('change', syncAndCalc);
        speedBE.addEventListener('change', syncAndCalc);
    }

    fetch("providers.json").then(r => r.json()).then(data => {
        PRESETS = data.providers;

        const tripIds = ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"];        
        tripIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            if (urlParams.has(id)) {
                el.value = urlParams.get(id);
            } else if (savedValues && savedValues[id] !== undefined) {
                el.value = savedValues[id];
            }
            el.addEventListener('input', calculate);
        });

        const effTrip = document.getElementById("efficiency");
        const effBE = document.getElementById("efficiencyBE");
        const adhocTrip = document.getElementById("adhoc");
        const adhocBE = document.getElementById("adhocBE");
        
        const syncFields = (source, target) => {
            source.addEventListener('input', () => {
                target.value = source.value;
                calculate();
            });
        };
        
        if (effTrip && effBE) {
            effBE.value = effTrip.value; 
            syncFields(effTrip, effBE);
            syncFields(effBE, effTrip);
        }
        
        if (adhocTrip && adhocBE) {
            adhocBE.value = adhocTrip.value;
            syncFields(adhocTrip, adhocBE);
            syncFields(adhocBE, adhocTrip);
        }

        if (urlParams.has("p")) {
            try {
                const sharedProviders = JSON.parse(urlParams.get("p"));
                document.getElementById("providers").innerHTML = ""; 
                sharedProviders.forEach(p => {
                    createProviderBox(); 
                    const id = providerCount;
                    document.getElementById(`name${id}`).value = p.name;
                    document.getElementById(`subCost${id}`).value = p.sub;
                    document.getElementById(`rate${id}`).value = p.rate;
                    document.getElementById(`preset${id}`).value = p.preset;
                    if(p.preset !== 'Custom') {
                        updateProviderFields(id);
                        document.getElementById(`rate${id}`).value = p.rate;
                    }
                });
            } catch (e) {
                console.error("Error parsing shared providers:", e);
            }
        }

        const modeParam = urlParams.get("mode");
        if (modeParam === "trip-savings") {
            const tripBtn = document.querySelector('.pill-btn:nth-child(3)'); 
            if (tripBtn) setToggle('trip-savings', tripBtn);
        } else {
            const activePill = document.querySelector('.pill-btn.active');
            const currentMode = activePill.textContent.trim() === "Trip Savings" ? 'trip-savings' : 'break-even';
            setToggle(currentMode, activePill);
        }

        const provEl = document.getElementById("provider");
        if (provEl && savedValues && savedValues.provider) {
            provEl.value = savedValues.provider;
        }

        updateProviderInfo();
        calculate();
    });
}

function exportPdf() {
    const pdfBtn = document.getElementById("pdfBtn");
    const providerRows = document.querySelectorAll("#providerResults tbody tr");
    const paygSummary = document.querySelector(".calc-lines");
    const conclusion = document.getElementById("conclusionsBox");

    if (!providerRows.length || !pdfBtn) return;

    const originalText = pdfBtn.textContent;
    pdfBtn.textContent = "Generating...";
    pdfBtn.style.pointerEvents = "none";
    pdfBtn.style.opacity = "0.7";

    const printContainer = document.createElement("div");
    printContainer.id = "pdf-render-area";
    printContainer.style.cssText = "position:absolute; left:-9999px; width:800px; padding:40px; background:#fff; color:#000; font-family:Arial, sans-serif;";

    let contentHtml = `
        <style>
            #pdf-render-area * { color: #000 !important; }
            .pdf-header { text-align: center; margin-bottom: 10px; }
            .pdf-section-title { font-size: 22px; margin-top: 20px; }
            .pdf-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; margin-bottom: 30px; }
            .pdf-table th, .pdf-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .pdf-table th { background: #f2f2f2; }
            .conclusion-white-border { border: none !important; }
            .pdf-conclusion-wrapper { 
                background: #f4f4f4 !important; 
                padding: 0px; 
                border: 1px solid #ccc; 
                border-radius: 8px; 
                margin-top: 20px;
            }
            .calc-lines div { margin-bottom: 5px; }
        </style>
        
        <div class="pdf-header">
            <strong style="font-size:24px; color:#000">EV SUBSCRIPTIONS COMPARISON REPORT</strong>
            <p>Generated on ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
        
        <div class="calc-lines">
            ${paygSummary ? paygSummary.innerHTML : ""}
        </div>

        <h2 class="pdf-section-title">Comparison Results</h2>
        <table class="pdf-table">
            <thead>
                <tr>
                    <th>Provider</th>
                    <th>Sub. Fee</th>
                    <th>Disc. Rate</th>
                    <th>Trip Cost</th>
                    <th>vs. PAYG</th>
                    <th>Break Even<br />(Exc. Battery Pre-Charge)</th>
                </tr>
            </thead>
            <tbody>`;

    providerRows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length >= 6) {
            contentHtml += `
                <tr>
                    <td><strong>${cols[0].innerText.split('\n')[0]}</strong></td>
                    <td>${cols[1].innerText}</td>
                    <td>${cols[2].innerText}</td>
                    <td>${cols[3].innerText}</td>
                    <td>${cols[4].innerText}</td>
                    <td>${cols[5].innerText}</td>
                </tr>`;
        }
    });

    contentHtml += `</tbody></table>
        <h2 class="pdf-section-title">Analysis Conclusion</h2>
        <div class="pdf-conclusion-wrapper">
            ${conclusion ? conclusion.innerHTML : ""}
        </div>`;

    printContainer.innerHTML = contentHtml;

    printContainer.querySelectorAll(".info-icon, .jump-btn-pulse, .mini-table, .mobile-only-text, p[style*='opacity:0.8']").forEach(el => el.remove());

    document.body.appendChild(printContainer);

    html2canvas(printContainer, { 
        scale: 2,
        useCORS: true 
    }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth - 20; // 10mm margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 15, imgWidth, imgHeight);
        pdf.save("EV-Trip-Analysis.pdf");

        document.body.removeChild(printContainer);
        pdfBtn.textContent = originalText;
        pdfBtn.style.pointerEvents = "auto";
        pdfBtn.style.opacity = "1";
    });
}

window.addEventListener("DOMContentLoaded", init);

let currentSlide = 0;

function moveSlide(step) {
    const container = document.getElementById('helpSlides');
    const slides = document.querySelectorAll('.help-slide'); 
    const totalSlides = slides.length; 

    currentSlide += step;
    if (currentSlide < 0) currentSlide = 0;
    if (currentSlide >= totalSlides) currentSlide = totalSlides - 1;

    const slideWidthPercent = 100 / totalSlides;
    const offset = currentSlide * -slideWidthPercent;
    container.style.transform = `translateX(${offset}%)`;
}

function closeHelp() {
    const overlay = document.getElementById('helpOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

function toggleTooltip(el) {
    const container = el.closest('.tooltip-container');
    if (container) {
        container.classList.toggle('active');
    }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.tooltip-container')) {
        document.querySelectorAll('.tooltip-container.active').forEach(openTooltip => {
            openTooltip.classList.remove('active');
        });
    }

});

function toggleProviders() {
    const container = document.getElementById("collapsibleProviders");
    const controls = document.getElementById("providerControls"); 
    const btn = document.getElementById("toggleProvidersBtn");
    
    if (container.style.display === "none") {
        container.style.display = "block";
        if (controls) controls.style.display = "block"; 
        btn.textContent = "Collapse Providers List";
    } else {
        container.style.display = "none";
        if (controls) controls.style.display = "none"; 
        btn.textContent = "Expand Providers List";
    }

    btn.classList.remove("empty-pulse");
}

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('helpSlides');
    
    // --- 1. YOUR REQUESTED ANIMATION SEQUENCE ---
    if (track) {
        // Start the automatic sequence
        track.classList.add('intro-animation');

        // When the 5-second animation finishes on Slide 3
        track.addEventListener('animationend', () => {
            track.classList.remove('intro-animation');
            // Lock the position on Slide 3 (Index 2)
            track.style.transform = `translateX(-28.5714%)`;
            // Sync the manual index so 'Next' starts from Slide 3
            currentSlide = 2; 
        });
    }

    // --- 2. YOUR ORIGINAL COOKIE/BANNER LOGIC ---
    const savedMode = getCookie('calcMode');

    if (savedMode) {
        const modeBtn = document.querySelector(`.pill-btn[onclick*="${savedMode}"]`);
        if (modeBtn) {
            modeBtn.click();
        }

        const helpOverlay = document.getElementById('helpOverlay');
        if (helpOverlay) {
            helpOverlay.style.display = 'none';
        }

        const cookieBanner = document.getElementById('cookieBanner');
        if (cookieBanner) {
            cookieBanner.style.display = 'none';
        }
    } else {
        if (!getCookie('cookiesAccepted')) {
            const banner = document.getElementById('cookieBanner');
            if (banner) banner.style.display = 'block';
        }
    }
});

function acceptCookies() {
    const date = new Date();
    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
    document.cookie = `cookiesAccepted=true;expires=${date.toUTCString()};path=/;SameSite=Lax`;
    
    closeCookieBanner();
}

function closeCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    banner.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => banner.style.display = 'none', 400);
}

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    menu.classList.toggle('active');
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('sideMenu');
    const trigger = document.querySelector('.android-dots-trigger');
    if (menu.classList.contains('active')) {
        if (!menu.contains(e.target) && !trigger.contains(e.target)) {
            menu.classList.remove('active');
        }
    }
});

function openPrivacy() {
    const privacy = document.getElementById('privacyOverlay');
    privacy.style.display = 'flex';
    setTimeout(() => {
        privacy.style.opacity = '1';
    }, 10);
}

function closePrivacy() {
    const privacy = document.getElementById('privacyOverlay');
    privacy.style.opacity = '0';
    setTimeout(() => {
        privacy.style.display = 'none';
    }, 400); 
}

function openAbout() {
    const about = document.getElementById('aboutOverlay');
    about.style.display = 'flex';
    setTimeout(() => { about.style.opacity = '1'; }, 10);
}

function closeAbout() {
    const about = document.getElementById('aboutOverlay');
    about.style.opacity = '0';
    setTimeout(() => { about.style.display = 'none'; }, 400); 
}

function openContact() {
    const contact = document.getElementById('contactOverlay');
    contact.style.display = 'flex';
    setTimeout(() => {
        contact.style.opacity = '1';
    }, 10);
}

function closeContact() {
    const contact = document.getElementById('contactOverlay');
    contact.style.opacity = '0';
    setTimeout(() => {
        contact.style.display = 'none';
    }, 400);
}
