// ======================= import.js (lean, schema-integratie, geen ID-generatie) =======================

// Elementen
const fileInput = document.getElementById('csvFileInput');
const status = document.getElementById('importStatus');

// Functie om CSV te lezen en te importeren
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

        const importedData = [];
        const existingData = JSON.parse(sessionStorage.getItem('stamboomData') || '[]');

        lines.forEach((line, index) => {
            // Parse via schema (robust tegen quotes, line breaks)
            let person = StamboomSchema.fromCSV(line);

            if (!person) {
                console.warn(`Rij ${index+1} kon niet worden verwerkt.`);
                return;
            }

            // Geen ID-generator: gebruik exact de ID uit CSV
            // PartnerID default = lege pipe als veld ontbreekt
            if (!person.PartnerID) {
                person.PartnerID = StamboomSchema.stringifyPartners([]);
            }

            // Geslacht default indien leeg
            if (!person.Geslacht) {
                person.Geslacht = 'X';
            }

            // Alleen toevoegen als ID nog niet bestaat
            if (!existingData.some(e => e.ID === person.ID)) {
                existingData.push(person);
                importedData.push(person);
            }
        });

        // Opslaan in sessionStorage
        sessionStorage.setItem('stamboomData', JSON.stringify(existingData));

        // Statusmelding
        status.textContent = importedData.length
            ? `✅ CSV geladen: ${importedData.length} personen toegevoegd.`
            : `⚠️ Geen nieuwe personen toegevoegd.`;
    };

    reader.onerror = function() {
        status.textContent = "❌ Fout bij het lezen van het bestand.";
    };

    reader.readAsText(file);
});
