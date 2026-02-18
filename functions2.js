// ===============================
// functions2.js - Calculation Engine
// ===============================

function calculate() {
    const miles = parseFloat(document.getElementById("journeyMiles").value);
    const battery = parseFloat(document.getElementById("batteryKwh").value);
    const soc = parseFloat(document.getElementById("soc").value);
    const efficiency = parseFloat(document.getElementById("efficiency").value);
    const adhocRate = parseFloat(document.getElementById("adhoc").value);
    const startRate = parseFloat(document.getElementById("startChargeRate").value);

    // Hide results if primary inputs are missing
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

    // Show Results Section
    document.getElementById("results").style.display = "block";
    document.getElementById("preChargeLine").innerHTML = `Pre-journey charge: <strong>${startChargeKwh.toFixed(1)} kWh</strong> (£${startChargeCost.toFixed(2)})`;
    document.getElementById("homeRangeLine").innerHTML = `Range from start charge: <strong>${initialRange.toFixed(0)} miles</strong>`;
    document.getElementById("publicMilesLine").innerHTML = `Public charging energy needed: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total cost (Standard Ad-hoc @ ${adhocRate}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

    const providers = [];
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        const speedSelect = document.getElementById(`speed${id}`);
        const speedLabel = speedSelect && speedSelect.options[speedSelect.selectedIndex] ? speedSelect.options[speedSelect.selectedIndex].text : "any hardware";
        
        providers.push({
            name: document.getElementById(`name${id}`).value || `Provider ${id}`,
            subCost: parseFloat(document.getElementById(`subCost${id}`).value) || 0,
            rate: parseFloat(document.getElementById(`rate${id}`).value) || 0,
            categoryLabel: speedLabel
        });
    });

    providers.forEach(p => {
        p.totalJourneyCost = p.subCost + startChargeCost + (publicKwh * (p.rate / 100));
        p.savings = totalAdhocCost - p.totalJourneyCost;
    });

    // Ranking
    const sorted = [...providers].sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    const best = sorted[0];
    const conclusionsBox = document.getElementById("conclusionsBox");

    if (best) {
        if (best.totalJourneyCost < totalAdhocCost) {
            conclusionsBox.innerHTML = `
                <div class="conclusion-card good">
                    <p class="main-result"><strong>${best.name}</strong> is cheapest using <strong>${best.categoryLabel}</strong>.</p>
                    <p class="secondary-result">Saving <strong>£${best.savings.toFixed(2)}</strong> vs Ad-hoc.</p>
                </div>`;
        } else {
            conclusionsBox.innerHTML = `
                <div class="conclusion-card bad">
                    <p class="main-result">Standard <strong>Ad-hoc charging</strong> remains the best choice for this trip.</p>
                </div>`;
        }
    }

    drawGraph({journeyMiles: miles, homeMiles: initialRange, efficiency, startChargeCost, adhocRate}, providers);
}
