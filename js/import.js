/* ======================= js/import.js v1.0.8 ======================= */
/* Drop-in voor schema.js v0.0.2 en storage.js v0.0.4
   - Automatische delimiter detectie
   - Dynamische field mapping op basis van schema.js
   - Extra kolommen tot 22 opgeslagen als _extra
   - ID generatie indien leeg
   - Compatibel met dynamische storage.js
*/

document.getElementById("importBtn").addEventListener("click", async function () {

    const status = document.getElementById("importStatus"); // element voor statusmeldingen

    try {

        /* ======================= STORAGE CHECK ======================= */
        if(typeof StamboomStorage === "undefined"){
            status.innerHTML = "❌ StamboomStorage niet beschikbaar. Laad eerst storage.js!";
            status.style.color = "red";
            console.error("StamboomStorage is undefined. Zorg dat storage.js vóór import.js geladen wordt.");
            return;
        }

        /* ======================= SCHEMA CHECK ======================= */
        if(!window.StamboomSchema || !Array.isArray(window.StamboomSchema.fields)){
            status.innerHTML = "❌ StamboomSchema niet geladen!";
            status.style.color = "red";
            console.error("StamboomSchema niet beschikbaar");
            return;
        }

        /* ======================= FILE PICK ======================= */
        const fileInput = document.getElementById("importFile");
        const file = fileInput.files[0];
        if(!file){
            status.innerHTML = "❌ Geen bestand geselecteerd.";
            status.style.color = "red";
            return;
        }

        /* ======================= FILE READER ======================= */
        const reader = new FileReader();
        reader.onload = function(e){
            const text = e.target.result;

            /* ======================= DETECT DELIMITER ======================= */
            function detectDelimiter(csvText) {
                const firstLine = csvText.split("\n")[0]; // neem header
                const delimiters = [';', ',', '\t']; // mogelijke delimiters
                let maxCount = 0, chosen = ',';
                delimiters.forEach(d => {
                    const count = firstLine.split(d).length;
                    if(count > maxCount){ maxCount = count; chosen = d; }
                });
                return chosen;
            }

            const delimiter = detectDelimiter(text);

            /* ======================= SPLIT LINES ======================= */
            const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            if(lines.length < 2){
                status.innerHTML = "❌ CSV bevat geen data.";
                status.style.color = "red";
                return;
            }

            /* ======================= PARSE HEADERS ======================= */
            const headers = lines[0].split(delimiter).map(h => h.trim());

            /* ======================= HEADER VALIDATION ======================= */
            const missingHeaders = window.StamboomSchema.fields.filter(f => !headers.includes(f));
            if(missingHeaders.length > 0){
                status.innerHTML = "❌ CSV header fout. Ontbrekende kolommen: " + missingHeaders.join(", ");
                status.style.color = "red";
                console.error("CSV header fout. Ontbrekend:", missingHeaders);
                return;
            }

            /* ======================= PARSE CSV TO OBJECTS ======================= */
            let newData = [];
            const schemaLength = window.StamboomSchema.fields.length;

            lines.slice(1).forEach(line => {
                let values = [], current = '', insideQuotes = false;
                for(let i=0;i<line.length;i++){
                    const char = line[i];
                    if(char === '"') insideQuotes = !insideQuotes;
                    else if(char === delimiter && !insideQuotes){ values.push(current); current=''; }
                    else current += char;
                }
                values.push(current); // laatste waarde
                values = values.map(v => v.replace(/^"(.*)"$/,'$1').trim());

                /* ======================= MAP CSV NAAR SCHEMA ======================= */
                const obj = {};
                for(let j=0; j<schemaLength; j++){
                    obj[window.StamboomSchema.fields[j]] = values[j] !== undefined ? values[j] : "";
                }

                // extra kolommen tot veld 22 bewaren
                obj._extra = values.slice(schemaLength, 22);

                /* ======================= ID GENERATIE ======================= */
                if(!obj.ID || obj.ID.trim()===""){
                    obj.ID = window.genereerCode ? window.genereerCode(obj, StamboomStorage.get().concat(newData)) : 'P'+Date.now();
                }

                newData.push(obj);
            });

            /* ======================= COMBINE MET BESTAANDE DATA ======================= */
            const existingData = StamboomStorage.get();
            const combinedData = existingData.concat(newData);
            StamboomStorage.set(combinedData);

            /* ======================= SUCCESS ======================= */
            status.innerHTML = `✅ CSV succesvol geïmporteerd. ${newData.length} rijen toegevoegd.`;
            status.style.color = "green";
            console.log("CSV import completed:", newData);
        };

        reader.readAsText(file);

    } catch(error){
        status.innerHTML = "❌ Import mislukt.";
        status.style.color = "red";
        console.error(error);
    }
});
