// ======================= js/export.js v0.2.0 =======================
// Robuuste CSV-export van stamboomData
// Compatibel met alle browsers, veilige CSV, met bestandsnaam & locatie prompt
// =======================================

// 1️⃣ Headers definiëren voor CSV
const headers = [
    "ID", "Doopnaam", "Roepnaam", "Prefix", "Achternaam", "Geslacht",
    "Geboortedatum", "Geboorteplaats", "Overlijdensdatum", "Overlijdensplaats",
    "Vader", "Moeder ID", "Partner ID", "Huwelijksdatum", "Huwelijksplaats",
    "Opmerkingen", "Huisadressen", "ContactInfo", "URL"
];

// 2️⃣ Mapping van headers naar object-property namen
const mapping = {
    "ID": "id",
    "Doopnaam": "doopnaam",
    "Roepnaam": "roepnaam",
    "Prefix": "prefix",
    "Achternaam": "achternaam",
    "Geslacht": "geslacht",
    "Geboortedatum": "geboortedatum",
    "Geboorteplaats": "geboorteplaats",
    "Overlijdensdatum": "overlijdensdatum",
    "Overlijdensplaats": "overlijdensplaats",
    "Vader": "vader",
    "Moeder ID": "moederId",
    "Partner ID": "partnerId",
    "Huwelijksdatum": "huwelijksdatum",
    "Huwelijksplaats": "huwelijksplaats",
    "Opmerkingen": "opmerkingen",
    "Huisadressen": "huisadressen",
    "ContactInfo": "contactInfo",
    "URL": "url"
};

// 3️⃣ CSV-veld veilig maken
function escapeCSV(value) {
    if (value == null) return "";                        
    const str = String(value).replace(/"/g, '""');       
    return `"${str}"`;                                   
}

// 4️⃣ Event listener op export knop
document.getElementById("exportBtn").addEventListener("click", async function () {
    const status = document.getElementById("exportStatus");                 
    const data = JSON.parse(localStorage.getItem("stamboomData") || "[]"); 

    if (data.length === 0) {                                               
        status.innerHTML = "❌ Geen data om te exporteren.";               
        status.style.color = "red";
        return;
    }

    // 5️⃣ Standaard bestandsnaam op basis van datum
    const now = new Date();
    const defaultName = `stamboom_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`;

    // 6️⃣ Vraag gebruiker om bestandsnaam (zonder .csv) en locatie
    let userFileName = prompt("Voer bestandsnaam in (zonder .csv):", defaultName.replace(".csv",""));
    if (!userFileName) userFileName = defaultName.replace(".csv",""); // fallback
    const fileName = `${userFileName}.csv`;

    // 7️⃣ CSV inhoud opbouwen
    let csvContent = headers.map(escapeCSV).join(",") + "\n";              
    data.forEach(person => {
        const row = headers.map(header => escapeCSV(person[mapping[header]] || "")); 
        csvContent += row.join(",") + "\n";                                
    });

    try {
        if (window.showSaveFilePicker) {                                   
            // Moderne API met default bestandsnaam
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: "CSV bestand",
                    accept: { "text/csv": [".csv"] }
                }]
            });
            const writable = await fileHandle.createWritable();           
            await writable.write(csvContent);                               
            await writable.close();                                         
        } else {
            // 8️⃣ Fallback download via Blob
            const blob = new Blob([csvContent], { type: "text/csv" });     
            const url = URL.createObjectURL(blob);                         
            const a = document.createElement("a");                          
            a.href = url;
            a.download = fileName;                                         
            document.body.appendChild(a);                                   
            a.click();                                                      
            document.body.removeChild(a);                                   
            URL.revokeObjectURL(url);                                       
        }

        status.innerHTML = "✅ CSV succesvol geëxporteerd als " + fileName;  
        status.style.color = "green";
    } catch (error) {
        console.error(error);                                               
        status.innerHTML = "❌ Export geannuleerd of mislukt.";             
        status.style.color = "red";
    }
});
