// save.js
// Extracted from your original calculate() persistence logic.
// No logic changed. Only reorganised into a reusable helper.

import { setCookie } from '../../utils/cookies.js';
import { saveProvidersToCookie } from '../../providers/saveProviders.js';
import { getInputs } from '../../journeys/inputs.js';

export function saveState(inputs, providers, payg, validation) {

    // Save all input values (your existing behaviour)
    const dataToSave = getInputs();
    setCookie("ev_trip_values", dataToSave);

    // Save provider list (your existing behaviour)
    saveProvidersToCookie();
}