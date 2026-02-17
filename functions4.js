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
        alert("Shareable link copied to clipboard!");
    });
}

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
        if (params.has(id)) document.getElementById(id).value = params.get(id);
    });

    // Load providers
    let i = 0;
    while (params.has(`p${i}n`)) {
        createProviderBox();
        const id = providerCount;
        document.getElementById(`name${id}`).value = params.get(`p${i}n`);
        document.getElementById(`subCost${id}`).value = params.get(`p${i}s`);
        document.getElementById(`rate${id}`).value = params.get(`p${i}r`);
        
        const speed = params.get(`p${i}spd`);
        if (speed) {
            const speedRow = document.getElementById(`speedRow${id}`);
            const speedSelect = document.getElementById(`speed${id}`);
            speedRow.style.display = "block";
            speedSelect.innerHTML = `<option value="${speed}">${speed}kW</option>`;
            speedSelect.value = speed;
        }
        i++;
    }
    calculate();
}

// -------------------------------
// EXPORT PDF
// -------------------------------
async function exportPdf() {
    const resultsEl = document.getElementById("results");
    if (resultsEl.style.display === "none") {
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

// ⭐ CRITICAL: Minimum speed listener
document.getElementById("minSpeed").addEventListener("input", () => {
    enforceSpeedRules();
    calculate();
});

window.addEventListener("DOMContentLoaded", async () => {
    try {
        const resp = await fetch('providers.json');
        const data = await resp.json();
        PRESETS = data.providers;
        
        loadFromUrl();
        
        // If no URL params, add defaults
        if (document.querySelectorAll(".provider-box").length === 0) {
            addSubscriptionPresets();
        }
    } catch (e) {
        console.error("Failed to load presets", e);
    }
});