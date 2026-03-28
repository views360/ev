// render.js
// Extracted from your original calculate() rendering logic.
// No logic changed. Only reorganised into a reusable helper.

import { drawGraph } from '../graph.js';

export function renderResults(inputs, payg, providers, realWorld, validation) {

    const {
        totalAdhocCost,
        publicKwh
    } = payg;

    const {
        assessmentBoxHTML
    } = realWorld;

    const conclusionsBox = document.getElementById("conclusionsBox");

    if (providers.length === 0) {
        conclusionsBox.innerHTML = "";
        return;
    }

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

    const maxChargingTimeHours =
        maxChargingSpeed > 0 ? publicKwh / maxChargingSpeed : 0;

    const maxChargingTimeFormatted =
        formatChargingTime(maxChargingTimeHours);

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

    if (maxChargingSpeed > 0 &&
        !speedsToDisplay.some(s => Math.abs(s.speed - maxChargingSpeed) < 0.01)) {

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
        const highlightStyle =
            isMaxSpeed ? 'font-weight:bold; color:#4A9EFF;' : '';

        tableRows += `
            <tr style="${highlightStyle}">
                <td>${speedObj.speed}kW</td>
                <td>${speedObj.type}</td>
                <td>${speedObj.descriptor}</td>
                <td>${timeFormatted}</td>
            </tr>`;
    });

    const speedTableHtml = `
        <div class="speed-comparison-container" style="width: fit-content; max-width: 100%; margin: 0;">
            <p style="font-size: 0.85rem; margin-bottom: 10px;">
                <span class="tooltip-container">
                    <span class="info-icon" onclick="toggleTooltip(this)">
                        💡<span class="tooltip-box">
                            A comparison of estimated total journey charge durations at various speeds.
                        </span>
                    </span>
                </span>
                <strong>Estimated Total Public Charging Duration Required</strong>
            </p>
            <table class="mini-table">
                <thead>
                    <tr>
                        <th>Charging Speed</th>
                        <th>Type</th>
                        <th>Descriptor</th>
                        <th>Journey Charging Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>`;

    // -------------------------------
    // CONTENTS BOX
    // -------------------------------

    const contentsHTML = `
        <div id="toc" class="conclusion-white-border">
            <h3>RESULTS CONTENTS</h3>
            <ul style="margin:0; padding-left:20px; font-size:0.95rem;">
                <li><a href="#payg-summary" style="color: var(--accent); text-decoration:none;">
                    1. PAYG Summary (Based on ${inputs.adhoc}p/kWh)
                </a></li>
                <li><a href="#providerResults" style="color: var(--accent); text-decoration:none;">
                    2. Providers &amp; Subscriptions
                </a></li>
                <li><a href="#payg-vs-subscription" style="color: var(--accent); text-decoration:none;">
                    3. PAYG vs Subscription Conclusion
                </a></li>
                <li><a href="#charging-times-section" style="color: var(--accent); text-decoration:none;">
                    4. Charging Durations
                </a></li>
                <li><a href="#real-world-assessment" style="color: var(--accent); text-decoration:none;">
                    5. Real-World Charging Itinerary
                </a></li>
                <li><a href="#graph-section" style="color: var(--accent); text-decoration:none;">
                    6. Subscriptions Break-Even Graph
                </a></li>
            </ul>
        </div>`;

    document.getElementById("contentsBox").innerHTML = contentsHTML;

    // -------------------------------
    // PAYG VS SUBSCRIPTION CONCLUSION
    // -------------------------------

    let conclusionHTML = "";
    const extraNote = `
        <p style="font-size:0.85rem; margin-top:12px; opacity:0.8; color:var(--neon-green) !important;">
            Note: Before purchasing a subscription, check that your chosen provider has charging stations in your planned area of travel.
        </p>`;

    conclusionHTML += `
        <div class="conclusion-white-border guide-section" id="payg-vs-subscription">`;

    const journeyCount = 1 + inputs.additionalJourneys.length;
    const totalMiles =
        inputs.journeyMiles +
        inputs.additionalJourneys.reduce((sum, j) => sum + j.miles, 0);

    let journeyIntro = "";

    if (journeyCount === 1) {
        journeyIntro = `For a journey of <strong>${inputs.journeyMiles} miles</strong>`;
    } else {
        journeyIntro = `For ${journeyCount} journeys totalling <strong>${totalMiles} miles</strong>`;
    }

    if (bestProvider.savings > 0) {

        conclusionHTML += `
            <h3>3. PAYG vs Subscription Conclusion</h3>
            <p class="main-result">
                ${journeyIntro}, a one-month subscription with
                <strong>${bestProvider.name}</strong> works out cheaper than PAYG.
                The total journey cost will be
                <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>,
                which represents a saving of
                <strong>£${bestProvider.savings.toFixed(2)}</strong>.
            </p>
            ${extraNote}`;

    } else {

        conclusionHTML += `
            <h3>3. PAYG vs SUBSCRIPTION CONCLUSION</h3>
            <p class="main-result">
                ${journeyIntro}, a <strong>${inputs.adhoc}p PAYG rate</strong>
                is cheaper than the cheapest subscription.
                The total journey cost based on PAYG will be
                <strong>£${totalAdhocCost.toFixed(2)}</strong>.
            </p>
            ${extraNote}`;
    }

    conclusionHTML += `</div>`;

    // -------------------------------
    // CHARGING DURATIONS SECTION
    // -------------------------------

    conclusionHTML += `
        <div class="conclusion-white-border guide-section" id="charging-times-section">
            <h3>4. Charging Durations</h3>`;

    const durationJourneyCount = journeyCount;
    const durationTotalMiles = totalMiles;

    let durationIntro = "";

    if (durationJourneyCount === 1) {
        durationIntro = `Your proposed <strong>${inputs.journeyMiles}-mile</strong> journey`;
    } else {
        durationIntro =
            `Your ${durationJourneyCount} proposed journeys totalling <strong>${durationTotalMiles} miles</strong>`;
    }

    if (maxChargingSpeed > 0) {

        conclusionHTML += `
            <p class="main-result">
                ${durationIntro} will require
                <strong>${publicKwh.toFixed(1)} kWh</strong> of public charging.
                At your maximum supported charge speed of
                <strong>${maxChargingSpeed} kW</strong>,
                total recharging duration will be approximately
                <strong>${maxChargingTimeFormatted}</strong>.
            </p>
            ${speedTableHtml}`;

    } else {

        conclusionHTML += `
            <p class="main-result">
                Enter your vehicle's <strong>Max. Charging Speed</strong>
                above to see estimated charging durations.
            </p>`;
    }

    const locationDisclaimer = `
        <p style="font-size:0.85rem; margin-top:12px; opacity:0.8;">
            Note: Charging durations exclude the initial ramp-up phase.
        </p>`;

    conclusionHTML += `${locationDisclaimer}</div>`;

    // -------------------------------
    // REAL-WORLD ITINERARY
    // -------------------------------

    conclusionHTML += assessmentBoxHTML;

    conclusionsBox.innerHTML = conclusionHTML;

    // -------------------------------
    // GRAPH
    // -------------------------------

    drawGraph(inputs, providers);
}