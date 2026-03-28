// itinerary.js
// Extracted from your original functions.js

export function buildStopsRowsForJourney(journeyMiles, startSoc, rechargeAt, efficiency, batteryKwh) {
    let rows = "";
    let stop = 1;
    let distanceDriven = 0;
    let currentSoc = startSoc;

    const chargeToPercent = 80;
    const kwhFullCharge = ((chargeToPercent - rechargeAt) / 100) * batteryKwh;
    const maxRangeFromFullCharge = kwhFullCharge * efficiency;

    const preChargedRange = ((startSoc - rechargeAt) / 100) * batteryKwh * efficiency;

    rows += `
        <tr>
            <td style="padding: 10px; border: 1px solid var(--border);">0</td>
            <td style="padding: 10px; border: 1px solid var(--border);">Begin journey</td>
            <td style="padding: 10px; border: 1px solid var(--border);">0 miles</td>
            <td style="padding: 10px; border: 1px solid var(--border);">
                Depart with ${startSoc}% battery
            </td>
            <td style="padding: 10px; border: 1px solid var(--border);">–</td>
        </tr>
    `;

    if (journeyMiles <= preChargedRange) {
        const kwhUsed = journeyMiles / efficiency;
        const percentUsed = (kwhUsed / batteryKwh) * 100;

        let arrivalSoc = startSoc - percentUsed;
        arrivalSoc = Math.max(rechargeAt, Math.min(100, Math.max(0, arrivalSoc)));

        rows += `
            <tr>
                <td style="padding: 10px; border: 1px solid var(--border);">${stop}</td>
                <td style="padding: 10px; border: 1px solid var(--border);">Finish journey</td>
                <td style="padding: 10px; border: 1px solid var(--border);">${journeyMiles} miles</td>
                <td style="padding: 10px; border: 1px solid var(--border);">
                    Arrive with ${arrivalSoc.toFixed(0)}% battery
                </td>
                <td style="padding: 10px; border: 1px solid var(--border);">–</td>
            </tr>
        `;
        return rows;
    }

    while (true) {
        const rangeOnCurrentCharge = ((currentSoc - rechargeAt) / 100) * batteryKwh * efficiency;

        if (distanceDriven + rangeOnCurrentCharge >= journeyMiles) {
            break;
        }

        const mileMarkAtRecharge = distanceDriven + rangeOnCurrentCharge;
        const remainingMiles = journeyMiles - mileMarkAtRecharge;

        if (remainingMiles <= maxRangeFromFullCharge) {
            const requiredKwh = remainingMiles / efficiency;
            const requiredPercent = rechargeAt + (requiredKwh / batteryKwh) * 100;
            const durationMins = Math.round((requiredKwh / 50) * 60);

            rows += `
                <tr>
                    <td style="padding: 10px; border: 1px solid var(--border);">${stop}</td>
                    <td style="padding: 10px; border: 1px solid var(--border);">Final public charge</td>
                    <td style="padding: 10px; border: 1px solid var(--border);">${Math.round(mileMarkAtRecharge)} miles</td>
                    <td style="padding: 10px; border: 1px solid var(--border);">
                        Recharge from ${rechargeAt}%→${requiredPercent.toFixed(0)}%, ${requiredKwh.toFixed(1)} kWh
                    </td>
                    <td style="padding: 10px; border: 1px solid var(--border);">${durationMins} mins</td>
                </tr>
            `;
            stop++;
            break;
        }

        const durationMins = Math.round((kwhFullCharge / 50) * 60);
        const eventLabel = stop === 1 ? "First public charge" : "Public charge";

        rows += `
            <tr>
                <td style="padding: 10px; border: 1px solid var(--border);">${stop}</td>
                <td style="padding: 10px; border: 1px solid var(--border);">${eventLabel}</td>
                <td style="padding: 10px; border: 1px solid var(--border);">${Math.round(mileMarkAtRecharge)} miles</td>
                <td style="padding: 10px; border: 1px solid var(--border);">
                    Recharge from ${rechargeAt}%→${chargeToPercent}%, ${kwhFullCharge.toFixed(1)} kWh
                </td>
                <td style="padding: 10px; border: 1px solid var(--border);">${durationMins} mins</td>
            </tr>
        `;

        distanceDriven = mileMarkAtRecharge;
        currentSoc = chargeToPercent;
        stop++;
    }

    rows += `
        <tr>
            <td style="padding: 10px; border: 1px solid var(--border);">${stop}</td>
            <td style="padding: 10px; border: 1px solid var(--border);">Finish journey</td>
            <td style="padding: 10px; border: 1px solid var(--border);">${journeyMiles} miles</td>
            <td style="padding: 10px; border: 1px solid var(--border);">
                Arrive with ${rechargeAt}% battery
            </td>
            <td style="padding: 10px; border: 1px solid var(--border);">–</td>
        </tr>
    `;

    return rows;
}

export function buildTabbedItinerary(journeys, itineraryRowsArray, rechargethreshold) {
    let tabs = '';
    let contents = '';

    journeys.forEach((j, index) => {
        const active = index === 0 ? 'active' : '';
        tabs += `<div class="itinerary-tab-btn ${active}" onclick="selectItineraryTab(${index})">Journey ${index + 1}</div>`;

        contents += `
            <div class="itinerary-tab-panel" id="itinerary-panel-${index}" style="display:${index === 0 ? 'block' : 'none'};">
                ${buildItineraryTable(itineraryRowsArray[index], rechargethreshold)}
            </div>
        `;
    });

    return `
        <div class="conclusion-white-border guide-section" id="real-world-assessment">
            <h3>5. Real-World Charging Itinerary</h3>

            <div id="itineraryTabs">
                <div class="itinerary-tab-buttons">${tabs}</div>
                <div class="itinerary-tab-content">${contents}</div>
            </div>

            <p class="itinerary-note">Note: the final charge is calculated so you will reach your destination at the specified journey recharge threshold.</p>
        </div>
    `;
}

export function selectItineraryTab(index) {
    document.querySelectorAll('.itinerary-tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });

    document.querySelectorAll('.itinerary-tab-panel').forEach((panel, i) => {
        panel.style.display = i === index ? 'block' : 'none';
    });
}