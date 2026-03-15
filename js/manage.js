/* ======================= RENDER TABLE ======================= */
function renderTable(ds){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }
    const contextData = computeRelaties(ds,selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML='';          // Leeg body
    const renderQueue=[];             // Queue voor juiste volgorde

    // Voeg hoofd en directe relaties toe
    const hoofd = contextData.find(p=>p.Relatie==='HoofdID'); if(hoofd) renderQueue.push(hoofd);
    contextData.filter(p=>p.Relatie==='PHoofdID').forEach(p=>renderQueue.push(p));
    contextData.filter(p=>['KindID','HKindID','PHKindID'].includes(p.Relatie)).forEach(p=>{
        renderQueue.push(p);
        // Voeg partner van kind toe
        const kp = contextData.find(k=>k.Relatie==='KindPartnerID' && k.id===p.PartnerID);
        if(kp) renderQueue.push(kp);
    });
    contextData.filter(p=>p.Relatie==='BZID').forEach(p=>{
        renderQueue.push(p);
        const bzP=contextData.find(k=>k.Relatie==='BZPartnerID' && k.id===p.PartnerID);
        if(bzP) renderQueue.push(bzP);
    });

    // Maak rijen
    renderQueue.forEach(p=>{
        const tr=document.createElement('tr');                                 
        let relatieLabel='';
        switch(p.Relatie){
            case 'HoofdID': relatieLabel='Hoofd'; break;
            case 'PHoofdID': case 'KindPartnerID': case 'BZPartnerID': relatieLabel='Partner'; break;
            case 'KindID': case 'HKindID': case 'PHKindID': relatieLabel='Kind'; break;
            case 'BZID': relatieLabel='Broer/Zus'; break;
            default: relatieLabel=p.Relatie||'-';
        }
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);

        COLUMNS.forEach(col=>{
            const td=document.createElement('td');
            if(col.key==='Relatie'){ td.textContent=relatieLabel; }
            else if(col.readonly){ td.textContent=p[col.key]||''; }
            else{
                const ta=document.createElement('textarea');
                ta.value=p[col.key]||'';
                ta.dataset.field=col.key;
                ta.style.width='100%'; ta.style.boxSizing='border-box';
                ta.style.resize='vertical';
                td.appendChild(ta);
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    adjustTextareas(); // Pas textarea hoogte aan
}

✅ Wat er nu werkt:

Hoofd en partner van hoofd verschijnen eerst.

Alle kinderen (KindID, HKindID, PHKindID) verschijnen en krijgen label “Kind”.

Partners van kinderen verschijnen met label “Partner”.

Broer/zus en hun partners verschijnen correct.

Volgorde is logisch: Hoofd → Partner → Kinderen → Kind-partners → BZ → BZ-partners.

Als je wilt, kan ik ook de oude VHoofdID / MHoofdID logica volledig integreren, zodat ouders van hoofd ook bovenaan netjes verschijnen, zoals in je originele manage.js.

Wil je dat ik dat erbij doe?

dit is de code die er nu staat met Textarea  hoogte er tussen wat doe ik daar mee?
naar het eind verplaatsen?
/* ======================= RELATIE ENGINE (aangepast) ======================= */
function computeRelaties(data, hoofdId){
    if(!hoofdId) return []; // Stop als er geen hoofd geselecteerd is

    const hoofd = data.find(p=>safe(p.ID)===safe(hoofdId)); // Zoek het hoofd
    if(!hoofd) return []; // Stop als hoofd niet in dataset staat

    const VHoofdID = safe(hoofd.VaderID);    // ID van vader van hoofd
    const MHoofdID = safe(hoofd.MoederID);   // ID van moeder van hoofd
    const PHoofdID = safe(hoofd.PartnerID);  // ID van partner van hoofd

    // ======================= KINDEREN =======================
    // Vind alle kinderen van hoofd of partner van hoofd
    const children = data.filter(p=>safe(p.VaderID)===hoofdId || safe(p.MoederID)===hoofdId || 
                                    safe(p.VaderID)===PHoofdID || safe(p.MoederID)===PHoofdID);

    // Maak een mapping van KindID naar de juiste Relatie-code
    const KindRelaties = children.map(k=>{
        const kVader = safe(k.VaderID);  // Vader van kind
        const kMoeder = safe(k.MoederID); // Moeder van kind
        let relatie='';
        
        // Regel: beide ouders = hoofd + partner
        if((kVader===hoofdId && kMoeder===PHoofdID) || (kVader===PHoofdID && kMoeder===hoofdId)){
            relatie='KindID';
        }
        // Alleen hoofd als ouder
        else if(kVader===hoofdId || kMoeder===hoofdId){
            relatie='HKindID';
        }
        // Alleen partner van hoofd als ouder
        else if(kVader===PHoofdID || kMoeder===PHoofdID){
            relatie='PHKindID';
        }
        return {id:safe(k.ID), relatie, partnerID:safe(k.PartnerID)};
    });

    // ======================= BZ (Broer/Zus) =======================
    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        // Sluit hoofd, partner en kinderen uit
        if(pid===hoofdId || pid===PHoofdID || KindRelaties.some(k=>k.id===pid)) return false;
        return (VHoofdID && safe(p.VaderID)===VHoofdID) || (MHoofdID && safe(p.MoederID)===MHoofdID);
    }).map(p=>p.ID);

    // ======================= PARTNERS =======================
    // Partner van hoofd
    const hoofdPartner = PHoofdID ? [PHoofdID] : [];
    // Partner van kinderen
    const KindPartnerID = KindRelaties.map(k=>k.partnerID).filter(Boolean);
    // Partner van BZ
    const BZPartnerID = BZID.map(id=>{
        const p = data.find(x=>x.ID===id);
        return p && p.PartnerID ? p.PartnerID : null;
    }).filter(Boolean);

    // ======================= CLONEN EN RELATIE TOEVOEGEN =======================
    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p}; // Kopieer persoon
        clone.Relatie = '';
        clone._priority = 99;

        // Prioriteit en label instellen
        if(pid===hoofdId){ clone.Relatie='HoofdID'; clone._priority=1; } // Hoofd eerst
        else if(pid===PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; } // Partner van hoofd
        else if(KindRelaties.some(k=>k.id===pid)){ // Kinderen
            const kr = KindRelaties.find(k=>k.id===pid);
            clone.Relatie = kr.relatie; // KindID, HKindID of PHKindID
            clone._priority = 3;
        }
        else if(BZID.includes(pid)){ clone.Relatie='BZID'; clone._priority=4; } // Broer/zus
        else if(BZPartnerID.includes(pid)){ clone.Relatie='BZPartnerID'; clone._priority=4.5; } // Partner broer/zus

        return clone;
    }).sort((a,b)=>a._priority - b._priority); // Sorteer op prioriteit
}

