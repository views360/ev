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
    const cookiesAccepted = getCookie("cookiesAccepted");
    if (!cookiesAccepted) {
        document.getElementById("cookieBanner").style.display = "block";
    }
    calculate();
}

function acceptCookies() {
    setCookie("cookiesAccepted", true);
    document.getElementById("cookieBanner").style.display = "none";
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
        const paygCost = netKwh * (inputs.adhoc / 100);
        const savings = paygCost - cost;
        const breakEvenMiles = (p.subscription.monthlyCost || 0) / ((inputs.adhoc - rate) / 100) * inputs.efficiency;
        
        return { ...p, totalCost: cost, savings, breakEvenMiles, rateUsed: rate };
    });

    const sortVal = document.getElementById("sortResults").value;
    if (sortVal === "cheapest") results.sort((a, b) => a.totalCost - b.totalCost);
    else if (sortVal === "breakeven") results.sort((a, b) => a.breakEvenMiles - b.breakEvenMiles);
    else if (sortVal === "az") results.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortVal === "za") results.sort((a, b) => b.name.localeCompare(a.name));

    renderResults(results, netKwh);
    updateChart(results);
}

function renderResults(results, netKwh) {
    const container = document.getElementById("providerResults");
    const conclusions = document.getElementById("conclusionsBox");
    
    container.innerHTML = results.map(r => `
        <div class="result-card ${r.savings > 0 ? 'good' : ''}">
            <div class="result-header">
                <h3>${r.name}</h3>
                <span class="price-tag">£${r.totalCost.toFixed(2)}</span>
            </div>
            <div class="result-details">
                <p>Rate: ${r.rateUsed}p/kWh | Monthly: £${(r.subscription.monthlyCost || 0).toFixed(2)}</p>
                <p class="${r.savings > 0 ? 'text-good' : 'text-danger'}">
                    ${r.savings > 0 ? 'Saves' : 'Loss'}: £${Math.abs(r.savings).toFixed(2)}
                </p>
                <small>Break-even: ${isFinite(r.breakEvenMiles) ? Math.ceil(r.breakEvenMiles) : 'N/A'} miles</small>
            </div>
        </div>
    `).join('');

    const best = results[0];
    conclusions.innerHTML = `<h3>Recommendation</h3><p>Based on ${netKwh.toFixed(1)} kWh needed, <strong>${best.name}</strong> is your cheapest option.</p>`;
}

function updateChart(results) {
    const ctx = document.getElementById('costChart').getContext('2d');
    const labels = Array.from({length: 11}, (_, i) => i * 100);
    
    if (chart) chart.destroy();

    const datasets = results.slice(0, 5).map((r, i) => ({
        label: r.name,
        data: labels.map(m => (r.subscription.monthlyCost || 0) + ((m / getInputs().efficiency) * (r.rateUsed / 100))),
        borderColor: `hsl(${i * 45}, 70%, 50%)`,
        tension: 0.1
    }));

    chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    menu.classList.toggle('active');
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('sideMenu');
    const trigger = document.querySelector('.android-dots-trigger');
    if (menu?.classList.contains('active') && !menu.contains(e.target) && !trigger.contains(e.target)) {
        menu.classList.remove('active');
    }
});

function openPrivacy() {
    const privacy = document.getElementById('privacyOverlay');
    privacy.style.display = 'flex';
    setTimeout(() => { privacy.style.opacity = '1'; }, 10);
}

function closePrivacy() {
    const privacy = document.getElementById('privacyOverlay');
    privacy.style.opacity = '0';
    setTimeout(() => { privacy.style.display = 'none'; }, 400);
}

function resetAll() {
    document.cookie = "ev_trip_values=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload();
}

window.onload = loadProviders;
