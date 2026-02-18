// =======================================
// export.js
// Exporteer stamboomData naar CSV
// Slaat op in dezelfde gekozen locatie
// =======================================

const headers = [
    "ID",
    "Doopnaam",
    "Roepnaam",
    "Prefix",
    "Achternaam",
    "Geslacht",
    "Geboortedatum",
    "Geboorteplaats",
    "Overlijdensdatum",
    "Overlijdensplaats",
    "Vader",
    "Moeder ID",
    "Partner ID",
    "Huwelijksdatum",
    "Huwelijksplaats",
    "Opmerkingen",
    "Adres",
    "ContactInfo",
    "URL"
];

let fileHandle = null;

document.getElementById("exportBtn").addEventListener("click", async function () {

    const status = document.getElementById("exportStatus");

    const data = JSON.parse(localStorage.getItem("stamboomData") || "[]");

    if (data.length === 0) {
        status.innerHTML = "❌ Geen data om te exporteren.";
        status.style.color = "red";
        return;
    }

    let csvContent = "";
    csvContent += headers.join(",") + "\n";

    data.forEach(person => {
        const row = headers.map(header => person[header] ? person[header] : "");
        csvContent += row.join(",") + "\n";
    });

    try {

        // Als nog geen locatie gekozen → laat gebruiker kiezen
        if (!fileHandle) {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: "stamboom_export.csv",
                types: [{
                    description: "CSV bestand",
                    accept: { "text/csv": [".csv"] }
                }]
            });
        }

        const writable = await fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();

        status.innerHTML = "✅ CSV succesvol geëxporteerd.";
        status.style.color = "green";

    } catch (error) {

        status.innerHTML = "❌ Export geannuleerd of mislukt.";
        status.style.color = "red";
    }
});
