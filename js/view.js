// ======================= view.js v1.4.2 =======================
// Boom rendering + Live search + Kind/Partner + BZID + kleur/shading
// Alleen node-inhoud aangepast
(function(){
'use strict'; // voorkomt onbedoelde globale variabelen

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer');   // container waar de boom wordt opgebouwd
const BZBox        = document.getElementById('siblingsList');    // lijst met BZID (Broer/Zus)
const searchInput  = document.getElementById('searchPerson');    // zoekveld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // dataset laden uit storage
let selectedHoofdId = null;                       // huidige hoofd persoon in de boom

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // voorkomt null/undefined problemen

// Nieuwe functie: formatDate voor node
function formatDate(d){
    if(!d) return '';
    const date = new Date(d);
    if(isNaN(date)) return d; // fallback als datum ongeldig
    const options = { day:'2-digit', month:'short', year:'numeric' };
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,''); // dd-mmm-jjjj
}

// =======================
// NODE CREATOR (Boom-nodes)
// =======================
function createTreeNode(p,rel,color){                        // node maken met relatie type en optionele tekstkleur
    const div = document.createElement('div');               // nieuwe div node maken
    div.className = 'tree-node';                             // basis CSS class
    if(rel) div.classList.add(rel);                          // relatie class toevoegen voor kleur/shading
    // ====================== Node tekst =======================
    // Tekst in drie regels:
    // [ID]
    // [Roepnaam, Prefix, Achternaam]
    // [Geboortedatum dd-mmm-jjjj]
    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim();      // roepnaam + prefix + achternaam
    const birth = formatDate(p.GeboorteDatum);              // geboortedatum
    div.innerHTML = `
        <div style="text-align:center; font-size:0.85rem;">${safe(p.ID)}</div>
        <div style="text-align:center; font-weight:600;">${fullName}</div>
        <div style="text-align:center; font-size:0.8rem; color:#555;">${birth}</div>
    `;
    if(color) div.style.color = color;                      // tekstkleur toepassen voor BZID
    div.dataset.id = p.ID;                                   // ID opslaan in dataset attribuut

    div.addEventListener('click', () => {                    // klik op node
        selectedHoofdId = p.ID;                              // nieuwe hoofd persoon zetten
        renderTree();                                        // boom opnieuw renderen
    });

    return div;                                              // node teruggeven
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){ return dataset.find(p => safe(p.ID) === safe(id)); }
function findChildren(id){ return dataset.filter(p => safe(p.VaderID)===safe(id) || safe(p.MoederID)===safe(id)); }

// =======================
// RELATIE ENGINE (shading + BZID kleur)
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); 
    if(!hoofdID) return [];

    const hoofd = findPerson(hoofdID);
    if(!hoofd) return [];

    const VHoofdID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    const KindID = data.filter(p => safe(p.VaderID)===hoofdID || safe(p.MoederID)===hoofdID).map(p=>p.ID);

    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid===hoofdID) return false;
        if(KindID.includes(pid)) return false;
        if(pid===PHoofdID) return false;
        const sameV = VHoofdID && safe(p.VaderID)===VHoofdID;
        const sameM = MHoofdID && safe(p.MoederID)===MHoofdID;
        return sameV || sameM;
    }).map(p=>p.ID);

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie=''; clone._priority=99; clone._textColor=null; clone._shade=null;

        if(pid===hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid===VHoofdID){ clone.Relatie='VHoofdID'; clone._priority=0; }
        else if(pid===MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid===PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }
        else if(KindID.includes(pid)){
            clone.Relatie='KindID'; clone._priority=3;
            const kind = findPerson(pid);
            const hasHoofd = kind && (safe(kind.VaderID)===hoofdID || safe(kind.MoederID)===hoofdID);
            const hasPartner = kind && (PHoofdID && (safe(kind.VaderID)===PHoofdID || safe(kind.MoederID)===PHoofdID));
            if(hasHoofd && hasPartner) clone._shade='full';
            else if(hasHoofd) clone._shade='halfHoofd';
            else if(hasPartner) clone._shade='halfPartner';
        }
        else if(BZID.includes(pid)){
            clone.Relatie='BZID'; clone._priority=4;
            const bz = findPerson(pid);
            const sameV = bz && VHoofdID && safe(bz.VaderID)===VHoofdID;
            const sameM = bz && MHoofdID && safe(bz.MoederID)===MHoofdID;
            if(sameV && sameM) clone._textColor='black';
            else if(sameV) clone._textColor='darkgrey';
            else if(sameM) clone._textColor='grey';
        }
        return clone;
    }).sort((a,b)=>a._priority - b._priority);
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML=''; BZBox.innerHTML='';

    if(!rootID){ treeBox.textContent='Selecteer een persoon'; return; }
    const root = findPerson(rootID);
    if(!root){ treeBox.textContent='Persoon niet gevonden'; return; }

    const dataRel = computeRelaties(dataset, rootID);

    // ===== ROOT =====
    const rootNode = createTreeNode(root,'rel-hoofd');
    const rootWrapper = document.createElement('div');
    rootWrapper.className='tree-root';
    rootWrapper.appendChild(rootNode);
    treeBox.appendChild(rootWrapper);

    // ===== OUDERS =====
    const parents = document.createElement('div'); parents.className='tree-parents';
    if(root.VaderID){ const v=findPerson(root.VaderID); if(v) parents.appendChild(createTreeNode(v,'rel-vhoofdid')); }
    if(root.MoederID){ const m=findPerson(root.MoederID); if(m) parents.appendChild(createTreeNode(m,'rel-mhoofdid')); }
    if(parents.children.length>0) treeBox.prepend(parents);

    // ===== PARTNER =====
    if(root.PartnerID){ const partner=findPerson(root.PartnerID); if(partner) rootWrapper.appendChild(createTreeNode(partner,'rel-phoofdid')); }

    // ===== KINDEREN =====
    const children = dataRel.filter(d=>d.Relatie==='KindID');
    if(children.length>0){
        const kidsWrap=document.createElement('div'); kidsWrap.className='tree-children';
        children.forEach(k=>{
            const shadeClass = k._shade==='full' ? 'rel-kindid' :
                               k._shade==='halfHoofd' ? 'rel-kindid-halfHoofd' :
                               'rel-kindid-halfPartner';
            kidsWrap.appendChild(createTreeNode(k,shadeClass));
        });
        treeBox.appendChild(kidsWrap);
    }

    // ===== BZID =====
    const bzNodes = dataRel.filter(d=>d.Relatie==='BZID');
    bzNodes.forEach(b=>{ BZBox.appendChild(createTreeNode(b,null,b._textColor)); }); // BZID tekstkleur
}

