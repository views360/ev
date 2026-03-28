export function calculate() {
    const ui = updateUIState();
    const inputs = getInputs();
    const validationResult = validateInputs(inputs, ui);
    if (!validationResult.shouldContinue) return;

    const payg = calculatePayg(inputs, validationResult);
    const providers = calculateSubscriptions(inputs, payg, validationResult);
    const realWorld = simulateRealWorldJourney(inputs, payg, providers, validationResult);

    renderResults(inputs, payg, providers, realWorld, validationResult);
    saveState(inputs, providers, payg, validationResult);
}