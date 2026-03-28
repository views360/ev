// providerStorage.js
// Extracted from your original functions.js with no logic changes

import { setCookie, getCookie } from '../utils/cookies.js';
import { createProviderBox, updateProviderFields } from './providerUI.js';
import { providerCountRef } from '../core/state.js';
import { calculate } from '../core/calculate/calculate.js';

export function saveProvidersToCookie() {
    const providers = [];

    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;

        providers.push({
            name: document.getElementById(`name${id}`).value,
            subCost: document.getElementById(`subCost${id}`).value,
            rate: document.getElementById(`rate${id}`).value,
            preset: document.getElementById(`preset${id}`).value,
            speed: document.getElementById(`speed${id}`)?.value || null
        });
    });

    setCookie('ev_providers', providers);
}

export function loadProvidersFromCookie() {
    const saved = getCookie('ev_providers');

    if (saved && Array.isArray(saved)) {
        document.getElementById("providers").innerHTML = "";

        saved.forEach(p => {
            createProviderBox();
            const id = providerCountRef.value;

            document.getElementById(`name${id}`).value = p.name;
            document.getElementById(`subCost${id}`).value = p.subCost;
            document.getElementById(`rate${id}`).value = p.rate;
            document.getElementById(`preset${id}`).value = p.preset;

            if (p.speed && document.getElementById(`speed${id}`)) {
                updateProviderFields(id);
                document.getElementById(`speed${id}`).value = p.speed;
            }
        });

        calculate();
    }
}

export function loadProviderState() {
    const isCollapsed = getCookie('providers_collapsed');
    const container = document.getElementById("collapsibleProviders");
    const controls = document.getElementById("providerControls");
    const btn = document.getElementById("toggleProvidersBtn");
    const hiddenMsg = document.getElementById("providersHiddenMsg");

    if (isCollapsed === true && container && btn) {
        container.style.display = "none";
        if (controls) controls.style.display = "none";
        btn.textContent = "Expand Providers List";
        if (hiddenMsg) hiddenMsg.style.display = "block";
        btn.classList.remove("empty-pulse");
    }
}