// =======================
// LIVE SEARCH (onveranderd)
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

    if(results.length>0 && !selectedHoofdId){ selectedHoofdId = safe(results[0].ID); renderTree(); }

    const rect = searchInput.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.id='searchPopup'; popup.style.position='absolute';
    popup.style.background='#fff'; popup.style.border='1px solid #999';
    popup.style.zIndex=1000; popup.style.top=rect.bottom+window.scrollY+'px';
    popup.style.left=rect.left+window.scrollX+'px'; popup.style.width=rect.width+'px';
    popup.style.maxHeight='200px'; popup.style.overflowY='auto';

    results.forEach(p=>{
        const row=document.createElement('div');
        row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding='5px'; row.style.cursor='pointer';
        row.addEventListener('click',()=>{
            selectedHoofdId=safe(p.ID); popup.remove(); renderTree();
        });
        popup.appendChild(row);
    });
    if(results.length===0){ const row=document.createElement('div'); row.textContent='Geen resultaten'; row.style.padding='5px'; popup.appendChild(row); }

    document.body.appendChild(popup);
}

// =======================
// INIT
// =======================
function renderTree(){ buildTree(selectedHoofdId); }
function refreshView(){ dataset=window.StamboomStorage.get()||[]; selectedHoofdId=null; renderTree(); }

refreshView();
searchInput.addEventListener('input',liveSearch);

})();
