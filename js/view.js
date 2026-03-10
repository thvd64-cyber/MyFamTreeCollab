// ======================= stamboom/view.js v1.5.9 =======================
// Boom rendering + Live search + Kind/Partner + BZID
// Volledig compatibel met CSS kleuren via :root variabelen
// Correcte relatieclass voor alle nodes (VHoofdID, MHoofdID, HoofdID, PHoofdID, kind1/2/3, BZID)
// =======================
(function(){
'use strict';

// =======================
// DOM-elementen ophalen
// =======================
const treeBox      = document.getElementById('treeContainer'); // Container voor boom nodes
const BZBox        = document.getElementById('BZBox');        // Container voor BZID nodes
const searchInput  = document.getElementById('searchPerson'); // Input veld voor live search

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];  // Haal dataset uit local storage
let selectedHoofdId = null;                        // ID van huidige geselecteerde hoofd persoon

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // Zet elke waarde veilig om naar string

function formatDate(d){
    if(!d) return '';                                      // Lege datum geeft lege string
    d = String(d).trim();                                  // Trim whitespace
    let date =
        /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) :    // YYYY-MM-DD
        /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d) ? new Date(d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/,'$3-$2-$1')) : // DD-MM-YYYY
        /^\d{4}-\d{2}$/.test(d) ? new Date(d+'-01') :    // YYYY-MM
        /^\d{4}$/.test(d) ? new Date(d+'-01-01') :       // YYYY
        new Date(d);                                      // fallback
    if(isNaN(date.getTime())) return d;                   // Ongeldige datum → retourneer originele string
    const options = { day:'2-digit', month:'short', year:'numeric' };
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,''); // NL datumstring
}

