/* ======================= js/import.js v2.0.2 ======================= */
/* Drop-in CSV/TXT importer voor MyFamTreeCollab
   - ondersteunt schema.js v0.1.x
   - BOM verwijdering
   - delimiter detectie: comma, semicolon, tab
   - quotes en embedded commas correct
   - eerste 14 schema velden worden herkend
   - extra kolommen 15-22 opgeslagen in _extra
   - automatische ID generatie indien leeg
   - datum dd-mm-yyyy → yyyy-mm-dd
   - inline uitleg toegevoegd voor onderhoud
*/

// ======================= START IMPORT =======================
document.addEventListener("DOMContentLoaded", function() {

    const btn = document.getElementById("importBtn"); // import knop
    if(!btn){
        console.error("importBtn niet gevonden");
        return;
    }

    btn.addEventListener("click", async function() {

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

            const schema = window.StamboomSchema;             // schema referentie
            const coreCount = schema.fields.length;           // eerste 14 velden
            const maxColumns = 22;                             // max kolommen totaal

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
                text = text.replace(/^\uFEFF/, "");

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
                    .split(/\r?\n/)        // Windows/Mac line endings
                    .map(l => l.trim())    // whitespace verwijderen
                    .filter(l => l.length); // lege regels overslaan

                if(lines.length < 2){
                    status.innerHTML = "❌ CSV bevat geen data";
                    status.style.color = "red";
                    return;
                }

                /* ======================= HEADER NORMALISATIE ======================= */
                let headerLine = lines[0];

                // vervang tabs en ; door , zodat schema normalizeHeader werkt
                headerLine = headerLine.replace(/\t/g, ",").replace(/;/g, ",");

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

                lines.slice(1).forEach((line, index) => {

                    if(!line.trim()) return; // lege regel overslaan

                    /* ======================= CSV SPLIT + QUOTES ======================= */
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

                    // truncate naar maxColumns
                    if(values.length > maxColumns) values.length = maxColumns;

                    /* ======================= SCHEMA PARSER ======================= */
                    const obj = schema.fromCSV(line, headerInfo);
                    if(!obj){
                        console.warn("CSV rij overgeslagen:", index+1);
                        return;
                    }

                    /* ======================= EXTRA KOLOMMEN ======================= */
                    obj._extra = values.slice(coreCount, maxColumns);

                    /* ======================= DATUM CONVERSIE dd-mm-yyyy → yyyy-mm-dd ======================= */
                    ["Geboortedatum","Overlijdensdatum"].forEach(f => {
                        if(obj[f] && /^\d{1,2}-\d{1,2}-\d{4}$/.test(obj[f])){
                            const parts = obj[f].split("-");
                            obj[f] = `${parts[2].padStart(4,"0")}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
                        }
                    });

                    /* ======================= ID GENERATIE ======================= */
                    if(!obj.ID || obj.ID.trim()===""){
                        obj.ID = window.genereerCode ?
                            window.genereerCode(obj, existing.concat(newRows)) :
                            "P"+Date.now()+Math.floor(Math.random()*1000);
                    }

                    /* ======================= BASIS VALIDATIE ======================= */
                    if(!schema.validate(obj)){
                        console.warn("Ongeldige persoon overgeslagen:", obj);
                        return;
                    }

                    newRows.push(obj);
                });

                /* ======================= COMBINEER EN OPSLAAN ======================= */
                StamboomStorage.set(existing.concat(newRows));

                /* ======================= SUCCESS ======================= */
                status.innerHTML = `✅ Import voltooid: ${newRows.length} personen toegevoegd`;
                status.style.color = "green";

                console.log("Import completed:", newRows);
            };

            reader.readAsText(file); // start lezen

        } catch(err){
            status.innerHTML = "❌ Import fout";
            status.style.color = "red";
            console.error(err);
        }

    }); // einde click handler

}); // einde DOMContentLoaded
