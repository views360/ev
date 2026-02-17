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
    document.getElementById("results").style.display = "block";
    document.getElementById("preChargeLine").innerHTML = `Start Charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (£${startChargeCost.toFixed(2)})`;
    document.getElementById("homeRangeLine").innerHTML = `Range from Start Charge: <strong>${initialRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `Public Miles Needed: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `Public Energy Needed: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total Ad-hoc Trip Cost: <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

    // -------------------------------
    // CORE DATA OBJECT for Graphing
    // -------------------------------
    const core = {
        journeyMiles: miles,
        homeMiles: initialRange, // Added this
        efficiency: efficiency,
        adhocRate: adhocRate,
        minSpeed: minSpeed,      // Added this
        startChargeCost: startChargeCost,
        totalAdhocCost: totalAdhocCost
    };

    // -------------------------------
    // PROVIDER CALCULATIONS
    // -------------------------------
    const providers = [];
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value;
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value);
        const rate = parseFloat(document.getElementById(`rate${id}`).value);

        if (!isNaN(subCost) && !isNaN(rate)) {
            const totalCost = subCost + startChargeCost + (publicKwh * (rate / 100));
            const savings = totalAdhocCost - totalCost;
            providers.push({ name, subCost, rate, totalJourneyCost: totalCost, savings });
        }
    });

    // Sort Results
    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    else if (sortVal === "az") providers.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortVal === "za") providers.sort((a, b) => b.name.localeCompare(a.name));

    // Render HTML Results
    let resultsHTML = "";
    providers.forEach(p => {
        const color = getProviderColor(p.name);
        const savingText = p.savings >= 0 
            ? `<span style="color:#22c55e">Saves £${p.savings.toFixed(2)}</span>`
            : `<span style="color:#f87171">Costs £${Math.abs(p.savings).toFixed(2)} more</span>`;

        resultsHTML += `
            <div class="provider-result" style="border-left: 4px solid ${color}">
                <div><strong>${p.name}</strong></div>
                <div>Total: £${p.totalJourneyCost.toFixed(2)} (${savingText})</div>
            </div>
        `;
    });
    document.getElementById("providerResults").innerHTML = resultsHTML;

    // Summary & Conclusions
    const summaryBox = document.getElementById("summaryBox");
    const conclusionsBox = document.getElementById("conclusionsBox");
    if (providers.length === 0) {
        summaryBox.style.display = "none";
        conclusionsBox.innerHTML = "";
        drawGraph(core, []);
        return;
    }

    summaryBox.style.display = "block";
    const bestProvider = providers[0];
    let conclusionHTML = `<h3>Analysis</h3>`;
    
    const locationDisclaimer = `<p class="disclaimer">Note: Cost is only one factor—a subscription only saves money if you can actually use their network.</p>`;

    if (bestProvider.totalJourneyCost < totalAdhocCost) {
        summaryBox.className = "summary good";
        summaryBox.textContent = `${bestProvider.name} is cheapest for this trip (saves £${bestProvider.savings.toFixed(2)} vs Ad‑hoc).`;
        conclusionHTML += `
            <div class="conclusion-card good">
                <p>For a trip of <strong>${miles} miles</strong>, taking a subscription with <strong>${bestProvider.name}</strong> is the most cost‑effective option.</p>
                <p>Total cost including subscription: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>
            </div>
        `;
    } else {
        summaryBox.className = "summary bad";
        summaryBox.textContent = `Ad‑hoc charging is cheaper for this specific trip distance.`;
        conclusionHTML += `
            <div class="conclusion-card bad">
                <p>Standard <strong>Ad‑hoc charging</strong> is the most cost‑effective choice for this trip.</p>
                <p>At ${miles} miles, subscription savings do not cover the monthly fee.</p>
            </div>
        `;
    }

    conclusionHTML += locationDisclaimer;
    conclusionsBox.innerHTML = conclusionHTML;

    // -------------------------------
    // DRAW GRAPH
    // -------------------------------
    drawGraph(core, providers);
}
