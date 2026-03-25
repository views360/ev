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
    const extraMiles = Array.from(document.querySelectorAll(".extra-journey-miles")).map(el => parseFloat(el.value) || 0);
    const extraSocs = Array.from(document.querySelectorAll(".extra-journey-soc")).map(el => parseFloat(el.value) || 0);
    const extraRates = Array.from(document.querySelectorAll(".extra-journey-rate")).map(el => parseFloat(el.value) || 0);
    return {
        journeyMiles: parseFloat(document.getElementById("journeyMiles").value) || 0,
        batteryKwh: parseFloat(document.getElementById("batteryKwh").value) || 0,
        soc: parseFloat(document.getElementById("soc").value) || 0,
        efficiency: parseFloat(document.getElementById("efficiency").value) || 0,
        adhoc: parseFloat(document.getElementById("adhoc").value) || 0,
        startChargeRate: parseFloat(document.getElementById("startChargeRate").value) || 0,
        maxChargingSpeed: parseFloat(document.getElementById("maxChargingSpeed").value) || 0,
        rechargeAt: parseFloat(document.getElementById("rechargeAt").value) || 20,
        minSpeed: parseFloat(document.getElementById("minSpeed").value) || 0,
        additionalJourneys: extraMiles.map((miles, i) => ({
            miles: miles,
            soc: extraSocs[i],
            rate: extraRates[i]
        }))
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
    const isTripMode = activePill && activePill.textContent.trim() === "Cost Reduction";
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
        "adhoc", "startChargeRate", "maxChargingSpeed", "efficiencyBE", "adhocBE", "rechargeAt"
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

    document.querySelectorAll(".extra-journey-miles").forEach(input => {
        const val = parseFloat(input.value);
        if (!input.value || isNaN(val) || val <= 0) {
            input.classList.add('empty-pulse');
        } else {
            input.classList.remove('empty-pulse');
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
            uiPreText.innerHTML = "Please attend to all flashing green fields, or use the navigation tabs at the top to switch between BREAK EVEN and COST REDUCTION calcuation types.";
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
                const isTripMode = activePill && activePill.textContent.trim() === "Cost Reduction";
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
        !document.getElementById("rechargeAt").value ||
        inputs.maxChargingSpeed <=0 ||
        inputs.startChargeRate <= 0;
    
    const providerBoxes = document.querySelectorAll(".provider-box");

    if (tripIncomplete) {
        uiPreText.innerHTML = "Please attend to all flashing green fields, or use the navigation tabs at the top to switch between BREAK EVEN and COST REDUCTION calcuation types.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (resultsHeader) resultsHeader.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        const toc = document.getElementById("toc");
        if (toc) toc.style.display = "none";
        return; 
    }
    
    if (providerBoxes.length === 0) {
        uiPreText.innerHTML = "Before you may view the results, you must select at least one provider from the list of providers (above). It is simplest to add <i>all</i> providers.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        const toc = document.getElementById("toc");
        if (toc) toc.style.display = "none";
        if (resultsHeader) resultsHeader.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        return;
    }

    uiPreText.style.display = "none";
    uiResults.style.display = "block";
    conclusionsBox.style.display = "block";
    const toc = document.getElementById("toc");
    if (toc) toc.style.display = "block";
    if (uiShare) uiShare.style.display = "";
    if (uiPdf) uiPdf.style.display = "";
    document.querySelector(".calc-lines").style.display = "block";
    document.querySelector(".chart-wrapper").style.display = "block";

// 1. Calculate Main Journey (Journey 1)
    const mainTopUpKwh = Math.max(0, ((inputs.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh);
    const mainTopUpCost = mainTopUpKwh * (inputs.startChargeRate / 100);

    let totalPreJourneyCost = mainTopUpCost;
    
    // Updated Tooltip with 0.8rem icon and requested text
    const preChargeTooltip = `<span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the total pre-journey battery charge cost for charging from your recharge threshold (${inputs.rechargeAt}%) to the specified starting state of charge (SOC).</span></span></span>`;

    let preChargeHtml = "";

    if (inputs.additionalJourneys.length > 0) {
        // Multi-journey view header
        preChargeHtml = `<h3>PAYG Summary</h3><p style="margin-bottom: 4px;"><strong>Pre-journey charge costs:</strong></p>`;
        
        // Journey 1 detail line (0.8 opacity)
        preChargeHtml += `<div style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 2px; margin-left: 10px;">
            Journey 1 pre-charge cost (${inputs.rechargeAt}% - ${inputs.soc}% / ${mainTopUpKwh.toFixed(1)} kWh): £${mainTopUpCost.toFixed(2)}
        </div>`;

        // 2. Loop through Additional Journeys
        inputs.additionalJourneys.forEach((j, index) => {
            const extraKwh = Math.max(0, ((j.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh);
            const extraCost = extraKwh * (j.rate / 100);
            totalPreJourneyCost += extraCost;
            preChargeHtml += `<div style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 2px; margin-left: 10px;">
                Journey ${index + 2} pre-charge cost (${inputs.rechargeAt}% - ${j.soc}% / ${extraKwh.toFixed(1)} kWh): £${extraCost.toFixed(2)}
            </div>`;
        });

        // Total Line (removed bottom margin)
        preChargeHtml += `<p style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px; margin-bottom: 0;">
            ${preChargeTooltip}<strong>Total battery pre-charge cost for all journeys: £${totalPreJourneyCost.toFixed(2)}</strong>
        </p>`;
    } else {
        // Single-journey view (removed bottom margin, 0.8rem icon)
        preChargeHtml = `<h3>PAYG Summary</h3>
            <p style="margin-bottom: 0;">${preChargeTooltip}Pre-journey battery charge cost (${inputs.rechargeAt}% - ${inputs.soc}% / ${mainTopUpKwh.toFixed(1)} kWh): 
            <strong>£${mainTopUpCost.toFixed(2)}</strong></p>`;
    }

    // 3. Update the UI
    document.getElementById("preChargeLine").innerHTML = `<div class="guide-section" id="payg-summary">${preChargeHtml}</div>`;
    
    // 4. RESTORE REQUIRED CALCULATIONS
    const usableKwh = ((inputs.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh;
    const initialRange = usableKwh * inputs.efficiency;
    const publicMiles = Math.max(0, inputs.journeyMiles - initialRange);
    const publicKwh = publicMiles / inputs.efficiency;
    const totalAdhocCost = totalPreJourneyCost + (publicKwh * (inputs.adhoc / 100));
    
    // 5. Update the remaining detail lines (with 0.8rem icons)
    document.getElementById("homeRangeLine").innerHTML = `<span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the distance you can expect to drive before your first public charge along your route. It is calculated from your starting charge level down to your recharge threshold (${inputs.rechargeAt}%).</span></span></span>Range from pre-charged battery: <strong>${initialRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `<span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is how many miles of your journey will need to be covered by public charging. It accounts for your recharge threshold of ${inputs.rechargeAt}%.</span></span></span>PAYG public charging miles needed: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `PAYG public charging energy needed: <strong>${publicKwh.toFixed(1)} kWh @ ${inputs.adhoc}p</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total journey cost (pre-charge + standard PAYG): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;
    
    // Helper function to simulate trip with a given provider
    const simulateTripWithProvider = (providerRate, batteryKwh, rechargeThreshold, efficiency, journeyMiles, initialSoc) => {
        const chargeToPercent = 80; 
        const kwhPerCharge = ((chargeToPercent - rechargeThreshold) / 100) * batteryKwh; 
        let distanceDriven = 0;
        let publicChargeCost = 0;
        let chargeCount = 0;
        let currentSoc = initialSoc;
        
        while (distanceDriven < journeyMiles) {
            const rangeOnCurrentCharge = ((currentSoc - rechargeThreshold) / 100) * batteryKwh * efficiency;
            if (distanceDriven + rangeOnCurrentCharge >= journeyMiles) break;
            
            distanceDriven += rangeOnCurrentCharge;
            chargeCount++;
            const remainingDistance = journeyMiles - distanceDriven;
            const kwhNeededForFinal = (remainingDistance / efficiency) + ((rechargeThreshold / 100) * batteryKwh);
            
            if (kwhNeededForFinal <= kwhPerCharge) {
                publicChargeCost += kwhNeededForFinal * (providerRate / 100);
                break;
            } else {
                publicChargeCost += kwhPerCharge * (providerRate / 100);
                currentSoc = chargeToPercent;
            }
        }
        return publicChargeCost;
    };
    
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
        
        const publicChargingCost = simulateTripWithProvider(
            rate, inputs.batteryKwh, inputs.rechargeAt, inputs.efficiency, inputs.journeyMiles, inputs.soc
        );
        
        const totalJourneyCost = subCost + totalPreJourneyCost + publicChargingCost;
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
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the provider's subscription fee, which gives you access to their discounted charge rate for ONE MONTH.</span></span></span>Sub. Fee</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the provider's discounted charge rate (per kWh) that is available after subscribing for one month. Note that some providers have variable charge rates depending on location and time of day. The rate listed here may be an average. Click the provider's link to confirm pricing.</span></span></span>Disc. Rate</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the expected <strong>total charging cost</strong> of your journey using this provider and including your stated battery pre-charge. If it is displayed in green, it is cheaper than the equivalent journey using PAYG charging at the rate you entered above.</span></span></span>Journey Cost</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the amount by which the discounted charge rate will either be cheaper or more expensive than your average PAYG rate for the same distance. Green means cheaper; red means more expensive. Bear in mind that you can continue to use a provider's subscription for one full month.</span></span></span>vs. PAYG</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the number of miles you must drive on the provider's discounted charge rate to pay off the subscription fee. <strong>Important! This is not the total miles of your journey</strong> — it is the number of miles you must drive from your first charge with this provider. Remember, a subscription lasts for an entire month.</span></span></span>Break-Even Miles</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the break-even miles PLUS the initial number of miles your vehicle can drive based on its precharged state.</span></span></span>Break Even + Battery</th>
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
                <span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">${p.comments}</span>
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
            <div class="speed-comparison-container" style="width: fit-content; max-width: 100%; margin: 0;">
                <p style="font-size: 0.85rem; margin-bottom: 10px;">
                    <span class="tooltip-container">
                        <span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">A comparison of estimated total journey charge durations at various speeds for the public-charging section of your journey assumes that charging will begin each time the battery reaches your recharge threshold (${inputs.rechargeAt}%) and that you will charge to 80% (except for the final charge, which only charges enough to reach your destination with a ${inputs.rechargeAt}% reserve). All charges use the vehicle's maximum charging speed of ${inputs.maxChargingSpeed}kW.</span></span>
                    </span>
                    <strong>Estimated Total Public Charging Duration Required</strong>
                </p>
                <table class="mini-table">
                    <thead>
                        <tr><th>Charging Speed</th><th>Type</th><th>Descriptor</th><th>Journey Charging Duration</th></tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>`;
        
        // --- REAL WORLD SECTION ---
        const chargeSpeed = inputs.maxChargingSpeed || 101;
        const rechargeThreshold = inputs.rechargeAt;
        const chargeToPercent = 80; // Charge to 80% at each public stop (except final)
        
        // Usable energy per public charge (from threshold to 80%)
        const kwhPerPublicCharge = ((chargeToPercent - rechargeThreshold) / 100) * inputs.batteryKwh;
        const rangePerPublicCharge = kwhPerPublicCharge * inputs.efficiency;
        
        // Starting range (from pre-charge SOC down to threshold)
        const startingRangeOnPreCharge = ((inputs.soc - rechargeThreshold) / 100) * inputs.batteryKwh * inputs.efficiency;
        
        let stopsRows = '';
        let stopCount = 0;
        let distanceDriven = 0;
        let currentChargePercent = inputs.soc;
        
        // Simulate the journey
        while (distanceDriven < inputs.journeyMiles) {
            // How far can we drive before hitting recharge threshold on current charge?
            const rangeOnCurrentCharge = ((currentChargePercent - rechargeThreshold) / 100) * inputs.batteryKwh * inputs.efficiency;
            
            if (distanceDriven + rangeOnCurrentCharge >= inputs.journeyMiles) {
                // Can reach destination - no more public charging needed
                break;
            }
            
            // Drive to threshold and need to charge
            distanceDriven += rangeOnCurrentCharge;
            stopCount++;
            
            // Check if this is the final charge
            const remainingDistance = inputs.journeyMiles - distanceDriven;
            const kwhNeededToReachHome = remainingDistance / inputs.efficiency;
            
            if (kwhNeededToReachHome <= kwhPerPublicCharge) {
                // This is the final charge - only charge what's needed to reach destination at threshold
                const chargeTimeHours = kwhNeededToReachHome / chargeSpeed;
                const chargeTimeFormatted = formatChargingTime(chargeTimeHours);
                const chargePercent = Math.ceil((kwhNeededToReachHome / inputs.batteryKwh) * 100);
                
                stopsRows += `<tr>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${stopCount}</td>
                    <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">Final public charge (when battery reaches ${rechargeThreshold}%)</td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${distanceDriven.toFixed(0)}</td>
                    <td style="padding: 10px; border: 1px solid var(--border);">Add ${chargePercent}% / ${kwhNeededToReachHome.toFixed(1)}kWh</td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${chargeTimeFormatted}</td>
                </tr>`;
                break;
            } else {
                // Not the final charge - charge to 80% (add kwhPerPublicCharge)
                const chargeTimeHours = kwhPerPublicCharge / chargeSpeed;
                const chargeTimeFormatted = formatChargingTime(chargeTimeHours);
                
                stopsRows += `<tr>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${stopCount}</td>
                    <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">Public charge (when battery reaches ${rechargeThreshold}%)</td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${distanceDriven.toFixed(0)}</td>
                    <td style="padding: 10px; border: 1px solid var(--border);">Add ${(chargeToPercent - rechargeThreshold).toFixed(0)}% / ${kwhPerPublicCharge.toFixed(1)}kWh</td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${chargeTimeFormatted}</td>
                </tr>`;
                currentChargePercent = chargeToPercent;
            }
        }

        let assessmentBoxHTML = `
            <div class="conclusion-white-border guide-section" id="real-world-assessment">
                <h3>Real-World Charging Itinerary</h3>
                <div class="results-scroll" style="width: fit-content; max-width: 100%; margin: 0;">
                    <table style="border-collapse: collapse; margin-top: 10px; border: 1px solid var(--border); font-size: 0.8rem;">
                        <thead>
                            <tr style="background: rgba(57, 255, 20, 0.05); color: var(--text);">
                                <th style="padding: 10px; border: 1px solid var(--border);">Stop</th>
                                <th style="padding: 10px; border: 1px solid var(--border); text-align: left;">Event</th>
                                <th style="padding: 10px; border: 1px solid var(--border);">Mile Mark</th>
                                <th style="padding: 10px; border: 1px solid var(--border); text-align: left;">Action</th>
                                <th style="padding: 10px; border: 1px solid var(--border);">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stopsRows || '<tr><td colspan="5" style="padding: 20px; text-align: center;">No public charging stops required for this journey distance.</td></tr>'}
                        </tbody>
                    </table>
                    <p style="font-size:0.85rem; margin-top:12px; opacity:0.8; !important;">Note: when there is more than one stop for public charging, the final charge will usually be less than previous charge(s). It represents the amount of final top-up charge needed to complete the journey and be left with a residual charge of ${rechargeThreshold}%.</p>
                </div>
            </div>`;
        
        const locationDisclaimer = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8; color:var(--neon-green) !important;">Note 1: Before purchasing a subscription, check that your chosen provider has charging stations in your planned area of travel — else your subscription will be wasted.</p><p style="font-size:0.85rem; margin-top:12px; opacity:0.8;">Note 2: Charging durations exclude the initial ramp-up phase. Since you should only charge above 80% in exceptional circumstances, the 80-to-100% charging slowdown is of no consequence. Read the section on <a href="mastery.html#sec-slow" style="color: var(--accent); text-decoration: underline;">Slow Charging</a> to find out more.</p>`;
    
        const contentsHTML = `
            <div id="toc" class="conclusion-white-border">
                <h3>RESULTS CONTENTS</h3>
                <ul style="margin:0; padding-left:20px; font-size:0.95rem;">
                    <li><a href="#payg-summary" style="color: var(--accent); text-decoration:none;">PAYG Summary</a></li>
                    <li><a href="#providerResults" style="color: var(--accent); text-decoration:none;">Providers & Subscriptions</a></li>
                    <li><a href="#payg-vs-subscription" style="color: var(--accent); text-decoration:none;">PAYG vs Subscription Conclusion</a></li>
                    <li><a href="#charging-times-section" style="color: var(--accent); text-decoration:none;">Charging Durations</a></li>
                    <li><a href="#real-world-assessment" style="color: var(--accent); text-decoration:none;">Real-World Charging Itinerary</a></li>
                    <li><a href="#graph-section" style="color: var(--accent); text-decoration:none;">Subscriptions Break-Even Graph</a></li>
                </ul>
            </div>
        `;
        
        document.getElementById("contentsBox").innerHTML = contentsHTML;
        let conclusionHTML = "";
        
        conclusionHTML += `<div class="conclusion-white-border guide-section" id="payg-vs-subscription">`; 
        if (bestProvider.savings > 0) {
            conclusionHTML += `<h3>PAYG vs Subscription Conclusion</h3><p class="main-result">For a journey of <strong>${inputs.journeyMiles} miles</strong>, a one-month subscription with <strong>${bestProvider.name}</strong> works out cheaper than a ${inputs.adhoc}p PAYG rate based on the selected minimum charging rate of <strong>${minSpeedLabel}</strong> and the other information entered. The total journey cost will be <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>, which represents a saving of <strong>£${bestProvider.savings.toFixed(2)}</strong> over the average PAYG rate you entered above.</p>`;
        } else {
            conclusionHTML += `<h3>PAYG vs SUBSCRIPTION CONCLUSION</h3><p class="main-result">For a journey of <strong>${inputs.journeyMiles} miles</strong>, a <strong>${inputs.adhoc}p PAYG rate</strong> is cheaper than the cheapest subscription at the selected minimum charging rate of <strong>${minSpeedLabel}</strong> and the other information entered. The total journey cost based on PAYG will be <strong>£${totalAdhocCost.toFixed(2)}</strong>. Before opting for PAYG rates, however, consider whether you will go on any other journeys within the month that will require public charging because this may make a one-month subscription more cost effective.</p>`;
        }
        conclusionHTML += `</div>`;
        
        conclusionHTML += `<div class="conclusion-white-border guide-section" id="charging-times-section"><h3>Charging Durations</h3>`;
        if (maxChargingSpeed > 0) {
            conclusionHTML += `<p class="main-result">Your proposed ${inputs.journeyMiles}-mile journey will require <strong>${publicKwh.toFixed(1)} kWh</strong> of public charging after your pre-charged battery reduces to your specified recharge threshhold of ${inputs.rechargeAt}%. At your maximum supported speed of <strong>${maxChargingSpeed} kW</strong>, total recharging duration for the entire journey will be approximately <strong>${maxChargingTimeFormatted}</strong>.</p>`;
        } else {
            conclusionHTML += `<p class="main-result">Enter your vehicle's <strong>Max. Charging Speed</strong> above to see estimated charging durations for this journey.</p>`;
        }
        conclusionHTML += `${speedTableHtml}${locationDisclaimer}</div>`;
        conclusionsBox.innerHTML = conclusionHTML + assessmentBoxHTML;
    } else {
        conclusionsBox.innerHTML = "";
    }
    
    drawGraph(inputs, providers);
    const dataToSave = getInputs();
    setCookie("ev_trip_values", dataToSave);
    saveProvidersToCookie();
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
                y: { title: { display: true, text: 'Total Journey Cost (£)' } },
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
            const currentMode = activeTab.textContent.trim() === "Cost Reduction" ? 'trip-savings' : 'break-even';
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
                    <th>Journey Cost</th>
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
        <h2 class="pdf-section-title">Estimated Total Public Charging Duration Required</h2>`;
    
    // Add charging times table
    const chargingTimesTable = document.querySelector(".speed-comparison-container table");
    if (chargingTimesTable) {
        contentHtml += `<table class="pdf-table">`;
        const chargingHeaders = chargingTimesTable.querySelectorAll("thead th");
        contentHtml += `<thead><tr>`;
        chargingHeaders.forEach(header => {
            contentHtml += `<th>${header.innerText}</th>`;
        });
        contentHtml += `</tr></thead><tbody>`;
        
        const chargingRows = chargingTimesTable.querySelectorAll("tbody tr");
        chargingRows.forEach(row => {
            const cells = row.querySelectorAll("td");
            contentHtml += `<tr>`;
            cells.forEach(cell => {
                contentHtml += `<td>${cell.innerText}</td>`;
            });
            contentHtml += `</tr>`;
        });
        contentHtml += `</tbody></table>`;
    }
    
    contentHtml += `
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
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 20; // 10mm margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Handle multiple pages if content is taller than one page
        let yPosition = 15;
        const pageHeightAvailable = pageHeight - 30; // 15mm top and bottom margins
        
        if (imgHeight <= pageHeightAvailable) {
            // Content fits on one page
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 15, imgWidth, imgHeight);
        } else {
            // Content spans multiple pages
            let remainingHeight = canvas.height;
            let yCanvasOffset = 0;
            
            while (remainingHeight > 0) {
                // Calculate how much of the canvas we can fit on this page
                const canvasHeightThatFits = Math.min(remainingHeight, (pageHeightAvailable * canvas.width) / imgWidth);
                
                // Create a temporary canvas for this section
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvasHeightThatFits;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(canvas, 0, yCanvasOffset, canvas.width, canvasHeightThatFits, 0, 0, canvas.width, canvasHeightThatFits);
                
                // Add this section to the PDF
                const sectionImgHeight = (canvasHeightThatFits * imgWidth) / canvas.width;
                pdf.addImage(tempCanvas.toDataURL("image/png"), "PNG", 10, 15, imgWidth, sectionImgHeight);
                
                // Move to next page and update positions
                remainingHeight -= canvasHeightThatFits;
                yCanvasOffset += canvasHeightThatFits;
                
                if (remainingHeight > 0) {
                    pdf.addPage();
                }
            }
        }

        pdf.save("EV-Journey-Analysis.pdf");

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
    const hiddenMsg = document.getElementById("providersHiddenMsg"); 
    
    if (container.style.display === "none") {
        container.style.display = "block";
        if (controls) controls.style.display = "block"; 
        btn.textContent = "Collapse Providers List";
        hiddenMsg.style.display = "none";
    } else {
        container.style.display = "none";
        if (controls) controls.style.display = "none"; 
        btn.textContent = "Expand Providers List";
        hiddenMsg.style.display = "block";
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
            track.style.transform = `translateX(-25%)`;
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
    setTimeout(loadProvidersFromCookie, 100);
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

function saveProvidersToCookie() {
    const providers = [];
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        providers.push({
            name: document.getElementById(`name${id}`).value,
            subCost: document.getElementById(`subCost${id}`).value,
            rate: document.getElementById(`rate${id}`).value,
            preset: document.getElementById(`preset${id}`).value,
            speed: document.getElementById(`speed${id}`) ? document.getElementById(`speed${id}`).value : null
        });
    });
    setCookie('ev_providers', providers); // Uses your existing setCookie function
}

function loadProvidersFromCookie() {
    const saved = getCookie('ev_providers'); // Uses your existing getCookie function
    if (saved && Array.isArray(saved)) {
        // Clear any default or existing boxes first
        document.getElementById("providers").innerHTML = "";
        
        saved.forEach(p => {
            // Use your existing function to create the box structure
            createProviderBox(); 
            const id = providerCount;
            
            // Repopulate the fields
            document.getElementById(`name${id}`).value = p.name;
            document.getElementById(`subCost${id}`).value = p.subCost;
            document.getElementById(`rate${id}`).value = p.rate;
            document.getElementById(`preset${id}`).value = p.preset;
            
            // Handle speed dropdown if it exists for this preset
            if (p.speed && document.getElementById(`speed${id}`)) {
                updateProviderFields(id); // Rebuilds speed options
                document.getElementById(`speed${id}`).value = p.speed;
            }
        });
        calculate(); // Refresh the results
    }
}

let journeyCount = 0;

function addJourneyField() {
    journeyCount++;
    const container = document.getElementById("additionalJourneysContainer");
    const defaultSoc = document.getElementById("soc").value || "";
    const defaultRate = document.getElementById("startChargeRate").value || "";
    const journeyDiv = document.createElement("div");
    journeyDiv.className = "additional-journey-box"; // You can style this in CSS
    journeyDiv.style.borderTop = "1px solid var(--accent)";
    journeyDiv.style.marginTop = "15px";
    journeyDiv.style.paddingTop = "10px";
    journeyDiv.id = `journeyRow${journeyCount}`;

    journeyDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4>Additional Journey #${journeyCount}</h4>
            <button class="remove-btn" onclick="document.getElementById('journeyRow${journeyCount}').remove(); calculate();">×</button>
        </div>
        <p style="font-size: 0.8rem">Enter or adjust the following details for this additional journey, which may differ from the first.</p>
        <div class="input-group">
            <label><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">The is the total distance for this additional journey, out and back.</span></span></span>Journey Distance (Miles)</label>
            <input type="number" class="extra-journey-miles" placeholder="e.g. 150" oninput="calculate()">
        </div>
        <div class="input-row">
            <div class="input-group">
                <label><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the level to which you will pre-charge your battery for this additional trip. It may be the same as above — or not.</span></span></span>Starting State of Charge (%)</label>
                <input type="number" class="extra-journey-soc" placeholder="e.g. 100" value="${defaultSoc}" oninput="calculate()">
            </div>
            <div class="input-group">
                <label><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">While it is to be expected that you will depart from your usual place (e.g., home) and charge at your usual rate, you may have other plans — so this allows the results to take that into account.</span></span></span>Starting Rate (Pence per kWh)</label>
                <input type="number" class="extra-journey-rate" placeholder="e.g. 7.5" value="${defaultRate}" oninput="calculate()">
            </div>
        </div>
    `;
    
    container.appendChild(journeyDiv);
    calculate();
}
