// payg.js
// Extracted from your original calculate() PAYG logic.
// No logic changed. Only reorganised into a reusable helper.

export function calculatePayg(inputs, validation) {

    // -------------------------------
    // 1. RANGE AND PUBLIC CHARGING CALCULATIONS
    // -------------------------------

    const mainInitialRange =
        ((inputs.soc - inputs.rechargeAt) / 100) *
        inputs.batteryKwh *
        inputs.efficiency;

    let totalInitialRange = mainInitialRange;

    let rangeHtml = "";
    const paygSubtitle = document.getElementById("paygSummarySubtitle");

    if (inputs.additionalJourneys.length > 0) {
        paygSubtitle.textContent =
            `Here is the key information for your journeys if you choose PAYG.`;

        rangeHtml =
            `<p style="opacity: 0.5; margin: 0px; font-size: 0.8rem"><strong>Pre-charged battery range:</strong></p>`;

        rangeHtml += `
            <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey 1 range: ${mainInitialRange.toFixed(0)} miles
            </div>`;

        inputs.additionalJourneys.forEach((j, index) => {
            const extraRange =
                Math.max(0,
                    ((j.soc - inputs.rechargeAt) / 100) *
                    inputs.batteryKwh *
                    inputs.efficiency
                );

            totalInitialRange += extraRange;

            rangeHtml += `
                <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                    Journey ${index + 2} range: ${extraRange.toFixed(0)} miles
                </div>`;
        });

        rangeHtml += `
            <p style="border-bottom: 1px solid rgba(255,255,255,0.2); margin: 0; padding-bottom: 10px;">
                <span class="tooltip-container">
                    <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">
                        💡<span class="tooltip-box">
                            This is the range you <i>should</i> expect from pre-charging at your start/departure location(s) from your recharge threshold of ${inputs.rechargeAt}% to your specified departure SOC for each journey.
                        </span>
                    </span>
                </span>
                Total pre-charged battery range for all journeys: ${totalInitialRange.toFixed(0)} miles
            </p>`;
    } else {
        paygSubtitle.textContent =
            `Here is the key information for your journey if you choose PAYG.`;

        rangeHtml = `
            <p style="margin: 0px">
                <span class="tooltip-container">
                    <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">
                        💡<span class="tooltip-box">
                            This is the initial range you should expect for each journey based on pre-charging at your start/departure location.
                        </span>
                    </span>
                </span>
                Pre-charged battery range: <strong>${mainInitialRange.toFixed(0)} miles</strong>
            </p>`;
    }

    // -------------------------------
    // 2. PRE-CHARGE COSTS
    // -------------------------------

    const mainTopUpKwh =
        Math.max(0, ((inputs.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh);

    const mainTopUpCost = mainTopUpKwh * (inputs.startChargeRate / 100);

    let totalPreJourneyCost = mainTopUpCost;

    let preChargeHtml = "";

    if (inputs.additionalJourneys.length > 0) {

        preChargeHtml =
            `<p style="opacity: 0.5; font-size: 0.8rem; margin: 0px"><strong>Pre-charge battery costs:</strong></p>`;

        preChargeHtml += `
            <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey 1 pre-charge cost (${inputs.rechargeAt}%→${inputs.soc}%, ${mainTopUpKwh.toFixed(1)} kWh x ${inputs.startChargeRate}p):
                £${mainTopUpCost.toFixed(2)}
            </div>`;

        inputs.additionalJourneys.forEach((j, index) => {
            const extraKwh =
                Math.max(0, ((j.soc - inputs.rechargeAt) / 100) * inputs.batteryKwh);

            const extraCost = extraKwh * (j.rate / 100);
            totalPreJourneyCost += extraCost;

            preChargeHtml += `
                <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                    Journey ${index + 2} pre-charge cost (${inputs.rechargeAt}%→${j.soc}%, ${extraKwh.toFixed(1)} kWh x ${j.rate}p):
                    £${extraCost.toFixed(2)}
                </div>`;
        });

        preChargeHtml += `
            <p style="margin: 0px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">
                <span class="tooltip-container">
                    <span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">
                        💡<span class="tooltip-box">
                            This is the combined cost for pre-charging your battery before each journey.
                        </span>
                    </span>
                </span>
                Total battery pre-charge cost for all journeys: £${totalPreJourneyCost.toFixed(2)}
            </p>`;
    } else {

        preChargeHtml = `
            <p style="margin: 0px;">
                <span class="tooltip-container">
                    <span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">
                        💡<span class="tooltip-box">
                            This is the cost of pre-charging your battery at your start/departure location.
                        </span>
                    </span>
                </span>
                Pre-journey battery charge (${inputs.rechargeAt}%→${inputs.soc}%, ${mainTopUpKwh.toFixed(1)} kWh x ${inputs.startChargeRate}p):
                <strong>£${mainTopUpCost.toFixed(2)}</strong>
            </p>`;
    }

    document.getElementById("preChargeLine").innerHTML =
        `<div class="guide-section" id="payg-summary">${preChargeHtml}</div>`;

    // -------------------------------
    // 3. PAYG MILES
    // -------------------------------

    let totalPublicMiles = 0;
    let publicMilesHtml = "";

    const journey1PublicMiles =
        Math.max(0, inputs.journeyMiles - mainInitialRange);

    totalPublicMiles += journey1PublicMiles;

    if (inputs.additionalJourneys.length > 0) {

        publicMilesHtml =
            `<p style="opacity: 0.5; font-size: 0.8rem; margin: 0px"><strong>PAYG miles:</strong></p>`;

        publicMilesHtml += `
            <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey 1 PAYG miles: ${journey1PublicMiles.toFixed(0)} miles
            </div>`;

        inputs.additionalJourneys.forEach((j, index) => {
            const extraRange =
                Math.max(0,
                    ((j.soc - inputs.rechargeAt) / 100) *
                    inputs.batteryKwh *
                    inputs.efficiency
                );

            const extraPublicMiles =
                Math.max(0, j.miles - extraRange);

            totalPublicMiles += extraPublicMiles;

            publicMilesHtml += `
                <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                    Journey ${index + 2} PAYG miles: ${extraPublicMiles.toFixed(0)} miles
                </div>`;
        });

        publicMilesHtml += `
            <p style="border-bottom: 1px solid rgba(255,255,255,0.2); margin:0; padding-bottom: 10px;">
                <span class="tooltip-container">
                    <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">
                        💡<span class="tooltip-box">
                            This is the total number of miles of your combined journey distance that will need to be paid for with PAYG charging.
                        </span>
                    </span>
                </span>
                Total PAYG charging miles required: ${totalPublicMiles.toFixed(0)} miles
            </p>`;
    } else {

        publicMilesHtml = `
            <p style="margin: 0px;">
                <span class="tooltip-container">
                    <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">
                        💡<span class="tooltip-box">
                            This is how many miles of your journey will need to be paid for with PAYG charging.
                        </span>
                    </span>
                </span>
                PAYG charging miles needed:
                <strong>${journey1PublicMiles.toFixed(0)} miles</strong>
            </p>`;
    }

    document.getElementById("publicMilesLine").innerHTML = publicMilesHtml;
    document.getElementById("homeRangeLine").innerHTML = rangeHtml;

    // -------------------------------
    // 4. PAYG kWh + COST
    // -------------------------------

    let breakoutKwh = 0;
    let breakoutHtml = "";

    const j1Kwh = journey1PublicMiles / inputs.efficiency;
    breakoutKwh += j1Kwh;

    if (inputs.additionalJourneys.length > 0) {

        breakoutHtml =
            `<p style="opacity: 0.5; font-size: 0.8rem; margin: 0px"><strong>PAYG mileage costs:</strong></p>`;

        breakoutHtml += `
            <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                Journey 1 PAYG kWh: ${j1Kwh.toFixed(1)} kWh
            </div>`;

        inputs.additionalJourneys.forEach((j, index) => {
            const extraRange =
                Math.max(0,
                    ((j.soc - inputs.rechargeAt) / 100) *
                    inputs.batteryKwh *
                    inputs.efficiency
                );

            const extraKwh =
                Math.max(0, j.miles - extraRange) / inputs.efficiency;

            breakoutKwh += extraKwh;

            breakoutHtml += `
                <div style="font-size: 0.8rem; opacity: 0.5; margin-bottom: 2px; margin-left: 10px;">
                    Journey ${index + 2} PAYG kWh: ${extraKwh.toFixed(1)} kWh
                </div>`;
        });

        const totalPaygKwhCost = breakoutKwh * (inputs.adhoc / 100);

        breakoutHtml += `
            <p style="border-bottom: 1px solid rgba(255,255,255,0.2); margin:0; padding-bottom: 10px;">
                <span class="tooltip-container">
                    <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">
                        💡<span class="tooltip-box">
                            This is the total cost of energy needed from PAYG chargers across all journeys.
                        </span>
                    </span>
                </span>
                Total PAYG mileage cost (${breakoutKwh.toFixed(1)} kWh x ${inputs.adhoc}p):
                <strong>£${totalPaygKwhCost.toFixed(2)}</strong>
            </p>`;
    } else {

        breakoutHtml = `
            <p style="margin: 0px;">
                <span class="tooltip-container">
                    <span class="info-icon" style="font-size:0.8rem" onclick="toggleTooltip(this)">
                        💡<span class="tooltip-box">
                            This is the cost of energy needed from PAYG charging to complete this journey.
                        </span>
                    </span>
                </span>
                PAYG battery charge (${j1Kwh.toFixed(1)} kWh x ${inputs.adhoc}p):
                <strong>£${(j1Kwh * (inputs.adhoc / 100)).toFixed(2)}</strong>
            </p>`;
    }

    document.getElementById("publicKwhLine").innerHTML = breakoutHtml;

    const publicKwh = breakoutKwh;
    const totalAdhocCost =
        totalPreJourneyCost + (publicKwh * (inputs.adhoc / 100));

    const paygJourneyCount = 1 + inputs.additionalJourneys.length;
    const paygTotalMiles =
        inputs.journeyMiles +
        inputs.additionalJourneys.reduce((sum, j) => sum + j.miles, 0);

    let paygIntro = "";

    if (paygJourneyCount === 1) {
        paygIntro =
            `Total PAYG cost for a ${inputs.journeyMiles}-mile journey (pre-charge + public charging):`;
    } else {
        paygIntro =
            `Total PAYG cost for ${paygJourneyCount} journeys totalling ${paygTotalMiles} miles (pre-charge + public charging):`;
    }

    document.getElementById("adhocCostLine").innerHTML = `
        <p style="margin: 0px; font-size: 1.2rem">
            ${paygIntro} <strong>£${totalAdhocCost.toFixed(2)}</strong>
        </p>`;

    // -------------------------------
    // RETURN STRUCTURED PAYG DATA
    // -------------------------------

    return {
        mainInitialRange,
        totalInitialRange,
        totalPreJourneyCost,
        totalPublicMiles,
        publicKwh,
        totalAdhocCost,
        rangeHtml,
        publicMilesHtml,
        breakoutHtml
    };
}