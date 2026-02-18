// ===============================
// functions2.js
// Core Calculation Engine (Updated for Hardware Categories)
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
    document.getElementById("publicMilesLine").innerHTML = `Public charging energy needed: <strong>${publicKwh.toFixed(1)} kWh</strong>`;
    document.getElementById("adhocCostLine").innerHTML = `Total cost (Standard Ad-hoc @ ${adhocRate}p): <strong>£${totalAdhocCost.toFixed(2)}</strong>`;

    const providers = [];
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        const speedEl = document.getElementById(`speed${id}`);
        const speedVal = speedEl ? speedEl.value : "Unknown";
        
        providers.push({
            name: document.getElementById(`name${id}`).value,
            subCost: parseFloat(document.getElementById(`subCost${id}`).value) || 0,
            rate: parseFloat(document.getElementById(`rate${id}`).value) || 0,
            speed: speedVal,
            category: speedVal === "default" ? "any hardware" : getSpeedCategory(speedVal)
        });
    });

    providers.forEach(p => {
        p.totalJourneyCost = p.subCost + startChargeCost + (publicKwh * (p.rate / 100));
        p.savings = totalAdhocCost - p.totalJourneyCost;
    });

    // Ranking and Analysis Logic
    const bestProvider = [...providers].sort((a, b) => a.totalJourneyCost - b.totalJourneyCost)[0];
    const conclusionsBox = document.getElementById("conclusionsBox");

    if (!bestProvider) return;

    const isSubscription = bestProvider.subCost > 0;
    const line2Label = isSubscription ? "Total cost including subscription" : "Total journey cost";
    
    let conclusionHTML = `<h3>Analysis</h3>`;
    
    if (bestProvider.totalJourneyCost < totalAdhocCost) {
        conclusionHTML += `
            <div class="conclusion-card good">
                <p class="main-result"><strong>${bestProvider.name}</strong> is cheapest for this trip using <strong>${bestProvider.category}</strong> hardware (saving <strong>£${bestProvider.savings.toFixed(2)}</strong>).</p>
                <p class="secondary-result">${line2Label}: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>
            </div>
        `;
    } else {
        conclusionHTML += `
            <div class="conclusion-card bad">
                <p class="main-result">Standard <strong>Ad‑hoc charging</strong> remains the best choice for this trip.</p>
            </div>
        `;
    }

    conclusionsBox.innerHTML = conclusionHTML;
    drawGraph({journeyMiles: miles, homeMiles: initialRange, efficiency, startChargeCost, adhocRate}, providers);
}