// =======================
// NODE CREATOR
// =======================
function createTreeNode(p, rel){ 
    const div = document.createElement('div');          // Maak div voor node
    div.className = 'tree-node';                        // Voeg basis tree-node class toe
    if(rel) div.classList.add(rel);                     // Voeg relatie-specifieke class toe (kleur via CSS)

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)].filter(Boolean).join(' ').trim(); // Naam
    const birth = formatDate(p.Geboortedatum);          // Format NL datum

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>          <!-- ID van persoon -->
        <span class="name">${fullName}</span>          <!-- Volledige naam -->
        <span class="birth">${birth}</span>            <!-- Geboortedatum -->
    `;

    div.dataset.id = p.ID;                              // Bewaar ID in dataset attribuut
    div.addEventListener('click', () => {              // Klik op node selecteert hoofd
        selectedHoofdId = p.ID;
        renderTree();
    });

    return div;
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id));  // Zoek persoon op ID
}

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); 
    if(!hoofdID) return [];
    const hoofd = findPerson(hoofdID);
    if(!hoofd) return [];

    const VHoofdID = safe(hoofd.VaderID);              // ID van vader
    const MHoofdID = safe(hoofd.MoederID);             // ID van moeder
    const PHoofdID = safe(hoofd.PartnerID);            // ID van partner

    const children = data.filter(p => safe(p.VaderID) === hoofdID || safe(p.MoederID) === hoofdID); // Kinder IDs

    const BZID = data.filter(p=>{                      // Broer/zus (exclusief hoofd, partner, kinderen)
        const pid = safe(p.ID);
        if(pid === hoofdID || pid === PHoofdID || children.some(c=>c.ID===pid)) return false;
        const sameVader = VHoofdID && safe(p.VaderID) === VHoofdID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder;
    });

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = '';
        clone._priority = 99;

        if(pid === hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }       // Hoofd node
        else if(pid === VHoofdID){ clone.Relatie='VHoofdID'; clone._priority=0; } // Vader node
        else if(pid === MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; } // Moeder node
        else if(pid === PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; } // Partner node
        else if(children.some(c=>c.ID===pid)){                                       // Kinderen
            clone.Relatie='KindID'; clone._priority=3;
            if(PHoofdID && safe(p.VaderID)===hoofdID && safe(p.MoederID)===PHoofdID) clone.Relatie='kind1'; // Scenario 1
            else if(safe(p.VaderID)===hoofdID) clone.Relatie='kind2';                 // Scenario 2
            else if(PHoofdID && safe(p.MoederID)===PHoofdID) clone.Relatie='kind3';   // Scenario 3
        }
        else if(BZID.some(b=>b.ID===pid)){ clone.Relatie='BZID'; clone._priority=4; } // Broer/zus

        return clone;
    }).sort((a,b)=>a._priority - b._priority);         // Sorteer op prioriteit
}

// =======================
// BOOM BUILDER v1.5.8
// =======================
function buildTree(rootID){
    treeBox.innerHTML = '';   // Maak boom container leeg
    BZBox.innerHTML = '';     // Maak BZID container leeg

    if(!rootID){              // Check of er een root persoon geselecteerd is
        treeBox.textContent='Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);  // Zoek root persoon in dataset
    if(!root){
        treeBox.textContent='Persoon niet gevonden';
        return;
    }

    const dataRel = computeRelaties(dataset, rootID);  // Bereken relaties voor rootID

    // ======================= Hoofd + Partner =======================
    const rootWrapper = document.createElement('div');  // Wrapper voor Hoofd + partner
    rootWrapper.className='tree-root-main';             // Flex container

    rootWrapper.appendChild(createTreeNode(root,'HoofdID'));  // Voeg hoofd toe

    if(root.PartnerID){                               // Check of hoofd een partner heeft
        const partner = findPerson(root.PartnerID);
        if(partner) rootWrapper.appendChild(createTreeNode(partner,'PHoofdID')); // Voeg partner toe
    }

    treeBox.appendChild(rootWrapper);  // Voeg Hoofd + partner toe aan tree

    // ======================= Ouders =======================
    const parents = document.createElement('div');  // Wrapper voor ouders
    parents.className='tree-parents';

    if(root.VaderID){                                // Voeg vader toe als aanwezig
        const v = findPerson(root.VaderID);
        if(v) parents.appendChild(createTreeNode(v,'VHoodID'));
    }

    if(root.MoederID){                               // Voeg moeder toe als aanwezig
        const m = findPerson(root.MoederID);
        if(m) parents.appendChild(createTreeNode(m,'MHoofdID'));
    }

    if(parents.children.length>0) treeBox.prepend(parents);  // Plaats ouders bovenaan

    // ======================= Kinderen + Partner =======================
    const children = dataRel.filter(d => ['kind1','kind2','kind3'].includes(d.Relatie)); // Alle kinderen
    if(children.length>0){
        const kidsWrap=document.createElement('div');  // Wrapper voor alle kinderen
        kidsWrap.className='tree-children';

        children.forEach(k=>{
            const kidGroup=document.createElement('div');  // Wrapper per kind + partner
            kidGroup.className='tree-kid-group';

            kidGroup.appendChild(createTreeNode(k,k.Relatie));  // Voeg kind toe

            if(k.PartnerID){  // Voeg partner toe als aanwezig
                const kPartner=findPerson(k.PartnerID);
                if(kPartner) kidGroup.appendChild(createTreeNode(kPartner,'PKindID'));
            }

            kidsWrap.appendChild(kidGroup);  // Voeg kind-groep toe aan kinderen wrapper
        });

        treeBox.appendChild(kidsWrap);  // Voeg alle kinderen toe aan tree
    }

    // ======================= BZID + Partner =======================
    const bzNodes = dataRel.filter(d => d.Relatie==='BZID');  // Alle BZID personen
    bzNodes.forEach(b => {
        const bzGroup = document.createElement('div');       // Wrapper voor BZID + partner
        bzGroup.className = 'tree-kid-group';                // Gebruik dezelfde flex styling als kinderen

        bzGroup.appendChild(createTreeNode(b,'BZID'));      // Voeg BZID toe

        if(b.PartnerID){                                    // Check partner van BZID
            const bPartner = findPerson(b.PartnerID);
            if(bPartner) bzGroup.appendChild(createTreeNode(bPartner,'PBZID')); // Voeg partner naast BZID
        }

        BZBox.appendChild(bzGroup);                         // Voeg groep toe aan BZ container
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
