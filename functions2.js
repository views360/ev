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
    const startType = document.getElementById("startChargeType").value;
    const minSpeed = parseFloat(document.getElementById("minSpeed").value);

    if (isNaN(miles) || isNaN(battery) || isNaN(soc) || isNaN(efficiency) || isNaN(adhocRate)) {
        document.getElementById("results").style.display = "none";
        return;
    }

    const startChargeKwh = (soc / 100) * battery;
    const startChargeCost = startChargeKwh * (startRate / 100);
    const homeRange = startChargeKwh * efficiency;

    const publicMiles = Math.max(0, miles - homeRange);
    const publicKwh = publicMiles / efficiency;
    const totalAdhocCost = startChargeCost + (publicKwh * (adhocRate / 100));

    document.getElementById("results").style.display = "block";
    document.getElementById("preChargeLine").innerHTML = `Pre-journey charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (Cost: <strong>£${startChargeCost.toFixed(2)}</strong>)`;
    document.getElementById("homeRangeLine").innerHTML = `Distance covered by start charge: <strong>${homeRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `Remaining distance to charge publicly: <strong>${publicMiles.toFixed(0)} miles</strong>`;
    document.getElementById("publicKwhLine").innerHTML = `Public energy needed: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total cost at ad-hoc rate (${adhocRate}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

    const providerBoxes = document.querySelectorAll(".provider-box");
    let providerData = [];

    providerBoxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value;
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        let rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;
        const discountVal = parseFloat(document.getElementById(`discount${id}`).value) || 0;

        // Apply discount percentage
        if (discountVal > 0) {
            rate = rate * (1 - (discountVal / 100));
        }

        const cost = subTypeCalculation(startChargeCost, publicKwh, rate, subCost);
        const savings = totalAdhocCost - cost;

        providerData.push({ id, name, subCost, rate, cost, savings });
    });

    function subTypeCalculation(startCost, pubKwh, pRate, sCost) {
        return sCost + startCost + (pubKwh * (pRate / 100));
    }

    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") providerData.sort((a, b) => b.savings - a.savings);
    else if (sortVal === "az") providerData.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortVal === "za") providerData.sort((a, b) => b.name.localeCompare(a.name));

    renderResults(providerData, totalAdhocCost);
    drawGraph({journeyMiles: miles, homeRange, efficiency, startChargeCost, adhocRate}, providerData);
}

function renderResults(data, adhocTotal) {
    const container = document.getElementById("providerResults");
    const conclusions = document.getElementById("conclusionsBox");
    container.innerHTML = "";
    conclusions.innerHTML = "";

    if (data.length === 0) return;

    data.forEach(p => {
        const card = document.createElement("div");
        card.className = `result-card ${p.savings > 0 ? 'better' : 'worse'}`;
        card.innerHTML = `
            <div class="result-header">
                <strong>${p.name}</strong>
                <span>Total: £${p.cost.toFixed(2)}</span>
            </div>
            <div class="result-meta">
                ${p.savings > 0 ? `<span class="tag good">Save £${p.savings.toFixed(2)}</span>` : `<span class="tag bad">£${Math.abs(p.savings).toFixed(2)} more</span>`}
                <small>(Effective Rate: ${p.rate.toFixed(1)}p)</small>
            </div>
        `;
        container.appendChild(card);
    });

    const best = data[0];
    const minSpeedLabel = document.getElementById("minSpeed").options[document.getElementById("minSpeed").selectedIndex].text;

    if (best.savings > 0) {
        conclusions.innerHTML = `<div class="conclusion-card good"><p class="main-result"><strong>${best.name}</strong> is your best option, saving you <strong>£${best.savings.toFixed(2)}</strong> on this trip.</p></div>`;
    } else {
        conclusions.innerHTML = `<div class="conclusion-card bad"><p class="main-result">Standard <strong>Ad-hoc charging</strong> is currently cheaper than your added subscriptions for this trip.</p></div>`;
    }
}