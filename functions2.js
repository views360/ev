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
    document.getElementById("preChargeLine").innerHTML = `Pre-journey charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (£${startChargeCost.toFixed(2)})`;
    document.getElementById("homeRangeLine").innerHTML = `Range from start charge: <strong>${initialRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `Public charging miles needed: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `Public charging energy needed: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total cost (Standard Ad-hoc @ ${adhocRate}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

    // -------------------------------
    // PROVIDER CALCULATIONS
    // -------------------------------
    const providers = [];
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;

        const journeyCost = publicKwh * (rate / 100);
        const totalJourneyCost = subCost + startChargeCost + journeyCost;
        const savings = totalAdhocCost - totalJourneyCost;

        providers.push({
            id,
            name,
            subCost,
            rate,
            totalJourneyCost,
            savings
        });
    });

    // Sort results
    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") {
        providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    } else if (sortVal === "az") {
        providers.sort((a, b) => a.name.localeCompare(name));
    } else if (sortVal === "za") {
        providers.sort((a, b) => b.name.localeCompare(a.name));
    }

    // Render Table
    const resultsContainer = document.getElementById("providerResults");
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Provider</th>
                    <th>Sub. Fee</th>
                    <th>Rate</th>
                    <th>Trip Cost</th>
                    <th>vs. Ad-hoc</th>
                </tr>
            </thead>
            <tbody>
    `;

    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const diffText = p.savings > 0 ? `-£${p.savings.toFixed(2)}` : `+£${Math.abs(p.savings).toFixed(2)}`;
        
        html += `
            <tr class="${rowClass}">
                <td>${p.name}</td>
                <td>£${p.subCost.toFixed(2)}</td>
                <td>${p.rate}p</td>
                <td>£${p.totalJourneyCost.toFixed(2)}</td>
                <td><strong>${diffText}</strong></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    resultsContainer.innerHTML = html;

    // -------------------------------
    // CONCLUSIONS & ANALYSIS
    // -------------------------------
    const conclusionsBox = document.getElementById("conclusionsBox");
    const summaryBox = document.getElementById("summaryBox");
    
    const core = {
        journeyMiles: miles,
        homeMiles: initialRange,
        efficiency: efficiency,
        startChargeCost: startChargeCost,
        adhocRate: adhocRate
    };

    if (providers.length === 0) {
        conclusionsBox.innerHTML = "";
        summaryBox.style.display = "none";
        drawGraph(core, []);
        return;
    }

    const bestProvider = [...providers].sort((a, b) => a.totalJourneyCost - b.totalJourneyCost)[0];
    
    // Ensure Line 4 (summaryBox) is hidden
    summaryBox.style.display = "none";

    // Primary Charging Time Calc
    const totalHoursDecimal = publicKwh / minSpeed;
    let hrs = Math.floor(totalHoursDecimal);
    let mins = Math.round((totalHoursDecimal % 1) * 60);
    if (mins === 60) { hrs++; mins = 0; }
    
    const timeLine = `<p class="secondary-result">Total hours charging at <strong>${minSpeed}kW</strong>: <strong>${hrs} hours and ${mins} minutes</strong>.</p>`;

    // Public Charging Speed Comparison Table
    const comparisonSpeeds = [7, 11, 22, 50, 150];
    let comparisonRows = "";
    comparisonSpeeds.forEach(speed => {
        const hDecimal = publicKwh / speed;
        let h = Math.floor(hDecimal);
        let m = Math.round((hDecimal % 1) * 60);
        if (m === 60) { h++; m = 0; }
        
        const isSelected = speed === minSpeed ? 'style="color: var(--accent); font-weight: bold;"' : "";
        comparisonRows += `<tr ${isSelected}><td>${speed}kW</td><td>${h} hours and ${m} minutes</td></tr>`;
    });

    const speedTableHtml = `
        <div class="speed-comparison-container">
            <p><strong>Public Charging Time Comparison</strong> (for the ${publicKwh.toFixed(1)} kWh needed):</p>
            <table class="mini-table">
                <thead>
                    <tr>
                        <th>Speed</th>
                        <th>Time Required</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparisonRows}
                </tbody>
            </table>
        </div>
    `;
    
    let conclusionHTML = `<h3>Analysis</h3>`;
    const locationDisclaimer = `<p class="disclaimer">Note: A subscription will only save money if the provider has charging stations where you plan to travel. Also, the above timings do not take into account the slowdown between 80% and 100% charge.</p>`;

    // Logic to handle subscription-specific text
    const hasSub = bestProvider.subCost > 0;
    const subTextLine2 = hasSub 
        ? `Total cost including subscription: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.`
        : `Total journey cost: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.`;

    const badLuckTextLine
