// ======================= manage.js v1.3.2 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Production hardened: null-safe + selectedHoofdId state + header fix
// Visualisatie: Ouders → Hoofd+Partner → Kinderen → Broer/Zus
// =================================================================
(function(){ // IIFE start → voorkomt globale vervuiling
'use strict'; // strikte modus

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody'); // tbody referentie
const theadRow    = document.querySelector('#manageTable thead tr'); // header rij
const addBtn      = document.getElementById('addBtn'); // toevoegen knop
const saveBtn     = document.getElementById('saveBtn'); // opslaan knop
const refreshBtn  = document.getElementById('refreshBtn'); // refresh knop
const searchInput = document.getElementById('searchPerson'); // zoekveld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // dataset laden
let selectedHoofdId = null; // actieve geselecteerde persoon

// =======================
// Helpers (null-safe)
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // null-safe string
function parseDate(d){ 
    if(!d) return new Date(0);
    const parts = d.split('-');
    if(parts.length !==3) return new Date(0);
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
// Build Table Header
// =======================
function buildHeader(){ 
    theadRow.innerHTML = ''; // leegmaken
    COLUMNS.forEach(col=>{
        const th = document.createElement('th');
        th.textContent = col.key;
        theadRow.appendChild(th);
    });
}

// =======================
// Relatie mapping (robuust)
// =======================
return contextData.map(p=>{
    const clone = { ...p };                                // Clone object voor mutatie
    const pid = safe(p.ID);                                 // Huidige persoon ID
    clone._linkedTo = '';                                   // Voor partner direct onder gekoppelde persoon
    clone._scenario = 0;                                    // Default scenario
    clone._priority = 99;                                   // Default prioriteit
    clone.Relaties = [];                                    // Array om alle mogelijke relaties tijdelijk op te slaan

    // ===== Ouders =====
    if(pid === vaderId || pid === moederId){
        clone.Relaties.push({ type: 'Ouder', priority: 90 }); // Voeg Ouder toe
    }

    // ===== Hoofd =====
    if(pid === hoofdIdStr){
        clone.Relaties.push({ type: 'Hoofd', priority: 100 }); // Voeg Hoofd toe
    }

    // ===== Partner =====
    if(pid === partnerId){
        clone.Relaties.push({ type: 'Partner', priority: 60 }); // Voeg Partner toe
    }

    // ===== Kind =====
    const isKindHoofd = safe(p.VaderID) === hoofdIdStr || safe(p.MoederID) === hoofdIdStr; // Biologisch kind
    const isKindPartner = partnerId && (safe(p.VaderID) === partnerId || safe(p.MoederID) === partnerId); // Kind van partner
    if(isKindHoofd || isKindPartner){
        clone.Relaties.push({ type: 'Kind', priority: 70, scenario:
            isKindHoofd && isKindPartner ? 1 :
            isKindHoofd ? 2 : 3
        }); // Voeg Kind toe met scenario
    }

    // ===== Broer/Zus =====
    const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId; // Zelfde vader?
    const zelfdeMoeder = moederId && safe(p.MoederID) === moederId; // Zelfde moeder?
    if(zelfdeVader || zelfdeMoeder){
        clone.Relaties.push({ type: 'broer-zus', priority: 80, scenario:
            zelfdeVader && zelfdeMoeder ? 1 :
            zelfdeVader ? 2 : 3
        }); // Voeg sibling toe met scenario
    }

    // ===== Partner van Kind =====
    const childLinked = data.find(k =>
        (safe(k.VaderID) === hoofdIdStr || safe(k.MoederID) === hoofdIdStr) &&
        safe(k.PartnerID) === pid
    ); // Zoek partner van kind
    if(childLinked){
        clone.Relaties.push({ type: 'kind-partner', priority: 40, scenario: 4, linkedTo: safe(childLinked.ID) }); // Voeg toe met scenario en link
    }

    // ===== Partner van Broer/Zus =====
    const siblingLinked = data.find(k =>
        ((vaderId  && safe(k.VaderID)  === vaderId) ||
         (moederId && safe(k.MoederID) === moederId)) &&
        safe(k.ID) !== hoofdIdStr &&
        safe(k.PartnerID) === pid
    ); // Zoek partner van sibling
    if(siblingLinked){
        clone.Relaties.push({ type: 'sibling-partner', priority: 50, scenario: 4, linkedTo: safe(siblingLinked.ID) }); // Voeg toe
    }

    // ===== Dominante relatie selecteren =====
    if(clone.Relaties.length > 0){
        clone.Relaties.sort((a,b)=>b.priority - a.priority); // Sorteer op prioriteit (hoogste eerst)
        const dominant = clone.Relaties[0]; // Kies hoogste prioriteit
        clone.Relatie = dominant.type;       // Stel dominante relatie in
        clone._priority = dominant.priority; // Stel prioriteit in
        if(dominant.scenario) clone._scenario = dominant.scenario; // Stel scenario in indien aanwezig
        if(dominant.linkedTo) clone._linkedTo = dominant.linkedTo; // Stel linkedTo in indien aanwezig
    }

    return clone; // Retourneer gemapte clone
})

// =======================
// Sortering
// =======================
.sort((a,b)=>{
    // 1️⃣ Prioriteit
    if(a._priority !== b._priority)
        return a._priority - b._priority;

    // 2️⃣ Partner direct onder gekoppelde persoon
    if(a._linkedTo === b.ID) return 1;
    if(b._linkedTo === a.ID) return -1;

    // 3️⃣ Scenario volgorde
    if(a._scenario !== b._scenario)
        return a._scenario - b._scenario;

    // 4️⃣ Leeftijd (oudste eerst)
    return parseDate(a.Geboortedatum) -
           parseDate(b.Geboortedatum);
});
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
// Live Search
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
    const rows=tableBody.querySelectorAll('tr'); const nieuweDataset=[]; const idSet=new Set();
    rows.forEach(tr=>{
        const persoon={};
        COLUMNS.forEach((col,index)=>{
            const cell=tr.cells[index];
            if(col.readonly){ if(col.key==='ID') persoon.ID = safe(cell.textContent); }
            else { const input=cell.querySelector('input'); persoon[col.key]=input?input.value.trim():''; }
        });
        if(!persoon.ID) throw new Error('ID ontbreekt'); 
        if(idSet.has(persoon.ID)) throw new Error(`Duplicate ID: ${persoon.ID}`);
        idSet.add(persoon.ID);
        nieuweDataset.push(persoon);
    });
    dataset=nieuweDataset; window.StamboomStorage.set(dataset);
    alert('Dataset succesvol opgeslagen');
}

function refreshTable(){ dataset=window.StamboomStorage.get()||[]; renderTable(dataset); }

// =======================
// Init
// =======================
buildHeader();                   // ✅ header fix toegevoegd
renderTable(dataset);            // render tabel
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addPersoon);
saveBtn.addEventListener('click', saveDataset);
refreshBtn.addEventListener('click', refreshTable);

// =======================
// Sluit popup bij klik buiten
// =======================
document.addEventListener('click', e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});

})();
