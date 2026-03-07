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

function resetAll() {
    localStorage.removeItem("ev_calc_settings");
    document.cookie = "ev_trip_values=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "cookiesAccepted=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = window.location.pathname;
}

function toggleTheme() {
    document.body.classList.toggle("light-mode");
}

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
