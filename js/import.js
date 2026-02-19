// ======================= import.js =======================

// Elementen
const fileInput = document.getElementById('csvFileInput');
const status = document.getElementById('importStatus');

// ID-generator (zelfde logica als Create.js)
function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    return (doopnaam[0] || '') + 
           (roepnaam[0] || '') + 
           (achternaam[0] || '') + 
           (geslacht[0] || 'X') + 
           Date.now();
}

// Functie om CSV te lezen en te importeren
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

        // Array voor stamboomData
        const importedData = [];

        lines.forEach((line, index) => {
            const fields = line.split(",");

            // Zorg dat elke rij precies 20 velden heeft
            while (fields.length < 20) fields.push("");
            fields.length = 20;

            const person = {
                ID: fields[0].trim(),
                Relatie: fields[1].trim(),
                Doopnaam: fields[2].trim(),
                Roepnaam: fields[3].trim(),
                Prefix: fields[4].trim(),
                Achternaam: fields[5].trim(),
                Geslacht: fields[6].trim(),
                Geboortedatum: fields[7].trim(),
                Geboorteplaats: fields[8].trim(),
                Overlijdensdatum: fields[9].trim(),
                Overlijdensplaats: fields[10].trim(),
                VaderID: fields[11].trim(),
                MoederID: fields[12].trim(),
                PartnerID: fields[13].trim(),
                Huwelijksdatum: fields[14].trim(),
                Huwelijksplaats: fields[15].trim(),
                Opmerkingen: fields[16].trim(),
                Adres: fields[17].trim(),
                ContactInfo: fields[18].trim(),
                URL: fields[19].trim()
            };

            importedData.push(person);
        });

        // Opslaan in sessionStorage
        if (importedData.length > 0) {
            const existingData = JSON.parse(sessionStorage.getItem('stamboomData') || '[]');

            importedData.forEach(p => {

                // Genereer ID indien ontbreekt
                if (!p.ID) {
                    p.ID = genereerCode(p.Doopnaam, p.Roepnaam, p.Achternaam, p.Geslacht || 'X');
                }

                // Vul Relatie automatisch indien leeg
                if (!p.Relatie) {
                    p.Relatie = existingData.length === 0 ? 'Hoofd-ID' : 'Kind';
                }

                // Voeg alleen nieuwe ID’s toe
                if (!existingData.some(e => e.ID === p.ID)) {
                    existingData.push(p);
                }
            });

            sessionStorage.setItem('stamboomData', JSON.stringify(existingData));
            status.textContent = `✅ CSV geladen: ${importedData.length} personen verwerkt.`;
        } else {
            status.textContent = "⚠️ Geen data gevonden in CSV.";
        }
    };

    reader.onerror = function() {
        status.textContent = "❌ Fout bij het lezen van het bestand.";
    };

    reader.readAsText(file);
});
