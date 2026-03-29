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
        
        // Can we make it to the end?
        if (distanceDriven + rangeAvailable >= miles) {
            break; 
        }

        // We need to stop and charge
        const mileMarkAtRecharge = distanceDriven + rangeAvailable;
        stops++;
        
        // Logic for final stop vs mid-journey stop
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
    // 1. Initialize variables (using your exact naming conventions)
    const providersContainer = document.getElementById("providers");
    const collapseBtn = document.getElementById("toggleProvidersBtn");
    const clearBtn = document.querySelector('button[onclick="clearSavedProviders()"]');
    const hiddenMsg = document.getElementById("providersHiddenMsg");

    // 2. Check if any provider boxes exist
    const hasProviders = providersContainer && providersContainer.querySelectorAll(".provider-box").length > 0;

    // 3. Update visibility based on whether the list is empty
    if (!hasProviders) {
        if (collapseBtn) collapseBtn.style.display = "none";
        if (clearBtn) clearBtn.style.display = "none";
        if (hiddenMsg) hiddenMsg.style.display = "none";
    } else {
        if (collapseBtn) collapseBtn.style.display = "block";
        if (clearBtn) clearBtn.style.display = "block";
        // hiddenMsg visibility remains managed by your toggleProviders logic
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
        // If at least one extra journey exists, remove the pulse; otherwise, keep it.
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
                                <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the number of miles you must drive on the provider's discounted charge rate to pay off the subscription fee. <strong>Important! This is not the total miles of your journey</strong> — it is the number of miles you must drive from your first charge with this provider. Remember, a subscription lasts for an entire month. The number of journeys has no impact on this value.</span></span></span>Break-Even Miles</th>
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
            if (!el._ftScrollBound) { el._ftScrollBound = true; el.addEventListener("scroll", () => { if (typeof _ftActive !== 'undefined' && _ftActive) _ftHide(); }, { passive: true }); }
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
    const paygTitle = document.getElementById("paygSummaryTitle");
    if (paygTitle) {
        if (inputs.adhoc > 0) {
            paygTitle.textContent = `1. PAYG Summary (Based on ${inputs.adhoc}p/kWh)`;
        } else {
            paygTitle.textContent = `1. PAYG Summary`;
        }
    }
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

// --- START REPLACEMENT: CONSOLIDATED JOURNEY LOGIC ---
    const allJourneys = [
        { miles: inputs.journeyMiles, soc: inputs.soc, rate: inputs.startChargeRate },
        ...inputs.additionalJourneys
    ];

    let totalInitialRange = 0;
    let totalPreJourneyCost = 0;
    let totalPublicKwh = 0;
    let rangeDetailsHtml = "";
    let preChargeDetailsHtml = "";
    let publicMilesDetailsHtml = "";

    allJourneys.forEach((j, index) => {
        const initialRange = Math.max(0, ((j.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh * inputs.efficiency);
        const preChargeKwh = Math.max(0, ((j.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh);
        const preChargeCost = preChargeKwh * (j.rate / 100);
        
        const sim = runJourneySimulation({
            miles: j.miles,
            batteryKwh: inputs.batteryKwh,
            efficiency: inputs.efficiency,
            rechargeAt: inputs.rechargeAt,
            chargeToPercent: 80,
            rate: inputs.adhoc,
            initialSoc: j.soc
        });

        totalInitialRange += initialRange;
        totalPreJourneyCost += preChargeCost;
        totalPublicKwh += sim.totalPublicKwh;

        // UI Detail lines
        const label = `Journey ${index + 1}`;
        rangeDetailsHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">${label} range: ${initialRange.toFixed(0)} miles</div>`;
        preChargeDetailsHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">${label} pre-charge cost (${inputs.rechargeAt}%→${j.soc}%, ${preChargeKwh.toFixed(1)} kWh x ${j.rate}p): £${preChargeCost.toFixed(2)}</div>`;
        publicMilesDetailsHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">${label} PAYG miles: ${Math.max(0, j.miles - initialRange).toFixed(0)} miles</div>`;
    });

    const totalAdhocCost = totalPreJourneyCost + (totalPublicKwh * (inputs.adhoc / 100));
    const publicKwh = totalPublicKwh; 
    // --- END REPLACEMENT ---
       

 const providers = [];
    providerBoxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;
       
        let publicChargingCost = 0;

        // Journey 1
        publicChargingCost += runJourneySimulation({
            miles: inputs.journeyMiles,
            batteryKwh: inputs.batteryKwh,
            efficiency: inputs.efficiency,
            rechargeAt: inputs.rechargeAt,
            chargeToPercent: 80,
            rate: rate,
            initialSoc: inputs.soc
        }).totalCost;
        
        // Additional journeys
        inputs.additionalJourneys.forEach(j => {
            publicChargingCost += runJourneySimulation({
                miles: j.miles,
                batteryKwh: inputs.batteryKwh,
                efficiency: inputs.efficiency,
                rechargeAt: inputs.rechargeAt,
                chargeToPercent: 80,
                rate: rate,
                initialSoc: j.soc
            }).totalCost;
        });
        
        const totalJourneyCost = subCost + totalPreJourneyCost + publicChargingCost;
        const pData = PRESETS.find(p => p.name === document.getElementById(`preset${id}`).value);

        // Break-even logic for this provider
        const savingPerKwh = (inputs.adhoc - rate) / 100;
        let breakEvenMiles = 0;
        if (savingPerKwh > 0) {
            const kwhNeeded = subCost / savingPerKwh;
            breakEvenMiles = kwhNeeded * inputs.efficiency;
        }

        providers.push({ 
            name, subCost, rate, totalJourneyCost, 
            breakEvenMiles,
            totalWithBattery: breakEvenMiles + mainInitialRange,
            savings: totalAdhocCost - totalJourneyCost,
            url: pData?.subscription?.url,
            comments: pData?.subscription?.comments || ""
        });
    });   
            
        const totalJourneyCost = subCost + totalPreJourneyCost + publicChargingCost;
        const pData = PRESETS.find(p => p.name === document.getElementById(`preset${id}`).value);

        providers.push({ 
            name, subCost, rate, totalJourneyCost, 
            breakEvenMiles,
            totalWithBattery: breakEvenMiles + mainInitialRange,
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
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the provider's discounted charge rate (per kWh) that is available after subscribing for an entire month. Note: Some providers have variable charge rates depending on location and time of day. The rate listed here may be an average. Click the provider's link to confirm pricing.</span></span></span>Disc. Rate</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the expected <strong>total charging cost</strong> of your journey using this provider and including your stated battery pre-charge. If the value is displayed in green, it is cheaper than the equivalent journey using PAYG charging at the rate you entered above (${inputs.adhoc}p/kWh).</span></span></span>Journey Cost</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the amount by which the discounted charge rate will either be cheaper or more expensive than your average PAYG rate for the same distance. Green means cheaper; red means more expensive. Bear in mind that you can continue to use a provider's subscription for an entire month.</span></span></span>vs. PAYG</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the number of miles you must drive on the provider's discounted charge rate to pay off the subscription fee. <strong>Important! This is not the total miles of your journey</strong> — it is the number of miles you must drive from your first charge with this provider. Remember, a subscription lasts for an entire month.</span></span></span>Break-Even Miles</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the break-even miles PLUS the initial number of miles your vehicle can drive based on its pre-charged state. The number of journeys has no impact on this value.</span></span></span>Break Even + Battery</th>
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
        if (!el._ftScrollBound) { el._ftScrollBound = true; el.addEventListener("scroll", () => { if (typeof _ftActive !== 'undefined' && _ftActive) _ftHide(); }, { passive: true }); }
    });

    if (providers.length > 0) {
        const bestProvider = providers[0];
        const minSpeedSelect = document.getElementById("minSpeed");
        const minSpeedLabel = minSpeedSelect.options[minSpeedSelect.selectedIndex].text;
        const maxChargingSpeed = inputs.maxChargingSpeed;
        
        const formatChargingTime = (timeHours) => {
            if (timeHours < 1) {
                const minutes = Math.round(timeHours * 60);
                return `${minutes} mins`;
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
        const rechargethreshold = inputs.rechargeAt;
        const chargeToPercent = 80; // Charge to 80% at each public stop (except final)
        
        // Usable energy per public charge (from threshold to 80%)
        const kwhPerPublicCharge = ((chargeToPercent - rechargethreshold) / 100) * inputs.batteryKwh;
        const rangePerPublicCharge = kwhPerPublicCharge * inputs.efficiency;
        
        // Starting range (from pre-charge SOC down to threshold)
        const startingRangeOnPreCharge = ((inputs.soc - rechargethreshold) / 100) * inputs.batteryKwh * inputs.efficiency;
        
        let stopsRows = '';
        let stopCount = 0;
        let distanceDriven = 0;
        let currentChargePercent = inputs.soc;
        
        // Simulate the journey
        while (distanceDriven < inputs.journeyMiles) {
            // How far can we drive before hitting recharge threshold on current charge?
            const rangeOnCurrentCharge = ((currentChargePercent - rechargethreshold) / 100) * inputs.batteryKwh * inputs.efficiency;
            
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
                    <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">Final public charge (when battery reaches ${rechargethreshold}%)</td>
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
                    <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">Public charge (when battery reaches ${rechargethreshold}%)</td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${distanceDriven.toFixed(0)}</td>
                    <td style="padding: 10px; border: 1px solid var(--border);">Add ${(chargeToPercent - rechargethreshold).toFixed(0)}% / ${kwhPerPublicCharge.toFixed(1)}kWh</td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${chargeTimeFormatted}</td>
                </tr>`;
                currentChargePercent = chargeToPercent;
            }
        }

        // Build unified journey list (Journey 1 + additional journeys)
        const allJourneys = [
            {
                miles: inputs.journeyMiles,
                soc: inputs.soc,
                rate: inputs.startChargeRate
            },
            ...inputs.additionalJourneys
        ];

        // Build itinerary rows for each journey
        const itineraryRowsArray = allJourneys.map((j, idx) => {
            return buildStopsRowsForJourney(j.miles, j.soc, inputs.rechargeAt, inputs.efficiency, inputs.batteryKwh);
        });
        
        // Build tabbed itinerary
        let assessmentBoxHTML = buildTabbedItinerary(allJourneys, itineraryRowsArray, inputs.rechargeAt);
        
        const locationDisclaimer = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8;">Note: Charging durations exclude the initial ramp-up phase. Since you should only charge above 80% in exceptional circumstances, the 80-to-100% charging slowdown is disregarded here. Read the section on <a href="mastery.html#sec-slow" style="color: var(--accent); text-decoration: underline;">Slow Charging</a> to find out more.</p>`;
    
        const contentsHTML = `
            <div id="toc" class="conclusion-white-border">
                <h3>RESULTS CONTENTS</h3>
                <ul style="margin:0; padding-left:20px; font-size:0.95rem;">
                    <li><a href="#payg-summary" style="color: var(--accent); text-decoration:none;">1. PAYG Summary (Based on ${inputs.adhoc}p/kWh)</a></li>
                    <li><a href="#providerResults" style="color: var(--accent); text-decoration:none;">2. Providers &amp; Subscriptions</a></li>
                    <li><a href="#payg-vs-subscription" style="color: var(--accent); text-decoration:none;">3. PAYG vs Subscription Conclusion</a></li>
                    <li><a href="#charging-times-section" style="color: var(--accent); text-decoration:none;">4. Charging Durations</a></li>
                    <li><a href="#real-world-assessment" style="color: var(--accent); text-decoration:none;">5. Real-World Charging Itinerary</a></li>
                    <li><a href="#graph-section" style="color: var(--accent); text-decoration:none;">6. Subscriptions Break-Even Graph</a></li>
                </ul>
            </div>
        `;
        
        document.getElementById("contentsBox").innerHTML = contentsHTML;
        let conclusionHTML = "";
        const extraNote = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8; color:var(--neon-green) !important;">Note: Before purchasing a subscription, check that your chosen provider has charging stations in your planned area of travel — else your subscription will be wasted.</p>`
        conclusionHTML += `<div class="conclusion-white-border guide-section" id="payg-vs-subscription">`; 
        const journeyCount = 1 + inputs.additionalJourneys.length;
        const totalMiles = inputs.journeyMiles + inputs.additionalJourneys.reduce((sum, j) => sum + j.miles, 0);
        
        let journeyIntro = "";
        
        if (journeyCount === 1) {
            journeyIntro = `For a journey of <strong>${inputs.journeyMiles} miles</strong>`;
        } else {
            journeyIntro = `For ${journeyCount} journeys totalling <strong>${totalMiles} miles</strong>`;
        }

        if (bestProvider.savings > 0) {
            conclusionHTML += `<h3>3. PAYG vs Subscription Conclusion</h3><p class="main-result">${journeyIntro}, a one-month subscription with <strong>${bestProvider.name}</strong> works out cheaper than PAYG based on the selected minimum charging rate of <strong>${minSpeedLabel}</strong> and the other information entered. The total journey cost will be <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>, which represents a saving of <strong>£${bestProvider.savings.toFixed(2)}</strong> over the average PAYG rate you entered above (${inputs.adhoc}p/kWh).</p>${extraNote}`
        } else {
            conclusionHTML += `<h3>3. PAYG vs SUBSCRIPTION CONCLUSION</h3><p class="main-result">${journeyIntro}, a <strong>${inputs.adhoc}p PAYG rate</strong> is cheaper than the cheapest subscription at the selected minimum charging rate of <strong>${minSpeedLabel}</strong> and the other information entered. The total journey cost based on PAYG will be <strong>£${totalAdhocCost.toFixed(2)}</strong>. Before opting for PAYG rates, however, consider whether you will go on any other journeys within the month that will require public charging because this may make a one-month subscription more cost effective.</p>${extraNote}`
        }
        conclusionHTML += `</div>`;
        
        conclusionHTML += `<div class="conclusion-white-border guide-section" id="charging-times-section"><h3>4. Charging Durations</h3>`;
        const durationJourneyCount = 1 + inputs.additionalJourneys.length;
        const durationTotalMiles = inputs.journeyMiles + inputs.additionalJourneys.reduce((sum, j) => sum + j.miles, 0);
        
        let durationIntro = "";
        
        if (durationJourneyCount === 1) {
            durationIntro = `Your proposed <strong>${inputs.journeyMiles}-mile</strong> journey`;
        } else {
            durationIntro = `Your ${durationJourneyCount} proposed journeys totalling <strong>${durationTotalMiles} miles</strong>`;
        }
     
        if (maxChargingSpeed > 0) {
            conclusionHTML += `<p class="main-result">${durationIntro} will require <strong>${publicKwh.toFixed(1)} kWh</strong> of public charging (either PAYG or subscription based) after your pre-charged battery percentage drops to your specified recharge threshold of ${inputs.rechargeAt}%. At your maximum supported charge speed of <strong>${maxChargingSpeed} kW</strong>, total recharging duration for the entire journey will be approximately <strong>${maxChargingTimeFormatted}</strong>. A speed-comparison table for adding ${publicKwh.toFixed(1)} kWh of charge over the expected number of stops (see <i>Real-World Chargin Itinerary</i>) is provided below.</p>`;
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

