// ======================= manage.js v1.3.7 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Features v1.3.7:
// - addRow: voeg lege rij toe, max 10 rijen
// - SaveDatasetMerged: lege rijen krijgen ID via genereerCode()
// - Duplicaatcontrole toegevoegd (while-loop)
// - Refresh behoudt centrale persoon
// - Live Search intact
// =================================================================

(function(){
'use strict'; // activeer strict mode voor veiligere JavaScript-uitvoering

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody'); // tbody referentie ophalen
const theadRow    = document.querySelector('#manageTable thead tr'); // header rij ophalen
const addBtn      = document.getElementById('addBtn'); // knop nieuwe lege rij
const saveBtn     = document.getElementById('saveBtn'); // opslaan knop
const refreshBtn  = document.getElementById('refreshBtn'); // refresh knop
const searchInput = document.getElementById('searchPerson'); // zoekveld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // laad dataset uit storage
let selectedHoofdId = null; // centrale geselecteerde persoon
let tempRowCount = 0; // teller tijdelijke rijen via addRow

// =======================
// Helpers (null-safe)
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // null-safe string conversie

function parseDate(d){ // datum parser (dd-mm-jjjj)
    if(!d) return new Date(0); // fallback datum
    const parts = d.split('-'); // splits datum
    if(parts.length !==3) return new Date(0); // invalid fallback
    return new Date(parts.reverse().join('-')); // omzetting naar Date object
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
// Build Header
// =======================
function buildHeader(){
    theadRow.innerHTML = ''; // bestaande header leegmaken
    COLUMNS.forEach(col=>{
        const th = document.createElement('th'); // nieuwe kolom header maken
        th.textContent = col.key; // kolomnaam tonen
        theadRow.appendChild(th); // toevoegen aan header
    });
}

// =======================
// Relatie-engine (ongewijzigd)
// =======================
function computeRelaties(data, hoofdId){

    const hoofdID = safe(hoofdId); // centrale ID
    if(!hoofdID) return []; // stop indien leeg

    const hoofd = data.find(p => safe(p.ID) === hoofdID); // zoek hoofd
    if(!hoofd) return []; // stop indien niet gevonden

    const VHoofdID = safe(hoofd.VaderID); // vader
    const MHoofdID = safe(hoofd.MoederID); // moeder
    const PHoofdID = safe(hoofd.PartnerID); // partner

    const KindID = data.filter(p =>
        safe(p.VaderID) === hoofdID ||
        safe(p.MoederID) === hoofdID ||
        (PHoofdID && (safe(p.VaderID) === PHoofdID || safe(p.MoederID) === PHoofdID))
    ).map(p => p.ID);

    const PKPartnerID = data.filter(p =>
        KindID.includes(safe(p.VaderID)) || KindID.includes(safe(p.MoederID))
    ).filter(p => p.PartnerID).map(p => safe(p.PartnerID));

    const BZID = data.filter(p =>
        (safe(p.VaderID) === VHoofdID || safe(p.MoederID) === MHoofdID) &&
        safe(p.ID) !== hoofdID &&
        !KindID.includes(safe(p.ID))
    ).map(p => p.ID);

    const BZPartnerID = data.filter(p =>
        BZID.includes(safe(p.VaderID)) || BZID.includes(safe(p.MoederID))
    ).filter(p => p.PartnerID).map(p => safe(p.PartnerID));

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
        else if(PKPartnerID.includes(pid)){ clone.Relatie='PKPartnerID'; clone._priority=3; }
        else if(BZID.includes(pid)){ clone.Relatie='BZID'; clone._priority=4; }
        else if(BZPartnerID.includes(pid)){ clone.Relatie='BZPartnerID'; clone._priority=4; }

        return clone;
    }).sort((a,b)=>a._priority - b._priority);
}

// =======================
// Render Table (ongewijzigd)
// =======================
function renderTable(dataset){

    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }

    const contextData = computeRelaties(dataset, selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML = '';

    contextData.forEach(p=>{
        const tr = document.createElement('tr');
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);

        COLUMNS.forEach(col=>{
            const td = document.createElement('td');

            if(col.readonly){
                td.textContent = p[col.key] || '';
            } else {
                const input = document.createElement('input');
                input.value = p[col.key] || '';
                input.dataset.field = col.key;
                td.appendChild(input);
            }

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
    td.colSpan=COLUMNS.length;
    td.textContent=msg;
    td.style.textAlign='center';
    tr.appendChild(td);
    tableBody.appendChild(tr);
}

// =======================
// addRow (max 10)
// =======================
function addRow(){

    if(tempRowCount >= 10){
        alert('Maximaal 10 rijen toegevoegd. Klik Opslaan om verder te gaan.');
        return;
    }

    const tr = document.createElement('tr');

    COLUMNS.forEach(col=>{
        const td = document.createElement('td');
        if(col.readonly){
            td.textContent='';
        } else {
            const input=document.createElement('input');
            input.dataset.field=col.key;
            td.appendChild(input);
        }
        tr.appendChild(td);
    });

    tableBody.appendChild(tr);
    tempRowCount++;
}

// =======================
// Save + Duplicaatcontrole
// =======================
function saveDatasetMerged(){

    try{

        const rows = tableBody.querySelectorAll('tr');
        let bestaandeData = window.StamboomStorage.get() || [];
        const idMap = new Map(bestaandeData.map(p => [p.ID, p]));

        rows.forEach(tr=>{

            const persoon={};

            COLUMNS.forEach((col,index)=>{
                const cell = tr.cells[index];
                if(col.readonly){
                    if(col.key==='ID') persoon.ID = safe(cell.textContent);
                } else {
                    const input = cell.querySelector('input');
                    persoon[col.key] = input ? input.value.trim() : '';
                }
            });

            // ===== ID generatie + duplicaatcontrole =====
            if(!persoon.ID){

                let newID='';
                let attempts=0;

                do{
                    newID = window.genereerCode(
                        persoon.Doopnaam,
                        persoon.Roepnaam,
                        persoon.Achternaam,
                        persoon.Geslacht
                    );
                    attempts++;
                    if(attempts>100) throw new Error('Unieke ID kon niet worden gegenereerd');
                }
                while(idMap.has(newID)); // herhaal zolang ID al bestaat

                persoon.ID=newID;
            }

            idMap.set(persoon.ID,{...idMap.get(persoon.ID),...persoon});
        });

        dataset = Array.from(idMap.values());
        window.StamboomStorage.set(dataset);

        tempRowCount=0;

        alert('Dataset succesvol opgeslagen.');

    }catch(e){
        alert('Opslaan mislukt: '+e.message);
        console.error(e);
    }
}

// =======================
// Refresh
// =======================
function refreshTable(){
    dataset = window.StamboomStorage.get() || [];
    if(!selectedHoofdId && dataset.length>0){
        selectedHoofdId = dataset[0].ID;
    }
    renderTable(dataset);
}

// =======================
// Live Search (ongewijzigd)
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
    popup.id = 'searchPopup';
    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+'px';
    popup.style.left=rect.left+window.scrollX+'px';
    popup.style.width=rect.width+'px';
    popup.style.maxHeight='200px';
    popup.style.overflowY='auto';

    results.forEach(p=>{
        const row=document.createElement('div');
        row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding='5px';
        row.style.cursor='pointer';
        row.addEventListener('click',()=>{
            selectedHoofdId=safe(p.ID);
            popup.remove();
            renderTable(dataset);
        });
        popup.appendChild(row);
    });

    if(results.length===0){
        const row=document.createElement('div');
        row.textContent='Geen resultaten';
        row.style.padding='5px';
        popup.appendChild(row);
    }

    document.body.appendChild(popup);
}

// =======================
// Init
// =======================
buildHeader();
renderTable(dataset);
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addRow);
saveBtn.addEventListener('click', saveDatasetMerged);
refreshBtn.addEventListener('click', refreshTable);

// =======================
// Sluit popup bij klik buiten
// =======================
document.addEventListener('click', e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});

})();
