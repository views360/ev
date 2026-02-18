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

    if (isNaN(miles) || isNaN(battery) || isNaN(soc) || isNaN(efficiency) || isNaN(adhocRate)) {
        document.getElementById("results").style.display = "none";
        return;
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
    document.getElementById("adhocCostLine").innerHTML = `Total cost (Standard Ad-hoc @ ${adhocRate}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

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

        const journeyCost = publicKwh * (rate / 100);
        const totalJourneyCost = subCost + startChargeCost + journeyCost;
        const savings = totalAdhocCost - totalJourneyCost;

        providers.push({ id, name, subCost, rate, totalJourneyCost, savings });
    });

    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    else if (sortVal === "az") providers.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortVal === "za") providers.sort((a, b) => b.name.localeCompare(a.name));

    const resultsContainer = document.getElementById("providerResults");
    let html = `<table><thead><tr><th>Provider</th><th>Sub. Fee</th><th>Rate</th><th>Trip Cost</th><th>vs. Ad-hoc</th></tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        html += `<tr class="${rowClass}"><td>${p.name}</td><td>£${p.subCost.toFixed(2)}</td><td>${p.rate}p</td><td>£${p.totalJourneyCost.toFixed(2)}</td><td>${p.savings > 0 ? 'Save £' : 'Cost £'}${Math.abs(p.savings).toFixed(2)}</td></tr>`;
    });
    html += `</tbody></table>`;
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

    const speedTableHtml = `<div class="speed-comparison-container"><table class="mini-table"><thead><tr><th>Speed</th><th>Est. Charge Time</th></tr></thead><tbody><tr><td>7kW (AC)</td><td>${(publicKwh/7).toFixed(1)}h</td></tr><tr><td>50kW (Rapid)</td><td>${((publicKwh/50)*60).toFixed(0)}m</td></tr><tr><td>150kW+ (Ultra)</td><td>${((publicKwh/150)*60).toFixed(0)}m</td></tr></tbody></table></div>`;
    const locationDisclaimer = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8;">* Times exclude the "80-100%" charging slowdown. Also, you will need to ensure that this provider has charging stations in your planned area of travel.</p>`;
    
    let conclusionHTML = "";
    if (bestProvider.savings > 0) {
        conclusionHTML += `<div class="conclusion-card good"><p class="main-result"><strong>${bestProvider.name}</strong> is cheapest at the selected minimum charging rate of <strong>${minSpeedLabel}</strong> (saving <strong>£${bestProvider.savings.toFixed(2)}</strong>).</p>${timeLine}${speedTableHtml}${locationDisclaimer}</div>`;
    } else {
        conclusionHTML += `<div class="conclusion-card bad"><p class="main-result"><strong>Ad-hoc charging</strong> is cheapest at the selected minimum charging rate of <strong>${minSpeedLabel}</strong>.</p>${timeLine}${speedTableHtml}${locationDisclaimer}</div>`;
    }

    conclusionsBox.innerHTML = conclusionHTML;
    drawGraph(core, providers);
}