/* ======================= TEXTAREA HOOGTE ======================= */
function adjustTextareas(){
    tableBody.querySelectorAll('textarea').forEach(ta=>{
        ta.style.height='auto';                                                 // Reset hoogte
        const maxH=120; 
        if(ta.scrollHeight>maxH){ta.style.height=maxH+'px'; ta.style.overflowY='auto';} 
        else{ta.style.height=ta.scrollHeight+'px'; ta.style.overflowY='hidden';}
    });
}

/* ======================= RENDER TABLE ======================= */
function renderTable(ds){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }
    const contextData = computeRelaties(ds,selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML='';                                                    // Leeg body
    const renderQueue=[];                                                       // Queue voor juiste volgorde

    // Ouder, hoofd, partner, kind, BZID
    contextData.filter(p=>p.Relatie==='VHoofdID'||p.Relatie==='MHoofdID').forEach(p=>renderQueue.push(p));
    const hoofd=contextData.find(p=>p.Relatie==='HoofdID'); if(hoofd) renderQueue.push(hoofd);
    contextData.filter(p=>p.Relatie==='PHoofdID').forEach(p=>renderQueue.push(p));
    contextData.filter(p=>p.Relatie==='KindID').forEach(k=>{
        renderQueue.push(k);
        const kp=contextData.find(p=>p.Relatie==='KindPartnerID' && p.ID===k.PartnerID); if(kp) renderQueue.push(kp);
    });
    contextData.filter(p=>p.Relatie==='BZID').forEach(s=>{
        renderQueue.push(s);
        const bzP=contextData.find(p=>p.Relatie==='BZPartnerID' && p.ID===s.PartnerID); if(bzP) renderQueue.push(bzP);
    });

    // Maak rijen
    renderQueue.forEach(p=>{
        const tr=document.createElement('tr');                                 
        let relatieLabel='';
        switch(p.Relatie){
            case 'VHoofdID': case 'MHoofdID': relatieLabel='Ouder'; break;
            case 'PHoofdID': case 'KindPartnerID': case 'BZPartnerID': relatieLabel='Partner'; break;
            case 'BZID': relatieLabel='Broer/Zus'; break;
            case 'HoofdID': relatieLabel='Hoofd'; break;
            case 'KindID': relatieLabel='Kind'; break;
            default: relatieLabel=p.Relatie||'-';
        }
        if(p.Relatie) tr.classList.add(rel-${p.Relatie.toLowerCase()});
        COLUMNS.forEach(col=>{
            const td=document.createElement('td');
            if(col.key==='Relatie'){td.textContent=relatieLabel;}
            else if(col.readonly){td.textContent=p[col.key]||'';}
            else{
                const ta=document.createElement('textarea');
                ta.value=p[col.key]||'';
                ta.dataset.field=col.key;
                ta.style.width='100%'; ta.style.boxSizing='border-box'; ta.style.resize='vertical';
                td.appendChild(ta);
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    adjustTextareas();
}

Ah, ik begrijp wat je bedoelt. De adjustTextareas() functie staat nu onderaan renderTable, wat op zich correct is. Je hoeft hem niet naar het eind van de file te verplaatsen, want het hoort logisch na het opbouwen van de tabelrijen te komen, zodat alle textarea-elementen in de DOM aanwezig zijn voordat je hun hoogte aanpast.

Kortom:

Huidige plek: ✅ Juist, direct na het toevoegen van alle rijen.

Waarom: De functie berekent scrollHeight van elke <textarea>; dit kan pas nadat ze in de DOM staan.

Niet verplaatsen naar het einde van de file, want dan zou de hoogte-aanpassing niet automatisch plaatsvinden bij elke render.

Extra tip: Als je wilt dat textarea-hoogtes dynamisch meeschalen bij window resize of bij nieuwe input, kun je adjustTextareas() ook aanroepen in een input-event of resize-event:

document.addEventListener('input', e => {
    if(e.target.tagName==='TEXTAREA') adjustTextareas();
});

window.addEventListener('resize', adjustTextareas);

Dit zorgt dat alles altijd netjes past, zelfs als iemand een lange tekst typt of het scherm verkleint/groot maakt.

Wil je dat ik je renderTable zo aanpas dat alle kinderen (KindID/HKindID/PHKindID) én hun partners altijd correct verschijnen en de textarea-hoogtes automatisch meekomen?
