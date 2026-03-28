// init.js
// Extracted from your original functions.js with no logic changes

import { getCookie } from '../utils/cookies.js';
import { PRESETS } from './state.js';
import { createProviderBox, updateProviderFields } from '../providers/providerUI.js';
import { loadProvidersFromCookie, loadProviderState } from '../providers/providerStorage.js';
import { calculate } from './calculate/calculate.js';
import { setToggle } from '../ui/tabs.js';

export function init() {
    const savedValues = getCookie("ev_trip_values");
    const urlParams = new URLSearchParams(window.location.search);

    const speedTrip = document.getElementById("minSpeed");
    const speedBE = document.getElementById("minSpeedBE");

    const syncAndCalc = (e) => {
        const newValue = e.target.value;
        speedTrip.value = newValue;
        speedBE.value = newValue;
        calculate();
    };

    if (speedTrip && speedBE) {
        speedTrip.addEventListener('change', syncAndCalc);
        speedBE.addEventListener('change', syncAndCalc);
    }

    fetch("providers.json")
        .then(r => r.json())
        .then(data => {
            PRESETS.length = 0;
            PRESETS.push(...data.providers);

            const tripIds = [
                "journeyMiles", "batteryKwh", "soc", "efficiency",
                "adhoc", "startChargeRate", "maxChargingSpeed",
                "rechargeAt", "minSpeed"
            ];

            tripIds.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;

                if (urlParams.has(id)) {
                    el.value = urlParams.get(id);
                } else if (savedValues && savedValues[id] !== undefined) {
                    el.value = savedValues[id];
                }

                el.addEventListener('input', calculate);
            });

            const effTrip = document.getElementById("efficiency");
            const effBE = document.getElementById("efficiencyBE");
            const adhocTrip = document.getElementById("adhoc");
            const adhocBE = document.getElementById("adhocBE");

            const syncFields = (source, target) => {
                source.addEventListener('input', () => {
                    target.value = source.value;
                    calculate();
                });
            };

            if (effTrip && effBE) {
                effBE.value = effTrip.value;
                syncFields(effTrip, effBE);
                syncFields(effBE, effTrip);
            }

            if (adhocTrip && adhocBE) {
                adhocBE.value = adhocTrip.value;
                syncFields(adhocTrip, adhocBE);
                syncFields(adhocBE, adhocTrip);
            }

            if (urlParams.has("p")) {
                try {
                    const sharedProviders = JSON.parse(urlParams.get("p"));
                    document.getElementById("providers").innerHTML = "";

                    sharedProviders.forEach(p => {
                        createProviderBox();
                        const id = providerCountRef.value;

                        document.getElementById(`name${id}`).value = p.name;
                        document.getElementById(`subCost${id}`).value = p.sub;
                        document.getElementById(`rate${id}`).value = p.rate;
                        document.getElementById(`preset${id}`).value = p.preset;

                        if (p.preset !== 'Custom') {
                            updateProviderFields(id);
                            document.getElementById(`rate${id}`).value = p.rate;
                        }
                    });
                } catch (e) {
                    console.error("Error parsing shared providers:", e);
                }
            }

            const modeParam = urlParams.get("mode");
            if (modeParam === "trip-savings") {
                const tripBtn = document.querySelector('.calc-tab:nth-child(2)');
                if (tripBtn) setToggle('trip-savings', tripBtn);
            } else {
                const activeTab = document.querySelector('.calc-tab.active');
                const currentMode = activeTab.textContent.trim() === "Cost Reduction"
                    ? 'trip-savings'
                    : 'break-even';
                setToggle(currentMode, activeTab);
            }

            loadProviderState();
            setTimeout(loadProvidersFromCookie, 100);

            calculate();
        });
}

window.addEventListener("DOMContentLoaded", init);