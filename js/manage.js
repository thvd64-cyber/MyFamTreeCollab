// ======================= manage.js v1.3.0 =======================
// Alle relaties zichtbaar: ouders, hoofd+partner, kind+partner, broer/zus+partner

(function(){
'use strict';

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody');
const theadRow    = document.querySelector('#manageTable thead tr');
const addBtn      = document.getElementById('addBtn');
const saveBtn     = document.getElementById('saveBtn');
const refreshBtn  = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchPerson');

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];
let selectedHoofdId = null;

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; }
function parseDate(d){
    if(!d) return new Date(0);
    const parts = d.split('-');
    if(parts.length!==3) return new Date(0);
    return new Date(parts.reverse().join('-'));
}

// =======================
// Kolomdefinitie
// =======================
const COLUMNS = [
    { key: 'Relatie', readonly: true },
    { key: 'ID', readonly: true },
    { key: 'Doopnaam', readonly: false },
    { key: 'Roepnaam', readonly: false },
    { key: 'Prefix', readonly: false },
    { key: 'Achternaam', readonly: false },
    { key: 'Geslacht', readonly: false },
    { key: 'Geboortedatum', readonly: false },
    { key: 'Geboorteplaats', readonly: false },
    { key: 'Overlijdensdatum', readonly: false },
    { key: 'Overlijdensplaats', readonly: false },
    { key: 'VaderID', readonly: false },
    { key: 'MoederID', readonly: false },
    { key: 'PartnerID', readonly: false },
    { key: 'Huwelijksdatum', readonly: false },
    { key: 'Huwelijksplaats', readonly: false },
    { key: 'Opmerkingen', readonly: false },
    { key: 'Adres', readonly: false },
    { key: 'ContactInfo', readonly: false },
    { key: 'UR', readonly: false }
];

// =======================
// Build header
// =======================
function buildHeader(){
    theadRow.innerHTML='';
    COLUMNS.forEach(col=>{
        const th = document.createElement('th');
        th.textContent = col.key;
        theadRow.appendChild(th);
    });
}

// =======================
// Relatie-engine v2.0/************************************************************
 * STAP 0 — Voorbereiding
 ************************************************************/

const hoofdIdStr = String(hoofdId);      
// Zorgt dat hoofdId altijd string is zodat vergelijkingen betrouwbaar zijn

const safe = v => String(v || "");      
// Helperfunctie: voorkomt undefined/null problemen bij ID-vergelijkingen


/************************************************************
 * STAP 1 — Basis relaties bepalen (ZONDER partners)
 ************************************************************/

const parents = [];      // G0
const hoofd = [];        // G1
const siblings = [];     // G1
const children = [];     // G2

// Zoek hoofd persoon
const hoofdPersoon = data.find(p => safe(p.ID) === hoofdIdStr);
// Zoekt de hoofdpersoon op basis van ID

if (!hoofdPersoon) {
    console.error("HoofdID niet gevonden");
    return;
}

// Bepaal ouders van hoofd
data.forEach(p => {
    if (
        safe(p.ID) === safe(hoofdPersoon.VaderID) ||
        safe(p.ID) === safe(hoofdPersoon.MoederID)
    ) {
        parents.push({ ...p, _role: "parent" });
        // Voeg ouder toe aan G0
    }
});

// Voeg hoofd toe
hoofd.push({ ...hoofdPersoon, _role: "hoofd" });

// Bepaal kinderen van hoofd
data.forEach(p => {
    if (
        safe(p.VaderID) === hoofdIdStr ||
        safe(p.MoederID) === hoofdIdStr
    ) {
        children.push({ ...p, _role: "child" });
    }
});

// Bepaal broers/zussen (zelfde vader én moeder)
data.forEach(p => {
    if (
        safe(p.ID) !== hoofdIdStr &&
        safe(p.VaderID) === safe(hoofdPersoon.VaderID) &&
        safe(p.MoederID) === safe(hoofdPersoon.MoederID)
    ) {
        siblings.push({ ...p, _role: "sibling" });
    }
});


/************************************************************
 * STAP 2 — Partners koppelen (altijd onder persoon)
 ************************************************************/

const allBasePersons = [
    ...hoofd,
    ...children,
    ...siblings
];
// Alleen personen die partners mogen hebben

const partners = [];

allBasePersons.forEach(base => {

    if (!safe(base.PartnerID)) return;
    // Geen partner? Stop hier.

    const partner = data.find(p =>
        safe(p.ID) === safe(base.PartnerID)
    );
    // Zoek exacte partner via ID

    if (!partner) return;

    partners.push({
        ...partner,
        _role: "partner",
        _linkedTo: base.ID
        // Koppel partner expliciet aan persoon
    });
});


/************************************************************
 * STAP 3 — Definitieve volgorde bepalen
 ************************************************************/

const finalList = [];

// 1️⃣ Ouders
parents.forEach(p => finalList.push(p));

// 2️⃣ Hoofd
hoofd.forEach(p => finalList.push(p));

