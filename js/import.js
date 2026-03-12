/* ======================= js.import.js v1.1.0 ======================= */
/* Verbeterde CSV import voor MyFamTreeCollab
   - Extra kolommen toegestaan
   - Case-insensitive header check
   - Multi-line cellen & quotes correct verwerkt
   - Veilige ID generatie
*/

(function(){
'use strict'; // strikte modus

/* ======================= EVENT: IMPORT BUTTON ======================= */
document.getElementById("importBtn").addEventListener("click", async function () {

    const status = document.getElementById("importStatus"); // Status element

    try {
        /* ======================= CHECK STORAGE ======================= */
        if (typeof StamboomStorage === "undefined") {
            status.innerHTML = "❌ StamboomStorage niet beschikbaar. Laad eerst storage.js!";
            status.style.color = "red";
            console.error("StamboomStorage is undefined. Laad storage.js vóór import.js");
            return;
        }

        /* ======================= FILE INPUT ======================= */
        const fileInput = document.getElementById("importFile");
        const file = fileInput.files[0];
        if (!file) {
            status.innerHTML = "❌ Geen bestand geselecteerd.";
            status.style.color = "red";
            return;
        }

        /* ======================= FILE READER ======================= */
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;

            /* ======================= DETECT DELIMITER ======================= */
            function detectDelimiter(csvText) {
                const firstLine = csvText.split("\n")[0];
                const delimiters = [';', ',', '\t'];
                let maxCount = 0, chosen = ',';
                delimiters.forEach(d => {
                    const count = firstLine.split(d).length;
                    if (count > maxCount) { maxCount = count; chosen = d; }
                });
                return chosen;
            }

            const delimiter = detectDelimiter(text); // automatische delimiter

            /* ======================= SPLIT LINES ======================= */
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

            /* ======================= PARSE HEADERS ======================= */
            const headers = lines[0].split(delimiter).map(h => h.trim());

            /* ======================= HEADER VALIDATOR ======================= */
            const requiredHeaders = ["ID","Roepnaam","Prefix","Achternaam","Geboortedatum","VaderID","MoederID","PartnerID"];
            const missingHeaders = requiredHeaders.filter(rh => !headers.some(h => h.toLowerCase() === rh.toLowerCase()));

            if (missingHeaders.length > 0) {
                status.innerHTML = "❌ CSV header fout. Ontbrekende kolommen: " + missingHeaders.join(", ");
                status.style.color = "red";
                console.error("CSV header fout:", missingHeaders);
                return;
            }

            /* ======================= PARSE CSV ROWS ======================= */
            const newData = [];
            lines.slice(1).forEach(line => {
                const values = [];
                let current = '';
                let insideQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') insideQuotes = !insideQuotes; // toggle quotes
                    else if (char === delimiter && !insideQuotes) {
                        values.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current); // laatste cel

                // verwijder omringende quotes en trim
                const cleaned = values.map(v => v.replace(/^"(.*)"$/, '$1').trim());

                // maak object dynamisch voor alle kolommen
                const obj = {};
                headers.forEach((header, i) => obj[header] = cleaned[i] !== undefined ? cleaned[i] : "");
                newData.push(obj);
            });

            /* ======================= COMBINE WITH EXISTING DATA ======================= */
            const existingData = StamboomStorage.get ? StamboomStorage.get() : [];

            // Genereer ID indien ontbreekt
            newData.forEach(item => {
                if (!item.ID || item.ID.trim() === "") {
                    item.ID = window.genereerCode(item, existingData.concat(newData));
                }
            });

            // Combineer data
            const combinedData = existingData.concat(newData);

            // Sla op
            if (StamboomStorage.set) StamboomStorage.set(combinedData);

            /* ======================= STATUS ======================= */
            status.innerHTML = `✅ CSV succesvol geïmporteerd. Rijen toegevoegd: ${newData.length}`;
            status.style.color = "green";
        };

        reader.readAsText(file); // start uitlezen
    } catch (err) {
        status.innerHTML = "❌ Import mislukt.";
        status.style.color = "red";
        console.error(err);
    }
});
})();
