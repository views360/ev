// uiState.js
// Extracted from the top section of your original calculate().
// No logic changed. Only reorganised into a reusable helper.

import { PRESETS } from '../state.js';

export function updateUIState() {

    const providersContainer = document.getElementById("providers");
    const collapseBtn = document.getElementById("toggleProvidersBtn");
    const clearBtn = document.querySelector('button[onclick="clearSavedProviders()"]');
    const hiddenMsg = document.getElementById("providersHiddenMsg");

    const hasProviders = providersContainer &&
        providersContainer.querySelectorAll(".provider-box").length > 0;

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
        "adhoc", "startChargeRate", "maxChargingSpeed",
        "efficiencyBE", "adhocBE", "rechargeAt"
    ];

    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const val = parseFloat(el.value);
        if (!el.value || isNaN(val) || val <= 0) {
            el.classList.add('empty-pulse');
        } else {
            el.classList.remove('empty-pulse');
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

    document.querySelectorAll(".provider-box input[type='number'], .provider-box input[type='text']")
        .forEach(input => {
            if (!input.value || input.value === "0") {
                input.classList.add('empty-pulse');
            } else {
                input.classList.remove('empty-pulse');
            }
        });

    return {
        isTripMode,
        conclusionsBox,
        uiPreText,
        uiResults,
        resultsHeader,
        sortContainer,
        hasProviders
    };
}