// 3️⃣ Partner van hoofd
partners
    .filter(p => p._linkedTo === hoofdIdStr)
    .forEach(p => finalList.push(p));

// 4️⃣ Kinderen + partner direct eronder
children.forEach(child => {
    finalList.push(child);

    partners
        .filter(p => p._linkedTo === child.ID)
        .forEach(p => finalList.push(p));
});

// 5️⃣ Broer/Zus + partner direct eronder
siblings.forEach(sib => {
    finalList.push(sib);

    partners
        .filter(p => p._linkedTo === sib.ID)
        .forEach(p => finalList.push(p));
});


/************************************************************
 * STAP 4 — Render
 ************************************************************/

renderList(finalList);
// Stuurt definitieve gestructureerde lijst naar je renderfunctie

    // =======================
    //  Sorteer: prioriteit -> linkedTo -> scenario -> geboortedatum
    // =======================
    return mapped.sort((a,b)=>{
        if(a._priority!==b._priority) return a._priority-b._priority;
        if(a._linkedTo===b.ID) return 1;       // Partner direct onder gekoppelde persoon
        if(b._linkedTo===a.ID) return -1;
        if(a._scenario!==b._scenario) return a._scenario-b._scenario;
        return parseDate(a.Geboortedatum)-parseDate(b.Geboortedatum);
    });
}
// =======================
// Render Table
// =======================
function renderTable(data){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }
    const contextData = computeRelaties(data, selectedHoofdId);
    tableBody.innerHTML='';
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }
    contextData.forEach(p=>{
        const tr = document.createElement('tr');
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);
        if(p._scenario) tr.classList.add(`scenario-${p._scenario}`);
        COLUMNS.forEach(col=>{
            const td=document.createElement('td');
            if(col.readonly){ td.textContent=p[col.key]||''; }
            else { const input=document.createElement('input'); input.value=p[col.key]||''; input.dataset.field=col.key; td.appendChild(input); }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// =======================
// Placeholder
// =======================
function showPlaceholder(msg){
    tableBody.innerHTML='';
    const tr=document.createElement('tr');
    const td=document.createElement('td');
    td.colSpan=COLUMNS.length; td.textContent=msg; td.style.textAlign='center';
    tr.appendChild(td); tableBody.appendChild(tr);
}

// =======================
// Live search
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();
    if(!term) return;
    const results = dataset.filter(p=>safe(p.ID).toLowerCase().includes(term) || safe(p.Roepnaam).toLowerCase().includes(term) || safe(p.Achternaam).toLowerCase().includes(term));
    const rect = searchInput.getBoundingClientRect();
    const popup=document.createElement('div');
    popup.id='searchPopup'; popup.style.position='absolute'; popup.style.background='#fff';
    popup.style.border='1px solid #999'; popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+'px'; popup.style.left=rect.left+window.scrollX+'px';
    popup.style.width=rect.width+'px'; popup.style.maxHeight='200px'; popup.style.overflowY='auto';
    results.forEach(p=>{
        const row=document.createElement('div'); row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding='5px'; row.style.cursor='pointer';
        row.addEventListener('click', ()=>{
            selectedHoofdId = safe(p.ID); popup.remove(); renderTable(dataset);
        });
        popup.appendChild(row);
    });
    if(results.length===0){ const row=document.createElement('div'); row.textContent='Geen resultaten'; row.style.padding='5px'; popup.appendChild(row); }
    document.body.appendChild(popup);
}

// =======================
// Add / Save / Refresh
// =======================
function addPersoon(){
    const nieuw={}; COLUMNS.forEach(col=>nieuw[col.key]='');
    nieuw.ID = window.genereerCode(nieuw,dataset);
    dataset.push(nieuw);
    selectedHoofdId = nieuw.ID;
    window.StamboomStorage.set(dataset);
    renderTable(dataset);
}

function saveDataset(){
    const rows=tableBody.querySelectorAll('tr'); 
    const nieuweDataset=[]; 
    const idSet=new Set();
    rows.forEach(tr=>{
        const persoon={};
        COLUMNS.forEach((col,index)=>{
            const cell=tr.cells[index];
            if(col.readonly){ if(col.key==='ID') persoon.ID=safe(cell.textContent); }
            else { const input=cell.querySelector('input'); persoon[col.key]=input?input.value.trim():''; }
        });
        if(!persoon.ID) throw new Error('ID ontbreekt'); 
        if(idSet.has(persoon.ID)) throw new Error(`Duplicate ID: ${persoon.ID}`);
        idSet.add(persoon.ID);
        nieuweDataset.push(persoon);
    });
    dataset=nieuweDataset;
    window.StamboomStorage.set(dataset);
    alert('Dataset succesvol opgeslagen');
}

function refreshTable(){ dataset=window.StamboomStorage.get()||[]; renderTable(dataset); }

// =======================
// Init
// =======================
buildHeader();
renderTable(dataset);
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addPersoon);
saveBtn.addEventListener('click', saveDataset);
refreshBtn.addEventListener('click', refreshTable);
document.addEventListener('click', e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});
})();
