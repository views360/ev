/**
 * PURE LOGIC: Simulates a journey and calculates costs/stops.
 * Returns an object with numerical results.
 */
function runJourneySimulation(params) {
    const { 
        miles, batteryKwh, efficiency, rechargeAt, 
        chargeToPercent, rate, initialSoc 
    } = params;

    const kwhFullCharge = ((chargeToPercent - rechargeAt) / 100) * batteryKwh;
    let distanceDriven = 0;
    let publicKwh = 0;
    let currentSoc = initialSoc;
    let stops = 0;
    const itinerary = [];

    while (distanceDriven < miles) {
        const rangeAvailable = ((currentSoc - rechargeAt) / 100) * batteryKwh * efficiency;
        
        if (distanceDriven + rangeAvailable >= miles) {
            break; 
        }

        const mileMarkAtRecharge = distanceDriven + rangeAvailable;
        stops++;
        
        const remainingDist = miles - mileMarkAtRecharge;
        const kwhNeededToFinish = (remainingDist / efficiency);

        let kwhAdded = 0;
        if (kwhNeededToFinish <= kwhFullCharge) {
            kwhAdded = kwhNeededToFinish;
            currentSoc = rechargeAt + (kwhNeededToFinish / batteryKwh * 100); 
        } else {
            kwhAdded = kwhFullCharge;
            currentSoc = chargeToPercent;
        }

        publicKwh += kwhAdded;
        distanceDriven = mileMarkAtRecharge;

        itinerary.push({
            stop: stops,
            mileMark: mileMarkAtRecharge,
            kwhAdded: kwhAdded
        });
    }

    return {
        totalPublicKwh: publicKwh,
        stopCount: stops,
        itinerary: itinerary,
        totalCost: publicKwh * (rate / 100)
    };
}

