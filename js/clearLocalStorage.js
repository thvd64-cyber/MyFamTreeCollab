// ===============================
// Auto-clear localStorage na export/create
// ===============================
(function() {
    const prefixes = ["import_", "create_", "export_"]; // keys die we willen verwijderen

    function clearAppLocalStorage() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (prefixes.some(prefix => key.startsWith(prefix))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            if(keysToRemove.length) {
                console.log(`LocalStorage keys verwijderd: ${keysToRemove.join(", ")}`);
            }
        } catch (error) {
            console.error("Fout bij het verwijderen van localStorage keys:", error);
        }
    }

    // Vervang hier de selectors door je eigen knoppen
    const exportButton = document.querySelector("#exportBtn");
    const createButton = document.querySelector("#createBtn");

    if(exportButton) exportButton.addEventListener("click", clearAppLocalStorage);
    if(createButton) createButton.addEventListener("click", clearAppLocalStorage);
})();
