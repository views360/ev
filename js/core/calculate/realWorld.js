// realWorld.js
// Extracted from your original calculate() real-world charging simulation.
// No logic changed. Only reorganised into a reusable helper.

import { formatChargingTimeDetailed } from '../../utils/formatting.js';
import { buildStopsRowsForJourney, buildTabbedItinerary } from '../../journeys/itinerary.js';

export function simulateRealWorldJourney(inputs, payg, providers, validation) {

    // -------------------------------
    // REAL-WORLD CHARGING SIMULATION
    // -------------------------------

    const chargeSpeed = inputs.maxChargingSpeed || 101;
    const rechargethreshold = inputs.rechargeAt;
    const chargeToPercent = 80;

    const kwhPerPublicCharge =
        ((chargeToPercent - rechargethreshold) / 100) * inputs.batteryKwh;

    const rangePerPublicCharge =
        kwhPerPublicCharge * inputs.efficiency;

    const startingRangeOnPreCharge =
        ((inputs.soc - rechargethreshold) / 100) *
        inputs.batteryKwh *
        inputs.efficiency;

    let stopsRows = '';
    let stopCount = 0;
    let distanceDriven = 0;
    let currentChargePercent = inputs.soc;

    while (distanceDriven < inputs.journeyMiles) {

        const rangeOnCurrentCharge =
            ((currentChargePercent - rechargethreshold) / 100) *
            inputs.batteryKwh *
            inputs.efficiency;

        if (distanceDriven + rangeOnCurrentCharge >= inputs.journeyMiles) {
            break;
        }

        distanceDriven += rangeOnCurrentCharge;
        stopCount++;

        const remainingDistance = inputs.journeyMiles - distanceDriven;
        const kwhNeededToReachHome = remainingDistance / inputs.efficiency;

        if (kwhNeededToReachHome <= kwhPerPublicCharge) {

            const chargeTimeHours = kwhNeededToReachHome / chargeSpeed;
            const chargeTimeFormatted = formatChargingTimeDetailed(chargeTimeHours);
            const chargePercent = Math.ceil((kwhNeededToReachHome / inputs.batteryKwh) * 100);

            stopsRows += `
                <tr>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${stopCount}</td>
                    <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">
                        Final public charge (when battery reaches ${rechargethreshold}%)
                    </td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">
                        ${distanceDriven.toFixed(0)}
                    </td>
                    <td style="padding: 10px; border: 1px solid var(--border);">
                        Add ${chargePercent}% / ${kwhNeededToReachHome.toFixed(1)}kWh
                    </td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">
                        ${chargeTimeFormatted}
                    </td>
                </tr>`;

            break;

        } else {

            const chargeTimeHours = kwhPerPublicCharge / chargeSpeed;
            const chargeTimeFormatted = formatChargingTimeDetailed(chargeTimeHours);

            stopsRows += `
                <tr>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">${stopCount}</td>
                    <td style="padding: 10px; border: 1px solid var(--border); color: var(--muted);">
                        Public charge (when battery reaches ${rechargethreshold}%)
                    </td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">
                        ${distanceDriven.toFixed(0)}
                    </td>
                    <td style="padding: 10px; border: 1px solid var(--border);">
                        Add ${(chargeToPercent - rechargethreshold).toFixed(0)}% / ${kwhPerPublicCharge.toFixed(1)}kWh
                    </td>
                    <td style="padding: 10px; border: 1px solid var(--border); text-align: center;">
                        ${chargeTimeFormatted}
                    </td>
                </tr>`;

            currentChargePercent = chargeToPercent;
        }
    }

    // -------------------------------
    // BUILD UNIFIED JOURNEY LIST
    // -------------------------------

    const allJourneys = [
        {
            miles: inputs.journeyMiles,
            soc: inputs.soc,
            rate: inputs.startChargeRate
        },
        ...inputs.additionalJourneys
    ];

    const itineraryRowsArray = allJourneys.map((j, idx) => {
        return buildStopsRowsForJourney(
            j.miles,
            j.soc,
            inputs.rechargeAt,
            inputs.efficiency,
            inputs.batteryKwh
        );
    });

    const assessmentBoxHTML =
        buildTabbedItinerary(allJourneys, itineraryRowsArray, inputs.rechargeAt);

    return {
        stopsRows,
        stopCount,
        distanceDriven,
        assessmentBoxHTML
    };
}