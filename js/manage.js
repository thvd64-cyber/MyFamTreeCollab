// ======================= js/manage.js v1.3.15 =======================
// Drop-in beheer voor MyFamTreeCollab met 14 kolommen + storage v0.0.2
// Inclusief INIT, live search popup, sluit-popup bij klik buiten, migratie logic
// =================================================================

(function(){
'use strict'; // activeer strict mode

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody'); // tbody van de tabel
const theadRow    = document.querySelector('#manageTable thead tr'); // header rij
const addBtn      = document.getElementById('addBtn'); // knop om rij toe te voegen
const saveBtn     = document.getElementById('saveBtn'); // knop om dataset op te slaan
const refreshBtn  = document.getElementById('refreshBtn'); // knop om tabel te verversen
const searchInput = document.getElementById('searchPerson'); // zoekveld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // laad bestaande data of lege array
let selectedHoofdId = null; // huidig geselecteerd hoofd
let tempRowCount = 0; // teller voor tijdelijk toegevoegde rijen

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // veilige string conversie
function parseDate(d){ 
    if(!d) return new Date(0); // fallback datum
    const parts = d.split('-'); 
    if(parts.length !==3) return new Date(0); 
    return new Date(parts.reverse().join('-')); 
}

// =======================
// Migratie Logic
// =======================
function migrateDataset(oldData){
    // Controleer of alle nieuwe kolommen aanwezig zijn
    const NEW_COLS = ['Relatie','ID','Doopnaam','Roepnaam','Prefix','Achternaam','Geslacht','Geboortedatum','Geboorteplaats','Overlijdensdatum','Overlijdensplaats','VaderID','MoederID','PartnerID'];
    return oldData.map(p=>{
        const migrated = {};
        NEW_COLS.forEach(c=>{
            migrated[c] = c in p ? p[c] : ''; // vul lege waarde als ontbreekt
        });
        return migrated;
    });
}
dataset = migrateDataset(dataset); // migratie uitvoeren bij load

// =======================
// Kolomdefinitie (14 drop-in kolommen)
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
    { key: 'PartnerID', readonly: false }
];

// =======================
// ID GENERATOR (letters + 3 cijfers, uniek)
// =======================
function genereerCode(persoon, bestaande){
    const letters = (persoon.Doopnaam[0]||'') + (persoon.Roepnaam[0]||'') + (persoon.Achternaam[0]||'') + (persoon.Geslacht[0]||'X'); 
    let code;
    const bestaandeIDs = new Set(bestaande.map(p=>p.ID));
    do {
        const cijfers = Math.floor(100 + Math.random()*900);
        code = letters + cijfers;
    } while(bestaandeIDs.has(code));
    return code;
}

// =======================
// Build Table Header
// =======================
function buildHeader(){ 
    theadRow.innerHTML = ''; 
    COLUMNS.forEach(col=>{
        const th = document.createElement('th'); 
        th.textContent = col.key;
        theadRow.appendChild(th); 
    });
}

// =======================
// Relatie-engine
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId);
    if(!hoofdID) return [];
    const hoofd = data.find(p => safe(p.ID) === hoofdID);
    if(!hoofd) return [];

    const VHoofdID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    const KindID = data.filter(p =>
        safe(p.VaderID) === hoofdID || 
        safe(p.MoederID) === hoofdID || 
        (PHoofdID && (safe(p.VaderID) === PHoofdID || safe(p.MoederID) === PHoofdID))
    ).map(p => p.ID);

    const BZID = data.filter(p => {
        const pid = safe(p.ID);
        if(pid === hoofdID) return false; 
        if(KindID.includes(pid)) return false;
        if(pid === PHoofdID) return false;
        const sameVader = VHoofdID && safe(p.VaderID) === VHoofdID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder; 
    }).map(p => p.ID);

    const KindPartnerID = KindID
        .map(id => { const k = data.find(p => safe(p.ID) === id); return k && k.PartnerID ? safe(k.PartnerID) : null; })
        .filter(Boolean);

    const BZPartnerID = BZID
        .map(id => { const s = data.find(p => safe(p.ID) === id); return s && s.PartnerID ? safe(s.PartnerID) : null; })
        .filter(Boolean);

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = ''; 
        clone._priority = 99; 

        if(pid === hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid === VHoofdID){ clone.Relatie='VHoofdID'; clone._priority=0; }
        else if(pid === MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid === PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }
        else if(KindID.includes(pid)){ clone.Relatie='KindID'; clone._priority=3; }
        else if(KindPartnerID.includes(pid)){ clone.Relatie='KindPartnerID'; clone._priority=3.5; }
        else if(BZID.includes(pid)){ clone.Relatie='BZID'; clone._priority=4; }
        else if(BZPartnerID.includes(pid)){ clone.Relatie='BZPartnerID'; clone._priority=4.5; }

        return clone;
    }).sort((a,b)=>a._priority - b._priority);
}

