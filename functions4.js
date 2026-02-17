// ===============================
// functions4.js
// Utilities + Initialisation + Local Storage
// ===============================

// -------------------------------
// LOCAL STORAGE LOGIC
// -------------------------------
function saveToLocalStorage() {
    const data = {
        journeyMiles: document.getElementById("journeyMiles").value,
        batteryKwh: document.getElementById("batteryKwh").value,
        soc: document.getElementById("soc").value,
        efficiency: document.getElementById("efficiency").value,
        adhoc: document.getElementById("adhoc").value,
        startChargeRate: document.getElementById("startChargeRate").value,
        startChargeType: document.getElementById("startChargeType").value,
        minSpeed: document.getElementById("minSpeed").value
    };
    localStorage.setItem("ev_calc_settings", JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem("ev_calc_settings");
    if (!saved) return;

    const data = JSON.parse(saved);
    Object.keys(data).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = data[id];
    });

    // TRIGGER CALCULATION:
    // Once data is loaded, we update the UI logic and run the calculations
    // to reveal the results section immediately.
    enforceSpeedRules();
    calculate();
}

// -------------------------------
// SHAREABLE LINK
// -------------------------------
function shareLink() {
    const params = new URLSearchParams();

    [
        "journeyMiles",
        "batteryKwh",
        "soc",
        "efficiency",
        "adhoc",
        "startChargeRate",
        "startChargeType",
        "minSpeed"
    ].forEach(id => {
        params.set(id, document.getElementById(id).value);
    });

    const boxes = document.querySelectorAll(".provider-box");

    boxes.forEach((box, i) => {
        const id = box.dataset.id;

        params.set(`p${i}n`, document.getElementById(`name${id}`).value);
        params.set(`p${i}s`, document.getElementById(`subCost${id}`).value);
        params.set(`p${i}r`, document.getElementById(`rate${id}`).value);

        const speedSelect = document.getElementById(`speed${id}`);
        if (speedSelect && speedSelect.style.display !== "none") {
            params.set(`p${i}spd`, speedSelect.value);
        }
    });

    const url =
        window.location.origin +
        window.location.pathname +
        "?" +
        params.toString();

    navigator.clipboard.writeText(url).then(() => {
        alert("Shareable link copied!");
    });
}

// -------------------------------
// LOAD FROM URL PARAMETERS
// -------------------------------
function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);

    if (!params.has("journeyMiles")) return;

    [
        "journeyMiles",
        "batteryKwh",
        "soc",
        "efficiency",
        "adhoc",
        "startChargeRate",
        "startChargeType",
        "minSpeed"
    ].forEach(id => {
        if (params.has(id)) {
            document.getElementById(id).value = params.get(id);
        }
    });

    document.getElementById("results").style.display = "none";
    document.getElementById("providers").innerHTML = "";

    let idx = 0;

    while (params.has(`p${idx}n`)) {
        createProviderBox();
        const id = providerCount;

        document.getElementById(`name${id}`).value = params.get(`p${idx}n`);
        document.getElementById(`subCost${id}`).value = params.get(`p${idx}s`);
        document.getElementById(`rate${id}`).value = params.get(`p${idx}r`);

        const speedSelect = document.getElementById(`speed${id}`);
        if (speedSelect && params.has(`p${idx}spd`)) {
            speedSelect.value = params.get(`p${idx}spd`);
        }

        idx++;
    }

    enforceSpeedRules();
    calculate();
}

// -------------------------------
// EXPORT PDF
// -------------------------------
async function exportPdf() {
    const resultsEl = document.getElementById("results");

    if (!resultsEl || resultsEl.style.display === "none") {
        alert("Enter data first.");
        return;
    }

    const { jsPDF } = window.jspdf;

    const canvas = await html2canvas(document.body, {
        scale: 2,
        backgroundColor: getComputedStyle(document.body)
            .getPropertyValue("--bg")
            .trim()
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("ev-charging-comparison.pdf");
}

// -------------------------------
// RESET ALL
// -------------------------------
function resetAll() {
    localStorage.removeItem("ev_calc_settings");
    window.location.href = window.location.pathname;
}

// -------------------------------
// INITIALISATION
// -------------------------------

// 1. Attach Event Listeners first
[
    "journeyMiles",
    "batteryKwh",
    "soc",
    "efficiency",
    "adhoc",
    "startChargeRate",
    "startChargeType",
    "minSpeed"
].forEach(id => {
    const el = document.getElementById(id);
    // Standard calculation trigger
    el.addEventListener("input", () => {
        if(id === "minSpeed") enforceSpeedRules();
        calculate();
    });
    // Persistence trigger
    el.addEventListener("input", saveToLocalStorage);
});

// 2. Fetch presets then handle data restoration
fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        PRESETS = data.providers;
        
        // Priority: URL parameters first, then Local Storage
        const params = new URLSearchParams(window.location.search);
        if (params.has("journeyMiles")) {
            loadFromUrl();
        } else {
            loadFromLocalStorage();
        }
    });