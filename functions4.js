// ===============================
// functions4.js
// Utilities + Persistence
// ===============================

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
    enforceSpeedRules();
    calculate();
}

/* ============================================
   NEW FUNCTION — FIXES SHAREABLE LINK LOADING
   ============================================ */
function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);

    // Load main fields
    [
        "journeyMiles","batteryKwh","soc","efficiency","adhoc",
        "startChargeRate","startChargeType","minSpeed"
    ].forEach(id => {
        if (params.has(id)) {
            const el = document.getElementById(id);
            if (el) el.value = params.get(id);
        }
    });

    // Rebuild provider boxes
    document.getElementById("providers").innerHTML = "";
    let i = 0;

    while (params.has(`p${i}n`)) {
        createProviderBox();
        const id = providerCount;

        document.getElementById(`name${id}`).value = params.get(`p${i}n`);
        document.getElementById(`subCost${id}`).value = params.get(`p${i}s`);
        document.getElementById(`rate${id}`).value = params.get(`p${i}r`);

        i++;
    }

    enforceSpeedRules();
    calculate();
}

function shareLink() {
    const params = new URLSearchParams();
    ["journeyMiles","batteryKwh","soc","efficiency","adhoc","startChargeRate","startChargeType","minSpeed"].forEach(id => {
        params.set(id, document.getElementById(id).value);
    });
    const boxes = document.querySelectorAll(".provider-box");
    boxes.forEach((box, i) => {
        const id = box.dataset.id;
        params.set(`p${i}n`, document.getElementById(`name${id}`).value);
        params.set(`p${i}s`, document.getElementById(`subCost${id}`).value);
        params.set(`p${i}r`, document.getElementById(`rate${id}`).value);
    });
    const url = window.location.origin + window.location.pathname + "?" + params.toString();
    navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
}

function exportPdf() {
    const results = document.getElementById("results");
    html2canvas(results).then(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, width, height);
        pdf.save("ev-comparison.pdf");
    });
}

function resetAll() {
    localStorage.removeItem("ev_calc_settings");
    window.location.href = window.location.pathname;
}

[
    "journeyMiles", "batteryKwh", "soc", "efficiency",
    "adhoc", "startChargeRate", "minSpeed"
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
        if (window.location.search) loadFromUrl();
        else loadFromLocalStorage();
    });