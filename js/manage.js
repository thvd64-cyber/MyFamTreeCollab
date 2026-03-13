/* ======================= manage.js v1.3.20 ======================= */
/* Veilige drop-in: DOM-ready, live search, renderTable, Add/Save/Refresh */
/* Compatibel met schema.js v0.0.2 + storage.js v0.0.4 */

(function(){
'use strict'; // strikte modus

/* ======================= DOM-READY INIT ======================= */
document.addEventListener('DOMContentLoaded', ()=>{

    // ======================= HELPERS =======================
    function safe(val){ return val ? String(val).trim() : ''; } // Converteer alles naar string en trim whitespace
    function parseDate(d){ 
        if(!d) return new Date(0); 
        const parts=d.split('-'); 
        if(parts.length!==3) return new Date(0); 
        return new Date(parts.reverse().join('-')); 
    }

    // ======================= STORAGE =======================
    const dataset = window.StamboomStorage.get() || []; // Haal dataset uit storage
    let selectedHoofdId = dataset.length>0 ? dataset[0].ID : null; // Init selectie
    let tempRowCount = 0; // Tel tijdelijke rijen

    // ======================= DOM ELEMENTS =======================
    const tableBody   = document.querySelector('#manageTable tbody'); // Tabel body
    const theadRow    = document.querySelector('#manageTable thead tr'); // Header row
    const addBtn      = document.getElementById('addBtn'); // + Toevoegen knop
    const saveBtn     = document.getElementById('saveBtn'); // Opslaan knop
    const refreshBtn  = document.getElementById('refreshBtn'); // Refresh knop
    const searchInput = document.getElementById('searchPerson'); // Live search input

    // Check of alle essentiële elementen bestaan
    if(!tableBody || !theadRow || !addBtn || !saveBtn || !refreshBtn || !searchInput){
        console.error('Belangrijke DOM-elementen missen', {tableBody, theadRow, addBtn, saveBtn, refreshBtn, searchInput});
        return; // Stop script
    }

    // ======================= BUILD HEADER =======================
    function buildHeader(){
        theadRow.innerHTML=''; // Maak leeg
        if(!window.COLUMNS) { console.warn('COLUMNS schema niet gevonden'); return; }
        window.COLUMNS.forEach(col=>{
            const th=document.createElement('th'); // Maak header cel
            th.textContent=col.key; // Zet kolomnaam
            theadRow.appendChild(th); // Voeg toe
        });
    }

    // ======================= RENDER TABLE =======================
    function renderTable(data){
        if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }

        // Bereken relaties voor context
        const contextData = computeRelaties(data, selectedHoofdId); 
        if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

        tableBody.innerHTML=''; // Clear table
        const renderQueue=[]; // Volgorde van rijen

        // Ouders
        contextData.filter(p=>p.Relatie==='VHoofdID'||p.Relatie==='MHoofdID').forEach(p=>renderQueue.push(p));
        // Hoofd
        const hoofd=contextData.find(p=>p.Relatie==='HoofdID'); if(hoofd) renderQueue.push(hoofd);
        // Partner
        contextData.filter(p=>p.Relatie==='PHoofdID').forEach(p=>renderQueue.push(p));
        // Kinderen + partner
        contextData.filter(p=>p.Relatie==='KindID').forEach(k=>{
            renderQueue.push(k);
            const kp=contextData.find(p=>p.Relatie==='KindPartnerID' && p.ID===k.PartnerID); if(kp) renderQueue.push(kp);
        });
        // Broer/zus + partner
        contextData.filter(p=>p.Relatie==='BZID').forEach(s=>{
            renderQueue.push(s);
            const bzP=contextData.find(p=>p.Relatie==='BZPartnerID' && p.ID===s.PartnerID); if(bzP) renderQueue.push(bzP);
        });

        // Render rijen
        renderQueue.forEach(p=>{
            const tr=document.createElement('tr'); 
            // Label relatie
            let relatieLabel='';
            switch(p.Relatie){
                case 'VHoofdID': case 'MHoofdID': relatieLabel='Ouder'; break;
                case 'PHoofdID': case 'KindPartnerID': case 'BZPartnerID': relatieLabel='Partner'; break;
                case 'BZID': relatieLabel='Broer/Zus'; break;
                case 'HoofdID': relatieLabel='Hoofd'; break;
                case 'KindID': relatieLabel='Kind'; break;
                default: relatieLabel=p.Relatie||'-';
            }
            if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);

            // Vul cellen
            window.COLUMNS.forEach(col=>{
                const td=document.createElement('td');
                if(col.key==='Relatie'){ td.textContent=relatieLabel; } // Label
                else if(col.readonly){ td.textContent=p[col.key]||''; } // Readonly
                else{ // Editable
                    const ta=document.createElement('textarea'); 
                    ta.value=p[col.key]||''; 
                    ta.dataset.field=col.key;
                    ta.style.width='100%'; 
                    ta.style.boxSizing='border-box'; 
                    ta.style.resize='vertical'; 
                    td.appendChild(ta);
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr); // Voeg rij toe
        });

        adjustTextareas(); // Pas hoogte aan
    }

    // ======================= PLACEHOLDER =======================
    function showPlaceholder(msg){
        tableBody.innerHTML=''; 
        const tr=document.createElement('tr');
        const td=document.createElement('td');
        td.colSpan=window.COLUMNS ? window.COLUMNS.length : 1;
        td.textContent=msg;
        td.style.textAlign='center';
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    // ======================= ADD ROW =======================
    function addRow(){
        if(tempRowCount>=10){ alert('Maximaal 10 rijen toegevoegd. Klik Opslaan om verder te gaan.'); return; }
        const tr=document.createElement('tr');
        window.COLUMNS.forEach(col=>{
            const td=document.createElement('td');
            if(col.readonly){ td.textContent=''; } 
            else{
                const ta=document.createElement('textarea');
                ta.dataset.field=col.key;
                ta.value='';
                ta.style.width='100%'; ta.style.boxSizing='border-box'; ta.style.resize='vertical';
                td.appendChild(ta);
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
        tempRowCount++;
        adjustTextareas();
    }

    // ======================= SAVE DATASET =======================
    function saveDataset(){
        try{
            const rows = tableBody.querySelectorAll('tr');
            const idMap = new Map(dataset.map(p=>[p.ID,p]));
            rows.forEach(tr=>{
                const persoon={};
                window.COLUMNS.forEach((col,i)=>{
                    const cell=tr.cells[i];
                    if(col.readonly){ if(col.key==='ID') persoon.ID=safe(cell.textContent); }
                    else{ const ta=cell.querySelector('textarea'); persoon[col.key]=ta?ta.value.trim():''; }
                });
                if(!persoon.ID) persoon.ID=window.genereerCode ? window.genereerCode(persoon, Array.from(idMap.values())) : 'ID'+Math.random();
                idMap.set(persoon.ID,{...idMap.get(persoon.ID),...persoon});
            });
            dataset=Array.from(idMap.values());
            window.StamboomStorage.set(dataset);
            tempRowCount=0;
            alert('Dataset succesvol opgeslagen');
        } catch(e){ alert('Opslaan mislukt: '+e.message); console.error(e); }
    }

    // ======================= REFRESH =======================
    function refreshTable(){
        dataset=window.StamboomStorage.get()||[];
        if(!selectedHoofdId && dataset.length>0) selectedHoofdId=dataset[0].ID;
        renderTable(dataset);
    }

    // ======================= DYNAMIC TEXTAREA HEIGHT =======================
    function adjustTextareas(){
        tableBody.querySelectorAll('textarea').forEach(ta=>{
            ta.style.height='auto';
            const maxH=120;
            if(ta.scrollHeight>maxH){ ta.style.height=maxH+'px'; ta.style.overflowY='auto'; }
            else{ ta.style.height=ta.scrollHeight+'px'; ta.style.overflowY='hidden'; }
        });
    }

    // ======================= LIVE SEARCH =======================
    function liveSearch(){
        const term = safe(searchInput.value).toLowerCase();
        document.getElementById('searchPopup')?.remove(); // verwijder oud popup
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
        popup.style.top=rect.bottom+window.scrollY+'px';
        popup.style.left=Math.max(rect.left+window.scrollX,5)+'px';
        popup.style.width=rect.width+'px';
        popup.style.maxHeight='300px';
        popup.style.overflowY='auto';
        popup.style.fontSize='1.3rem';
        popup.style.padding='8px';
        popup.style.borderRadius='5px';
        popup.style.boxShadow='0 3px 6px rgba(0,0,0,0.2)';

        if(results.length===0){
            const row=document.createElement('div');
            row.textContent='Geen resultaten';
            row.style.padding='8px';
            popup.appendChild(row);
        } else {
            results.forEach(p=>{
                const row=document.createElement('div');
                row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
                row.style.padding='8px';
                row.style.cursor='pointer';
                row.addEventListener('click',()=>{
                    selectedHoofdId=safe(p.ID);
                    popup.remove();
                    renderTable(dataset);
                });
                popup.appendChild(row);
            });
        }
        document.body.appendChild(popup);
    }

    // ======================= INIT =======================
    function init(){
        buildHeader();
        renderTable(dataset);

        // Event listeners
        searchInput.addEventListener('input', liveSearch);
        addBtn.addEventListener('click', addRow);
        saveBtn.addEventListener('click', saveDataset);
        refreshBtn.addEventListener('click', refreshTable);

        // Klik buiten popup sluit deze
        document.addEventListener('click', e=>{
            const popup = document.getElementById('searchPopup');
            if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
        });
    }

    init(); // Start alles

}); // DOMContentLoaded
})();
