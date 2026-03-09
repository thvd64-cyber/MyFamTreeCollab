// ======================= view.js v1.5.3 =======================
// Boom rendering + Live search + Kind/Partner + BZID + kleur/shading + geboortedatum zichtbaar
// Relaties expliciet benoemd: HoofdID, PHoofdID, KindID, PKindID, VHoodID, MHoofdID, BZID, PBZID

(function(){
'use strict';

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer'); 
const BZBox        = document.getElementById('BZBox');       
const searchInput  = document.getElementById('searchPerson'); 

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];
let selectedHoofdId = null;

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; }

function formatDate(d){
    if(!d) return '';
    d = String(d).trim();

    let date =
        /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) :
        /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d) ? new Date(d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/,'$3-$2-$1')) :
        /^\d{4}-\d{2}$/.test(d) ? new Date(d+'-01') :
        /^\d{4}$/.test(d) ? new Date(d+'-01-01') :
        new Date(d);

    if(isNaN(date.getTime())) return d;
    const options = { day:'2-digit', month:'short', year:'numeric' };
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,'');
}

// =======================
// NODE CREATOR
// =======================
function createTreeNode(p, rel, color){
    const div = document.createElement('div');
    div.className = 'tree-node';
    if(rel) div.classList.add(rel);

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)].filter(Boolean).join(' ').trim();
    const birth = formatDate(p.GeboorteDatum);

    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'flex-start';
    div.style.height = '120px';
    div.style.paddingTop = '5px';

    div.innerHTML = `
        <span style="font-size:0.85rem;">${safe(p.ID)}</span>
        <span style="font-weight:600;">${fullName}</span>
        <span style="font-size:0.8rem; color:#555; margin-top:4px;">${birth}</span>
    `;

    if(color) div.style.color = color;
    div.dataset.id = p.ID;

    div.addEventListener('click', () => {
        selectedHoofdId = p.ID;
        renderTree();
    });

    return div;
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id));
}

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); 
    if(!hoofdID) return [];

    const hoofd = findPerson(hoofdID);
    if(!hoofd) return [];

    const VHoodID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    const KindID = data.filter(p => (safe(p.VaderID) === hoofdID || safe(p.MoederID) === hoofdID)).map(p => p.ID);

    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid === hoofdID || KindID.includes(pid) || pid === PHoofdID) return false;
        const sameVader = VHoodID && safe(p.VaderID) === VHoodID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder;
    }).map(p=>p.ID);

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = ''; 
        clone._priority = 99;
        clone._shade = null;
        clone._textColor = null;

        // =======================
        // Expliciete labels
        // =======================
        if(pid === hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid === VHoodID){ clone.Relatie='VHoodID'; clone._priority=0; }
        else if(pid === MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid === PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }
        else if(KindID.includes(pid)){
            clone.Relatie='KindID'; clone._priority=3;
            const kind = findPerson(pid);
            const hasHoofd = kind && (safe(kind.VaderID) === hoofdID || safe(kind.MoederID) === hoofdID);
            const hasPartnerHoofd = kind && safe(PHoofdID) !== '';
            // kleur/shading logica
            if(hasHoofd && hasPartnerHoofd) clone._shade='full';          // donker blauw: kind + partner van hoofd
            else if(hasHoofd) clone._shade='halfHoofd';                  // licht blauw: kind + hoofd
            else if(hasPartnerHoofd) clone._shade='halfPartner';         // lichtste blauw: kind + PHoofdID
        }
        else if(BZID.includes(pid)){
            clone.Relatie='BZID'; clone._priority=4;
            const bz = findPerson(pid);
            const sameVader = bz && VHoodID && safe(bz.VaderID) === VHoodID;
            const sameMoeder = bz && MHoofdID && safe(bz.MoederID) === MHoofdID;
            if(sameVader && sameMoeder) clone._textColor = 'black';
            else if(sameVader) clone._textColor = 'darkgrey';
            else if(sameMoeder) clone._textColor = 'grey';
        }

        return clone;
    }).sort((a,b)=>a._priority - b._priority);
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML = '';
    BZBox.innerHTML = '';

    if(!rootID){ treeBox.textContent='Selecteer een persoon'; return; }
    const root = findPerson(rootID);
    if(!root){ treeBox.textContent='Persoon niet gevonden'; return; }

    const dataRel = computeRelaties(dataset, rootID);

    // =======================
    // HoofdID + PHoofdID naast elkaar
    // =======================
    const rootWrapper = document.createElement('div');
    rootWrapper.className='tree-root-main';

    const rootNode = createTreeNode(root,'HoofdID');
    rootWrapper.appendChild(rootNode);

    if(root.PartnerID){
        const partner = findPerson(root.PartnerID);
        if(partner){
            rootWrapper.appendChild(createTreeNode(partner,'PHoofdID'));
        }
    }
    treeBox.appendChild(rootWrapper);

    // =======================
    // Ouders
    // =======================
    const parents = document.createElement('div');
    parents.className='tree-parents';

    if(root.VaderID){
        const v = findPerson(root.VaderID);
        if(v) parents.appendChild(createTreeNode(v,'VHoodID'));
    }
    if(root.MoederID){
        const m = findPerson(root.MoederID);
        if(m) parents.appendChild(createTreeNode(m,'MHoofdID'));
    }
    if(parents.children.length>0) treeBox.prepend(parents);

    // =======================
    // Kinderen + PKindID
    // =======================
    const children = dataRel.filter(d => d.Relatie==='KindID');
    if(children.length>0){
        const kidsWrap=document.createElement('div');
        kidsWrap.className='tree-children';

        children.forEach(k=>{
            const kidGroup=document.createElement('div');
            kidGroup.style.display='flex';
            kidGroup.style.alignItems='center';
            kidGroup.style.gap='5px';

            let shadeClass='rel-kindid';
            if(k._shade==='full') shadeClass='rel-kindid';
            else if(k._shade==='halfHoofd') shadeClass='rel-kindid-halfHoofd';
            else if(k._shade==='halfPartner') shadeClass='rel-kindid-halfPartner';

            kidGroup.appendChild(createTreeNode(k,shadeClass));

            if(k.PartnerID){
                const kPartner=findPerson(k.PartnerID);
                if(kPartner) kidGroup.appendChild(createTreeNode(kPartner,'PKindID'));
            }

            kidsWrap.appendChild(kidGroup);
        });
        treeBox.appendChild(kidsWrap);
    }

    // =======================
    // BZID + PBZID
    // =======================
    const bzNodes = dataRel.filter(d => d.Relatie==='BZID');
    bzNodes.forEach(b=>{
        BZBox.appendChild(createTreeNode(b,null,b._textColor));
    });
}

// =======================
// LIVE SEARCH
// =======================
function liveSearch(){
    const term=safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();
    if(!term) return;

    const results=dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    if(results.length>0 && !selectedHoofdId){
        selectedHoofdId=safe(results[0].ID);
        renderTree();
    }

    const rect=searchInput.getBoundingClientRect();
    const popup=document.createElement('div');
    popup.id='searchPopup';
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
            renderTree();
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
// INIT
// =======================
function renderTree(){ buildTree(selectedHoofdId); }
function refreshView(){
    dataset=window.StamboomStorage.get()||[];
    selectedHoofdId=null;
    renderTree();
}

refreshView();
searchInput.addEventListener('input',liveSearch);

})();
