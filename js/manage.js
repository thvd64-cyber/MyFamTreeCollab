// ======================= manage.js v1.3.11 =======================
// Alleen opslaan + ID-generator geüpdatet
// =================================================================
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
let tempRowCount = 0; 

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; }
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
// ID GENERATOR (letters + 3 cijfers)
// =======================
// Alleen deze functie geüpdatet, veilig voor duplicaten
function genereerCode(persoon, bestaande){
    // Pak eerste letters van doopnaam, roepnaam, achternaam, geslacht
    const letters = (persoon.Doopnaam[0]||'') + (persoon.Roepnaam[0]||'') + (persoon.Achternaam[0]||'') + (persoon.Geslacht[0]||'X');
    let code;
    const bestaandeIDs = new Set(bestaande.map(p=>p.ID)); // alle bestaande IDs
    do {
        const cijfers = Math.floor(100 + Math.random()*900); // random 100-999
        code = letters + cijfers; // combineer letters + cijfers
    } while(bestaandeIDs.has(code)); // voorkom duplicaten
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
// Opslaan + merge dataset
// =======================
// Alleen deze functie geüpdatet voor veilige ID-generatie
function saveDatasetMerged(){
    try {
        const rows = tableBody.querySelectorAll('tr');
        let bestaandeData = window.StamboomStorage.get() || [];
        const idMap = new Map(bestaandeData.map(p => [p.ID, p]));

        rows.forEach(tr=>{
            const persoon = {};
            COLUMNS.forEach((col,index)=>{
                const cell = tr.cells[index];
                if(col.readonly){ 
                    if(col.key==='ID') persoon.ID = safe(cell.textContent); 
                } else { 
                    const input = cell.querySelector('input'); 
                    persoon[col.key] = input ? input.value.trim() : ''; 
                }
            });

            // Als er nog geen ID is, genereer er één met de veilige generator
            if(!persoon.ID){
                persoon.ID = genereerCode(persoon, Array.from(idMap.values()));
            }

            // Merge met bestaande data
            idMap.set(persoon.ID, {...idMap.get(persoon.ID), ...persoon});
        });

        dataset = Array.from(idMap.values());
        window.StamboomStorage.set(dataset);
        tempRowCount = 0; // reset teller
        alert('Dataset succesvol opgeslagen (merged met bestaande data)');
    } catch(e){
        alert(`Opslaan mislukt: ${e.message}`);
        console.error(e);
    }
}

// =======================
// INIT overige code zoals v1.3.10
// renderTable, computeRelaties, addRow, refreshTable, liveSearch, placeholder, events
// exact behouden, geen wijzigingen
// =======================
buildHeader(); 
renderTable(dataset); 
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addRow);
saveBtn.addEventListener('click', saveDatasetMerged);
refreshBtn.addEventListener('click', refreshTable);

document.addEventListener('click', e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});

})();
