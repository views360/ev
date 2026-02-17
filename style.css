// -------------------------------
    // CONCLUSIONS & SUMMARY
    // -------------------------------
    const conclusionsBox = document.getElementById("conclusionsBox");
    const summaryBox = document.getElementById("summaryBox");
    
    // Core data for the graph
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

    // Find best provider
    const bestProvider = [...providers].sort((a, b) => a.totalJourneyCost - b.totalJourneyCost)[0];
    
    summaryBox.style.display = "block";
    let conclusionHTML = `<h3>Analysis</h3>`;
    const locationDisclaimer = `<p class="disclaimer"><strong>Note:</strong> Cost is only one factor — a subscription will only save money if the provider has charging stations where you plan to travel.</p>`;

    if (bestProvider.totalJourneyCost < totalAdhocCost) {
        summaryBox.className = "summary good";
        // Update the top summary banner
        summaryBox.textContent = `${bestProvider.name} is the most cost-effective choice for this trip.`;
        
        conclusionHTML += `
            <div class="conclusion-card good">
                <p class="main-result"><strong>${bestProvider.name}</strong> is cheapest for a <strong>${miles}-mile trip</strong> (saving <strong>£${bestProvider.savings.toFixed(2)}</strong> vs Ad‑hoc).</p>
                <p class="secondary-result">Total cost including subscription: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>
                ${locationDisclaimer}
            </div>
        `;
    } else {
        summaryBox.className = "summary bad";
        summaryBox.textContent = `Standard Ad-hoc charging is cheaper for this trip distance.`;
        
        conclusionHTML += `
            <div class="conclusion-card bad">
                <p class="main-result">Standard <strong>Ad‑hoc charging</strong> is the most cost‑effective choice for this trip.</p>
                <p class="secondary-result">At <strong>${miles} miles</strong>, subscription savings do not yet cover the monthly fee.</p>
                ${locationDisclaimer}
            </div>
        `;
    }

    conclusionsBox.innerHTML = conclusionHTML;
    drawGraph(core, providers);
