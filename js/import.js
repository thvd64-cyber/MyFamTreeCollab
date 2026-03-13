/* ======================= js/import.js v2.0.3 ======================= */
/* Drop-in CSV/TXT importer voor MyFamTreeCollab
   - Geen validatie, geen ID generaties
   - Eerste 14 velden volgens schema.fields
   - Extra kolommen 15-22 → _extra
   - Delimiter detectie: comma, semicolon, tab
   - Quotes handling en embedded delimiters
   - Inline uitleg toegevoegd
*/

// ======================= START IMPORT =======================
document.addEventListener("DOMContentLoaded", function() {

    const btn = document.getElementById("importBtn"); // zoek import knop
    if(!btn){
        console.error("importBtn niet gevonden");
        return;
    }

    btn.addEventListener("click", function() {

        const status = document.getElementById("importStatus"); // element voor statusmeldingen

        if(typeof StamboomStorage === "undefined"){
            status.innerHTML = "❌ storage.js niet geladen";
            status.style.color = "red";
            return;
        }

        if(!window.StamboomSchema){
            status.innerHTML = "❌ schema.js niet geladen";
            status.style.color = "red";
            return;
        }

        const schema = window.StamboomSchema;
        const coreCount = schema.fields.length;  // eerste 14 velden
        const maxColumns = 22;                    // max kolommen totaal

        const fileInput = document.getElementById("importFile");
        const file = fileInput.files[0];
        if(!file){
            status.innerHTML = "❌ Geen bestand geselecteerd";
            status.style.color = "red";
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e){

            let text = e.target.result;
            text = text.replace(/^\uFEFF/, ""); // verwijder BOM indien aanwezig

            // ======================= DELIMITER DETECTIE =======================
            function detectDelimiter(csv){
                const firstLine = csv.split(/\r?\n/)[0];        // eerste regel
                const options = [",",";","\t"];                 // mogelijke delimiters
                let best = ",";
                let bestScore = 0;
                options.forEach(d => {
                    const score = firstLine.split(d).length;
                    if(score > bestScore){ bestScore = score; best = d; }
                });
                return best;
            }

            const delimiter = detectDelimiter(text);

            // ======================= SPLIT LINES =======================
            const lines = text
                .split(/\r?\n/)     // split regels
                .map(l => l.trim()) // trim whitespace
                .filter(l => l.length); // lege regels overslaan

            if(lines.length < 2){
                status.innerHTML = "❌ CSV bevat geen data";
                status.style.color = "red";
                return;
            }

            // ======================= HEADER MAPPING =======================
            const headers = lines[0].split(delimiter).map(h => h.trim());

            // eenvoudige mapping: eerste 14 headers naar schema.fields
            const headerMap = [];
            for(let i=0;i<coreCount;i++){
                headerMap.push(headers[i] ?? schema.fields[i] ?? ""); // fallback naar schema veldnaam
            }

            // ======================= PARSEN VAN RIJEN =======================
            const newRows = [];
            const existing = StamboomStorage.get();

            lines.slice(1).forEach((line,index)=>{

                if(!line.trim()) return; // lege regel overslaan

                // ======================= CSV SPLIT MET QUOTES =======================
                let values = [];
                let current = "";
                let insideQuotes = false;

                for(let i=0;i<line.length;i++){
                    const char = line[i];
                    if(char === '"') insideQuotes = !insideQuotes;
                    else if(char === delimiter && !insideQuotes){
                        values.push(current);
                        current = "";
                    } else current += char;
                }
                values.push(current);

                // verwijder surrounding quotes en dubbele quotes
                values = values.map(v => v.replace(/^"(.*)"$/,'$1').replace(/""/g,'"').trim());

                // ======================= OBJECT MAKEN =======================
                const obj = {};
                for(let j=0;j<coreCount;j++){
                    obj[schema.fields[j]] = values[j] !== undefined ? values[j] : "";
                }

                // ======================= EXTRA KOLOMMEN =======================
                obj._extra = values.slice(coreCount, maxColumns); // kolommen 15-22

                newRows.push(obj);
            });

            // ======================= OPSLAAN =======================
            StamboomStorage.set(existing.concat(newRows));

            status.innerHTML = `✅ Import voltooid: ${newRows.length} personen toegevoegd`;
            status.style.color = "green";
            console.log("Import completed:", newRows);
        };

        reader.readAsText(file);
    });
});
