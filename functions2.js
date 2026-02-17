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
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;
        
        // Retrieve selected speed for the analysis text
        const speedSelect = document.getElementById(`speed${id}`);
        const speedText = (speedSelect && speedSelect.offsetParent !== null) ? `${speedSelect.value}kW` : "standard speed";

        const journeyCost = publicKwh * (rate / 100);
        const totalJourneyCost = subCost + startChargeCost + journeyCost;
        const savings = totalAdhocCost - totalJourneyCost;

        providers.push({ id, name, subCost, rate, totalJourneyCost, savings, speedText });
    });

    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    else if (sortVal === "az") providers.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortVal === "za") providers.sort((a, b) => b.name.localeCompare(a.name));

    const resultsContainer = document.getElementById("providerResults");
    let html = `<table><thead><tr><th>Provider</th><th>Sub. Fee</th><th>Rate</th><th>Trip Cost</th><th>vs. Ad-hoc</th></tr></thead><tbody>`;
    providers.forEach(p => {
        const rowClass = p.savings > 0 ? "good" : (p.savings < 0 ? "bad" : "");
        const diffText = p.savings > 0 ? `-£${p.savings.toFixed(2)}` : `+£${Math.abs(p.savings).toFixed(2)}`;
        html += `<tr class="${rowClass}"><td>${p.name}</td><td>£${p.subCost.toFixed(2)}</td><td>${p.rate}p</td><td>£${p.totalJourneyCost.toFixed(2)}</td><td><strong>${diffText}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    resultsContainer.innerHTML = html;

    const conclusionsBox = document.getElementById("conclusionsBox");
    const summaryBox = document.getElementById("summaryBox");
    const core = { journeyMiles: miles, homeMiles: initialRange, efficiency: efficiency, startChargeCost: startChargeCost, adhocRate: adhocRate };

    if (providers.length === 0) {
        conclusionsBox.innerHTML = "";
        summaryBox.style.display = "none";
        drawGraph(core, []);
        return;
    }

    const bestProvider = [...providers].sort((a, b) => a.totalJourneyCost - b.totalJourneyCost)[0];
    
    // REDUNDANCY FIX: Hide the summaryBox entirely
    summaryBox.style.display = "none";
    summaryBox.textContent = "";

    let conclusionHTML = `<h3 style="font-size:1rem; margin-top:20px;">Analysis</h3>`;

    if (bestProvider.totalJourneyCost < totalAdhocCost) {
        conclusionHTML += `
            <div class="conclusion-card good">
                <p class="main-result"><strong>${bestProvider.name}</strong> is cheapest for a <strong>${miles}-mile trip</strong> charging at <strong>${bestProvider.speedText}</strong> (saving <strong>£${bestProvider.savings.toFixed(2)}</strong> vs Ad‑hoc).</p>
                <p class="secondary-result">Total cost including subscription: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>
            </div>`;
    } else {
        conclusionHTML += `
            <div class="conclusion-card bad">
                <p class="main-result">Standard <strong>Ad‑hoc charging</strong> is the most cost‑effective choice for this trip.</p>
                <p class="secondary-result">At <strong>${miles} miles</strong>, subscription savings do not cover the monthly fee.</p>
            </div>`;
    }

    conclusionsBox.innerHTML = conclusionHTML;
    drawGraph(core, providers);
}