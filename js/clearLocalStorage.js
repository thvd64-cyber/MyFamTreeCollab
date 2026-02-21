// ===============================
// manageLocalStorage.js
// Wis alle MyFamTreeCollab personen data
// Genereer unieke ID voor nieuwe personen
// Dubbele ID detectie + auto-generate
// ===============================

(function() {

    // ===========================
    // Configuratie
    // ===========================
    const prefixes = ["personen_", "import_", "create_", "export_"]; // keys met personen data
    const extraKeys = ["ID"]; // losse keys
    const dynamicIDPattern = /^XHJ\d+$/; // losse IDs zoals XHJ000001

    // ===========================
    // Functie: Clear alle personen data
    // ===========================
    function clearPersonData() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (
                    prefixes.some(prefix => key.startsWith(prefix)) ||
                    extraKeys.includes(key) ||
                    dynamicIDPattern.test(key)
                ) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            if(keysToRemove.length) {
                console.log(`MyFamTreeCollab data verwijderd: ${keysToRemove.join(", ")}`);
            }
        } catch (error) {
            console.error("Fout bij verwijderen van MyFamTreeCollab data:", error);
        }
    }

    // ===========================
    // Functie: Genereer unieke ID
    // Formaat: XHJ + 6 cijfers
    // ===========================
    function generateUniqueID() {
        let newID;
        const existingIDs = Object.keys(localStorage)
            .filter(key => dynamicIDPattern.test(key) || key === "ID");
        do {
            const randomNumber = Math.floor(Math.random() * 999999) + 1; // 1–999999
            newID = "XHJ" + String(randomNumber).padStart(6, "0");
        } while(existingIDs.includes(newID));
        return newID;
    }

    // ===========================
    // Auto-koppeling aan knoppen
    // ===========================
    const actions = ["create", "import", "refresh"];
    actions.forEach(action => {
        const buttons = document.querySelectorAll(`[data-action="${action}"]`);
        if(buttons.length) {
            buttons.forEach(btn => {
                // Wis eerst oude data
                btn.addEventListener("click", () => {
                    clearPersonData();

                    // Voor create-knop: genereer ID voor nieuwe persoon
                    if(action === "create") {
                        const newID = generateUniqueID();
                        localStorage.setItem(newID, JSON.stringify({id: newID}));
                        console.log(`Nieuwe unieke ID aangemaakt: ${newID}`);
                    }
                });
            });
            console.log(`Auto-clear + ID-gen actief op ${buttons.length} "${action}" knop(pen).`);
        }
    });

    // ===========================
    // Wis bij verlaten / afsluiten pagina
    // ===========================
    window.addEventListener("beforeunload", clearPersonData);

})();
