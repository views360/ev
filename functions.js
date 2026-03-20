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

// Stub function - called in init() but doesn't need to do anything
// The calculate() function handles all necessary updates
function updateProviderInfo() {
    // Intentionally empty - this function is called but not needed
}

function getInputs() {
    return {
        journeyMiles: parseFloat(document.getElementById("journeyMiles").value) || 0,
        batteryKwh: parseFloat(document.getElementById("batteryKwh").value) || 0,
        soc: parseFloat(document.getElementById("soc").value) || 0,
        efficiency: parseFloat(document.getElementById("efficiency").value) || 0,
        adhoc: parseFloat(document.getElementById("adhoc").value) || 0,
        startChargeRate: parseFloat(document.getElementById("startChargeRate").value) || 0,
        maxChargingSpeed: parseFloat(document.getElementById("maxChargingSpeed").value) || 0,
        rechargeAt: parseFloat(document.getElementById("rechargeAt").value) || 20,
        minSpeed: parseFloat(document.getElementById("minSpeed").value) || 0
    };
}

function shareLink() {
    const params = new URLSearchParams();
    params.set("mode", "trip-savings");

    const tripIds = ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "maxChargingSpeed", "rechargeAt", "minSpeed"];
    
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
    const activePill = document.querySelector('.calc-tab.active');
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
        "adhoc", "startChargeRate", "maxChargingSpeed", "efficiencyBE", "adhocBE"
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
            uiPreText.innerHTML = "Please attend to all flashing green fields, or use the navigation tabs at the top to switch between BREAK EVEN and TRIP SAVINGS calcuation types.";
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
                    <div class="mobile-only-text" style="font-size: 0.8em; text-align: center; color: var(--neon-green)">Slide table left to view hidden columns.</div>
                    <div class="results-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Provider (click hyperlink to view subscription info)</th>
                                <th><span class="tooltip-container">
                                    <span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">If the provider's discounted charge rate is tied to a charging speed (selected in the form above), it will be specified in this column. If the provider offers more than one speed at the same discounted charge rate, you will see <strong>'Max. available'</strong>.</span></span>
                                </span></span>Charging Speed</th>
                                <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the provider's subscription fee, which gives you access to their discounted charge rate for ONE MONTH.</span></span></span>Sub. Fee</th>
                                <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the provider's discounted charge rate (per kWh) that is available after subscribing for one month. Note that some providers have variable charge rates depending on location and time of day. The rate listed here may be an average. Click the provider's link to confirm pricing.</span></span></span>Disc. Rate</th>
                                <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the number of miles you must drive on the provider's discounted charge rate to pay off the subscription fee. <strong>Important! This is not the total miles of your journey</strong> — it is the number of miles you must drive from your first charge with this provider. Remember, a subscription lasts for an entire month.</span></span></span>Break-Even Miles</th>
                            </tr>
                        </thead>
                        <tbody>`;

        beData.forEach(row => {
            const providerLink = row.url 
                ? `<a href="${row.url}" target="_blank" style="color:inherit; text-decoration:underline;">${row.name}</a>` 
                : row.name;

            html += `<tr>
                <td>
                    <span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">${row.comments}</span>
                    </span></span> ${providerLink}
                </td>
                <td>${row.speedDisplay}</td>
                <td>£${row.subCost.toFixed(2)}</td>
                <td>${row.rate.toFixed(1)}p</td>
                <td><strong>${row.displayText}</strong></td>
            </tr>`;
        });

        document.getElementById("providerResults").innerHTML = html + `</tbody></table></div>`;
        document.querySelectorAll(".results-scroll").forEach(el => {
            if (!el._ftScrollBound) { el._ftScrollBound = true; el.addEventListener("scroll", () => { if (_ftActive) _ftHide(); }, { passive: true }); }
        });

        if (!beReminderShown) {
            setTimeout(() => {
                const activePill = document.querySelector('.calc-tab.active');
                const isTripMode = activePill && activePill.textContent.trim() === "Trip Savings";
                if (!isTripMode) {
                    showBeReminder();
                    beReminderShown = true; 
                }
            }, 5000);
        }
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
        uiPreText.innerHTML = "Please attend to all flashing green fields, or use the navigation tabs at the top to switch between BREAK EVEN and TRIP SAVINGS calcuation types.";
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
    
    document.getElementById("preChargeLine").innerHTML = `<div class="guide-section" id="payg-summary"><h3>PAYG SUMMARY</h3>Pre-journey starting charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (£${startChargeCost.toFixed(2)})</div>`;
    document.getElementById("homeRangeLine").innerHTML = `<span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the distance you can expect to drive before your first public charge along your route.</span></span></span>Range from pre-journey starting charge: <strong>${initialRange.toFixed(0)} miles</strong></span>`;
    document.getElementById("publicMilesLine").innerHTML = `<span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is how many miles of your trip will need to be covered by public charging.</span></span></span>PAYG public charging miles needed: <strong>${publicMiles.toFixed(0)} miles</strong></span>`;
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
        if (sortVal === "cheapest") return a.totalJourneyCost - b.totalJourneyCost;
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

    let html = `<div class="mobile-only-text" style="font-size: 0.8em; text-align: center; color: var(--neon-green)">Slide table left to view hidden columns.</div><div class="results-scroll"><table><thead><tr>
        <th>Provider (click hyperlink to view subscription info)</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the provider's subscription fee, which gives you access to their discounted charge rate for ONE MONTH.</span></span></span>Sub. Fee</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the provider's discounted charge rate (per kWh) that is available after subscribing for one month. Note that some providers have variable charge rates depending on location and time of day. The rate listed here may be an average. Click the provider's link to confirm pricing.</span></span></span>Disc. Rate</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the expected <strong>total charging cost</strong> of your trip using this provider and including your stated battery pre-charge. If it is displayed in green, it is cheaper than the equivalent journey using PAYG charging at the rate you entered above.</span></span></span>Trip Cost</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the amount by which the discounted charge rate will either be cheaper or more expensive than your average PAYG rate for the same distance. Green means cheaper; red means more expensive. Bear in mind that you can continue to use a provider's subscription for one full month.</span></span></span>vs. PAYG</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the number of miles you must drive on the provider's discounted charge rate to pay off the subscription fee. <strong>Important! This is not the total miles of your journey</strong> — it is the number of miles you must drive from your first charge with this provider. Remember, a subscription lasts for an entire month.</span></span></span>Break-Even Miles</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the break-even miles PLUS the initial number of miles your vehicle can drive based on its precharged state.</span></span></span>Break Even + Battery</th>
        </tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const providerLink = p.url 
            ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>` 
            : p.name;
        const breakEvenText = p.rate < inputs.adhoc 
            ? `${p.breakEvenMiles.toFixed(0)} miles` 
            : "Never";
        const totalMilesText = p.rate < inputs.adhoc 
            ? `${p.totalWithBattery.toFixed(0)} miles` 
            : "N/A";
        html += `<tr class="${rowClass}">
            <td>
                <span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">${p.comments}</span>
                </span></span> ${providerLink}
            </td>
            <td>£${p.subCost.toFixed(2)}</td>
            <td>${p.rate.toFixed(1)}p</td>
            <td><strong>£${p.totalJourneyCost.toFixed(2)}</strong></td>
            <td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td>
            <td><strong>${breakEvenText}</strong></td>
            <td><strong>${totalMilesText}</strong></td>
        </tr>`;
    });
    document.getElementById("providerResults").innerHTML = html + `</tbody></table></div>`;
    document.querySelectorAll(".results-scroll").forEach(el => {
        if (!el._ftScrollBound) { el._ftScrollBound = true; el.addEventListener("scroll", () => { if (_ftActive) _ftHide(); }, { passive: true }); }
    });

    if (providers.length > 0) {
        const bestProvider = providers[0];
        const minSpeedSelect = document.getElementById("minSpeed");
        const minSpeedLabel = minSpeedSelect.options[minSpeedSelect.selectedIndex].text;
        const maxChargingSpeed = inputs.maxChargingSpeed;
        
        const formatChargingTime = (timeHours) => {
            if (timeHours < 1) {
                const minutes = Math.round(timeHours * 60);
                return `${minutes} minutes`;
            } else {
                const hours = Math.floor(timeHours);
                const minutes = Math.round((timeHours - hours) * 60);
                if (minutes === 0) {
                    return `${hours} hour${hours > 1 ? 's' : ''}`;
                }
                return `${hours}h ${minutes}m`;
            }
        };
        
        const maxChargingTimeHours = maxChargingSpeed > 0 ? publicKwh / maxChargingSpeed : 0;
        const maxChargingTimeFormatted = formatChargingTime(maxChargingTimeHours);
        
        const chargingSpeeds = [
            { speed: 7, type: 'AC', descriptor: 'Standard' },
            { speed: 11, type: 'AC', descriptor: 'Standard Plus' },
            { speed: 22, type: 'AC', descriptor: 'Fast' },
            { speed: 50, type: 'DC', descriptor: 'Rapid' },
            { speed: 60, type: 'DC', descriptor: 'Rapid' },
            { speed: 75, type: 'DC', descriptor: 'Rapid Plus' },
            { speed: 90, type: 'DC', descriptor: 'Rapid Plus' },
            { speed: 100, type: 'DC', descriptor: 'Rapid Plus' },
            { speed: 120, type: 'DC', descriptor: 'Ultra-Rapid' },
            { speed: 150, type: 'DC', descriptor: 'Ultra-Rapid' },
            { speed: 175, type: 'DC', descriptor: 'Ultra-Rapid' },
            { speed: 250, type: 'DC', descriptor: 'Ultra-Rapid' },
            { speed: 300, type: 'DC', descriptor: 'Hyper-Rapid' },
            { speed: 350, type: 'DC', descriptor: 'Hyper-Rapid' },
            { speed: 360, type: 'DC', descriptor: 'Hyper-Rapid' }
        ];
        
        let speedsToDisplay = [...chargingSpeeds];
        if (maxChargingSpeed > 0 && !speedsToDisplay.some(s => Math.abs(s.speed - maxChargingSpeed) < 0.01)) {
            speedsToDisplay.push({
                speed: maxChargingSpeed,
                type: 'Custom',
                descriptor: 'Vehicle Max'
            });
            speedsToDisplay.sort((a, b) => a.speed - b.speed);
        }
        
        let tableRows = '';
        speedsToDisplay.forEach(speedObj => {
            const timeHours = publicKwh / speedObj.speed;
            const timeFormatted = formatChargingTime(timeHours);
            const isMaxSpeed = Math.abs(maxChargingSpeed - speedObj.speed) < 0.01;
            const highlightStyle = isMaxSpeed ? 'font-weight:bold; color:#4A9EFF;' : '';
            tableRows += `<tr style="${highlightStyle}"><td>${speedObj.speed}kW</td><td>${speedObj.type}</td><td>${speedObj.descriptor}</td><td>${timeFormatted}</td></tr>`;
        });
        
        const speedTableHtml = `
            <div class="speed-comparison-container">
                <table class="mini-table">
                    <thead>
                        <tr><th>Charging Speed</th><th>Type</th><th>Descriptor</th><th>Journey Charging Time</th></tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>`;
        
        // --- REAL WORLD SECTION ---
        const usableKwh = inputs.batteryKwh;
        const efficiency = inputs.efficiency;
        const chargeSpeed = inputs.maxChargingSpeed || 101;
        const reserveKwh = 0.2 * usableKwh;
        const initialKwhAtStart = (inputs.soc / 100) * usableKwh;
        const sixtyPercentKwh = 0.6 * usableKwh;
        const fullChargeRange = sixtyPercentKwh * efficiency;
        const firstStopMile = Math.max(0, (initialKwhAtStart - reserveKwh) * efficiency);
        
        let stopsRows = '';
        let stopCount = 0;
        let currentMileMark = firstStopMile;

        if (inputs.journeyMiles > firstStopMile) {
            // intermediate stops loop (Corrected logic)
            if (fullChargeRange > 0) {
                while (currentMileMark + fullChargeRange < inputs.journeyMiles) {
                    stopCount++;
                    stopsRows += `<tr>
                        <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${stopCount}</td>
                        <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">Public charge (when battery reaches 20%)</td>
                        <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${currentMileMark.toFixed(0)}</td>
                        <td style="padding: 10px; border: 1px solid var(--border);">Add 60% / ${sixtyPercentKwh.toFixed(1)}kWh</td>
                        <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${formatChargingTime(sixtyPercentKwh / chargeSpeed)}</td>
                    </tr>`;
                    currentMileMark += fullChargeRange;
                }
            }

            // Final stop logic (Option a and b)
            const finalStopNum = stopCount + 1;
            const milesRemainingAfterLastStop = inputs.journeyMiles - currentMileMark;
            const kwhNeededForFinalLeg = (milesRemainingAfterLastStop / efficiency);
            const percentNeededForFinalLeg = Math.ceil((kwhNeededForFinalLeg / usableKwh) * 100);

            stopsRows += `<tr>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${finalStopNum}a</td>
                <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">Final stop Option 1: Standard charge (20% to 80%)</td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${currentMileMark.toFixed(0)}</td>
                <td style="padding: 10px; border: 1px solid var(--border);">Add 60% / ${sixtyPercentKwh.toFixed(1)}kWh</td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${formatChargingTime(sixtyPercentKwh / chargeSpeed)}</td>
            </tr>`;

            stopsRows += `<tr>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${finalStopNum}b</td>
                <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">Final stop Option 2: Precise charge to reach destination with 20%</td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${currentMileMark.toFixed(0)}</td>
                <td style="padding: 10px; border: 1px solid var(--border);">Add ${percentNeededForFinalLeg}% / ${kwhNeededForFinalLeg.toFixed(1)}kWh</td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${formatChargingTime(kwhNeededForFinalLeg / chargeSpeed)}</td>
            </tr>`;
        }

        let assessmentBoxHTML = `
            <div class="conclusion-white-border guide-section" id="real-world-assessment">
                <h3>REAL WORLD CHARGING ASSESSMENT</h3>
                <div class="results-scroll">
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid var(--border); font-size: 0.8rem;">
                        <thead>
                            <tr style="background: rgba(57, 255, 20, 0.05); color: var(--text);">
                                <th style="padding: 10px; border: 1px solid var(--border);">Stop</th>
                                <th style="padding: 10px; border: 1px solid var(--border); text-align: left;">Event</th>
                                <th style="padding: 10px; border: 1px solid var(--border);">Mile Mark</th>
                                <th style="padding: 10px; border: 1px solid var(--border); text-align: left;">Action</th>
                                <th style="padding: 10px; border: 1px solid var(--border);">Timing</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stopsRows || '<tr><td colspan="5" style="padding: 20px; text-align: center;">No public charging stops required for this journey distance.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
        
        const locationDisclaimer = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8; color:var(--neon-green) !important;">Note 1: Before purchasing a subscription, check that your chosen provider has charging stations in your planned area of travel — else your subscription will be wasted.</p><p style="font-size:0.85rem; margin-top:12px; opacity:0.8;">Note 2: Charging times exclude the initial ramp-up phase and the 80-to-100% charging slowdown. Read the section on <a href="mastery.html#sec-slow" style="color: var(--accent); text-decoration: underline;">Slow Charging</a> to find out more.</p>`;
    
        const contentsHTML = `
            <div class="conclusion-white-border">
                <h3>RESULTS CONTENTS</h3>
                <ul style="margin:0; padding-left:20px; font-size:0.95rem;">
                    <li><a href="#payg-summary" style="color: var(--accent); text-decoration:none;">PAYG Summary</a></li>
                    <li><a href="#providerResults" style="color: var(--accent); text-decoration:none;">Table of Results</a></li>
                    <li><a href="#payg-vs-subscription" style="color: var(--accent); text-decoration:none;">PAYG vs Subscription Conclusion</a></li>
                    <li><a href="#charging-times-section" style="color: var(--accent); text-decoration:none;">Charging Times</a></li>
                    <li><a href="#real-world-assessment" style="color: var(--accent); text-decoration:none;">Real World Charging Assessment</a></li>
                    <li><a href="#graph-section" style="color: var(--accent); text-decoration:none;">Graph</a></li>
                </ul>
            </div>
        `;
        
        document.getElementById("contentsBox").innerHTML = contentsHTML;
        let conclusionHTML = "";
        
        conclusionHTML += `<div class="conclusion-white-border guide-section" id="payg-vs-subscription">`; 
        if (bestProvider.savings > 0) {
            conclusionHTML += `<h3>PAYG vs SUBSCRIPTION CONCLUSION</h3><p class="main-result">For a trip of <strong>${inputs.journeyMiles} miles</strong>, a one-month subscription with <strong>${bestProvider.name}</strong> is cheaper than PAYG based on the selected minimum charging rate of <strong>${minSpeedLabel}</strong> and the other information entered. The total journey cost will be <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>, which represents a saving of <strong>£${bestProvider.savings.toFixed(2)}</strong> over PAYG rates.</p>`;
        } else {
            conclusionHTML += `<h3>PAYG vs SUBSCRIPTION CONCLUSION</h3><p class="main-result"><strong>Standard PAYG</strong> rates are cheaper than a subscription at the selected minimum charging rate of <strong>${minSpeedLabel}</strong> and the other information entered. The total journey cost will be <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>`;
        }
        conclusionHTML += `</div>`;
        
        conclusionHTML += `<div class="conclusion-white-border guide-section" id="charging-times-section"><h3>CHARGING TIMES</h3>`;
        if (maxChargingSpeed > 0) {
            conclusionHTML += `<p class="main-result">With your vehicle's maximum charging speed of <strong>${maxChargingSpeed} kW</strong>, the journey requiring <strong>${publicKwh.toFixed(1)} kWh</strong> of public charging would take <strong>${maxChargingTimeFormatted}</strong> at public chargers.</p>`;
        } else {
            conclusionHTML += `<p class="main-result">Enter your vehicle's <strong>Max. Charging Speed</strong> above to see estimated charging times for this journey.</p>`;
        }
        conclusionHTML += `${speedTableHtml}${locationDisclaimer}</div>`;
        conclusionsBox.innerHTML = conclusionHTML + assessmentBoxHTML;
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
    document.querySelectorAll('.calc-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
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

        const tripIds = ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "maxChargingSpeed", "rechargeAt", "minSpeed"];        
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
            const tripBtn = document.querySelector('.calc-tab:nth-child(2)'); 
            if (tripBtn) setToggle('trip-savings', tripBtn);
        } else {
            const activeTab = document.querySelector('.calc-tab.active');
            const currentMode = activeTab.textContent.trim() === "Trip Savings" ? 'trip-savings' : 'break-even';
            setToggle(currentMode, activeTab);
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
        const modeBtn = document.querySelector(`.calc-tab[onclick*="${savedMode}"]`);
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
            setTimeout(function() {
                const banner = document.getElementById('cookieBanner');
                if (banner) banner.style.display = 'block';
            }, 4000);
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
    if (menu) {
        menu.classList.toggle('active');
        // When menu opens, expand sections containing the active page
        if (menu.classList.contains('active')) {
            expandActiveSections();
        }
    }
}

