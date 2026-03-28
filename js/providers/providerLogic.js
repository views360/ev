// providerLogic.js
// Extracted from your original functions.js with no logic changes

import { PRESETS } from '../core/state.js';
import { getInputs } from '../journeys/inputs.js';
import { updateProviderFields } from './providerUI.js';

export function getSortedPresets(minSpeed) {
    return PRESETS.filter(p => {
        if (p.rates?.default) return true;
        return Object.keys(p.rates).some(s => Number(s) >= minSpeed);
    }).sort((a, b) => {
        const aSub = a.subscription.hasSubscription;
        const bSub = b.subscription.hasSubscription;
        return (aSub === bSub) ? a.name.localeCompare(b.name) : aSub ? -1 : 1;
    });
}

export function enforceSpeedRules() {
    const { minSpeed } = getInputs();
    const sortedPresets = getSortedPresets(minSpeed);

    document.querySelectorAll(".provider-box").forEach(box => {
        const id = box.dataset.id;
        const presetSelect = document.getElementById(`preset${id}`);
        const current = presetSelect.value;

        presetSelect.innerHTML = ['Custom', ...sortedPresets.map(p => p.name)]
            .map(n => `<option value="${n}">${n}</option>`).join("");

        presetSelect.value = (sortedPresets.some(p => p.name === current) || current === 'Custom')
            ? current
            : 'Custom';

        updateProviderFields(id);
    });
}