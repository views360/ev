const setCookie = (name, value) => {
    const date = new Date();
    date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
    const cookieValue = encodeURIComponent(JSON.stringify(value));
    document.cookie = `${name}=${cookieValue};expires=${date.toUTCString()};path=/;SameSite=Lax`;
};

const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) {
            try {
                return JSON.parse(decodeURIComponent(c.substring(nameEQ.length)));
            } catch (e) {
                return null;
            }
        }
    }
    return null;
};

let PRESETS = [];
let providerCount = 0;
let chart = null;

function getInputs() {
    return {
        journeyMiles: parseFloat(document.getElementById("journeyMiles").value) || 0,
        batteryKwh: parseFloat(document.getElementById("batteryKwh").value) || 0,
        soc: parseFloat(document.getElementById("soc").value) || 0,
        efficiency: parseFloat(document.getElementById("efficiency").value) || 0,
        adhoc: parseFloat(document.getElementById("adhoc").value) || 0,
        startChargeRate: parseFloat(document.getElementById("startChargeRate").value) || 0,
        minSpeed: parseFloat(document.getElementById("minSpeed").value) || 0
    };
}

async function loadProviders() {
    try {
        const response = await fetch('providers.json');
        const data = await response.json();
        PRESETS = data.providers;
        initApp();
    } catch (error) {
        console.error("Error loading providers:", error);
    }
}

function initApp() {
    const saved = getCookie("ev_trip_values");
    if (saved) {
        Object.keys(saved).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = saved[id];
        });
    }
    calculate();
}

function calculate() {
    const inputs = getInputs();
    setCookie("ev_trip_values", inputs);

    const kwhNeeded = (inputs.journeyMiles / inputs.efficiency) - (inputs.batteryKwh * (inputs.soc / 100));
    const netKwh = Math.max(0, kwhNeeded);

    const results = PRESETS.map(p => {
        let rate = p.rates.default;
        if (inputs.startChargeRate > 0 && p.rates[inputs.startChargeRate]) {
            rate = p.rates[inputs.startChargeRate];
        }
        
        const cost = (p.subscription.monthlyCost || 0) + (netKwh * (rate / 100));
        return { ...p, totalCost: cost, rateUsed: rate };
    });

    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") results.sort((a, b) => a.totalCost - b.totalCost);
    
    renderResults(results, netKwh);
    updateChart(results);
}

function renderResults(results, netKwh) {
    const container = document.getElementById("providerResults");
    container.innerHTML = results.map(r => `
        <div class="result-card">
            <h3>${r.name}</h3>
            <p>Total: £${r.totalCost.toFixed(2)}</p>
            <small>Rate: ${r.rateUsed}p/kWh</small>
        </div>
    `).join('');
}

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    menu.classList.toggle('active');
}

function resetAll() {
    document.cookie = "ev_trip_values=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload();
}

window.onload = loadProviders;