function toggleMenuSection(toggleId, itemsId) {
    const toggle = document.getElementById(toggleId);
    const items = document.getElementById(itemsId);
    
    if (toggle && items) {
        toggle.classList.toggle('open');
        items.classList.toggle('open');
    }
}

function expandActiveSections() {
    // Get the current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Check all menu items with data-page attribute or href matching current page
    const activeItem = document.querySelector(`a[data-page][href="${currentPage}"]`) || 
                       document.querySelector(`a[href="${currentPage}"]`);
    
    if (activeItem) {
        // Add active class to the link
        document.querySelectorAll('a.menu-item-clean').forEach(link => {
            link.classList.remove('active-page');
        });
        activeItem.classList.add('active-page');
        
        // Find parent section and expand it
        let parent = activeItem.closest('.menu-section-items');
        if (parent) {
            const toggle = parent.previousElementSibling;
            if (toggle && toggle.classList.contains('menu-section-toggle')) {
                toggle.classList.add('open');
                parent.classList.add('open');
            }
        }
    }
}

// Initialize page highlighting on load
document.addEventListener('DOMContentLoaded', () => {
    expandActiveSections();
});

document.addEventListener('click', (e) => {
    const menu = document.getElementById('sideMenu');
    const trigger = document.querySelector('.android-dots-trigger');
    if (menu && menu.classList.contains('active')) {
        if (!menu.contains(e.target) && (!trigger || !trigger.contains(e.target))) {
            menu.classList.remove('active');
        }
    }
});


let beReminderShown = false;

function showBeReminder() {
    const overlay = document.getElementById('beReminderOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        void overlay.offsetWidth; 
        overlay.classList.add('active');
        overlay.style.opacity = '1';
    }
}

function closeBeReminder() {
    const overlay = document.getElementById('beReminderOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 400); 
    }
}