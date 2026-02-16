// ===============================
// functions4.js
// Utilities + Initialisation
// ===============================

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
    window.location.href = window.location.pathname;
}

// -------------------------------
// INITIALISATION
// -------------------------------
[
    "journeyMiles",
    "batteryKwh",
    "soc",
    "efficiency",
    "adhoc",
    "startChargeRate",
    "startChargeType"
].forEach(id => {
    document.getElementById(id).addEventListener("input", calculate);
});

// ⭐ NEW: Minimum speed listener (the missing piece)
document.getElementById("minSpeed").addEventListener("input", () => {
    enforceSpeedRules();
    calculate();
});

// Load presets and restore state from URL
fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        PRESETS = data.providers;
        loadFromUrl();
    });
