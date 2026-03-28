// validate.js
// Extracted from your original calculate() validation logic.
// No logic changed. Only reorganised into a reusable helper.

import { PRESETS } from '../state.js';

export function validateInputs(inputs, ui) {

    const {
        isTripMode,
        uiPreText,
        uiResults,
        resultsHeader,
        hasProviders
    } = ui;

    const uiShare = document.getElementById("shareBtn");
    const uiPdf = document.getElementById("pdfBtn");
    const toc = document.getElementById("toc");

    // -------------------------------
    // BREAK-EVEN MODE VALIDATION
    // -------------------------------
    if (!isTripMode) {

        const efficiency = parseFloat(document.getElementById("efficiencyBE").value);
        const adhocRate = parseFloat(document.getElementById("adhocBE").value) || 0;
        const minSpeedSelection = parseFloat(document.getElementById("minSpeedBE").value) || 0;

        if (isNaN(efficiency) || efficiency <= 0 || isNaN(adhocRate) || adhocRate <= 0) {
            uiPreText.innerHTML =
                "Please attend to all flashing green fields, or use the navigation tabs at the top to switch between BREAK EVEN and COST REDUCTION calcuation types.";
            uiPreText.style.display = "block";
            uiResults.style.display = "none";
            return { shouldContinue: false, mode: "break-even" };
        }

        // Break-even mode passes validation → continue into break-even calculations
        return {
            shouldContinue: true,
            mode: "break-even",
            minSpeedSelection,
            efficiency,
            adhocRate
        };
    }

    // -------------------------------
    // TRIP MODE VALIDATION
    // -------------------------------

    const tripIncomplete =
        inputs.journeyMiles <= 0 ||
        inputs.batteryKwh <= 0 ||
        inputs.soc <= 0 ||
        inputs.efficiency <= 0 ||
        inputs.adhoc <= 0 ||
        !document.getElementById("rechargeAt").value ||
        inputs.maxChargingSpeed <= 0 ||
        inputs.startChargeRate <= 0;

    if (tripIncomplete) {
        uiPreText.innerHTML =
            "Please attend to all flashing green fields, or use the navigation tabs at the top to switch between BREAK EVEN and COST REDUCTION calcuation types.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (resultsHeader) resultsHeader.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        if (toc) toc.style.display = "none";
        return { shouldContinue: false, mode: "trip" };
    }

    if (!hasProviders) {
        uiPreText.innerHTML =
            "Before you may view the results, you must select at least one provider from the list of providers (above). It is simplest to add <i>all</i> providers.";
        uiPreText.style.display = "block";
        uiResults.style.display = "none";
        if (toc) toc.style.display = "none";
        if (resultsHeader) resultsHeader.style.display = "none";
        if (uiShare) uiShare.style.display = "none";
        if (uiPdf) uiPdf.style.display = "none";
        return { shouldContinue: false, mode: "trip" };
    }

    // Trip mode passes validation → continue into PAYG + subscription calculations
    uiPreText.style.display = "none";
    uiResults.style.display = "block";
    if (toc) toc.style.display = "block";
    if (uiShare) uiShare.style.display = "";
    if (uiPdf) uiPdf.style.display = "";
    document.querySelector(".calc-lines").style.display = "block";
    document.querySelector(".chart-wrapper").style.display = "block";

    return {
        shouldContinue: true,
        mode: "trip"
    };
}