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
// Relatie-engine v1.5
// Inclusief:
// - Partner van kind
// - Partner van broer/zus
// - Directe positionering onder gekoppelde persoon
// - Null-safe
// =======================
function computeRelaties(data, hoofdId){

    const hoofdIdStr = safe(hoofdId);                          // Hoofd ID null-safe
    if(!hoofdIdStr) return [];                                 // Stop indien leeg

    const hoofd = data.find(d => safe(d.ID) === hoofdIdStr);   // Zoek hoofd persoon
    if(!hoofd) return [];                                      // Stop indien niet gevonden

    const vaderId   = safe(hoofd.VaderID);                     // Vader ID
    const moederId  = safe(hoofd.MoederID);                    // Moeder ID
    const partnerId = safe(hoofd.PartnerID);                   // Partner ID

    // =======================
    // Context filtering
    // =======================
    const contextData = data.filter(p=>{
        const pid = safe(p.ID);                                // Huidige ID

        if(pid === hoofdIdStr) return true;                    // Hoofd
        if(pid === vaderId || pid === moederId) return true;   // Ouders
        if(pid === partnerId) return true;                     // Partner

        // Kinderen van hoofd
        if(safe(p.VaderID) === hoofdIdStr ||
           safe(p.MoederID) === hoofdIdStr)
            return true;

        // Kinderen van partner
        if(partnerId && (
            safe(p.VaderID) === partnerId ||
            safe(p.MoederID) === partnerId))
            return true;

        // Broer/Zus
        const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId;
        const zelfdeMoeder = moederId && safe(p.MoederID) === moederId;
        if(pid !== hoofdIdStr && (zelfdeVader || zelfdeMoeder))
            return true;

        // Partner van kind
        const isPartnerVanKind = data.some(k =>
            (safe(k.VaderID) === hoofdIdStr ||
             safe(k.MoederID) === hoofdIdStr) &&
            safe(k.PartnerID) === pid
        );
        if(isPartnerVanKind) return true;

        // Partner van broer/zus
        const isPartnerVanSibling = data.some(k =>
            (
                (vaderId  && safe(k.VaderID)  === vaderId) ||
                (moederId && safe(k.MoederID) === moederId)
            ) &&
            safe(k.ID) !== hoofdIdStr &&
            safe(k.PartnerID) === pid
        );
        if(isPartnerVanSibling) return true;

        return false;                                          // Anders uitsluiten
    });

    // =======================
    // Relatie mapping
    // =======================
    rreturn contextData.map(p => { 
    const clone = { ...p };                // Maak een **kopie** van het object p zodat wijzigingen hier geen effect hebben op het originele object.
    const pid = safe(p.ID);                // Haal de ID van p op en zorg dat deze 'veilig' is (bijvoorbeeld geen undefined/null, via safe-functie).

    clone._priority = 99;                  // Standaard **prioriteit** toekennen aan dit object, kan later worden gebruikt voor sortering of filtering.
    clone._scenario = 0;                   // Initieer een **scenario**-waarde (bijv. status of categorie), standaard op 0.
    clone._linkedTo = '';                  // Initieer een veld voor **linking** of verwijzing naar andere objecten, nu leeg; kan gebruikt worden voor sortering of relaties.
});

        // ===== Ouders =====
if(pid === vaderId || pid === moederId){          // Controleer of de huidige persoon (pid) gelijk is aan de vaderID of moederID van het hoofd
    clone.Relatie = 'Ouder';                      // Als dat zo is, markeer deze persoon als 'Ouder'
    clone._priority = 0;                          // Stel een prioriteit in voor sortering of weergave (0 = hoogste prioriteit)
    return clone;                                 // Stop de functie hier en geef het object terug met de relatie 'Ouder'
}

       // ===== Hoofd =====
if(pid === hoofdIdStr){                  // Controleer of de huidige persoon (pid) dezelfde ID heeft als het hoofd (hoofdpersoon).
    clone.Relatie = 'Hoofd';             // Als dat zo is, zet de relatie van deze clone op 'Hoofd'.
    clone._priority = 1;                 // Geef deze persoon prioriteit 1 (hoogste prioriteit in weergave of sortering).
    return clone;                        // Stop de functie en retourneer deze clone (deze persoon is dus verwerkt als hoofd).
}

// ===== Partner =====
if(pid === partnerId){                   // Controleer of de huidige persoon (pid) dezelfde ID heeft als de partner van het hoofd.
    clone.Relatie = 'Partner';           // Als dat zo is, zet de relatie op 'Partner'.
    clone._priority = 2;                 // Geef deze persoon prioriteit 2 (volgt na het hoofd).
    return clone;                        // Stop de functie en retourneer deze clone (deze persoon is dus verwerkt als partner).
}

        // ===== Kind =====
        const isKindHoofd =
    safe(p.VaderID) === hoofdIdStr ||   // Controleert of de VaderID van persoon 'p' gelijk is aan het hoofdID
    safe(p.MoederID) === hoofdIdStr;    // OF of de MoederID van persoon 'p' gelijk is aan het hoofdID
                                        // Resultaat: true als 'p' een kind is van het hoofd, anders false

const isKindPartner = partnerId && (    // Controleert eerst of er een partnerId bestaat (niet null/undefined)
    safe(p.VaderID) === partnerId ||    // Controleert of de VaderID van 'p' gelijk is aan de partnerId
    safe(p.MoederID) === partnerId      // OF of de MoederID van 'p' gelijk is aan de partnerId
);                                      // Resultaat: true als 'p' een kind is van de partner, anders false

        if(isKindHoofd || isKindPartner){    // Controleer of de persoon een kind is van het hoofd of van de partner
    clone.Relatie = 'Kind';                  // Zet de relatie van deze clone persoon naar 'Kind'
    clone._priority = 3;                     // Ken een interne prioriteit toe van 3 aan deze persoon (mogelijk voor sortering)

    clone._scenario =
        isKindHoofd && isKindPartner ? 1 :  // Als de persoon zowel kind van hoofd als partner is, scenario = 1
        isKindHoofd ? 2 :                   // Anders, als het kind alleen van het hoofd is, scenario = 2
        3;                                  // Anders (dus alleen kind van partner), scenario = 3

    return clone; // Stuur het object clone terug met de toegevoegde eigenschappen
}
        // ===== Partner van Kind =====
const childLinked = data.find(k =>
    // Zoek een persoon `k` in de dataset `data` waarbij:
    // De vader van `k` gelijk is aan het hoofdId **of** de moeder van `k` gelijk is aan het hoofdId
    (safe(k.VaderID) === hoofdIdStr ||
     safe(k.MoederID) === hoofdIdStr) &&
    // én de partner van `k` gelijk is aan de huidige `pid`
    safe(k.PartnerID) === pid
);

// Als er zo'n persoon wordt gevonden
if(childLinked){
    clone.Relatie = 'Test';  // !!Kind-partner >> Test !! Markeer deze relatie als "kind-partner"
    clone._priority = 3;             // Geef prioriteit 3 aan deze relatie (voor sortering/visualisatie)
    clone._scenario = 4;             // Specificeer scenario 4 (bijvoorbeeld voor verschillende visuele weergaven)
    clone._linkedTo = safe(childLinked.ID); // Sla het ID van het gevonden kind op om de link te bewaren
    return clone;                    // Stop hier en retourneer het clone-object met de nieuwe relatie
}

       // ===== Broer/Zus =====
// Bepaal of de huidige persoon een broer of zus is van het hoofd
const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId; // Controleer of de persoon dezelfde vader heeft als het hoofd (indien vaderId bekend is)
const zelfdeMoeder = moederId && safe(p.MoederID) === moederId; // Controleer of de persoon dezelfde moeder heeft als het hoofd (indien moederId bekend is)

if(zelfdeVader || zelfdeMoeder){ // Als de persoon dezelfde vader of moeder heeft, dan is het een broer of zus
    clone.Relatie = 'broer-zus'; // Zet de relatie van deze clone persoon op 'broer-zus'
    clone._priority = 4; // Geef deze relatie een prioriteit van 4 (voor visuele of logische sortering)

    clone._scenario =
        zelfdeVader && zelfdeMoeder ? 1 : // Scenario 1: beide ouders hetzelfde → volle broer/zus
        zelfdeVader ? 2 : 3;               // Scenario 2: alleen vader hetzelfde → halfbroer/zus via vader; anders scenario 3 → alleen moeder hetzelfde → halfbroer/zus via moeder

    return clone; // Geef de aangepaste clone terug met relatie en scenario
}
        // ===== Partner van Broer/Zus =====
// We zoeken in de dataset `data` of er iemand is die getrouwd is of een partner heeft van een broer of zus van het hoofd.
const siblingLinked = data.find(k =>
    (
        (vaderId  && safe(k.VaderID)  === vaderId) ||  // Check: heeft deze persoon dezelfde vader als het hoofd? (en vaderId bestaat)
        (moederId && safe(k.MoederID) === moederId)    // Check: heeft deze persoon dezelfde moeder als het hoofd? (en moederId bestaat)
    ) &&
    safe(k.ID) !== hoofdIdStr &&                        // Zorg dat het niet het hoofd zelf is
    safe(k.PartnerID) === pid                           // Check: is deze persoon de partner van de huidige persoon (`pid`)?
);

// Als er zo’n partner-van-een-broer-of-zus gevonden wordt
if(siblingLinked){
    clone.Relatie = 'sibling-partner';                // Label deze relatie als 'sibling-partner'
    clone._priority = 4;                              // Stel prioriteit van de relatie in (voor layout/visualisatie)
    clone._scenario = 4;                              // Stel scenario nummer in (voor logica of styling)
    clone._linkedTo = safe(siblingLinked.ID);        // Bewaar de ID van de gevonden persoon als link
    return clone;                                     // Geef het aangepaste object terug
}

// Als er geen partner-van-een-broer-of-zus gevonden wordt
return clone;                                         // Geef het object terug zoals het is

    // =======================
    // Sortering
    // =======================
   .sort((a,b)=>{
    // 1️⃣ Prioriteit: sorteer eerst op het _priority veld; lagere waarden komen eerst
    if(a._priority !== b._priority)
        return a._priority - b._priority; // positief/negatief bepaalt volgorde

    // 2️⃣ Partner direct onder gekoppelde persoon: zorg dat gekoppelde partners onder elkaar komen
    if(a._linkedTo === b.ID) return 1;  // a volgt b
    if(b._linkedTo === a.ID) return -1; // b volgt a

    // 3️⃣ Scenario volgorde: sorteer op het _scenario veld; lagere waarde eerst
    if(a._scenario !== b._scenario)
        return a._scenario - b._scenario;

    // 4️⃣ Leeftijd: sorteer op geboortedatum, oudste eerst
    return parseDate(a.Geboortedatum) -
           parseDate(b.Geboortedatum);
});
}
// =======================
// Render Table
// =======================
function renderTable(data){
    if(!selectedHoofdId){ 
        showPlaceholder('Selecteer een persoon'); 
        return; 
    } 
    // Controleer of er een hoofdpersoon is geselecteerd. Zo niet, laat een placeholder zien en stop de functie.

    const contextData = computeRelaties(data, selectedHoofdId); 
    // Bereken relaties van alle personen ten opzichte van de geselecteerde hoofdpersoon.

    tableBody.innerHTML=''; 
    // Maak het bestaande tabellichaam leeg zodat we opnieuw kunnen vullen.

    if(!contextData.length){ 
        showPlaceholder('Geen personen gevonden'); 
        return; 
    } 
    // Als er geen data is na het berekenen van relaties, toon een melding en stop de functie.

    contextData.forEach(p=>{
        const tr = document.createElement('tr'); 
        // Maak een nieuwe tabelrij voor elke persoon in de contextdata.

        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`); 
        // Voeg een CSS-klasse toe op basis van de relatie (bijv. ouder, kind) voor styling.

        if(p._scenario) tr.classList.add(`scenario-${p._scenario}`); 
        // Voeg een CSS-klasse toe voor scenario-specifieke styling als aanwezig.

        COLUMNS.forEach(col=>{
            const td=document.createElement('td'); 
            // Maak een cel aan voor elke kolom die we willen tonen.

            if(col.readonly){ 
                td.textContent=p[col.key]||''; 
                // Als de kolom alleen-lezen is, zet de tekst van de persoon in de cel.
            } else { 
                const input=document.createElement('input'); 
                input.value=p[col.key]||''; 
                input.dataset.field=col.key; 
                td.appendChild(input); 
                // Als de kolom bewerkbaar is, voeg een input veld toe met de waarde van de persoon.
            }

            tr.appendChild(td); 
            // Voeg de cel toe aan de rij.
        });

        tableBody.appendChild(tr); 
        // Voeg de complete rij toe aan de tabel.
    });
}

// =======================
// Placeholder
// =======================
function showPlaceholder(msg){  // Functie showPlaceholder maakt een rij in de tabel met een bericht wanneer er geen data is
    tableBody.innerHTML='';    // Leeg eerst de bestaande inhoud van de tabel (tbody)
    const tr=document.createElement('tr');  // Maak een nieuwe tabelrij <tr> aan
    const td=document.createElement('td');  // Maak een nieuwe cel <td> aan
    td.colSpan=COLUMNS.length;               // Laat de cel over alle kolommen van de tabel heen strekken
    td.textContent=msg;                      // Zet de tekst van de cel naar het meegegeven bericht
    td.style.textAlign='center';             // Centreer de tekst in de cel
    tr.appendChild(td);                       // Voeg de cel toe aan de rij
    tableBody.appendChild(tr);                // Voeg de rij toe aan de tabel
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
