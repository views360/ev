// inputs.js
// Extracted exactly from your original functions.js

export function getInputs() {
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