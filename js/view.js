// ======================= view.js v1.0.0 =======================
// Visualisatie van stamboom (hark structuur)
// Gebruikt dezelfde dataset als manage.js
// =============================================================

(function(){
'use strict';

// =======================
// DOM
// =======================

const treeContainer = document.getElementById('treeView'); // hoofdcontainer voor de boom
const searchInput   = document.getElementById('searchPerson'); // zoekveld

// =======================
// STATE
// =======================

let dataset = window.StamboomStorage.get() || []; // laad dataset
let selectedHoofdId = null; // geselecteerde persoon

// =======================
// Helpers
// =======================

function safe(val){
    return val ? String(val).trim() : '';
}

function geboorteJaar(datum){
    if(!datum) return '';
    const parts = datum.split('-');
    return parts.length === 3 ? parts[0] : '';
}

// =======================
// RELATIE ENGINE
// (zelfde logica als manage.js)
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
        .map(id => {
            const k = data.find(p => safe(p.ID) === id);
            return k && k.PartnerID ? safe(k.PartnerID) : null;
        })
        .filter(Boolean);

    const BZPartnerID = BZID
        .map(id => {
            const s = data.find(p => safe(p.ID) === id);
            return s && s.PartnerID ? safe(s.PartnerID) : null;
        })
        .filter(Boolean);

    return data.map(p=>{

        const pid = safe(p.ID);
        const clone = {...p};

        clone.Relatie = '';

        if(pid === hoofdID) clone.Relatie='HoofdID';
        else if(pid === VHoofdID) clone.Relatie='VHoofdID';
        else if(pid === MHoofdID) clone.Relatie='MHoofdID';
        else if(pid === PHoofdID) clone.Relatie='PHoofdID';
        else if(KindID.includes(pid)) clone.Relatie='KindID';
        else if(KindPartnerID.includes(pid)) clone.Relatie='KindPartnerID';
        else if(BZID.includes(pid)) clone.Relatie='BZID';
        else if(BZPartnerID.includes(pid)) clone.Relatie='BZPartnerID';

        return clone;

    });
}

// =======================
// VIEW MODEL
// =======================

function buildViewModel(context){

    const model = {

        vader:null,
        moeder:null,

        siblings:[],
        siblingPartners:[],

        hoofd:null,
        partner:null,

        children:[],
        childPartners:[]
    };

    context.forEach(p=>{

        switch(p.Relatie){

            case 'VHoofdID':
                model.vader = p;
            break;

            case 'MHoofdID':
                model.moeder = p;
            break;

            case 'HoofdID':
                model.hoofd = p;
            break;

            case 'PHoofdID':
                model.partner = p;
            break;

            case 'BZID':
                model.siblings.push(p);
            break;

            case 'BZPartnerID':
                model.siblingPartners.push(p);
            break;

            case 'KindID':
                model.children.push(p);
            break;

            case 'KindPartnerID':
                model.childPartners.push(p);
            break;

        }

    });

    return model;

}

// =======================
// PERSON CARD
// =======================

function createPersonCard(p){

    if(!p) return document.createElement('div');

    const card = document.createElement('div');
    card.className = 'person';

    const name = document.createElement('div');
    name.className = 'name';

    name.textContent =
        `${safe(p.Roepnaam)} ${safe(p.Prefix)} ${safe(p.Achternaam)}`;

    const year = document.createElement('div');
    year.className = 'year';

    const geboortejaar = geboorteJaar(p.Geboortedatum);
    if(geboortejaar) year.textContent = `(${geboortejaar})`;

    card.appendChild(name);
    card.appendChild(year);

    // klik = nieuwe focus
    card.addEventListener('click',()=>{

        selectedHoofdId = p.ID;
        renderTree();

    });

    return card;

}

// =======================
// RENDER FAMILY PAIR
// =======================

function renderPair(p1,p2){

    const container = document.createElement('div');
    container.className = 'family';

    container.appendChild(createPersonCard(p1));

    if(p2){
        container.appendChild(createPersonCard(p2));
    }

    return container;

}

// =======================
// RENDER TREE
// =======================

function renderTree(){

    treeContainer.innerHTML = '';

    if(!selectedHoofdId){

        treeContainer.textContent = 'Selecteer een persoon';
        return;

    }

    const context = computeRelaties(dataset,selectedHoofdId);
    const model = buildViewModel(context);

    const tree = document.createElement('div');
    tree.className = 'tree';

    // =======================
    // parents
    // =======================

    const parentRow = document.createElement('div');
    parentRow.className = 'row';

    parentRow.appendChild(renderPair(model.vader,model.moeder));

    model.siblings.forEach(sib=>{

        const partner = model.siblingPartners
            .find(p=>safe(p.ID)===safe(sib.PartnerID));

        parentRow.appendChild(renderPair(sib,partner));

    });

    tree.appendChild(parentRow);

    // =======================
    // hoofd
    // =======================

    const hoofdRow = document.createElement('div');
    hoofdRow.className = 'row';

    hoofdRow.appendChild(renderPair(model.hoofd,model.partner));

    tree.appendChild(hoofdRow);

    // =======================
    // children
    // =======================

    const childRow = document.createElement('div');
    childRow.className = 'row';

    model.children.forEach(child=>{

        const partner = model.childPartners
            .find(p=>safe(p.ID)===safe(child.PartnerID));

        childRow.appendChild(renderPair(child,partner));

    });

    tree.appendChild(childRow);

    treeContainer.appendChild(tree);

}

// =======================
// SEARCH
// =======================

function liveSearch(){

    const term = safe(searchInput.value).toLowerCase();
    if(!term) return;

    const found = dataset.find(p=>

        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)

    );

    if(found){

        selectedHoofdId = found.ID;
        renderTree();

    }

}

// =======================
// INIT
// =======================

if(dataset.length){
    selectedHoofdId = dataset[0].ID;
}

renderTree();

searchInput.addEventListener('input',liveSearch);

})();
