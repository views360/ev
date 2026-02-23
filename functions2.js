// ===============================
// functions2.js
// Core Calculation Engine
// ===============================

function calculate() {
    const providerBoxes = document.querySelectorAll(".provider-box");
    const preConclusionsText = document.getElementById("preConclusionsText");
    const miles = parseFloat(document.getElementById("journeyMiles").value);
    const battery = parseFloat(document.getElementById("batteryKwh").value);
    const soc = parseFloat(document.getElementById("soc").value);
    const efficiency = parseFloat(document.getElementById("efficiency").value);
    const adhocRate = parseFloat(document.getElementById("adhoc").value);
    const startRate = parseFloat(document.getElementById("startChargeRate").value);

    if (isNaN(miles) || isNaN(battery) || isNaN(soc) || isNaN(efficiency) || isNaN(adhocRate)) {
        document.getElementById("results").style.display = "none";
        return;
    }

    // Logic to hide/show preConclusionsText based on provider count
    if (providerBoxes.length > 0) {
        if (preConclusionsText) preConclusionsText.style.display = "none";
    } else {
        if (preConclusionsText) preConclusionsText.style.display = "block";
    }

    const startChargeKwh = (soc / 100) * battery;
    const startChargeCost = startChargeKwh * (startRate / 100);
    const initialRange = startChargeKwh * efficiency;

    const publicMiles = Math.max(0, miles - initialRange);
    const publicKwh = publicMiles / efficiency;

    const totalAdhocCost = startChargeCost + (publicKwh * (adhocRate / 100));

    document.getElementById("results").style.display = "block";
    document.getElementById("preChargeLine").innerHTML = `Pre-journey charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (£${startChargeCost.toFixed(2)})`;
    document.getElementById("homeRangeLine").innerHTML = `Range from start charge: <strong>${initialRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `Public charging miles needed: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `Public charging energy needed: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total cost (Standard PAYG @ ${adhocRate}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

    const core = {
        journeyMiles: miles,
        efficiency: efficiency,
        startChargeCost: startChargeCost,
        homeRange: initialRange,
        adhocRate: adhocRate
    };

    const providers = [];
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;
        
        // Break-even logic
        let breakEvenPublicMiles = null;
        let breakEvenTotalMiles = null;
        
        if (rate < adhocRate) {
            const savingsPerKwh = (adhocRate - rate) / 100;
            const kwhNeededToBreakEven = subCost / savingsPerKwh;
            breakEvenPublicMiles = kwhNeededToBreakEven * efficiency;
            breakEvenTotalMiles = breakEvenPublicMiles + initialRange;
        }

        const journeyCost = publicKwh * (rate / 100);
        const totalJourneyCost = subCost + startChargeCost + journeyCost;
        const savings = totalAdhocCost - totalJourneyCost;

        // Find preset for URL and Comments
        const presetName = document.getElementById(`preset${id}`).value;
        const pData = PRESETS.find(p => p.name === presetName);
        const url = pData && pData.subscription ? pData.subscription.url : null;
        const comments = pData && pData.subscription ? pData.subscription.comments : "";

        providers.push({ 
            id, name, subCost, rate, totalJourneyCost, savings, 
            breakEvenPublicMiles, breakEvenTotalMiles, url, comments 
        });
    });

    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    else if (sortVal === "az") providers.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortVal === "za") providers.sort((a, b) => b.name.localeCompare(a.name));

    const resultsContainer = document.getElementById("providerResults");
    let html = `<div class="results-scroll"><table><thead><tr><th>Provider (click provider link for subscription details)</th><th>Sub. Fee</th><th>Rate</th><th>Trip Cost</th><th>vs. PAYG</th><th>Break-even (public/total)</th></tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        let displayName = p.url ? `<a href="${p.url}" target="_blank" style="color:inherit; text-decoration:underline;">${p.name}</a>` : p.name;
        
        // Append comments if available
        if (p.comments && p.comments.trim() !== "") {
            displayName += `<div style="font-size: 0.75rem; opacity: 0.8; margin-top: 4px; font-style: italic;">${p.comments}</div>`;
        }
        
        let breakEvenText = "N/A";
        if (p.breakEvenPublicMiles !== null) {
            breakEvenText = `${p.breakEvenPublicMiles.toFixed(0)} / ${p.breakEvenTotalMiles.toFixed(0)} mi`;
        }

        html += `<tr class="${rowClass}">
                    <td>${displayName}</td>
                    <td>£${p.subCost.toFixed(2)}</td>
                    <td>${p.rate.toFixed(1)}p</td>
                    <td>£${p.totalJourneyCost.toFixed(2)}</td>
                    <td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td>
                    <td style="font-size: 0.85rem;">${breakEvenText}</td>
                 </tr>`;
    });
    html += `</tbody></table></div>`;
    resultsContainer.innerHTML = html;

    const conclusionsBox = document.getElementById("conclusionsBox");
    if (providers.length === 0) {
        conclusionsBox.innerHTML = "";
        drawGraph(core, []);
        return;
    }

    const bestProvider = providers[0];
    const timeLine = `Approx driving time (at 60mph): <strong>${(miles/60).toFixed(1)} hours</strong>.`;
    
    const minSpeedSelect = document.getElementById("minSpeed");
    const minSpeedLabel = minSpeedSelect.options[minSpeedSelect.selectedIndex].text;

    const speedTableHtml = `
        <div class="speed-comparison-container">
            <table class="mini-table">
                <thead>
                    <tr><th>Speed</th><th>Est. Charge Time</th></tr>
                </thead>
                <tbody>
                    <tr><td>7kW (fast)</td><td>${(publicKwh/7).toFixed(1)}h</td></tr>
                    <tr><td>22kW (accelerated)</td><td>${(publicKwh/22).toFixed(1)}h</td></tr>
                    <tr><td>50kW (rapid)</td><td>${((publicKwh/50)*60).toFixed(0)}m</td></tr>
                    <tr><td>75kW (ultra rapid)</td><td>${((publicKwh/75)*60).toFixed(0)}m</td></tr>
                    <tr><td>150kW (high power)</td><td>${((publicKwh/150)*60).toFixed(0)}m</td></tr>
                </tbody>
            </table>
        </div>`;
    const locationDisclaimer = `<p style="font-size:1rem; margin-top:12px; opacity:0.8;"><strong>Important</strong><ul><li>You must ensure that your chosen provider has charging stations in your planned area of travel.</li><li>Suggested timings are illustrative only. If your motor's maximum charging power is lower than the selected charger, timing charges will be affected accordingly. Also, timings exclude the "80-100%" charging slowdown.</li></ul></p>`;
    
    let conclusionHTML = "";
    if (bestProvider.savings > 0) {
        conclusionHTML += `<div class="conclusion-card good"><p class="main-result"><strong>${bestProvider.name}</strong> is cheapest at the selected minimum charging rate of <strong>${minSpeedLabel}</strong> (saving <strong>£${bestProvider.savings.toFixed(2)}</strong>).</p>${timeLine}${speedTableHtml}${locationDisclaimer}</div>`;
    } else {
        conclusionHTML += `<div class="conclusion-card bad"><p class="main-result"><strong>PAYG charging</strong> is cheapest at the selected minimum charging rate of <strong>${minSpeedLabel}</strong>.</p>${timeLine}${speedTableHtml}${locationDisclaimer}</div>`;
    }

    conclusionsBox.innerHTML = conclusionHTML;
    drawGraph(core, providers);


}
