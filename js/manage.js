// =======================================
// manage.js
// Beheer van stamboom: toevoegen en tonen van personen tot tweede graad
// =======================================

// Haal bestaande stamboomdata op of start met lege array
let stamboomData = JSON.parse(localStorage.getItem('stamboomData') || '[]');

// Voeg Relatie toe aan bestaande data als ontbrekend (bijv. bij upload of create)
stamboomData.forEach(p => {
    if (!p.Relatie) {
        p.Relatie = (stamboomData.indexOf(p) === 0) ? 'Hoofd-ID' : 'Kind';
    }
});

// Sla eventueel bijgewerkte data terug op
localStorage.setItem('stamboomData', JSON.stringify(stamboomData));

// Elementen
const form = document.getElementById('addPersonForm');
const tableContainer = document.getElementById('stamboomTable');

// =======================
// Voeg persoon toe bij submit
// =======================
form.addEventListener('submit', function(e){
    e.preventDefault();

    const doopnaam = document.getElementById('doopnaam').value;
    const roepnaam = document.getElementById('roepnaam').value;
    const prefix = document.getElementById('prefix').value;
    const achternaam = document.getElementById('achternaam').value;
    const geboorte = document.getElementById('geboortedatum').value;
    const geslacht = document.getElementById('geslacht').value;
    const relatie = document.getElementById('relatie').value || 'Kind';
    const vaderID = document.getElementById('vaderID').value || null;
    const moederID = document.getElementById('moederID').value || null;

    // Nieuwe ID genereren via idGenerator.js
    const uniekeID = genereerCode(doopnaam, roepnaam, achternaam, geslacht);

    const person = {
        ID: uniekeID,
        Relatie: relatie,
        Doopnaam: doopnaam,
        Roepnaam: roepnaam,
        Prefix: prefix,
        Achternaam: achternaam,
        Geslacht: geslacht,
        Geboortedatum: geboorte,
        Geboorteplaats: '',
        Overlijdensdatum: '',
        Overlijdensplaats: '',
        VaderID: vaderID,
        MoederID: moederID,
        PartnerID: null,
        Huwelijksdatum: '',
        Huwelijksplaats: '',
        Opmerkingen: '',
        Adres: '',
        ContactInfo: '',
        URL: ''
    };

    // Voeg toe aan stamboomData
    stamboomData.push(person);

    // Sla alles op in localStorage
    localStorage.setItem('stamboomData', JSON.stringify(stamboomData));

    // Update tabel
    renderTable();

    // Reset formulier
    form.reset();
});

// =======================
// Render tabel met kleurcodering
// =======================
function renderTable() {
    tableContainer.innerHTML = '';

    if(stamboomData.length === 0){
        tableContainer.innerHTML = '<p>Geen personen toegevoegd.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'stamboom-table';

    // Header
    const header = document.createElement('tr');
    const headers = [
        'Relatie', 'ID', 'Doopnaam', 'Roepnaam', 'Prefix', 'Achternaam', 'Geslacht',
        'Geboortedatum', 'Geboorteplaats', 'Overlijdensdatum', 'Overlijdensplaats',
        'Vader ID', 'Moeder ID', 'Partner ID', 'Huwelijksdatum', 'Huwelijksplaats',
        'Opmerkingen', 'Adres', 'ContactInfo', 'URL'
    ];
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        header.appendChild(th);
    });
    table.appendChild(header);

    // Rijen
    stamboomData.forEach(p => {
        const tr = document.createElement('tr');

        // Kleurcodering op basis van relatie
        switch(p.Relatie){
            case 'Ouder': tr.style.backgroundColor = 'teal'; break;
            case 'Hoofd-ID': tr.style.backgroundColor = 'yellow'; break;
            case 'Partner': tr.style.backgroundColor = 'lightgray'; break;
            case 'Kind': tr.style.backgroundColor = 'lightgreen'; break;
            case 'Ex-partner': tr.style.backgroundColor = 'darkgray'; break;
            case 'Broer/Zus': tr.style.backgroundColor = 'cream'; break;
            default: tr.style.backgroundColor = 'white'; break;
        }

        const cells = [
            p.Relatie, p.ID, p.Doopnaam, p.Roepnaam, p.Prefix, p.Achternaam, p.Geslacht,
            p.Geboortedatum, p.Geboorteplaats, p.Overlijdensdatum, p.Overlijdensplaats,
            p.VaderID, p.MoederID, p.PartnerID, p.Huwelijksdatum, p.Huwelijksplaats,
            p.Opmerkingen, p.Adres, p.ContactInfo, p.URL
        ];
        cells.forEach(c => {
            const td = document.createElement('td');
            td.textContent = c || '';
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    tableContainer.appendChild(table);
}

// =======================
// Init render bij laden pagina
// =======================
renderTable();
