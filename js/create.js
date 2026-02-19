// =======================================
// create.js
// Beheer van de create-pagina: toevoegen van eerste persoon
// =======================================

// Haal bestaande stamboomdata op of start met lege array
let stamboomData = JSON.parse(localStorage.getItem('stamboomData') || '[]');

// Elementen
const form = document.getElementById('addPersonForm');
const statusMessage = document.getElementById('statusMessage');

// =======================
// Eenvoudige ID-generator
// =======================
function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    // Eerste letters van doopnaam, roepnaam, achternaam + eerste letter van geslacht + timestamp
    const code = (doopnaam[0] || '') + (roepnaam[0] || '') + (achternaam[0] || '') + (geslacht[0] || '') + Date.now();
    return code.toUpperCase();
}

// =======================
// Form submit handler
// =======================
form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Lees form input
    const doopnaam = document.getElementById('doopnaam').value.trim();
    const roepnaam = document.getElementById('roepnaam').value.trim();
    const prefix = document.getElementById('prefix').value.trim();
    const achternaam = document.getElementById('achternaam').value.trim();
    const geboorte = document.getElementById('geboorte').value;
    const geslacht = document.getElementById('geslacht').value;

    // Genereer unieke ID
    const uniekeID = genereerCode(doopnaam, roepnaam, achternaam, geslacht);

    // Bouw persoon object
    const person = {
        ID: uniekeID,
        Relatie: 'Hoofd-ID',       // eerste persoon
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

    // Voeg toe aan stamboomdata en sla op
    stamboomData.push(person);
    localStorage.setItem('stamboomData', JSON.stringify(stamboomData));

    // Reset form
    form.reset();

    // Toon statusmelding
    statusMessage.style.display = 'block';
    statusMessage.style.backgroundColor = '#d4edda';
    statusMessage.style.color = '#155724';
    statusMessage.textContent = `${doopnaam} is toegevoegd!`;

    // Verberg statusmelding na 3 seconden
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);

    // Optioneel: direct doorsturen naar Manage-pagina
    // window.location.href = '../manage/manage.html';
});
