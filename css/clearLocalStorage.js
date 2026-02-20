// ===============================
// Functie om specifieke localStorage keys te verwijderen
// ===============================
function clearAppLocalStorage(prefixes = ["import_", "create_", "export_"]) {
    try {
        const keysToRemove = [];

        // Loop door alle localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Check of key begint met een van de opgegeven prefixes
            if (prefixes.some(prefix => key.startsWith(prefix))) {
                keysToRemove.push(key);
            }
        }

        // Verwijder de gevonden keys
        keysToRemove.forEach(key => localStorage.removeItem(key));

        console.log(`LocalStorage keys verwijderd: ${keysToRemove.join(", ")}`);
    } catch (error) {
        console.error("Fout bij het verwijderen van localStorage keys:", error);
    }
}

// ===============================
// Voorbeeld van gebruik
// ===============================
// Na export of create proces
// clearAppLocalStorage();
