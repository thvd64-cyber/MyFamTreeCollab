/* ======================= js/export.js v1.2.3 ======================= */
/* CSV-export van stamboomData inclusief extra kolommen tot veld 22
   - Compatibel met moderne en oudere browsers
   - Veilig gebruik van showSaveFilePicker zonder SecurityError
   - Inline uitleg achter elke regel voor makkelijk onderhoud
*/

function escapeCSV(value) { // functie om waarden correct te escapen voor CSV
    if (value == null) return ""; // null of undefined wordt lege string
    const str = String(value).replace(/"/g, '""'); // dubbele quotes verdubbelen
    return `"${str}"`; // waarde tussen dubbele quotes plaatsen
}

document.getElementById("exportBtn").addEventListener("click", async function () { // click-handler voor export knop
    const status = document.getElementById("exportStatus"); // element om status te tonen
    const data = StamboomStorage.get(); // haal alle personen uit storage

    if (!data.length) { // geen data om te exporteren
        status.innerHTML = "❌ Geen data om te exporteren."; // meld gebruiker
        status.style.color = "red"; // rood tonen
        return; // stop verder uitvoeren
    }

    // ======================= DYNAMISCHE HEADERS =======================
    // verzamel alle keys van alle objecten, incl. _extra
    const headersSet = new Set();
    data.forEach(person => {
        Object.keys(person).forEach(key => {
            if(key !== "_extra") headersSet.add(key); // normale velden
        });
        if(person._extra) { // voeg _extra kolommen toe als aparte kolommen
            person._extra.forEach((_,i) => headersSet.add(`Extra${i+15}`)); // Extra15 t/m Extra22
        }
    });
    const headers = Array.from(headersSet); // converteer Set naar array

    // ======================= CSV CONTENT BOUWEN =======================
    let csvContent = headers.map(escapeCSV).join(",") + "\n"; // eerste rij = headers

    data.forEach(person => {
        const row = []; // rij voor huidige persoon
        headers.forEach(h => {
            if(h.startsWith("Extra")) { // extra kolommen
                const index = parseInt(h.replace("Extra","")) - 15; // 0-based index in _extra array
                row.push(escapeCSV(person._extra && person._extra[index] ? person._extra[index] : "")); // vul lege string indien niet aanwezig
            } else { // normale kolommen
                row.push(escapeCSV(person[h] ?? "")); // null/undefined → lege string
            }
        });
        csvContent += row.join(",") + "\n"; // voeg rij toe aan CSV
    });

    // ======================= BESTANDSNAAM =======================
    const now = new Date(); // huidige datum voor standaard naam
    const defaultName = `stamboom_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`; // YYYYMMDD
    const fileName = defaultName; // gebruik standaard naam (geen prompt, voorkomt SecurityError)

    try {
        if (window.showSaveFilePicker) { // moderne browsers
            const fileHandle = await window.showSaveFilePicker({ // open file picker
                suggestedName: fileName, // standaard naam
                types: [{ description: "CSV bestand", accept: {"text/csv": [".csv"]} }] // alleen CSV
            });
            const writable = await fileHandle.createWritable(); // open schrijfbare stream
            await writable.write(csvContent); // schrijf CSV
            await writable.close(); // sluit bestand
        } else { // fallback oudere browsers
            const blob = new Blob([csvContent], {type: "text/csv"}); // maak CSV blob
            const url = URL.createObjectURL(blob); // maak tijdelijke URL
            const a = document.createElement("a"); // link element
            a.href = url; // link naar blob
            a.download = fileName; // download naam
            document.body.appendChild(a); // voeg toe aan DOM
            a.click(); // trigger download
            document.body.removeChild(a); // verwijder link
            URL.revokeObjectURL(url); // cleanup
        }

        status.innerHTML = "✅ CSV succesvol geëxporteerd als " + fileName; // succesmelding
        status.style.color = "green"; // groen
    } catch (error) {
        console.error(error); // log fout
        status.innerHTML = "❌ Export geannuleerd of mislukt."; // foutmelding
        status.style.color = "red"; // rood
    }
});
