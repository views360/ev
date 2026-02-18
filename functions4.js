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

function shareLink() {
    const params = new URLSearchParams();
    ["journeyMiles","batteryKwh","soc","efficiency","adhoc","startChargeRate","minSpeed"].forEach(id => {
        params.set(id, document.getElementById(id).value);
    });
    const url = window.location.origin + window.location.pathname + "?" + params.toString();
    navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
}

function exportPdf() {
    const results = document.getElementById("results");
    const body = document.body;
    const wasDarkMode = !body.classList.contains("light-mode");

    // Force light mode for export
    if (wasDarkMode) body.classList.add("light-mode");

    // Small delay to allow CSS to paint the light mode
    setTimeout(() => {
        html2canvas(results, { 
            scale: 2,
            backgroundColor: "#ffffff" 
        }).then(canvas => {
            const imgData = canvas.toDataURL("image/png");
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");
            const width = pdf.internal.pageSize.getWidth();
            const height = (canvas.height * width) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, width, height);
            pdf.save("ev-comparison.pdf");

            // Restore dark mode if it was active
            if (wasDarkMode) body.classList.remove("light-mode");
        });
    }, 150);
}

function resetAll() {
    localStorage.removeItem("ev_calc_settings");
    window.location.href = window.location.pathname;
}

// Initial Listeners
[ "journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed" ].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
        if(id === "minSpeed") enforceSpeedRules();
        calculate();
        saveToLocalStorage();
    });
});

fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        PRESETS = data.providers;
        loadFromLocalStorage();
    });