function toggleProviderVisibility() {
    const listContainer = document.getElementById("collapsibleProviders");
    const controlsContainer = document.getElementById("providerControls"); // Added this
    const btn = document.getElementById("toggleProvidersBtn");
    
    // Check if the list is currently hidden
    const isHidden = listContainer.style.display === "none";

    if (isHidden) {
        listContainer.style.display = "block";
        controlsContainer.style.display = "block"; // Show the text and buttons
        btn.textContent = "Collapse Providers list";
    } else {
        listContainer.style.display = "none";
        controlsContainer.style.display = "none"; // Hide the text and buttons
        btn.textContent = "Expand Providers list";
    }
}
