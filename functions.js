function updateUiVisibility() {
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

    const beCard = document.getElementById("breakEvenCard");
    if (beCard) beCard.style.display = isTripMode ? "none" : "block";

    const tripGrid = document.querySelector(".grid");
    const resultsHeader = document.getElementById("resultsHeader");
    const btnRow = document.querySelector(".btn-row");
    const uiResults = document.getElementById("results");
    const sortContainer = document.getElementById("sortContainer");

    if (sortContainer) sortContainer.style.display = isTripMode ? "block" : "none";
    if (tripGrid) tripGrid.style.display = isTripMode ? "grid" : "none";
    if (resultsHeader) resultsHeader.style.display = isTripMode ? "flex" : "none";
    if (uiResults) uiResults.style.display = isTripMode ? "flex" : "none";
    if (btnRow) btnRow.style.display = isTripMode ? "flex" : "none";

    const fieldIds = [
        "journeyMiles", "batteryKwh", "soc", "efficiency",
        "adhoc", "startChargeRate", "maxChargingSpeed",
        "efficiencyBE", "adhocBE", "rechargeAt"
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
}

function isBreakEvenMode() {
    const activePill = document.querySelector('.calc-tab.active');
    return !(activePill && activePill.textContent.trim() === "Cost Reduction");
}

function validateInputs(inputs) {
    const uiPreText = document.getElementById("preConclusionsText");
    const uiResults = document.getElementById("results");
    const resultsHeader = document.getElementById("resultsHeader");
    const uiShare = document.getElementById("shareBtn");
    const uiPdf = document.getElementById("pdfBtn");
    const toc = document.getElementById("toc");

    const tripIncomplete =
        inputs.journeyMiles <= 0 ||
        inputs.batteryKwh <= 0 ||
        inputs.soc <= 0 ||
        inputs.efficiency <= 0 ||
        inputs.adhoc <= 0 ||
        !document.getElementById("rechargeAt").value ||
        inputs.maxChargingSpeed <= 0 ||
        inputs.startChargeRate <= 0;

    const providerBoxes = document.querySelectorAll(".provider-box");

    if (tripIncomplete) {
        uiPreText.innerHTML = "Please attend to all flashing green fields, or use the navigation tabs at the top to switch between BREAK EVEN and COST REDUCTION calcuation types.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (resultsHeader) resultsHeader.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        if (toc) toc.style.display = "none";
        return false;
    }

    if (providerBoxes.length === 0) {
        uiPreText.innerHTML = "Before you may view the results, you must select at least one provider from the list of providers (above). It is simplest to add <i>all</i> providers.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (toc) toc.style.display = "none";
        if (resultsHeader) resultsHeader.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        return false;
    }

    return true;
}

function computeBreakEven(inputs) {
    const efficiency = parseFloat(document.getElementById("efficiencyBE").value);
    const adhocRate = parseFloat(document.getElementById("adhocBE").value) || 0;
    const minSpeedSelection = parseFloat(document.getElementById("minSpeedBE").value) || 0;

    let beData = [];

    PRESETS.forEach(p => {
        const sub = p.subscription.monthlyCost;
        const rates = p.rates;
        const speedKeys = Object.keys(rates);

        speedKeys.forEach(speed => {
            const numericSpeed = speed === 'default' ? 0 : parseFloat(speed);
            if (speed !== 'default' && numericSpeed < minSpeedSelection) return;

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
                speedDisplay,
                subCost: sub,
                rate,
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

    return beData;
}

function computePaygSummary(inputs) {
    const mainInitialRange = ((inputs.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh * inputs.efficiency;

    let totalInitialRange = mainInitialRange;
    let totalPreJourneyCost = Math.max(0, ((inputs.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh) * (inputs.startChargeRate / 100);

    const additionalRanges = [];
    const additionalPreCosts = [];

    inputs.additionalJourneys.forEach(j => {
        const extraRange = Math.max(0, ((j.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh * inputs.efficiency);
        totalInitialRange += extraRange;
        additionalRanges.push(extraRange);

        const extraKwh = Math.max(0, ((j.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh);
        const extraCost = extraKwh * (j.rate / 100);
        totalPreJourneyCost += extraCost;
        additionalPreCosts.push(extraCost);
    });

    const journey1PublicMiles = Math.max(0, inputs.journeyMiles - mainInitialRange);
    let totalPublicMiles = journey1PublicMiles;

    const additionalPublicMiles = inputs.additionalJourneys.map((j, idx) => {
        const extraRange = additionalRanges[idx];
        const miles = Math.max(0, j.miles - extraRange);
        totalPublicMiles += miles;
        return miles;
    });

    const j1Kwh = journey1PublicMiles / inputs.efficiency;
    let breakoutKwh = j1Kwh;

    const additionalKwh = additionalPublicMiles.map(m => {
        const k = m / inputs.efficiency;
        breakoutKwh += k;
        return k;
    });

    const totalAdhocCost = totalPreJourneyCost + breakoutKwh * (inputs.adhoc / 100);

    return {
        mainInitialRange,
        totalInitialRange,
        totalPreJourneyCost,
        journey1PublicMiles,
        totalPublicMiles,
        j1Kwh,
        breakoutKwh,
        totalAdhocCost,
        additionalRanges,
        additionalPreCosts,
        additionalPublicMiles,
        additionalKwh
    };
}

function computeProviderResults(inputs, paygData) {
    const providerBoxes = document.querySelectorAll(".provider-box");

    const simulateTripWithProvider = (providerRate, batteryKwh, rechargethreshold, efficiency, journeyMiles, initialSoc) => {
        const chargeToPercent = 80;
        const kwhPerCharge = ((chargeToPercent - rechargethreshold) / 100) * batteryKwh;
        let distanceDriven = 0;
        let publicChargeCost = 0;
        let currentSoc = initialSoc;

        while (distanceDriven < journeyMiles) {
            const rangeOnCurrentCharge = ((currentSoc - rechargethreshold) / 100) * batteryKwh * efficiency;
            if (distanceDriven + rangeOnCurrentCharge >= journeyMiles) break;

            distanceDriven += rangeOnCurrentCharge;
            const remainingDistance = journeyMiles - distanceDriven;
            const kwhNeededForFinal = remainingDistance / efficiency;

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

        let publicChargingCost = 0;

        publicChargingCost += simulateTripWithProvider(
            rate,
            inputs.batteryKwh,
            inputs.rechargeAt,
            inputs.efficiency,
            inputs.journeyMiles,
            inputs.soc
        );

        inputs.additionalJourneys.forEach(j => {
            publicChargingCost += simulateTripWithProvider(
                rate,
                inputs.batteryKwh,
                inputs.rechargeAt,
                inputs.efficiency,
                j.miles,
                j.soc
            );
        });

        const totalJourneyCost = subCost + paygData.totalPreJourneyCost + publicChargingCost;
        const pData = PRESETS.find(p => p.name === document.getElementById(`preset${id}`).value);

        providers.push({
            name,
            subCost,
            rate,
            totalJourneyCost,
            breakEvenMiles,
            totalWithBattery: breakEvenMiles + paygData.mainInitialRange,
            savings: paygData.totalAdhocCost - totalJourneyCost,
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

    return providers;
}

function computeItinerary(inputs) {
    const allJourneys = [
        {
            miles: inputs.journeyMiles,
            soc: inputs.soc,
            rate: inputs.startChargeRate
        },
        ...inputs.additionalJourneys
    ];

    const itineraryRowsArray = allJourneys.map(j => {
        return buildStopsRowsForJourney(
            j.miles,
            j.soc,
            inputs.rechargeAt,
            inputs.efficiency,
            inputs.batteryKwh
        );
    });

    return {
        allJourneys,
        itineraryRowsArray
    };
}

function computeChargingDurations(inputs, publicKwh) {
    const chargeSpeed = inputs.maxChargingSpeed || 101;
    const rechargethreshold = inputs.rechargeAt;
    const chargeToPercent = 80;

    const kwhPerPublicCharge = ((chargeToPercent - rechargethreshold) / 100) * inputs.batteryKwh;

    return {
        chargeSpeed,
        rechargethreshold,
        chargeToPercent,
        kwhPerPublicCharge,
        publicKwh
    };
}

function renderBreakEven(beData) {
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
                    <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the provider's discounted charge rate (per kWh) that is available after subscribing for one month.</span></span></span>Disc. Rate</th>
                    <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the number of miles you must drive on the provider's discounted charge rate to pay off the subscription fee.</span></span></span>Break-Even Miles</th>
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
        if (!el._ftScrollBound) {
            el._ftScrollBound = true;
            el.addEventListener("scroll", () => {
                if (typeof _ftActive !== 'undefined' && _ftActive) _ftHide();
            }, { passive: true });
        }
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
}

function renderPaygSummary(paygData) {
    const {
        mainInitialRange,
        totalInitialRange,
        totalPreJourneyCost,
        journey1PublicMiles,
        totalPublicMiles,
        j1Kwh,
        breakoutKwh,
        totalAdhocCost,
        additionalRanges,
        additionalPreCosts,
        additionalPublicMiles,
        additionalKwh
    } = paygData;

    const inputs = getInputs();

    const paygSubtitle = document.getElementById("paygSummarySubtitle");
    let rangeHtml = "";
    let preChargeHtml = "";
    let publicMilesHtml = "";
    let breakoutHtml = "";

    if (inputs.additionalJourneys.length > 0) {
        paygSubtitle.textContent = `Here is the key information for your journeys if you choose PAYG.`;
        rangeHtml = `<p style="opacity: 0.5; margin: 0px; font-size: 0.8rem"><strong>Precharged battery range:</strong></p>
            <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey 1 range: ${mainInitialRange.toFixed(0)} miles
            </div>`;

        additionalRanges.forEach((extraRange, index) => {
            rangeHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey ${index + 2} range: ${extraRange.toFixed(0)} miles
            </div>`;
        });

        rangeHtml += `<p style="border-bottom: 1px solid rgba(255,255,255,0.2); margin: 0; padding-bottom: 10px;">
            <span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the range you should expect from precharging.</span></span></span>Total precharged battery range for all journeys: ${totalInitialRange.toFixed(0)} miles</p>`;
    } else {
        paygSubtitle.textContent = `Here is the key information for your journey if you choose PAYG.`;
        rangeHtml = `<p style="margin: 0px"><span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the initial range you should expect.</span></span></span>Precharged battery range: <strong>${mainInitialRange.toFixed(0)} miles</strong></p>`;
    }

    const mainTopUpKwh = Math.max(0, ((inputs.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh);
    const mainTopUpCost = mainTopUpKwh * (inputs.startChargeRate / 100);

    if (inputs.additionalJourneys.length > 0) {
        preChargeHtml = `<p style="opacity: 0.5; font-size: 0.8rem; margin: 0px"><strong>Precharge battery costs:</strong></p>
            <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey 1 precharge cost (${inputs.rechargeAt}%→${inputs.soc}%, ${mainTopUpKwh.toFixed(1)} kWh x  ${inputs.startChargeRate}p): £${mainTopUpCost.toFixed(2)}
            </div>`;

        inputs.additionalJourneys.forEach((j, index) => {
            const extraKwh = Math.max(0, ((j.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh);
            const extraCost = extraKwh * (j.rate / 100);
            preChargeHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey ${index + 2} precharge cost (${inputs.rechargeAt}%→${j.soc}%, ${extraKwh.toFixed(1)} kWh x ${j.rate}p): £${extraCost.toFixed(2)}
            </div>`;
        });

        preChargeHtml += `<p style="margin: 0px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">
            <span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the combined cost for precharging.</span></span></span>Total battery precharge cost for all journeys: £${totalPreJourneyCost.toFixed(2)}</p>`;
    } else {
        preChargeHtml = `<p style="margin: 0px;"><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the cost of precharging.</span></span></span>Pre-journey battery charge (${inputs.rechargeAt}%→${inputs.soc}%, ${mainTopUpKwh.toFixed(1)} kWh x ${inputs.startChargeRate}p): 
            <strong>£${mainTopUpCost.toFixed(2)}</strong></p>`;
    }

    document.getElementById("preChargeLine").innerHTML = `<div class="guide-section" id="payg-summary">${preChargeHtml}</div>`;
    document.getElementById("homeRangeLine").innerHTML = rangeHtml;

    if (inputs.additionalJourneys.length > 0) {
        publicMilesHtml = `<p style="opacity: 0.5; font-size: 0.8rem; margin: 0px"><strong>PAYG miles:</strong></p>
            <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey 1 PAYG miles: ${journey1PublicMiles.toFixed(0)} miles
            </div>`;

        additionalPublicMiles.forEach((m, index) => {
            publicMilesHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey ${index + 2} PAYG miles: ${m.toFixed(0)} miles
            </div>`;
        });

        publicMilesHtml += `<p style="border-bottom: 1px solid rgba(255,255,255,0.2); margin:0; padding-bottom: 10px;">
            <span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the total number of miles requiring PAYG charging.</span></span></span>Total PAYG charging miles required: ${totalPublicMiles.toFixed(0)} miles</p>`;
    } else {
        publicMilesHtml = `<p style="margin: 0px;"><span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is how many miles require PAYG charging.</span></span></span>PAYG charging miles needed: <strong>${journey1PublicMiles.toFixed(0)} miles</strong></p>`;
    }

    document.getElementById("publicMilesLine").innerHTML = publicMilesHtml;

    if (inputs.additionalJourneys.length > 0) {
        breakoutHtml = `<p style="opacity: 0.5; font-size: 0.8rem; margin: 0px"><strong>PAYG mileage costs:</strong></p>
            <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">Journey 1 PAYG kWh: ${j1Kwh.toFixed(1)} kWh</div>`;

        additionalKwh.forEach((k, index) => {
            breakoutHtml += `<div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">Journey ${index + 2} PAYG kWh: ${k.toFixed(1)} kWh</div>`;
        });

        breakoutHtml += `
            <p style="border-bottom: 1px solid rgba(255,255,255,0.2); margin:0; padding-bottom: 10px;">
                <span class="tooltip-container">
                    <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡
                        <span class="tooltip-box">
                            This is the total cost of energy needed from PAYG chargers.
                        </span>
                    </span>
                </span>
                Total PAYG mileage cost (${breakoutKwh.toFixed(1)} kWh x ${inputs.adhoc}p): 
                <strong>£${(breakoutKwh * (inputs.adhoc / 100)).toFixed(2)}</strong>
            </p>
        `;
    } else {
        breakoutHtml = `<p style="margin: 0px;"><span class="tooltip-container"><span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">💡<span class="tooltip-box">This is the cost of energy needed from PAYG charging.</span></span></span>PAYG battery charge (${j1Kwh.toFixed(1)} kWh x ${inputs.adhoc}p): <strong>£${(j1Kwh * (inputs.adhoc / 100)).toFixed(2)}</strong></p>`;
    }

    document.getElementById("publicKwhLine").innerHTML = breakoutHtml;

    const paygJourneyCount = 1 + inputs.additionalJourneys.length;
    const paygTotalMiles = inputs.journeyMiles + inputs.additionalJourneys.reduce((sum, j) => sum + j.miles, 0);

    let paygIntro = "";

    if (paygJourneyCount === 1) {
        paygIntro = `Total PAYG cost for a ${inputs.journeyMiles}-mile journey (precharge + public charging):`;
    } else {
        paygIntro = `Total PAYG cost for ${paygJourneyCount} journeys totalling ${paygTotalMiles} miles (precharge + on-the-go charges):`;
    }

    document.getElementById("adhocCostLine").innerHTML =
        `<p style="margin: 0px; font-size: 1.2rem">
            ${paygIntro} <strong>£${totalAdhocCost.toFixed(2)}</strong>
        </p>`;
}

function renderProviderResults(providers, inputs, paygData) {
    let html = `<div class="mobile-only-text" style="font-size: 0.8em; text-align: center; color: var(--neon-green)">Slide table left to view hidden columns.</div><div class="results-scroll"><table><thead><tr>
        <th>Provider (click hyperlink to view subscription info)</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the provider's subscription fee.</span></span></span>Sub. Fee</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the provider's discounted charge rate.</span></span></span>Disc. Rate</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the expected total charging cost.</span></span></span>Journey Cost</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">This is the amount saved or lost vs PAYG.</span></span></span>vs. PAYG</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">Break-even miles.</span></span></span>Break-Even Miles</th>
        <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡<span class="tooltip-box">Break-even miles + battery.</span></span></span>Break Even + Battery</th>
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
        if (!el._ftScrollBound) {
            el._ftScrollBound = true;
            el.addEventListener("scroll", () => {
                if (typeof _ftActive !== 'undefined' && _ftActive) _ftHide();
            }, { passive: true });
        }
    });
}

function renderItinerary(itineraryData) {
    const { allJourneys, itineraryRowsArray } = itineraryData;
    const inputs = getInputs();

    const assessmentBoxHTML = buildTabbedItinerary(
        allJourneys,
        itineraryRowsArray,
        inputs.rechargeAt
    );

    const conclusionsBox = document.getElementById("conclusionsBox");
    conclusionsBox.innerHTML += assessmentBoxHTML;
}

function renderChargingDurations(durationData) {
    const inputs = getInputs();
    const { publicKwh } = durationData;

    const maxChargingSpeed = inputs.maxChargingSpeed;
    const formatChargingTime = (timeHours) => {
        if (timeHours < 1) {
            const minutes = Math.round(timeHours * 60);
            return `${minutes} mins`;
        } else {
            const hours = Math.floor(timeHours);
            const minutes = Math.round((timeHours - hours) * 60);
            if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
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
                    <span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">A comparison of estimated total journey charge durations.</span></span>
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

    const locationDisclaimer = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8;">Note: Charging durations exclude the initial ramp-up phase.</p>`;

    const conclusionsBox = document.getElementById("conclusionsBox");
    conclusionsBox.innerHTML += speedTableHtml + locationDisclaimer;
}

function renderConclusions(inputs, providers, paygData, itineraryData) {
    const conclusionsBox = document.getElementById("conclusionsBox");
    conclusionsBox.innerHTML = "";

    if (providers.length === 0) return;

    const bestProvider = providers[0];
    const minSpeedSelect = document.getElementById("minSpeed");
    const minSpeedLabel = minSpeedSelect.options[minSpeedSelect.selectedIndex].text;

    const journeyCount = 1 + inputs.additionalJourneys.length;
    const totalMiles = inputs.journeyMiles + inputs.additionalJourneys.reduce((sum, j) => sum + j.miles, 0);

    let journeyIntro = journeyCount === 1
        ? `For a journey of <strong>${inputs.journeyMiles} miles</strong>`
        : `For ${journeyCount} journeys totalling <strong>${totalMiles} miles</strong>`;

    let conclusionHTML = `<div class="conclusion-white-border guide-section" id="payg-vs-subscription">`;

    const extraNote = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8; color:var(--neon-green) !important;">Note: Before purchasing a subscription, check that your chosen provider has charging stations in your planned area.</p>`;

    if (bestProvider.savings > 0) {
        conclusionHTML += `<h3>3. PAYG vs Subscription Conclusion</h3><p class="main-result">${journeyIntro}, a one-month subscription with <strong>${bestProvider.name}</strong> works out cheaper than PAYG. The total journey cost will be <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>, saving <strong>£${bestProvider.savings.toFixed(2)}</strong>.</p>${extraNote}`;
    } else {
        conclusionHTML += `<h3>3. PAYG vs SUBSCRIPTION CONCLUSION</h3><p class="main-result">${journeyIntro}, a <strong>${inputs.adhoc}p PAYG rate</strong> is cheaper than the cheapest subscription. Total PAYG cost: <strong>£${paygData.totalAdhocCost.toFixed(2)}</strong>.</p>${extraNote}`;
    }

    conclusionHTML += `</div>`;
    conclusionsBox.innerHTML += conclusionHTML;
}

function renderContentsBox(inputs) {
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
}

function calculate() {
    updateUiVisibility();

    const inputs = getInputs();
    if (!validateInputs(inputs)) return;

    if (isBreakEvenMode()) {
        const beData = computeBreakEven(inputs);
        renderBreakEven(beData);
        document.getElementById("results").style.display = "block";
        document.getElementById("resultsHeader").style.display = "flex";
        document.getElementById("shareBtn").style.display = "inline-block";
        document.getElementById("pdfBtn").style.display = "inline-block";
        document.getElementById("toc").style.display = "block";
        return;
    }

    const paygData = computePaygSummary(inputs);
    renderPaygSummary(paygData);

    const providers = computeProviderResults(inputs, paygData);
    renderProviderResults(providers, inputs, paygData);

    const itineraryData = computeItinerary(inputs);
    renderItinerary(itineraryData);

    const publicKwh = paygData.breakoutKwh;
    const durationData = computeChargingDurations(inputs, publicKwh);
    renderChargingDurations(durationData);

    renderConclusions(inputs, providers, paygData, itineraryData);
    renderContentsBox(inputs);

    drawGraph(inputs, providers);

    saveProvidersToCookie();
    setCookie("ev_trip_values", inputs);

    document.getElementById("results").style.display = "block";
    document.getElementById("resultsHeader").style.display = "flex";
    document.getElementById("shareBtn").style.display = "inline-block";
    document.getElementById("pdfBtn").style.display = "inline-block";
    document.getElementById("toc").style.display = "block";
}