// =======================
// Dynamische textarea hoogte
// =======================
function adjustTextareas() {
    const textareas = tableBody.querySelectorAll('textarea');
    textareas.forEach(ta => {
        ta.style.height = 'auto';
        const maxHeight = 120;
        if(ta.scrollHeight > maxHeight){
            ta.style.height = maxHeight + 'px';
            ta.style.overflowY = 'auto';
        } else {
            ta.style.height = ta.scrollHeight + 'px';
            ta.style.overflowY = 'hidden';
        }
    });
}

// =======================
// Render Table
// =======================
function renderTable(dataset){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }
    const contextData = computeRelaties(dataset, selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML = ''; 
    const renderQueue = []; 

    contextData.filter(p => p.Relatie==='VHoofdID' || p.Relatie==='MHoofdID').forEach(p => renderQueue.push(p));
    const hoofd = contextData.find(p => p.Relatie==='HoofdID'); if(hoofd) renderQueue.push(hoofd);
    contextData.filter(p => p.Relatie==='PHoofdID').forEach(p => renderQueue.push(p));
    contextData.filter(p => p.Relatie==='KindID').forEach(kind=>{
        renderQueue.push(kind);
        const kp = contextData.find(p => p.Relatie==='KindPartnerID' && safe(p.ID)===safe(kind.PartnerID));
        if(kp) renderQueue.push(kp);
    });
    contextData.filter(p => p.Relatie==='BZID').forEach(sib=>{
        renderQueue.push(sib);
        const bzP = contextData.find(p => p.Relatie==='BZPartnerID' && safe(p.ID)===safe(sib.PartnerID));
        if(bzP) renderQueue.push(bzP);
    });

    renderQueue.forEach(p=>{
        const tr = document.createElement('tr'); 
        let relatieLabel = '';
        switch(p.Relatie){
            case 'VHoofdID':
            case 'MHoofdID': relatieLabel='Ouder'; break;
            case 'PHoofdID':
            case 'KindPartnerID':
            case 'BZPartnerID': relatieLabel='Partner'; break;
            case 'BZID': relatieLabel='Broer/Zus'; break;
            case 'HoofdID': relatieLabel='Hoofd'; break;
            case 'KindID': relatieLabel='Kind'; break;
            default: relatieLabel=p.Relatie||'-';
        }
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);

        COLUMNS.forEach(col=>{
            const td = document.createElement('td');
            if(col.key==='Relatie'){ td.textContent = relatieLabel; } 
            else if(col.readonly){ td.textContent = p[col.key]||''; } 
            else { 
                const textarea = document.createElement('textarea'); 
                textarea.value = p[col.key]||''; 
                textarea.dataset.field = col.key; 
                textarea.style.width='100%'; 
                textarea.style.boxSizing='border-box'; 
                textarea.style.resize='vertical'; 
                td.appendChild(textarea); 
            }
            tr.appendChild(td); 
        });

        tableBody.appendChild(tr); 
    });

    adjustTextareas(); 
}

