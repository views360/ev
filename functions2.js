// ===============================
// functions2.js
// Core Calculation Engine
// ===============================

function calculate() {
    // ... (your original variable gathering)
    const miles = parseFloat(document.getElementById("journeyMiles").value);
    const battery = parseFloat(document.getElementById("batteryKwh").value);
    const soc = parseFloat(document.getElementById("soc").value);
    const efficiency = parseFloat(document.getElementById("efficiency").value);
    const adhocRate = parseFloat(document.getElementById("adhoc").value);
    const startRate = parseFloat(document.getElementById("startChargeRate").value);
    
    // ... (your original logic for startChargeCost, publicKwh, totalAdhocCost)
    const startChargeKwh = (soc / 100) * battery;
    const startChargeCost = startChargeKwh * (startRate / 100);
    const initialRange = startChargeKwh * efficiency;
    const publicMiles = Math.max(0, miles - initialRange);
    const publicKwh = publicMiles / efficiency;
    const totalAdhocCost = startChargeCost + (publicKwh * (adhocRate / 100));

    // ... (rest of your original UI updates for preChargeLine, etc.)

    const providers = [];
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const id = box.dataset.id;
        const name = document.getElementById(`name${id}`).value || "Unnamed";
        const subCost = parseFloat(document.getElementById(`subCost${id}`).value) || 0;
        let rate = parseFloat(document.getElementById(`rate${id}`).value) || 0;
        
        // ADDED DISCOUNT LOGIC
        const discountVal = parseFloat(document.getElementById(`discount${id}`).value) || 0;
        if (discountVal > 0) {
            rate = rate * (1 - (discountVal / 100));
        }

        const journeyCost = publicKwh * (rate / 100);
        const totalJourneyCost = subCost + startChargeCost + journeyCost;
        const savings = totalAdhocCost - totalJourneyCost;

        providers.push({
            name: name,
            subCost: subCost,
            rate: rate,
            cost: totalJourneyCost,
            savings: savings
        });
    });

    // ... (your original sorting and renderResults calls)
}