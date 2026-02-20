'use strict';

let stamboomData = JSON.parse(localStorage.getItem('stamboomData') || '[]');
const tableBody = document.querySelector('#manageTable tbody');
const theadRow = document.querySelector('#manageTable thead tr');
const loadBtn = document.getElementById('loadBtn');
const searchInput = document.getElementById('searchPerson');
const saveBtn = document.getElementById('saveBtn');
const refreshBtn = document.getElementById('refreshBtn');
const addBtn = document.getElementById('addBtn');

// =======================
// Kolommen dynamisch vanuit schema
// =======================
const fields = ['Relatie'].concat(window.StamboomSchema.fields);

// Table header genereren
theadRow.innerHTML = '';
fields.forEach(f => {
    const th = document.createElement('th');
    th.textContent = f;
    theadRow.appendChild(th);
});

// =======================
// Kleurcodes
// =======================
function getRowClass(p) {
    switch(p.Relatie){
        case 'Ouder': return 'ouders';
        case 'Hoofd-ID': return 'hoofd-id';
        case 'Partner': return 'partner';
        case 'Kind': return 'kind';
        case 'Ex-Partner': return 'ex-partner';
        case 'Broer/Zus': return 'broerzus';
        case 'Partner-Kind': return 'partner-kind';
        default: return '';
    }
}

// =======================
// Hiërarchische volgorde
// =======================
function sortByHierarchy(data, hoofdID) {
    const result = [];
    const hoofd = data.find(p => p.ID === hoofdID);
    if(!hoofd) return result;

    // Ouders
    data.filter(p => p.ID === hoofd.VaderID || p.ID === hoofd.MoederID).forEach(p => result.push(p));

    // Hoofd-ID
    result.push(hoofd);

    // Partner
    if(hoofd.PartnerID) {
        const partner = data.find(p => p.ID === hoofd.PartnerID);
        if(partner) result.push(partner);
    }

    // Kinderen van hoofd
    const children = data.filter(p => p.VaderID === hoofd.ID || p.MoederID === hoofd.ID);
    children.forEach(c => {
        result.push(c);
        if(c.PartnerID){
            const cPartner = data.find(p => p.ID === c.PartnerID);
            if(cPartner) result.push(cPartner);
        }
    });

    // Broer/Zus
    const siblings = data.filter(p => p.VaderID === hoofd.VaderID && p.MoederID === hoofd.MoederID && p.ID !== hoofd.ID);
    siblings.forEach(s => result.push(s));

    return result;
}

// =======================
// Render tabel
// =======================
function renderTable(data) {
    tableBody.innerHTML = '';
    clearTable();
    data.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = getRowClass(p);

        fields.forEach(f => {
            const td = document.createElement('td');
            if(f === 'ID' || f === 'Relatie'){
                td.textContent = p[f] || '';
            } else {
                const input = document.createElement('input');
                input.value = p[f] || '';
                input.addEventListener('change', e => p[f] = e.target.value);
                td.appendChild(input);
            }
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
}
function clearTable() {
    tableBody.innerHTML = '';
}

function reloadStamboomData() {
    stamboomData = JSON.parse(localStorage.getItem('stamboomData') || '[]');
}

// =======================
// Zoek persoon
// =======================
function loadPerson() {
        clearTable();
    reloadStamboomData();
    
    const term = searchInput.value.toLowerCase();
    const hoofd = stamboomData.find(p =>
        p.ID?.toLowerCase() === term ||
        p.Doopnaam?.toLowerCase() === term ||
        p.Achternaam?.toLowerCase() === term
    );
    if(!hoofd) return alert('Persoon niet gevonden');
    const hierData = sortByHierarchy(stamboomData, hoofd.ID);
    renderTable(hierData);
}

// =======================
// Genereer ID's voor lege velden
// =======================
function generateMissingIDs() {
    const existingIDs = new Set(stamboomData.map(p => p.ID));
    let duplicates = 0;

    stamboomData.forEach(p => {
        if(!p.ID){
            let newID;
            do {
                newID = idGenerator(p.Doopnaam, p.Roepnaam, p.Achternaam, p.Geslacht || 'X');
            } while(existingIDs.has(newID));
            p.ID = newID;
            existingIDs.add(newID);
        } else {
            if(existingIDs.has(p.ID)) duplicates++;
            existingIDs.add(p.ID);
        }
    });

    if(duplicates > 0){
        alert(`⚠️ Er zijn ${duplicates} dubbele ID(s) gevonden! Controleer de data.`);
    }
}

// =======================
// Opslaan
// =======================
function saveData() {
    generateMissingIDs();
    localStorage.setItem('stamboomData', JSON.stringify(stamboomData));
    alert('Wijzigingen opgeslagen!');
}

// =======================
// Voeg lege persoon toe
// =======================
function addNewPerson() {
    const empty = window.StamboomSchema.empty();
    empty.Relatie = 'Hoofd-ID';
    stamboomData.unshift(empty);
    renderTable([empty].concat(stamboomData));
}

// =======================
// Event listeners
// =======================
loadBtn.addEventListener('click', loadPerson);
saveBtn.addEventListener('click', saveData);
refreshBtn.addEventListener('click', () => renderTable(stamboomData));
addBtn.addEventListener('click', addNewPerson);

// Init render
if(stamboomData.length) renderTable(stamboomData);
