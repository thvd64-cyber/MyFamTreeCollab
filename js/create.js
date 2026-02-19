// =======================================
// create.js
// Beheer van de create-pagina: toevoegen van eerste persoon
// =======================================

// Haal bestaande stamboomdata op of start met lege array
let stamboomData = JSON.parse(localStorage.getItem('stamboomData') || '[]');

// Elementen
const form = document.getElementById('addPersonForm');

// Functie om ID te genereren (optioneel, aparte idGenerator.js wordt gebruikt)
// function generateID() {
//     return 'p' + Date.now();
// }

// =======================
// Voeg persoon toe bij submit
// =======================
form.addEventListener('submit', function(e){
    e.preventDefault();

    const doopnaam = document.getElementById('doopnaam').value;
    const roepnaam = document.getElementById('roepnaam').value;
    const prefix = document.getElementById('prefix').value;
    const achternaam = document.getElementById('achternaam').value;
    const geboorte = document.getElementById('geboorte').value;
    const geslacht = document.getElementById('geslacht').value;

    // Genereer automatisch unieke ID via idGenerator.js
    const uniekeID = genereerCode(doopnaam, roepnaam, achternaam, geslacht);

    const person = {
        ID: uniekeID,           // unieke code als ID
        Relatie: 'Hoofd-ID',    // standaard eerste persoon
        Doopnaam: doopnaam,
        Roepnaam: roepnaam,
        Prefix: prefix,
        Achternaam: achternaam,
        Geslacht: geslacht,
        Geboortedatum: geboorte,
        Geboorteplaats: '',
        Overlijdensdatum: '',
        Overlijdensplaats: '',
        VaderID: null,
        MoederID: null,
        PartnerID: null,
        Huwelijksdatum: '',
        Huwelijksplaats: '',
        Opmerkingen: '',
        Adres: '',
        ContactInfo: '',
        URL: ''
    };

    // Voeg toe aan stamboomdata
    stamboomData.push(person);

    // Sla op in localStorage
    localStorage.setItem('stamboomData', JSON.stringify(stamboomData));

    // Reset formulier
    form.reset();
});
