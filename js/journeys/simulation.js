// simulation.js
// Extracted from inside calculate() with no logic changes

export function simulateTripWithProvider(providerRate, batteryKwh, rechargethreshold, efficiency, journeyMiles, initialSoc) {
    const chargeToPercent = 80;
    const kwhPerCharge = ((chargeToPercent - rechargethreshold) / 100) * batteryKwh;

    let distanceDriven = 0;
    let publicChargeCost = 0;
    let chargeCount = 0;
    let currentSoc = initialSoc;

    while (distanceDriven < journeyMiles) {
        const rangeOnCurrentCharge = ((currentSoc - rechargethreshold) / 100) * batteryKwh * efficiency;

        if (distanceDriven + rangeOnCurrentCharge >= journeyMiles) break;

        distanceDriven += rangeOnCurrentCharge;
        chargeCount++;

        const remainingDistance = journeyMiles - distanceDriven;
        const kwhNeededForFinal = (remainingDistance / efficiency);

        if (kwhNeededForFinal <= kwhPerCharge) {
            publicChargeCost += kwhNeededForFinal * (providerRate / 100);
            break;
        } else {
            publicChargeCost += kwhPerCharge * (providerRate / 100);
            currentSoc = chargeToPercent;
        }
    }

    return publicChargeCost;
}