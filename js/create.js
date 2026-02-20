// =======================================
// create.js - lean integratie met schema
// =======================================

// Gebruik sessionStorage zodat data verdwijnt bij sluiten van het tabblad
let stamboomData = JSON.parse(sessionStorage.getItem('stamboomData') || '[]');

const form = document.getElementById('addPersonForm');
const statusMessage = document.getElementById('statusMessage');

// =======================
// ID-generator
// =======================
function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    return (doopnaam[0] || '') + (roepnaam[0] || '') + (achternaam[0] || '') + (geslacht[0] || 'X') + Date.now();
}

// =======================
// Form submit handler
// =======================
form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Lees formulierwaarden
    const doopnaam = document.getElementById('doopnaam').value.trim();
    const roepnaam = document.getElementById('roepnaam').value.trim();
    const prefix = document.getElementById('prefix').value.trim();
    const achternaam = document.getElementById('achternaam').value.trim();
    const geboorte = document.getElementById('geboorte').value;
    const geslacht = document.getElementById('geslacht').value;

    const uniekeID = genereerCode(doopnaam, roepnaam, achternaam, geslacht);

    // ==== Gebruik schema voor lege persoon ====
    const person = StamboomSchema.empty();

    // Vul velden vanuit formulier
    person.ID = uniekeID;
    person.Doopnaam = doopnaam;
    person.Roepnaam = roepnaam;
    person.Prefix = prefix;
    person.Achternaam = achternaam;
    person.Geslacht = geslacht;
    person.Geboortedatum = geboorte; // kan later als Date gebruikt worden
    person.Relatie = 'Hoofd-ID';

    // Partner/relaties leeg via schema helper
    person.PartnerID = StamboomSchema.stringifyPartners([]);

    // Stamboom opslaan
    stamboomData.push(person);
    sessionStorage.setItem('stamboomData', JSON.stringify(stamboomData));

    form.reset();

    // Statusmelding
    statusMessage.style.display = 'block';
    statusMessage.style.backgroundColor = '#d4edda';
    statusMessage.style.color = '#155724';
    statusMessage.textContent = `${doopnaam} is toegevoegd!`;

    setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);
});
