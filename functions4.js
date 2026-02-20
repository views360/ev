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

function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);

    [
        "journeyMiles","batteryKwh","soc","efficiency","adhoc",
        "startChargeRate","startChargeType","minSpeed"
    ].forEach(id => {
        if (params.has(id)) {
            const el = document.getElementById(id);
            if (el) el.value = params.get(id);
        }
    });

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
    navigator.clipboard.writeText(url).then(() => alert("Link copied! You may paste it elsewhere."));
}

function exportPdf() {
    const results = document.getElementById("results");
    if (!results) return;

    const cloneWrapper = document.createElement("div");
    const cloneId = "pdfClone_" + Math.floor(Math.random() * 1000000);
    cloneWrapper.id = cloneId;
    cloneWrapper.style.position = "absolute";
    cloneWrapper.style.left = "-99999px";
    cloneWrapper.style.top = "0";
    cloneWrapper.style.width = results.offsetWidth + "px";

    const clone = results.cloneNode(true);
    cloneWrapper.appendChild(clone);
    document.body.appendChild(cloneWrapper);

    const groups = cloneWrapper.querySelectorAll(".input-group");
    groups.forEach(group => {
        const label = group.querySelector("label");
        if (label && label.textContent.trim() === "Sort results") {
            group.remove();
        }
    });

    const charts = cloneWrapper.querySelectorAll(".chart-wrapper");
    charts.forEach(el => el.remove());

    const override = document.createElement("style");
    override.innerHTML = `
        #${cloneId}, #${cloneId} * {
            background: #ffffff !important;
            color: #000000 !important;
            border-color: #000000 !important;
            box-shadow: none !important;
        }
    `;
    document.head.appendChild(override);

    requestAnimationFrame(() => {
        html2canvas(cloneWrapper).then(canvas => {
            cloneWrapper.remove();
            override.remove();

            const bwCanvas = document.createElement("canvas");
            const bctx = bwCanvas.getContext("2d");

            bwCanvas.width = canvas.width;
            bwCanvas.height = canvas.height;
            bctx.drawImage(canvas, 0, 0);

            const imgData = bctx.getImageData(0, 0, bwCanvas.width, bwCanvas.height);
            const pixels = imgData.data;
            const threshold = 160;
            for (let i = 0; i < pixels.length; i += 4) {
                const grey = 0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2];
                const bw = grey < threshold ? 0 : 255;
                pixels[i] = pixels[i+1] = pixels[i+2] = bw;
            }
            bctx.putImageData(imgData, 0, 0);

            const bwImg = bwCanvas.toDataURL("image/png");
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 10;
            const usableWidth = pageWidth - margin * 2;
            const imgAspect = bwCanvas.width / bwCanvas.height;

            pdf.setFontSize(18);
            pdf.text("EV Public Charging Comparison", pageWidth / 2, margin, { align: "center" });
            pdf.addImage(bwImg, "PNG", margin, margin + 10, usableWidth, usableWidth / imgAspect);
            pdf.save("ev-comparison.pdf");
        });
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
    if(el) {
        el.addEventListener("input", () => {
            if (id === "minSpeed") enforceSpeedRules();
            calculate();
            saveToLocalStorage();
        });
    }
});

fetch("providers.json")
    .then(r => r.json())
    .then(data => {
        PRESETS = data.providers;
        if (window.location.search) loadFromUrl();
        else loadFromLocalStorage();
    });