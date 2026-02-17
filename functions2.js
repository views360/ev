// ===============================
// functions2.js
// Core Calculation Engine
// ===============================

function calculate() {
    const miles = parseFloat(document.getElementById("journeyMiles").value);
    const battery = parseFloat(document.getElementById("batteryKwh").value);
    const soc = parseFloat(document.getElementById("soc").value);
    const efficiency = parseFloat(document.getElementById("efficiency").value);
    const adhocRate = parseFloat(document.getElementById("adhoc").value);
    const startRate = parseFloat(document.getElementById("startChargeRate").value);
    const minSpeed = parseFloat(document.getElementById("minSpeed").value);

    // If any required fields are missing, hide results
    if (isNaN(miles) || isNaN(battery) || isNaN(soc) || isNaN(efficiency) || isNaN(adhocRate)) {
        document.getElementById("results").style.display = "none";
        return;
    }

    // -------------------------------
    // BASIC CALCULATIONS
    // -------------------------------
    const startChargeKwh = (soc / 100) * battery;
    const startChargeCost = startChargeKwh * (startRate / 100);
    const initialRange = startChargeKwh * efficiency;

    const publicMiles = Math.max(0, miles - initialRange);
    const publicKwh = publicMiles / efficiency;

    const totalAdhocCost = startChargeCost + (publicKwh * (adhocRate / 100));

    // Update UI lines
    document.getElementById("preChargeLine").innerHTML = `Pre-journey charge (${soc}%): <strong>${startChargeKwh.toFixed(1)} kWh</strong> costing <strong>£${startChargeCost.toFixed(2)}</strong>`;
    document.getElementById("homeRangeLine").innerHTML = `Estimated range from pre-charge: <strong>${initialRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `Remaining journey distance: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `Public charging required: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Standard Ad-hoc cost (@ ${adhocRate}p): <strong>£${(publicKwh * (adhocRate / 100)).toFixed(2)}</strong>`;

    // -------------------------------
    // PROVIDER CALCULATIONS
    // -------------------------------
    const boxes = document.querySelectorAll(".provider-box");
    const providers = [];

    boxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || `Provider ${id}`;
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;

        const journeyCost = publicKwh * (rate / 100);
        const totalJourneyCost = subCost + startChargeCost + journeyCost;
        const savings = totalAdhocCost - totalJourneyCost;

        providers.push({ id, name, subCost, rate, totalJourneyCost, savings });
    });

    // Sort
    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") {
        providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    } else if (sortVal === "az") {
        providers.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortVal === "za") {
        providers.sort((a, b) => b.name.localeCompare(a.name));
    }

    // Render Table
    let tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>Provider</th>
                    <th>Sub.</th>
                    <th>Rate</th>
                    <th>Trip Cost</th>
                    <th>vs Ad-hoc</th>
                </tr>
            </thead>
            <tbody>
    `;

    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const savingsText = p.savings >= 0 ? `£${p.savings.toFixed(2)} saving` : `£${Math.abs(p.savings).toFixed(2)} extra`;
        
        tableHtml += `
            <tr class="${rowClass}">
                <td><strong>${p.name}</strong></td>
                <td>£${p.subCost.toFixed(2)}</td>
                <td>${p.rate}p</td>
                <td>£${p.totalJourneyCost.toFixed(2)}</td>
                <td>${savingsText}</td>
            </tr>
        `;
    });
    tableHtml += `</tbody></table>`;

    document.getElementById("providerResults").innerHTML = tableHtml;
    document.getElementById("results").style.display = "block";

    // -------------------------------
    // ANALYSIS & CONCLUSIONS
    // -------------------------------
    const bestProvider = [...providers].sort((a, b) => a.totalJourneyCost - b.totalJourneyCost)[0];
    const conclusionsBox = document.getElementById("conclusionsBox");

    const core = { journeyMiles: miles, homeMiles: initialRange, efficiency, startChargeCost, adhocRate };

    // Speed comparison logic (mini-table)
    const speedTableHtml = `
        <div class="speed-comparison-container">
            <p><strong>Cost at different speeds (Ad-hoc):</strong></p>
            <table class="mini-table">
                <tr><td>Slow/Fast (7-22kW)</td><td>£${(startChargeCost + (publicKwh * 0.45)).toFixed(2)}</td></tr>
                <tr><td>Rapid (50kW)</td><td>£${(startChargeCost + (publicKwh * 0.59)).toFixed(2)}</td></tr>
                <tr><td>Ultra-Rapid (150kW+)</td><td>£${(startChargeCost + (publicKwh * 0.69)).toFixed(2)}</td></tr>
            </table>
        </div>
    `;

    const timeLine = `<p class="time-stat">Total cost for this trip: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong></p>`;
    
    let conclusionHTML = `<h3>Analysis</h3>`;
    const locationDisclaimer = `<p class="disclaimer">Note: A subscription will only save money if the provider has charging stations where you plan to travel.</p>`;

    if (bestProvider.savings > 0) {
        conclusionHTML += `
            <div class="conclusion-card good">
                <p class="main-result"><strong>${bestProvider.name}</strong> is cheapest for a <strong>${miles}-mile trip charging at ${minSpeed}kW</strong> (saving <strong>£${bestProvider.savings.toFixed(2)}</strong> vs Ad‑hoc).</p>
                <p class="secondary-result">Total cost including subscription: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>
                ${timeLine}
                ${speedTableHtml}
                ${locationDisclaimer}
            </div>
        `;
    } else {
        // IMPROVED LOGIC: Removed redundant subscription saving mention
        conclusionHTML += `
            <div class="conclusion-card bad">
                <p class="main-result">Standard <strong>Ad‑hoc charging</strong> is the most cost‑effective choice for this trip at <strong>${minSpeed}kW</strong>.</p>
                <p class="secondary-result">At <strong>${miles} miles</strong>, the monthly subscription fees exceed the per-kWh savings for this journey.</p>
                ${timeLine}
                ${speedTableHtml}
                ${locationDisclaimer}
            </div>
        `;
    }

    conclusionsBox.innerHTML = conclusionHTML;
    drawGraph(core, providers);
}
