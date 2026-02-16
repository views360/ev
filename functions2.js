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

    // If any required fields are missing, hide results
    if (isNaN(miles) || isNaN(battery) || isNaN(soc) || isNaN(efficiency) || isNaN(adhocRate)) {
        document.getElementById("results").style.display = "none";
        return;
    }

    // -------------------------------
    // BASIC CALCULATIONS
    // -------------------------------
    const startChargeKwh = (soc / 100) * battery;
    const startChargeCost = startChargeKwh * (startRate / 100);
    const initialRange = startChargeKwh * efficiency;

    const publicMiles = Math.max(0, miles - initialRange);
    const publicKwh = publicMiles / efficiency;

    const totalAdhocCost = startChargeCost + (publicKwh * (adhocRate / 100));

    // Update UI lines
    document.getElementById("preChargeLine").innerHTML =
        `Initial charge in battery: <span class="highlight">${startChargeKwh.toFixed(1)} kWh</span> (Cost: £${startChargeCost.toFixed(2)})`;

    document.getElementById("homeRangeLine").innerHTML =
        `Distance covered by initial charge: <span class="highlight">${initialRange.toFixed(0)} miles</span>`;

    document.getElementById("publicMilesLine").innerHTML =
        `Public charging distance needed: <span class="highlight">${publicMiles.toFixed(0)} miles</span>`;

    document.getElementById("publicKwhLine").innerHTML =
        `Public charging energy needed: <span class="highlight">${publicKwh.toFixed(1)} kWh</span>`;

    document.getElementById("adhocCostLine").innerHTML =
        `Total journey cost at your <span class="highlight">standard ad-hoc rate</span>: <span class="highlight">£${totalAdhocCost.toFixed(2)}</span>`;

    // -------------------------------
    // BUILD PROVIDER OBJECTS
    // -------------------------------
    const providers = [];
    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach(box => {
        const bid = box.dataset.id;

        const name = document.getElementById(`name${bid}`).value || `Provider #${bid}`;

        let sub = document.getElementById(`subCost${bid}`).value;
        sub = (sub === "N/A" || sub === "") ? 0 : parseFloat(sub);

        const rate = parseFloat(document.getElementById(`rate${bid}`).value);

        // Determine provider speed capability
        let providerSpeed = null;
        const speedSelect = document.getElementById(`speed${bid}`);

        if (speedSelect && speedSelect.style.display !== "none") {
            // Multi-speed provider: use selected speed
            providerSpeed = parseFloat(speedSelect.value);
        } else {
            // Default-only provider: treat as >50 kW
            providerSpeed = 999;
        }

        // Exclude providers that don't meet the minimum speed
        if (providerSpeed < minSpeed) return;

        // Only include providers with valid rate
        if (!isNaN(rate)) {
            const costWithSub = startChargeCost + sub + (publicKwh * (rate / 100));
            const savings = totalAdhocCost - costWithSub;

            let breakEvenTripMiles = Infinity;
            if (adhocRate > rate && sub > 0) {
                breakEvenTripMiles = (sub * efficiency) / ((adhocRate - rate) / 100);
            }

            providers.push({
                id: bid,
                name,
                sub,
                rate,
                totalJourneyCost: costWithSub,
                savings,
                breakEvenTripMiles
            });
        }
    });

    // -------------------------------
    // NO PROVIDERS → GRAPH ONLY AD-HOC
    // -------------------------------
    if (providers.length === 0) {
        document.getElementById("providerResults").innerHTML = "";
        document.getElementById("results").style.display = "block";

        drawGraph(
            {
                journeyMiles: miles,
                homeMiles: initialRange,
                efficiency,
                adhocRate,
                startChargeCost,
                totalAdhocCost
            },
            []
        );

        return;
    }

    // -------------------------------
    // SORT PROVIDERS
    // -------------------------------
    const sortMode = document.getElementById("sortResults").value;

    if (sortMode === "cheapest") {
        providers.sort((a, b) => a.totalJourneyCost - b.totalJourneyCost);
    } else if (sortMode === "az") {
        providers.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        providers.sort((a, b) => b.name.localeCompare(a.name));
    }

    // -------------------------------
    // RENDER PROVIDER RESULTS
    // -------------------------------
    const providerResults = document.getElementById("providerResults");
    providerResults.innerHTML = "";

    providers.forEach(p => {
        const beText = p.breakEvenTripMiles === Infinity
            ? "Never"
            : `${p.breakEvenTripMiles.toFixed(0)} miles`;

        providerResults.innerHTML += `
            <div class="result-line">
                <span class="highlight">${p.name}</span> —
                Total Journey Cost: £${p.totalJourneyCost.toFixed(2)} |
                Break‑even Trip Distance: ${beText}
                <i class="info-icon">i
                    <span class="tooltip-text">
                        The trip distance where savings from the discounted rate fully offset the subscription fee.
                    </span>
                </i> |
                Savings vs Ad‑hoc: £${p.savings.toFixed(2)}
            </div>
        `;
    });

    // -------------------------------
    // SUMMARY + CONCLUSIONS
    // -------------------------------
    document.getElementById("results").style.display = "block";

    const bestProvider = providers.reduce((a, b) =>
        a.totalJourneyCost < b.totalJourneyCost ? a : b
    );

    const summaryBox = document.getElementById("summaryBox");
    const conclusionsBox = document.getElementById("conclusionsBox");

    const core = {
        journeyMiles: miles,
        homeMiles: initialRange,
        efficiency,
        adhocRate,
        startChargeCost,
        totalAdhocCost
    };

    let conclusionHTML = "";
    const locationDisclaimer =
        `<p class="disclaimer">Note: Always check charger locations — a subscription only saves money if you can actually use their network.</p>`;

    if (bestProvider.totalJourneyCost < core.totalAdhocCost) {
        summaryBox.className = "summary good";
        summaryBox.textContent =
            `${bestProvider.name} is cheapest for this trip (saves £${bestProvider.savings.toFixed(2)} vs Ad‑hoc).`;

        conclusionHTML += `
            <div class="conclusion-card good">
                <p>For a trip of <strong>${core.journeyMiles} miles</strong>, taking a subscription with <strong>${bestProvider.name}</strong> is the most cost‑effective option.</p>
                <p>Total cost including subscription: <strong>£${bestProvider.totalJourneyCost.toFixed(2)}</strong>.</p>
            </div>
        `;
    } else {
        summaryBox.className = "summary bad";
        summaryBox.textContent =
            `Ad‑hoc charging is cheaper for this specific trip distance.`;

        conclusionHTML += `
            <div class="conclusion-card bad">
                <p>Standard <strong>Ad‑hoc charging</strong> is the most cost‑effective choice for this trip.</p>
                <p>At ${core.journeyMiles} miles, subscription savings do not cover the monthly fee.</p>
            </div>
        `;
    }

    conclusionHTML += locationDisclaimer;
    conclusionsBox.innerHTML = conclusionHTML;

    // -------------------------------
    // DRAW GRAPH
    // -------------------------------
    drawGraph(core, providers);
}