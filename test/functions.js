const setCookie = (name, value) => {
    const date = new Date();
    date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
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

// ===============================
// Global State
// ===============================
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

// ===============================
// UI & Provider Management
// ===============================

function resetAll() {
    localStorage.removeItem("ev_calc_settings");
    document.cookie = "ev_trip_values=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = window.location.pathname;
}

function shareLink() {
    const params = new URLSearchParams();
    params.set("mode", "trip-savings");

    // The specific IDs used in the Trip & Vehicle section
    const tripIds = ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"];
    
    tripIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) params.set(id, el.value);
    });

    // Add Providers
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

    if (!isTripMode) {
        const efficiency = parseFloat(document.getElementById("efficiencyBE").value);
        const adhocRate = parseFloat(document.getElementById("adhocBE").value) || 0;
        const minSpeedSelection = parseFloat(document.getElementById("minSpeedBE").value) || 0;

        if (isNaN(efficiency) || efficiency <= 0 || isNaN(adhocRate) || adhocRate <= 0) {
            uiPreText.innerHTML = "Please enter valid <strong>Efficiency</strong> and <strong>PAYG Rate</strong> values, or use the toggle at the top to switch to TRIP SAVINGS mode.";
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
                    url: p.subscription?.url, // Store URL
                    comments: p.subscription?.comments || "", // Store Comments
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

        let html = `<h2 class="results-heading" style="text-align: center;">BREAK-EVEN ANALYSIS</h2>
                    <div class="results-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Provider (click hyperlink to view subscription info)</th>
                                <th>Speed</th>
                                <th>Sub. Cost</th>
                                <th>Disc. Rate</th>
                                <th>Break Even Miles<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box">The number of miles you must drive (on the discounted rate) after subscribing to pay off the subscription fee. Remember, a subscription lasts for an entire month.</div></th>
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
        inputs.efficiency <= 0 || 
        inputs.adhoc <= 0;
    
    const providerBoxes = document.querySelectorAll(".provider-box");

    // Sequential Validation Logic for Trip Mode
    if (tripIncomplete) {
        uiPreText.innerHTML = "Please complete all fields in the <strong>Trip & Vehicle</strong> section.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        return; // Exit here if trip fields aren't valid
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
    document.querySelector(".calc-lines").style.display = "block";
    document.querySelector(".chart-wrapper").style.display = "block";

    const startChargeKwh = (inputs.soc / 100) * inputs.batteryKwh;
    const startChargeCost = startChargeKwh * (inputs.startChargeRate / 100);
    const initialRange = startChargeKwh * inputs.efficiency;
    const publicMiles = Math.max(0, inputs.journeyMiles - initialRange);
    const publicKwh = publicMiles / inputs.efficiency;
    const totalAdhocCost = startChargeCost + (publicKwh * (inputs.adhoc / 100));
    
    document.getElementById("preChargeLine").innerHTML = `Pre-journey charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (£${startChargeCost.toFixed(2)})`;
    document.getElementById("homeRangeLine").innerHTML = `Range from start charge: <strong>${initialRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `PAYG public charging miles needed: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `PAYG public charging energy needed: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total cost (Standard PAYG @ ${inputs.adhoc}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

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
            // Move "Never" cases to the bottom
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
    let html = `<div class="results-scroll"><table><thead><tr>
        <th>Provider (click hyperlink to view subscription info)</th>
        <th>Sub. Fee</th>
        <th>Disc. Rate</th>
        <th>Trip Cost</th>
        <th>vs. PAYG</th>
        <th>Break Even Miles<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box">The number of miles you must drive (on the discounted rate) after subscribing to pay off the subscription fee. Remember, a subscription lasts for an entire month.</div></th>
        <th>Total Miles (Inc. Battery)<div class="tooltip-container">
                            <span class="info-icon" onclick="toggleTooltip(this)">💡</span>
                          <div class="tooltip-box">This is the break-even miles PLUS your battery's pre-charged miles.) after subscribing to pay off the subscription fee. Remember, a subscription lasts for an entire month.</div></th>
        </th>
        </tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        // Add a 'jump to results' arrow and the provider link
        const jumpArrow = `<a href="#resultsHeader" title="Jump to results" style="text-decoration:none; margin-right:8px; color:var(--accent); font-size:1.1rem;">↓</a>`;
        const providerLink = p.url 
            ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>` 
            : p.name;
        const displayName = `${providerLink}`;        // Determine display text for providers more expensive than PAYG
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
            <td>£${p.totalJourneyCost.toFixed(2)}</td>
            <td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td>
            <td><strong>${breakEvenText}</strong></td>
            <td><strong>${totalMilesText}</strong></td>
        </tr>`;
    });
    document.getElementById("providerResults").innerHTML = html + `</tbody></table></div>`;

    drawGraph(inputs, providers);

    // At the end of function calculate()
    const dataToSave = getInputs();
    setCookie("ev_trip_values", dataToSave);
}

function drawGraph(core, providers) {
    const ctx = document.getElementById("costChart");
    if (chart) chart.destroy();

    const maxMiles = Math.max(core.journeyMiles * 1.2, 300); // Use .journeyMiles
    const labels = Array.from({length: 11}, (_, i) => Math.round((maxMiles * i) / 10));
    
    const adhocData = labels.map(m => {
        const pKwh = Math.max(0, m - (core.soc/100 * core.batteryKwh * core.efficiency)) / core.efficiency; // Use .batteryKwh
        return (core.soc/100 * core.batteryKwh * core.startChargeRate/100) + (pKwh * core.adhoc/100); // Use .batteryKwh, .startChargeRate, .adhoc
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
        const pKwh = Math.max(0, m - (core.soc/100 * core.batteryKwh * core.efficiency)) / core.efficiency; // Use .batteryKwh
        return p.subCost + (core.soc/100 * core.batteryKwh * core.startChargeRate/100) + (pKwh * p.rate/100); // Use .batteryKwh, .startChargeRate
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
    calculate();
}

function init() {
    const savedValues = getCookie("ev_trip_values");
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. Identify both dropdowns
    const speedTrip = document.getElementById("minSpeed");
    const speedBE = document.getElementById("minSpeedBE");

    // 2. Define the sync and recalculate function
    const syncAndCalc = (e) => {
        const newValue = e.target.value;
        speedTrip.value = newValue;
        speedBE.value = newValue;
        calculate(); // Refresh the tables/logic for the current mode
    };

    // 3. Attach listeners
    if (speedTrip && speedBE) {
        speedTrip.addEventListener('change', syncAndCalc);
        speedBE.addEventListener('change', syncAndCalc);
    }

    fetch("providers.json").then(r => r.json()).then(data => {
        PRESETS = data.providers;

        // List of all IDs to restore
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
        
        // Helper to sync and trigger calculation
        const syncFields = (source, target) => {
            source.addEventListener('input', () => {
                target.value = source.value;
                calculate();
            });
        };
        
        if (effTrip && effBE) {
            // Initial sync from saved/URL values
            effBE.value = effTrip.value; 
            syncFields(effTrip, effBE);
            syncFields(effBE, effTrip);
        }
        
        if (adhocTrip && adhocBE) {
            // Initial sync from saved/URL values
            adhocBE.value = adhocTrip.value;
            syncFields(adhocTrip, adhocBE);
            syncFields(adhocBE, adhocTrip);
        }

        if (urlParams.has("p")) {
            try {
                const sharedProviders = JSON.parse(urlParams.get("p"));
                document.getElementById("providers").innerHTML = ""; // Clear existing
                sharedProviders.forEach(p => {
                    // Recreate the box
                    createProviderBox(); 
                    const id = providerCount;
                    // Fill the fields manually from the shared data
                    document.getElementById(`name${id}`).value = p.name;
                    document.getElementById(`subCost${id}`).value = p.sub;
                    document.getElementById(`rate${id}`).value = p.rate;
                    document.getElementById(`preset${id}`).value = p.preset;
                    // Ensure the speed row/logic is updated if it was a preset
                    if(p.preset !== 'Custom') {
                        updateProviderFields(id);
                        // Re-override with the specific shared rate in case it differed
                        document.getElementById(`rate${id}`).value = p.rate;
                    }
                });
            } catch (e) {
                console.error("Error parsing shared providers:", e);
            }
        }

        const modeParam = urlParams.get("mode");
        if (modeParam === "trip-savings") {
            // Find the Trip Savings button and activate it
            const tripBtn = document.querySelector('.pill-btn:nth-child(3)'); // The second button
            if (tripBtn) setToggle('trip-savings', tripBtn);
        } else {
            // Default behavior: logic to ensure card visibility matches Break Even
            const activePill = document.querySelector('.pill-btn.active');
            const currentMode = activePill.textContent.trim() === "Trip Savings" ? 'trip-savings' : 'break-even';
            setToggle(currentMode, activePill);
        }

        // Restore Provider dropdown (ensure this ID exists or remove if not used)
        const provEl = document.getElementById("provider");
        if (provEl && savedValues && savedValues.provider) {
            provEl.value = savedValues.provider;
        }

        updateProviderInfo();
        calculate();
    });
}

/* ============================================
   PDF EXPORT — OFF-SCREEN CLONE (NO FLASH)
   PURE B&W + MARGINS + FIT TO A4
   GRAPH REMOVED, SORT REMOVED, HEADER ADDED
   ============================================ */
/* ============================================
   PDF EXPORT — UPDATED FOR BREAK EVEN COLUMNS
   ============================================ */
function exportPdf() {
    const results = document.getElementById("results");
    const pdfBtn = document.getElementById("pdfBtn");
    if (!results || !pdfBtn) return;
    
    const originalText = pdfBtn.textContent;
    pdfBtn.textContent = "Generating...";
    pdfBtn.style.pointerEvents = "none"; 
    pdfBtn.style.opacity = "0.7";

    // Create off-screen clone
    const cloneWrapper = document.createElement("div");
    const cloneId = "pdfClone_" + Math.floor(Math.random() * 1000000);
    cloneWrapper.id = cloneId;
    cloneWrapper.style.position = "absolute";
    cloneWrapper.style.left = "-9999px";
    cloneWrapper.style.top = "0";
    // Increase width to ensure table doesn't wrap/squash the new columns
    cloneWrapper.style.width = "1200px"; 

    const clone = results.cloneNode(true);
    cloneWrapper.appendChild(clone);
    document.body.appendChild(cloneWrapper);

    // Remove UI elements not needed in PDF
    const uiElements = cloneWrapper.querySelectorAll(".input-group, .chart-wrapper, .btn-row");
    uiElements.forEach(el => {
        const label = el.querySelector("label");
        if (label && label.textContent.trim() === "Sort results") el.remove();
        if (el.classList.contains("chart-wrapper")) el.remove();
    });

    // Apply print-safe styles to the clone
    const override = document.createElement("style");
    override.innerHTML = `
        #${cloneId} { padding: 20px; background: #fff; }
        #${cloneId} * {
            background: #ffffff !important;
            color: #000000 !important;
            border-color: #000000 !important;
            box-shadow: none !important;
            font-family: Arial, sans-serif !important;
        }
        #${cloneId} table { width: 100%; border-collapse: collapse; font-size: 12px; }
        #${cloneId} th, #${cloneId} td { border: 1px solid #000; padding: 6px; text-align: left; }
        #${cloneId} .good, #${cloneId} .bad { background: #fff !important; font-weight: bold; }
    `;
    document.head.appendChild(override);

    requestAnimationFrame(() => {
        html2canvas(cloneWrapper, { scale: 2 }).then(canvas => {
            cloneWrapper.remove();
            override.remove();

            // Convert to B&W
            const bwCanvas = document.createElement("canvas");
            const bctx = bwCanvas.getContext("2d");
            bwCanvas.width = canvas.width;
            bwCanvas.height = canvas.height;
            bctx.drawImage(canvas, 0, 0);

            const imgData = bctx.getImageData(0, 0, bwCanvas.width, bwCanvas.height);
            const pixels = imgData.data;
            for (let i = 0; i < pixels.length; i += 4) {
                const grey = 0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2];
                const bw = grey < 180 ? 0 : 255;
                pixels[i] = pixels[i+1] = pixels[i+2] = bw;
            }
            bctx.putImageData(imgData, 0, 0);

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 10;
            const usableWidth = pageWidth - (margin * 2);
            const imgWidth = usableWidth;
            const imgHeight = (bwCanvas.height * imgWidth) / bwCanvas.width;

            pdf.setFontSize(16);
            pdf.text("EV Subscription Comparison Report", pageWidth / 2, 15, { align: "center" });
            pdf.addImage(bwCanvas.toDataURL("image/png"), "PNG", margin, 25, imgWidth, imgHeight);
            
            pdf.save("ev-charging-comparison.pdf");
            
            // Restore button
            pdfBtn.textContent = originalText;
            pdfBtn.style.pointerEvents = "auto";
            pdfBtn.style.opacity = "1";
        });
    });
}

window.addEventListener("DOMContentLoaded", init);

// ===============================
// Help Modal Logic
// ===============================
let currentSlide = 0;

function moveSlide(step) {
    const container = document.getElementById('helpSlides');
    const slides = document.querySelectorAll('.help-slide');
    const totalSlides = slides.length;
    
    currentSlide += step;

    // Boundary checks to prevent sliding into empty space
    if (currentSlide < 0) currentSlide = 0;
    if (currentSlide >= totalSlides) currentSlide = totalSlides - 1;
    
    // Calculate percentage based on actual number of slides
    const slideWidthPercent = 100 / totalSlides;
    const offset = currentSlide * -slideWidthPercent;
    
    container.style.transform = `translateX(${offset}%)`;
}

function closeHelp() {
    const overlay = document.getElementById('helpOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        // Wait for fade out before removing from view
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

function toggleTooltip(el) {
    // Toggle the 'active' class on the parent container
    const container = el.closest('.tooltip-container');
    if (container) {
        container.classList.toggle('active');
    }
}

// Optional: Close tooltip when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tooltip-container')) {
        document.querySelectorAll('.tooltip-container.active').forEach(openTooltip => {
            openTooltip.classList.remove('active');
        });
    }
});
