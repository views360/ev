// ===============================
// functions4.js
// Utilities + Initialisation + Local Storage
// ===============================

function saveToLocalStorage() {
    const vehicleData = {
        journeyMiles: document.getElementById("journeyMiles").value,
        batteryKwh: document.getElementById("batteryKwh").value,
        soc: document.getElementById("soc").value,
        efficiency: document.getElementById("efficiency").value,
        adhoc: document.getElementById("adhoc").value,
        startChargeRate: document.getElementById("startChargeRate").value,
        startChargeType: document.getElementById("startChargeType").value,
        minSpeed: document.getElementById("minSpeed").value
    };

    const providersData = [];
    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        providersData.push({
            name: document.getElementById(`name${id}`).value,
            preset: document.getElementById(`preset${id}`).value,
            subCost: document.getElementById(`subCost${id}`).value,
            rate: document.getElementById(`rate${id}`).value,
            speed: document.getElementById(`speed${id}`)?.value || null
        });
    });

    localStorage.setItem("ev_calc_settings", JSON.stringify({ vehicle: vehicleData, providers: providersData }));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem("ev_calc_settings");
    if (!saved) return;

    const { vehicle, providers } = JSON.parse(saved);

    Object.keys(vehicle).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = vehicle[id];
    });

    document.getElementById("providers").innerHTML = "";
    providers.forEach(p => {
        createProviderBox();
        const id = providerCount;
        document.getElementById(`name${id}`).value = p.name;
        document.getElementById(`preset${id}`).value = p.preset;
        document.getElementById(`subCost${id}`).value = p.subCost;
        document.getElementById(`rate${id}`).value = p.rate;
        const speedSelect = document.getElementById(`speed${id}`);
        if (p.speed && speedSelect) {
            document.getElementById(`speedRow${id}`).style.display = "flex";
            speedSelect.value = p.speed;
        }
    });

    enforceSpeedRules();
    calculate();
}

function resetAll() {
    localStorage.removeItem("ev_calc_settings");
    window.location.href = window.location.pathname;
}

// Initialisation
[
    "journeyMiles", "batteryKwh", "soc", "efficiency", 
    "adhoc", "startChargeRate", "startChargeType", "minSpeed"
].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
        if(id === "minSpeed") enforceSpeedRules();
        calculate();
        saveToLocalStorage();
    });
});

fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        PRESETS = data.providers;
        const params = new URLSearchParams(window.location.search);
        if (params.has("journeyMiles")) loadFromUrl();
        else loadFromLocalStorage();
    });