function calculate() {
    // 1. Initialize variables
    const providersContainer = document.getElementById("providers");
    const collapseBtn = document.getElementById("toggleProvidersBtn");
    const clearBtn = document.querySelector('button[onclick="clearSavedProviders()"]');
    const hiddenMsg = document.getElementById("providersHiddenMsg");

    const hasProviders = providersContainer && providersContainer.querySelectorAll(".provider-box").length > 0;

    if (!hasProviders) {
        if (collapseBtn) collapseBtn.style.display = "none";
        if (clearBtn) clearBtn.style.display = "none";
        if (hiddenMsg) hiddenMsg.style.display = "none";
    } else {
        if (collapseBtn) collapseBtn.style.display = "block";
        if (clearBtn) clearBtn.style.display = "block";
    }

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

const addJourneyBtn = document.querySelector('button[onclick="addAdditionalJourney()"]');
    const extraJourneys = document.querySelectorAll(".extra-journey-miles");
    
    if (addJourneyBtn) {
        if (extraJourneys.length > 0) {
            addJourneyBtn.classList.remove("empty-pulse");
        } else {
            addJourneyBtn.classList.add("empty-pulse");
        }
    }

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
            uiPreText.innerHTML = "Please attend to all flashing green fields, or use the navigation tabs at the top to switch between BREAK EVEN and COST REDUCTION calculation types.";
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
                                <th>Charging Speed</th>
                                <th>Sub. Fee</th>
                                <th>Disc. Rate</th>
                                <th>Break-Even Miles</th>
                            </tr>
                        </thead>
                        <tbody>`;

        beData.forEach(row => {
            const providerLink = row.url 
                ? `<a href="${row.url}" target="_blank" style="color:inherit; text-decoration:underline;">${row.name}</a>` 
                : row.name;

            html += `<tr>
                <td>${providerLink}</td>
                <td>${row.speedDisplay}</td>
                <td>£${row.subCost.toFixed(2)}</td>
                <td>${row.rate.toFixed(1)}p</td>
                <td><strong>${row.displayText}</strong></td>
            </tr>`;
        });

        document.getElementById("providerResults").innerHTML = html + `</tbody></table></div>`;
        return; 
    }

conclusionsBox.style.display = "block";
    document.querySelector(".calc-lines").style.display = "block";
    document.querySelector(".chart-wrapper").style.display = "block";

    const mainInitialRange = (inputs.soc / 100) * inputs.batteryKwh * inputs.efficiency;
    const journey1PublicMiles = Math.max(0, inputs.journeyMiles - mainInitialRange);

    const startChargeKwhNeeded = Math.max(0, (inputs.soc - inputs.prechargesoc) / 100 * inputs.batteryKwh);
    const startChargeCost = startChargeKwhNeeded * (inputs.startChargeRate / 100);

    let totalPreJourneyCost = startChargeCost;
    let preJourneyBreakdownHtml = `<p style="opacity: 0.5; font-size: 0.8rem; margin: 0px"><strong>Pre-journey charging costs:</strong></p>`;
    preJourneyBreakdownHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">Journey 1 pre-charge (${startChargeKwhNeeded.toFixed(1)} kWh): £${startChargeCost.toFixed(2)}</div>`;

    inputs.additionalJourneys.forEach((j, index) => {
        const extraStartKwh = Math.max(0, (j.soc - j.prechargesoc) / 100 * inputs.batteryKwh);
        const extraStartCost = extraStartKwh * (j.startChargeRate / 100);
        totalPreJourneyCost += extraStartCost;
        preJourneyBreakdownHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">Journey ${index + 2} pre-charge (${extraStartKwh.toFixed(1)} kWh): £${extraStartCost.toFixed(2)}</div>`;
    });

    // --- 5. PUBLIC CHARGING CALCULATIONS (Refactored) ---
    // Use the simulation worker for accurate results including charging stops
    const j1Sim = runJourneySimulation({
        miles: inputs.journeyMiles,
        batteryKwh: inputs.batteryKwh,
        efficiency: inputs.efficiency,
        rechargeAt: inputs.rechargeAt,
        chargeToPercent: 80,
        rate: inputs.adhoc,
        initialSoc: inputs.soc
    });

    let cumulativeKwh = j1Sim.totalPublicKwh;
    let breakoutHtml = `<p style="opacity: 0.5; font-size: 0.8rem; margin: 0px"><strong>PAYG mileage costs:</strong></p>`;
    breakoutHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">Journey 1 PAYG kWh: ${j1Sim.totalPublicKwh.toFixed(1)} kWh</div>`;

    inputs.additionalJourneys.forEach((j, index) => {
        const res = runJourneySimulation({
            miles: j.miles,
            batteryKwh: inputs.batteryKwh,
            efficiency: inputs.efficiency,
            rechargeAt: inputs.rechargeAt,
            chargeToPercent: 80,
            rate: inputs.adhoc,
            initialSoc: j.soc
        });
        cumulativeKwh += res.totalPublicKwh;
        breakoutHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">Journey ${index + 2} PAYG kWh: ${res.totalPublicKwh.toFixed(1)} kWh</div>`;
    });

    // Fix: We declare publicKwh once here to be used in the rest of the function
    const publicKwh = cumulativeKwh;
    const totalAdhocCost = totalPreJourneyCost + (publicKwh * (inputs.adhoc / 100));

    document.getElementById("startChargeLine").innerHTML = preJourneyBreakdownHtml;
    document.getElementById("publicKwhLine").innerHTML = inputs.additionalJourneys.length > 0 ? breakoutHtml : "";

    const adhocCostLine = document.getElementById("adhocCostLine");
    const paygIntro = inputs.additionalJourneys.length > 0 ? "Total combined PAYG cost:" : "Standard PAYG journey cost:";
    
    adhocCostLine.innerHTML = `
        <p style="margin: 0px; font-size: 1.2rem">
            ${paygIntro} <strong>£${totalAdhocCost.toFixed(2)}</strong>
        </p>
    `;

const providers = [];
    const providerBoxes = document.querySelectorAll(".provider-box");

    providerBoxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;
       
        let providerPublicCost = 0;

        // Calculate Journey 1 using worker
        providerPublicCost += runJourneySimulation({
            miles: inputs.journeyMiles,
            batteryKwh: inputs.batteryKwh,
            efficiency: inputs.efficiency,
            rechargeAt: inputs.rechargeAt,
            chargeToPercent: 80,
            rate: rate,
            initialSoc: inputs.soc
        }).totalCost;
        
        // Calculate Additional journeys using worker
        inputs.additionalJourneys.forEach(j => {
            providerPublicCost += runJourneySimulation({
                miles: j.miles,
                batteryKwh: inputs.batteryKwh,
                efficiency: inputs.efficiency,
                rechargeAt: inputs.rechargeAt,
                chargeToPercent: 80,
                rate: rate,
                initialSoc: j.soc
            }).totalCost;
        });
        
        const totalJourneyCost = subCost + totalPreJourneyCost + providerPublicCost;
        const pData = PRESETS.find(p => p.name === document.getElementById(`preset${id}`).value);

        const savingPerKwh = (inputs.adhoc - rate) / 100;
        let breakEvenMiles = 0;
        if (savingPerKwh > 0) {
            breakEvenMiles = (subCost / savingPerKwh) * inputs.efficiency;
        }

        providers.push({ 
            name, 
            subCost, 
            rate, 
            totalJourneyCost, 
            breakEvenMiles,
            totalWithBattery: breakEvenMiles + mainInitialRange,
            savings: totalAdhocCost - totalJourneyCost,
            url: pData?.subscription?.url,
            comments: pData?.subscription?.comments || ""
        });
    });

    const sortVal = document.getElementById("sortProviders")?.value || "savings";
    if (sortVal === "cost") {
        providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    } else {
        providers.sort((a, b) => b.savings - a.savings);
    }

    const providerResults = document.getElementById("providerResults");
    if (providerResults) {
        let html = `
            <h2 class="results-heading" style="text-align: center">COST REDUCTION ANALYSIS</h2>
            <div class="mobile-only-text" style="font-size: 0.8em; text-align: center; color: var(--neon-green)">Slide table left to view hidden columns.</div>
            <div class="results-scroll">
            <table>
                <thead>
                    <tr>
                        <th>Provider (click hyperlink to view subscription info)</th>
                        <th>Sub. Fee</th>
                        <th>Disc. Rate</th>
                        <th>Total Journey Cost</th>
                        <th>Savings vs PAYG</th>
                        <th>Break-Even (Inc. Start Battery)</th>
                    </tr>
                </thead>
                <tbody>`;

        providers.forEach(p => {
            const providerLink = p.url 
                ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>` 
                : p.name;

            html += `
                <tr>
                    <td>${providerLink}</td>
                    <td>£${p.subCost.toFixed(2)}</td>
                    <td>${p.rate.toFixed(1)}p</td>
                    <td><strong>£${p.totalJourneyCost.toFixed(2)}</strong></td>
                    <td style="color: ${p.savings >= 0 ? '#22c55e' : '#ef4444'}">
                        <strong>${p.savings >= 0 ? '+' : ''}£${p.savings.toFixed(2)}</strong>
                    </td>
                    <td>${Math.round(p.totalWithBattery)} miles</td>
                </tr>`;
        });

        providerResults.innerHTML = html + `</tbody></table></div>`;
    }

const maxChargingSpeed = parseFloat(document.getElementById("maxChargingSpeed").value) || 0;
    const chargeSpeeds = [7, 22, 50, 100, 150, 250, 350];
    let speedTableHtml = `
        <div class="speed-comparison">
            <h3 style="color: var(--neon-green); margin-top: 20px;">Public Charging Duration Comparison</h3>
            <div class="mobile-only-text" style="font-size: 0.8em; text-align: center; color: var(--neon-green)">Slide table left to view speeds.</div>
            <div class="results-scroll">
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border);">
                        <th style="padding: 10px; text-align: left;">Charger Speed</th>
                        <th style="padding: 10px; text-align: left;">Total Time (Approx.)</th>
                        <th style="padding: 10px; text-align: left;">Per Stop Avg.</th>
                    </tr>
                </thead>
                <tbody>`;

    chargeSpeeds.forEach(speed => {
        const totalHours = publicKwh / speed;
        const totalMins = totalHours * 60;
        const totalStops = j1Sim.stopCount + inputs.additionalJourneys.reduce((acc, curr, idx) => {
             // We run a quick check for stops in extra journeys
             return acc + runJourneySimulation({
                miles: curr.miles,
                batteryKwh: inputs.batteryKwh,
                efficiency: inputs.efficiency,
                rechargeAt: inputs.rechargeAt,
                chargeToPercent: 80,
                rate: inputs.adhoc,
                initialSoc: curr.soc
            }).stopCount;
        }, 0);

        const hours = Math.floor(totalMins / 60);
        const mins = Math.round(totalMins % 60);
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        const avgMins = totalStops > 0 ? Math.round(totalMins / totalStops) : 0;
        const isUserMax = speed === maxChargingSpeed;

        speedTableHtml += `
            <tr style="${isUserMax ? 'background: rgba(34, 197, 94, 0.1); border: 1px solid var(--neon-green);' : 'border-bottom: 1px solid var(--border);'}">
                <td style="padding: 10px;">${speed} kW ${isUserMax ? '<strong>(Your Max)</strong>' : ''}</td>
                <td style="padding: 10px;">${timeStr}</td>
                <td style="padding: 10px;">${totalStops > 0 ? avgMins + ' mins' : 'N/A'}</td>
            </tr>`;
    });

    speedTableHtml += `</tbody></table></div></div>`;

    let maxChargingTimeFormatted = "N/A";
    if (maxChargingSpeed > 0) {
        const maxTotalMins = (publicKwh / maxChargingSpeed) * 60;
        const maxH = Math.floor(maxTotalMins / 60);
        const maxM = Math.round(maxTotalMins % 60);
        maxChargingTimeFormatted = maxH > 0 ? `${maxH}h ${maxM}m` : `${maxM}m`;
    }

let assessmentBoxHTML = `
        <div class="assessment-box" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 20px;">
            <h3 style="color: var(--neon-green); margin-bottom: 10px;">Real-World Charging Itinerary</h3>
            <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 15px;">
                Based on your <strong>${inputs.rechargeAt}%</strong> recharge threshold and <strong>80%</strong> target charge, here is your estimated stop-by-stop plan.
            </p>
            <div class="mobile-only-text" style="font-size: 0.8em; text-align: center; color: var(--neon-green)">Slide table left to view itinerary details.</div>
            <div class="results-scroll">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border); text-align: left;">
                        <th style="padding: 10px;">Event</th>
                        <th style="padding: 10px;">Type</th>
                        <th style="padding: 10px;">Odometer</th>
                        <th style="padding: 10px;">Action / Amount</th>
                        <th style="padding: 10px;">Est. Time (at ${maxChargingSpeed}kW)</th>
                    </tr>
                </thead>
                <tbody>`;

    const allJourneys = [
        { miles: inputs.journeyMiles, soc: inputs.soc, label: "Journey 1" },
        ...inputs.additionalJourneys.map((j, i) => ({ ...j, label: `Journey ${i + 2}` }))
    ];

    allJourneys.forEach(journey => {
        const sim = runJourneySimulation({
            miles: journey.miles,
            batteryKwh: inputs.batteryKwh,
            efficiency: inputs.efficiency,
            rechargeAt: inputs.rechargeAt,
            chargeToPercent: 80,
            rate: inputs.adhoc,
            initialSoc: journey.soc
        });

        // Departure Row
        assessmentBoxHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px;">${journey.label}</td>
                <td style="padding: 10px;">Depart</td>
                <td style="padding: 10px;">0 miles</td>
                <td style="padding: 10px;">Starting at ${journey.soc}%</td>
                <td style="padding: 10px;">-</td>
            </tr>`;

        // Charging Stop Rows
        sim.itinerary.forEach(stop => {
            const mins = maxChargingSpeed > 0 ? Math.round((stop.kwhAdded / maxChargingSpeed) * 60) : 0;
            const timeStr = mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

            assessmentBoxHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(34, 197, 94, 0.03);">
                    <td style="padding: 10px;">Stop ${stop.stop}</td>
                    <td style="padding: 10px; color: var(--neon-green);">Charge</td>
                    <td style="padding: 10px;">${Math.round(stop.mileMark)} miles</td>
                    <td style="padding: 10px;">Add ${stop.kwhAdded.toFixed(1)} kWh</td>
                    <td style="padding: 10px;">${maxChargingSpeed > 0 ? timeStr : 'N/A'}</td>
                </tr>`;
        });

        // Arrival Row
        assessmentBoxHTML += `
            <tr style="border-bottom: 1px solid var(--border); font-weight: bold;">
                <td style="padding: 10px;">${journey.label}</td>
                <td style="padding: 10px;">Arrive</td>
                <td style="padding: 10px;">${journey.miles} miles</td>
                <td style="padding: 10px;">Destination reached</td>
                <td style="padding: 10px;">-</td>
            </tr>`;
    });

    assessmentBoxHTML += `</tbody></table></div></div>`;

// --- 6. CONCLUSIONS & UI RENDERING ---
    let conclusionHTML = `<div class="conclusion-card">`;
    const sortedBySavings = [...providers].sort((a, b) => b.savings - a.savings);
    const best = sortedBySavings[0];

    if (best && best.savings > 0) {
        conclusionHTML += `
            <p class="main-result">
                The best provider for this journey is <strong>${best.name}</strong>, 
                saving you <strong>£${best.savings.toFixed(2)}</strong> compared to standard PAYG.
            </p>`;
    } else {
        conclusionHTML += `
            <p class="main-result">
                Based on your current providers, <strong>Standard PAYG</strong> is the most cost-effective 
                option for this specific trip.
            </p>`;
    }

    const durationJourneyCount = inputs.additionalJourneys.length + 1;
    const durationTotalMiles = inputs.journeyMiles + inputs.additionalJourneys.reduce((sum, j) => sum + j.miles, 0);
    const locationDisclaimer = `<p style="font-size: 0.8rem; opacity: 0.6; margin-top: 15px;">* Timings are based on constant peak delivery. Real-world speeds may vary by state of charge and station load.</p>`;
    
    let durationIntro = "";
    if (durationJourneyCount === 1) {
        durationIntro = `Your proposed <strong>${inputs.journeyMiles}-mile</strong> journey`;
    } else {
        durationIntro = `Your ${durationJourneyCount} proposed journeys totalling <strong>${durationTotalMiles} miles</strong>`;
    }
 
    if (maxChargingSpeed > 0) {
        conclusionHTML += `
            <p class="main-result">
                ${durationIntro} will require <strong>${publicKwh.toFixed(1)} kWh</strong> of public charging 
                after your battery drops to the ${inputs.rechargeAt}% threshold. 
                At <strong>${maxChargingSpeed} kW</strong>, total recharging duration will be 
                approximately <strong>${maxChargingTimeFormatted}</strong>.
            </p>`;
    } else {
        conclusionHTML += `<p class="main-result">Enter your <strong>Max. Charging Speed</strong> to see estimated durations.</p>`;
    }

    conclusionHTML += `${speedTableHtml}${locationDisclaimer}</div>`;
    conclusionsBox.innerHTML = conclusionHTML + assessmentBoxHTML;

    // Final sorting for the chart and storage
    providers.sort((a, b) => {
        if (sortVal === "cost") return a.totalJourneyCost - b.totalJourneyCost;
        return b.savings - a.savings;
    });

    drawGraph(inputs, providers);
    
    const dataToSave = getInputs();
    setCookie("ev_trip_values", dataToSave);
    saveProvidersToCookie();
} // This brace closes the calculate() function.

