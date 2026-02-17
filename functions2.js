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

    const providers = [];
    document.querySelectorAll(".provider-box").forEach(box => {
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

    let html = `<table><thead><tr><th>Provider</th><th>Sub. Fee</th><th>Rate</th><th>Trip Cost</th><th>vs. Ad-hoc</th></tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const diffText = p.savings > 0 ? `-£${p.savings.toFixed(2)}` : `+£${Math.abs(p.savings).toFixed(2)}`;
        html += `<tr class="${rowClass}"><td>${p.name}</td><td>£${p.subCost.toFixed(2)}</td><td>${p.rate}p</td><td>£${p.totalJourneyCost.toFixed(2)}</td><td><strong>${diffText}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById("providerResults").innerHTML = html;

    const conclusionsBox = document.getElementById("conclusionsBox");
    const core = { journeyMiles: miles, homeMiles: initialRange, efficiency, startChargeCost, adhocRate };

    if (providers.length === 0) {
        conclusionsBox.innerHTML = "";
        drawGraph(core, []);
        return;
    }

    const bestProvider = [...providers].sort((a, b) => a.totalJourneyCost - b.totalJourneyCost)[0];
    const totalHoursDecimal = publicKwh / minSpeed;
    let hrs = Math.floor(totalHoursDecimal);
    let mins = Math.round((totalHoursDecimal % 1) * 60);
    if (mins === 60) { hrs++; mins = 0; }
    const timeLine = `<p class="secondary-result">Total hours charging at <strong>${minSpeed}kW</strong>: <strong>${hrs}h ${mins}m</strong>.</p>`;

    let conclusionHTML = `<h3>Analysis</h3>`;
    if (bestProvider.totalJourneyCost < totalAdhocCost) {
        // FIXED: Conditional text for subscription cost
        const subText = bestProvider.subCost > 0 ? "including subscription" : "at ad-hoc rates";
        conclusionHTML += `
            <div class="conclusion-card good">
                <p class="main-result"><strong>${bestProvider.name}</strong> is cheapest (saving <strong>£${bestProvider.savings.toFixed(2)}</strong>).</p>
                <p class="secondary-result">Total cost ${subText}: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>
                ${timeLine}
            </div>`;
    } else {
        conclusionHTML += `<div class="conclusion-card bad"><p class="main-result">Ad‑hoc charging is best.</p></div>`;
    }
    conclusionsBox.innerHTML = conclusionHTML;
    drawGraph(core, providers);
}
