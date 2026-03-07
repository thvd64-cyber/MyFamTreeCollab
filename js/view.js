// ======================= view.js v1.2.9 =======================
// Live search + siblings fix
(function(){
'use strict'; // voorkomt onbedoelde globale variabelen

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer');   // container voor boom
const siblingsList = document.getElementById('siblingsList');    // lijst met broers/zussen
const searchInput  = document.getElementById('searchPerson');    // live search input
const refreshBtn   = document.getElementById('refreshBtn');      // refresh knop (optioneel)

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // dataset ophalen uit storage
let selectedHoofdId = null;                       // hoofdpersoon start leeg (live search bepaalt)

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; }   // voorkomt null/undefined
function nodeLabel(p){                                        // label voor node
    return `${safe(p.Roepnaam)} ${safe(p.Achternaam)} (${safe(p.ID)})`;
}

// =======================
// NODE CREATOR
// =======================
function createNode(p,rel){
    const div = document.createElement('div');              // maak div voor persoon
    div.className = 'tree-node';                            // basis CSS
    if(rel) div.classList.add(rel);                         // voeg relatie class toe
    div.textContent = nodeLabel(p);                         // label tonen
    div.dataset.id = p.ID;                                  // ID in dataset attribuut

    div.addEventListener('click', () => {                   // klik event
        selectedHoofdId = p.ID;                             // klik = nieuwe hoofdpersoon
        renderTree();                                       // boom renderen
    });

    return div;                                             // node teruggeven
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id));      // persoon zoeken op ID
}
function findChildren(id){
    return dataset.filter(p =>
        safe(p.VaderID) === safe(id) ||                     // kinderen via vader
        safe(p.MoederID) === safe(id)                       // kinderen via moeder
    );
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML = '';                                  // leegmaken container
    if(!rootID){                                             // geen hoofdpersoon
        treeBox.textContent = 'Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);                         // hoofdpersoon ophalen
    if(!root){                                               // controle
        treeBox.textContent = 'Persoon niet gevonden';
        return;
    }

    // ===== ROOT =====
    const rootNode = createNode(root,'rel-hoofd');           // node hoofd
    const rootWrapper = document.createElement('div');       // wrapper voor root + partner
    rootWrapper.className = 'tree-root';
    rootWrapper.appendChild(rootNode);
    treeBox.appendChild(rootWrapper);

    // ===== OUDERS =====
    const parents = document.createElement('div');
    parents.className = 'tree-parents';
    if(root.VaderID){
        const v = findPerson(root.VaderID);
        if(v) parents.appendChild(createNode(v,'rel-vhoofdid'));
    }
    if(root.MoederID){
        const m = findPerson(root.MoederID);
        if(m) parents.appendChild(createNode(m,'rel-mhoofdid'));
    }
    if(parents.children.length > 0){
        treeBox.prepend(parents);                           // alleen tonen als ouders aanwezig
    }

    // ===== PARTNER =====
    if(root.PartnerID){
        const partner = findPerson(root.PartnerID);
        if(partner){
            rootWrapper.appendChild(createNode(partner,'rel-phoofdid'));
        }
    }

    // ===== KINDEREN =====
    const kids = findChildren(rootID);
    if(kids.length > 0){
        const kidsWrap = document.createElement('div');
        kidsWrap.className = 'tree-children';
        kids.forEach(k => {
            kidsWrap.appendChild(createNode(k,'rel-kindid'));
        });
        treeBox.appendChild(kidsWrap);
    }

    renderSiblings(rootID);                                   // broers/zussen renderen
}

function renderTree(){ buildTree(selectedHoofdId); }          // wrapper

// =======================
// BROERS / ZUSSEN
// =======================
function renderSiblings(rootID){
    siblingsList.innerHTML = '';                              // lijst leegmaken
    if(!rootID) return;
    const persoon = findPerson(rootID);                       // hoofdpersoon ophalen
    if(!persoon) return;

    const siblings = dataset.filter(p =>
        safe(p.VaderID) === safe(persoon.VaderID) &&
        safe(p.MoederID) === safe(persoon.MoederID) &&
        safe(p.ID) !== safe(rootID)                          // zichzelf uitsluiten
    );

    if(siblings.length === 0){
        const li = document.createElement('li');
        li.textContent = 'Geen broers/zussen';
        siblingsList.appendChild(li);
        return;
    }

    siblings.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${safe(s.Roepnaam)} ${safe(s.Achternaam)} (${safe(s.ID)})`;
        li.addEventListener('click', () => {                 // klik → nieuwe hoofdpersoon
            selectedHoofdId = s.ID;
            renderTree();
        });
        siblingsList.appendChild(li);
    });
}

// =======================
// LIVE SEARCH
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();      // zoekterm ophalen
    document.getElementById('searchPopup')?.remove();        // oude popup verwijderen

    if(!term) return;                                        // leeg zoekveld → niets doen

    const results = dataset.filter(p =>                      // filter dataset
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    // ===== eerste match automatisch hoofdpersoon =====
    if(results.length > 0){
        selectedHoofdId = safe(results[0].ID);
        renderTree();
    }

    // ===== popup voor resultaten =====
    const rect = searchInput.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.id = 'searchPopup';
    popup.style.position = 'absolute';
    popup.style.background = '#fff';
    popup.style.border = '1px solid #999';
    popup.style.zIndex = 1000;
    popup.style.top = rect.bottom + window.scrollY + 'px';
    popup.style.left = rect.left + window.scrollX + 'px';
    popup.style.width = rect.width + 'px';
    popup.style.maxHeight = '200px';
    popup.style.overflowY = 'auto';

    results.forEach(p => {
        const row = document.createElement('div');
        row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding = '5px';
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            selectedHoofdId = safe(p.ID);
            popup.remove();
            renderTree();
        });
        popup.appendChild(row);
    });

    if(results.length === 0){
        const row = document.createElement('div');
        row.textContent = 'Geen resultaten';
        row.style.padding = '5px';
        popup.appendChild(row);
    }

    document.body.appendChild(popup);
}

// =======================
// INIT
// =======================
function refreshView(){
    dataset = window.StamboomStorage.get() || [];            // dataset opnieuw laden
    renderTree();                                            // boom renderen zonder init hoofdId
}

refreshView();                                               // eerste render
searchInput.addEventListener('input', liveSearch);           // live search activeren
if(refreshBtn) refreshBtn.addEventListener('click', refreshView); // refresh knop

})();
