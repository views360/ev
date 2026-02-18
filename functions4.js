// ===============================
// functions4.js
// Utilities + Initialisation + Local Storage
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
    localStorage.setItem("ev_calc_settings_v3", JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem("ev_calc_settings_v3");
    if (!saved) return;
    const data = JSON.parse(saved);
    Object.keys(data).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = data[id];
    });
    calculate();
}

async function exportPdf() {
    const resultsEl = document.getElementById("results");
    if (!resultsEl || resultsEl.style.display === "none") {
        alert("Please calculate results first.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const element = document.querySelector(".app");
    
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: getComputedStyle(document.body).getPropertyValue("--bg").trim()
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("EV-Charging-Report.pdf");
    } catch (e) {
        console.error("PDF Export Error:", e);
        alert("PDF Generation failed.");
    }
}

function shareLink() {
    const params = new URLSearchParams();
    ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc"].forEach(id => {
        params.set(id, document.getElementById(id).value);
    });
    const url = window.location.origin + window.location.pathname + "?" + params.toString();
    navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!"));
}

function resetAll() {
    localStorage.removeItem("ev_calc_settings_v3");
    window.location.href = window.location.pathname;
}

// Initialization Logic
document.addEventListener("DOMContentLoaded", () => {
    const inputs = ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculate);
            el.addEventListener("input", saveToLocalStorage);
        }
    });

    fetch("providers.json") // Renamed as per your request
        .then(r => r.json())
        .then(data => {
            PRESETS = data.providers;
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has("journeyMiles")) {
                urlParams.forEach((value, key) => {
                    const el = document.getElementById(key);
                    if (el) el.value = value;
                });
                calculate();
            } else {
                loadFromLocalStorage();
            }
        })
        .catch(err => console.error("Could not load provider data:", err));
});
