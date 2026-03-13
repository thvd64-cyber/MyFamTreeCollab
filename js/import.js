/* ======================= js/import.js v2.0.1 ======================= */
/* Robuuste CSV/TXT importer voor MyFamTreeCollab
   - werkt met schema.js v0.1.x en storage.js
   - automatische delimiter detectie
   - BOM verwijdering
   - max 22 kolommen
   - eerste 14 velden volgens schema
   - extra kolommen in _extra
   - ID generatie indien leeg
   - inline uitleg toegevoegd
*/

// ======================= START IMPORT =======================
// wacht tot de pagina volledig geladen is
document.addEventListener("DOMContentLoaded", function() {

    // zoek de import knop
    const btn = document.getElementById("importBtn");
    if(!btn){
        console.error("importBtn niet gevonden");
        return;
    }

    btn.addEventListener("click", async function() { // klik handler

        const status = document.getElementById("importStatus"); // status element

        try {

            /* ======================= STORAGE CHECK ======================= */
            if(typeof StamboomStorage === "undefined"){
                status.innerHTML = "❌ storage.js niet geladen";
                status.style.color = "red";
                console.error("StamboomStorage ontbreekt");
                return;
            }

            /* ======================= SCHEMA CHECK ======================= */
            if(!window.StamboomSchema){
                status.innerHTML = "❌ schema.js niet geladen";
                status.style.color = "red";
                console.error("StamboomSchema ontbreekt");
                return;
            }
            const schema = window.StamboomSchema;

            /* ======================= FILE PICK ======================= */
            const fileInput = document.getElementById("importFile");
            const file = fileInput.files[0];
            if(!file){
                status.innerHTML = "❌ Geen bestand geselecteerd";
                status.style.color = "red";
                return;
            }

            /* ======================= FILE READER ======================= */
            const reader = new FileReader();
            reader.onload = function(e) {

                let text = e.target.result;

                /* ======================= BOM VERWIJDEREN ======================= */
                text = text.replace(/^\uFEFF/, ""); // verwijder UTF-8 BOM

                /* ======================= DELIMITER DETECTIE ======================= */
                function detectDelimiter(csv){
                    const firstLine = csv.split(/\r?\n/)[0];
                    const options = [",",";","\t"];
                    let best = ",";
                    let bestScore = 0;
                    options.forEach(d => {
                        const score = firstLine.split(d).length;
                        if(score > bestScore){
                            bestScore = score;
                            best = d;
                        }
                    });
                    return best;
                }

                const delimiter = detectDelimiter(text);

                /* ======================= SPLIT LINES ======================= */
                const lines = text
                    .split(/\r?\n/)               // split op Windows/Mac
                    .map(l => l.trim())           // verwijder whitespace
                    .filter(l => l.length);       // verwijder lege regels

                if(lines.length < 2){
                    status.innerHTML = "❌ CSV bevat geen data";
                    status.style.color = "red";
                    return;
                }

                /* ======================= HEADER ANALYSE ======================= */
                let headerLine = lines[0];

                // vervang eventuele ; door , voor schema parser
                headerLine = headerLine.replace(/;/g, ",");

                const headerInfo = schema.normalizeHeader(headerLine);

                if(headerInfo.type === "unknown"){
                    status.innerHTML = "❌ Onbekende CSV header";
                    status.style.color = "red";
                    console.error("Header onbekend:", headerLine);
                    return;
                }

                /* ======================= DATA PARSING ======================= */
                const newRows = [];
                const existing = StamboomStorage.get();
                const coreCount = schema.fields.length;       // eerste 14 velden
                const maxColumns = 22;                        // max kolommen totaal

                lines.slice(1).forEach((line, index) => {
                    if(!line.trim()) return; // sla lege regels over

                    /* ======================= CSV SPLIT ======================= */
                    let values = [];
                    let current = "";
                    let insideQuotes = false;

                    for(let i=0; i<line.length; i++){
                        const char = line[i];
                        if(char === '"') {
                            insideQuotes = !insideQuotes; // toggle quote
                        } else if(char === delimiter && !insideQuotes) {
                            values.push(current);
                            current = "";
                        } else {
                            current += char;
                        }
                    }
                    values.push(current);

                    // verwijder omringende quotes
                    values = values.map(v => v.replace(/^"(.*)"$/,'$1').replace(/""/g,'"').trim());

                    // truncate extra kolommen
                    if(values.length > maxColumns) values.length = maxColumns;

                    /* ======================= SCHEMA PARSER ======================= */
                    const obj = schema.fromCSV(line, headerInfo);
                    if(!obj){
                        console.warn("CSV rij overgeslagen:", index+1);
                        return;
                    }

                    /* ======================= EXTRA KOLOMMEN ======================= */
                    obj._extra = values.slice(coreCount, maxColumns);

                    /* ======================= ID GENERATIE ======================= */
                    if(!obj.ID || obj.ID.trim() === ""){
                        obj.ID = window.genereerCode ?
                            window.genereerCode(obj, existing.concat(newRows)) :
                            "P"+Date.now()+Math.floor(Math.random()*1000);
                    }

                    /* ======================= VALIDATIE ======================= */
                    if(!schema.validate(obj)){
                        console.warn("Ongeldige persoon overgeslagen:", obj);
                        return;
                    }

                    newRows.push(obj);
                });

                /* ======================= COMBINE DATA ======================= */
                StamboomStorage.set(existing.concat(newRows));

                /* ======================= SUCCESS ======================= */
                status.innerHTML = `✅ Import voltooid: ${newRows.length} personen toegevoegd`;
                status.style.color = "green";

                console.log("Import completed:", newRows);
            };

            reader.readAsText(file); // start lezen

        } catch(err) {
            status.innerHTML = "❌ Import fout";
            status.style.color = "red";
            console.error(err);
        }

    }); // einde click handler

}); // einde DOMContentLoaded
