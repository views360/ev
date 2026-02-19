// ... (your original save/load LocalStorage)

function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    // ... (your original global field loading)

    document.getElementById("providers").innerHTML = "";
    let i = 0;
    while (params.has(`p${i}n`)) {
        createProviderBox();
        const id = providerCount;
        document.getElementById(`name${id}`).value = params.get(`p${i}n`);
        document.getElementById(`subCost${id}`).value = params.get(`p${i}s`);
        document.getElementById(`rate${id}`).value = params.get(`p${i}r`);
        // LOAD DISCOUNT
        if (params.has(`p${i}d`)) {
            document.getElementById(`discount${id}`).value = params.get(`p${i}d`);
        }
        i++;
    }
    calculate();
}

function shareLink() {
    const params = new URLSearchParams();
    // ... (your original global field saving)
    const boxes = document.querySelectorAll(".provider-box");
    boxes.forEach((box, i) => {
        const id = box.dataset.id;
        params.set(`p${i}n`, document.getElementById(`name${id}`).value);
        params.set(`p${i}s`, document.getElementById(`subCost${id}`).value);
        params.set(`p${i}r`, document.getElementById(`rate${id}`).value);
        // SAVE DISCOUNT
        params.set(`p${i}d`, document.getElementById(`discount${id}`).value);
    });
    // ... (your original clipboard logic)
}