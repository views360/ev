// ===============================
// functions4.js
// Utilities + Initialisation + Local Storage (Full Version)
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
    localStorage.setItem("ev_calc_settings_v2", JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem("ev_calc_settings_v2");
    if (!saved) return;
    const data = JSON.parse(saved);
    Object.keys(data).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = data[id];
    });
    calculate();
}

async function exportPdf() {
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
        alert("PDF Export failed. Check console for details.");
        console.error(e);
    }
}

function shareLink() {
    const params = new URLSearchParams();
    params.set("journeyMiles", document.getElementById("journeyMiles").value);
    params.set("batteryKwh", document.getElementById("batteryKwh").value);
    params.set("soc", document.getElementById("soc").value);
    params.set("efficiency", document.getElementById("efficiency").value);
    params.set("adhoc", document.getElementById("adhoc").value);
    
    const url = window.location.origin + window.location.pathname + "?" + params.toString();
    navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!"));
}

function resetAll() {
    localStorage.removeItem("ev_calc_settings_v2");
    window.location.href = window.location.pathname;
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Attach listeners to all inputs
    const inputs = ["journeyMiles", "batteryKwh", "soc", "efficiency", "adhoc", "startChargeRate", "minSpeed"];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculate);
            el.addEventListener("input", saveToLocalStorage);
        }
    });

    // Fetch the NEW data
    fetch("providers-new.json")
        .then(r => r.json())
        .then(data => {
            PRESETS = data.providers;
            // Check for URL params first, then local storage
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
        .catch(err => console.error("Data Load Error:", err));
});
