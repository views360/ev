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
    document.getElementById("publicMilesLine").innerHTML = `Remaining journey: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `Public charging required: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Cost at your usual public rate (${adhocRate}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

    const providerData = [];
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;

        const totalCost = subCost + startChargeCost + (publicKwh * (rate / 100));
        const savings = totalAdhocCost - totalCost;

        providerData.push({ id, name, subCost, rate, totalCost, savings });
    });

    const sortType = document.getElementById("sortResults").value;
    if (sortType === "cheapest") providerData.sort((a, b) => a.totalCost - b.totalCost);
    else if (sortType === "az") providerData.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortType === "za") providerData.sort((a, b) => b.name.localeCompare(a.name));

    let html = "";
    providerData.forEach(p => {
        const savingsClass = p.savings >= 0 ? "savings-positive" : "savings-negative";
        html += `
            <div class="result-row">
                <div class="result-main">
                    <span class="result-name">${p.name}</span>
                    <span class="result-total">£${p.totalCost.toFixed(2)}</span>
                </div>
                <div class="result-sub">
                    Sub: £${p.subCost.toFixed(2)} | Rate: ${p.rate}p | 
                    <span class="${savingsClass}">${p.savings >= 0 ? 'Saving: £' + p.savings.toFixed(2) : 'Extra: £' + Math.abs(p.savings).toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    document.getElementById("providerResults").innerHTML = html;

    const coreData = { journeyMiles: miles, homeRange: initialRange, efficiency, startChargeCost, adhocRate };
    drawGraph(coreData, providerData);

    updateConclusions(providerData, publicKwh);
    saveToLocalStorage();
}

function updateConclusions(providers, publicKwh) {
    const box = document.getElementById("conclusionsBox");
    if (providers.length === 0) {
        box.innerHTML = "";
        return;
    }

    const bestProvider = providers.reduce((prev, curr) => (prev.totalCost < curr.totalCost) ? prev : curr);
    const timeLine = publicKwh > 0 ? `<p>You need to add <strong>${publicKwh.toFixed(1)} kWh</strong> on the road.</p>` : "";
    
    const minSpeedSelect = document.getElementById("minSpeed");
    const minSpeedLabel = minSpeedSelect.options[minSpeedSelect.selectedIndex].text;

    // UPDATED TABLE TO INCLUDE 75kW and 150kW
    const speedTableHtml = `
        <div class="speed-comparison-container">
            <table class="mini-table">
                <thead>
                    <tr><th>Speed Tier</th><th>Est. Charge Time*</th></tr>
                </thead>
                <tbody>
                    <tr><td>7kW (Fast)</td><td>${(publicKwh/7).toFixed(1)}h</td></tr>
                    <tr><td>22kW (Accelerated)</td><td>${(publicKwh/22).toFixed(1)}h</td></tr>
                    <tr><td>50kW (Rapid)</td><td>${((publicKwh/50)*60).toFixed(0)}m</td></tr>
                    <tr><td>75kW (Ultra Rapid)</td><td>${((publicKwh/75)*60).toFixed(0)}m</td></tr>
                    <tr><td>150kW+ (High Power)</td><td>${((publicKwh/150)*60).toFixed(0)}m</td></tr>
                </tbody>
            </table>
        </div>`;

    const locationDisclaimer = `<p style="font-size:0.85rem; margin-top:12px; opacity:0.8;">* Times are estimates based on total kWh needed. Actual speeds vary based on vehicle curve and temperature.</p>`;
    
    let conclusionHTML = "";
    if (bestProvider.savings > 0) {
        conclusionHTML += `<div class="conclusion-card good"><p class="main-result"><strong>${bestProvider.name}</strong> is cheapest at <strong>${minSpeedLabel}</strong> (saving <strong>£${bestProvider.savings.toFixed(2)}</strong>).</p>${timeLine}${speedTableHtml}${locationDisclaimer}</div>`;
    } else {
        conclusionHTML += `<div class="conclusion-card bad"><p class="main-result"><strong>Ad-hoc charging</strong> is cheapest at <strong>${minSpeedLabel}</strong>.</p>${timeLine}${speedTableHtml}${locationDisclaimer}</div>`;
    }

    box.innerHTML = conclusionHTML;
}