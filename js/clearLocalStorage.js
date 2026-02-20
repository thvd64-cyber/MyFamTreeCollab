// ===============================
// Clear localStorage bij "Bestand kiezen" knop
// ===============================
(function() {
    const prefixes = ["import_", "create_", "export_"]; // keys die we willen verwijderen
    const extraKeys = ["ID"]; // losse keys zoals ID

    function clearAppLocalStorage() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (prefixes.some(prefix => key.startsWith(prefix)) || extraKeys.includes(key)) {
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

    // Koppel de functie aan de "Bestand kiezen" knop
    const bestandKiezenButton = document.querySelector("#bestandKiezenBtn");
    if(bestandKiezenButton) {
        bestandKiezenButton.addEventListener("click", clearAppLocalStorage);
        console.log(`LocalStorage auto-clear actief op "Bestand kiezen" knop.`);
    } else {
        console.warn('Knop "Bestand kiezen" niet gevonden.');
    }
})();