// =======================
// Placeholder
// =======================
function showPlaceholder(msg){
    tableBody.innerHTML='';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = COLUMNS.length;
    td.textContent = msg;
    td.style.textAlign='center';
    tr.appendChild(td);
    tableBody.appendChild(tr);
}

// =======================
// Voeg lege rij toe
// =======================
function addRow(){
    if(tempRowCount>=10){ alert('Maximaal 10 rijen toegevoegd. Klik Opslaan om verder te gaan.'); return; }
    const tr = document.createElement('tr'); 
    COLUMNS.forEach(col=>{
        const td = document.createElement('td');
        if(col.readonly){ td.textContent=''; } 
        else { 
            const textarea = document.createElement('textarea');
            textarea.value=''; 
            textarea.dataset.field = col.key;
            textarea.style.width='100%'; 
            textarea.style.boxSizing='border-box'; 
            textarea.style.resize='vertical'; 
            td.appendChild(textarea); 
        }
        tr.appendChild(td);
    });
    tableBody.appendChild(tr); 
    tempRowCount++; 
    adjustTextareas(); 
}

// =======================
// Save dataset (merged)
// =======================
function saveDatasetMerged(){
    try {
        const rows = tableBody.querySelectorAll('tr');
        let bestaandeData = window.StamboomStorage.get() || [];
        const idMap = new Map(bestaandeData.map(p => [p.ID,p]));

        rows.forEach(tr=>{
            const persoon={};
            COLUMNS.forEach((col,index)=>{
                const cell = tr.cells[index];
                if(col.readonly){ if(col.key==='ID') persoon.ID = safe(cell.textContent); } 
                else { const textarea=cell.querySelector('textarea'); persoon[col.key]=textarea?textarea.value.trim():''; }
            });

            if(!persoon.ID){
                persoon.ID = genereerCode(persoon, Array.from(idMap.values()));
            }

            idMap.set(persoon.ID,{...idMap.get(persoon.ID),...persoon});
        });

        dataset = Array.from(idMap.values());
        window.StamboomStorage.set(dataset);
        tempRowCount=0;
        alert('Dataset succesvol opgeslagen (merged met bestaande data)');
    } catch(e){
        alert(`Opslaan mislukt: ${e.message}`);
        console.error(e);
    }
}

// =======================
// Refresh Table
// =======================
function refreshTable(){
    dataset = window.StamboomStorage.get() || [];
    if(!selectedHoofdId && dataset.length>0) selectedHoofdId = dataset[0].ID;
    renderTable(dataset);
}

// =======================
// Live Search
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();
    if(!term) return;

    const results = dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    const rect = searchInput.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.id='searchPopup';
    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;
    popup.style.top = rect.bottom + window.scrollY + 'px';
    popup.style.left = Math.max(rect.left + window.scrollX, 5) + 'px';
    popup.style.width = rect.width + 'px';
    popup.style.maxHeight = '300px';
    popup.style.overflowY = 'auto';
    popup.style.fontSize = '1.3rem';
    popup.style.padding = '8px';

    if(results.length === 0){
        const row = document.createElement('div');
        row.textContent = 'Geen resultaten';
        row.style.padding = '8px';
        row.style.fontSize = '1.3rem';
        popup.appendChild(row);
    } else {
        results.forEach(p => {
            const row = document.createElement('div');
            row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
            row.style.padding = '8px';
            row.style.cursor = 'pointer';
            row.style.fontSize = '1.3rem';
            row.addEventListener('click', ()=>{
                selectedHoofdId = safe(p.ID);
                popup.remove();
                renderTable(dataset);
            });
            popup.appendChild(row);
        });
    }

    document.body.appendChild(popup);
}

// =======================
// INIT
// =======================
buildHeader();
refreshTable();
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addRow);
saveBtn.addEventListener('click', saveDatasetMerged);
refreshBtn.addEventListener('click', refreshTable);

// =======================
// Sluit popup bij klik buiten
// =======================
document.addEventListener('click', e => {
    const popup = document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target !== searchInput) popup.remove();
});

})();
