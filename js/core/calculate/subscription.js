// subscription.js
// Extracted from your original calculate() subscription/provider logic.
// No logic changed. Only reorganised into a reusable helper.

import { PRESETS } from '../state.js';
import { simulateTripWithProvider } from '../../journeys/simulation.js';

export function calculateSubscriptions(inputs, payg, validation) {

    const {
        totalPreJourneyCost,
        mainInitialRange,
        totalAdhocCost,
        publicKwh
    } = payg;

    const providerBoxes = document.querySelectorAll(".provider-box");
    const providers = [];

    providerBoxes.forEach(box => {

        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;

        // Break-even miles
        const savingPerKwh = (inputs.adhoc - rate) / 100;
        let breakEvenMiles = 0;

        if (savingPerKwh > 0) {
            const kwhNeeded = subCost / savingPerKwh;
            breakEvenMiles = kwhNeeded * inputs.efficiency;
        }

        // Public charging cost simulation
        let publicChargingCost = 0;

        // Journey 1
        publicChargingCost += simulateTripWithProvider(
            rate,
            inputs.batteryKwh,
            inputs.rechargeAt,
            inputs.efficiency,
            inputs.journeyMiles,
            inputs.soc
        );

        // Additional journeys
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

        const totalJourneyCost = subCost + totalPreJourneyCost + publicChargingCost;

        const pData = PRESETS.find(p =>
            p.name === document.getElementById(`preset${id}`).value
        );

        providers.push({
            name,
            subCost,
            rate,
            totalJourneyCost,
            breakEvenMiles,
            totalWithBattery: breakEvenMiles + mainInitialRange,
            savings: totalAdhocCost - totalJourneyCost,
            url: pData?.subscription?.url,
            comments: pData?.subscription?.comments || ""
        });
    });

    // -------------------------------
    // SORTING
    // -------------------------------

    const sortVal = document.getElementById("sortResults").value;

    providers.sort((a, b) => {

        if (sortVal === "cheapest")
            return a.totalJourneyCost - b.totalJourneyCost;

        if (sortVal === "breakeven") {
            const aNever = a.rate >= inputs.adhoc;
            const bNever = b.rate >= inputs.adhoc;

            if (aNever && !bNever) return 1;
            if (!aNever && bNever) return -1;

            return a.breakEvenMiles - b.breakEvenMiles;
        }

        if (sortVal === "az")
            return a.name.localeCompare(b.name);

        if (sortVal === "za")
            return b.name.localeCompare(a.name);

        return 0;
    });

    // -------------------------------
    // PROVIDER RESULTS TABLE HTML
    // -------------------------------

    let html = `
        <div class="mobile-only-text" style="font-size: 0.8em; text-align: center; color: var(--neon-green)">
            Slide table left to view hidden columns.
        </div>
        <div class="results-scroll">
        <table>
        <thead>
        <tr>
            <th>Provider (click hyperlink to view subscription info)</th>
            <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡
                <span class="tooltip-box">This is the provider's subscription fee, which gives you access to their discounted charge rate for ONE MONTH.</span>
            </span></span>Sub. Fee</th>

            <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡
                <span class="tooltip-box">This is the provider's discounted charge rate (per kWh) that is available after subscribing for an entire month.</span>
            </span></span>Disc. Rate</th>

            <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡
                <span class="tooltip-box">This is the expected <strong>total charging cost</strong> of your journey using this provider.</span>
            </span></span>Journey Cost</th>

            <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡
                <span class="tooltip-box">This is the amount by which the discounted charge rate will either be cheaper or more expensive than PAYG.</span>
            </span></span>vs. PAYG</th>

            <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡
                <span class="tooltip-box">Miles needed to pay off the subscription fee.</span>
            </span></span>Break-Even Miles</th>

            <th><span class="tooltip-container"><span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡
                <span class="tooltip-box">Break-even miles PLUS initial battery range.</span>
            </span></span>Break Even + Battery</th>
        </tr>
        </thead>
        <tbody>`;

    providers.forEach(p => {

        const rowClass =
            p.savings > 0 ? "good" :
            p.savings < 0 ? "bad" : "";

        const providerLink = p.url
            ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>`
            : p.name;

        const breakEvenText =
            p.rate < inputs.adhoc
                ? `${p.breakEvenMiles.toFixed(0)} miles`
                : "Never";

        const totalMilesText =
            p.rate < inputs.adhoc
                ? `${p.totalWithBattery.toFixed(0)} miles`
                : "N/A";

        html += `
            <tr class="${rowClass}">
                <td>
                    <span class="tooltip-container">
                        <span class="info-icon" onclick="toggleTooltip(this)" style="font-size: 0.8rem;">💡
                            <span class="tooltip-box">${p.comments}</span>
                        </span>
                    </span>
                    ${providerLink}
                </td>
                <td>£${p.subCost.toFixed(2)}</td>
                <td>${p.rate.toFixed(1)}p</td>
                <td><strong>£${p.totalJourneyCost.toFixed(2)}</strong></td>
                <td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td>
                <td><strong>${breakEvenText}</strong></td>
                <td><strong>${totalMilesText}</strong></td>
            </tr>`;
    });

    document.getElementById("providerResults").innerHTML =
        html + `</tbody></table></div>`;

    document.querySelectorAll(".results-scroll").forEach(el => {
        if (!el._ftScrollBound) {
            el._ftScrollBound = true;
            el.addEventListener("scroll", () => {
                if (typeof _ftActive !== 'undefined' && _ftActive) _ftHide();
            }, { passive: true });
        }
    });

    return providers;
}