// 1. Haal alle stamboom data op uit localStorage
let stamboomData = JSON.parse(localStorage.getItem('stamboomData') || '[]');

// 2. Selecteer HTML elementen
const searchInput = document.getElementById('searchInput'); // zoekbalk
const searchBtn = document.getElementById('searchBtn');     // zoek knop
const tableBody = document.getElementById('tableBody');     // tbody van de tabel

// 3. Functie om relatie te berekenen op basis van IDs
function bepaalRelatie(root, person) {
    if(person.ID === root.ID) return 'HoofdID'; // huidige root persoon
    if(person.ID === root.partnerID) return 'PartnerHuidig'; // partner van root
    if(person.ID === root.vaderID || person.ID === root.moederID) return 'Ouder'; // ouders
    if(person.vaderID === root.ID || person.moederID === root.ID) return 'Kind'; // kinderen
    if((person.vaderID === root.partnerID || person.moederID === root.partnerID) && person.ID !== root.partnerID) return 'ExPartner'; // ex-partners
    // broers/zussen = zelfde ouders
    if(person.vaderID === root.vaderID && person.moederID === root.moederID && person.ID !== root.ID) return 'BroerZus';
    return ''; // anders onbekend
}

// 4. Functie om tabel te renderen voor een geselecteerde root persoon
function renderTabel(root) {
    tableBody.innerHTML = ''; // oude tabel legen

    // Voeg root toe als eerste rij
    stamboomData.forEach(p => {
        let relatie = bepaalRelatie(root, p); // relatie bepalen
        let row = document.createElement('tr'); // nieuwe tabelrij
        row.className = relatie; // CSS kleur op basis van relatie

        // Kolommen: relatie en ID readonly, andere editable
        row.innerHTML = `
            <td>${relatie}</td>
            <td>${p.ID}</td>
            <td contenteditable="true">${p.doopnaam || ''}</td>
            <td contenteditable="true">${p.roepnaam || ''}</td>
            <td contenteditable="true">${p.prefix || ''}</td>
            <td contenteditable="true">${p.achternaam || ''}</td>
            <td contenteditable="true">${p.geslacht || ''}</td>
            <td contenteditable="true">${p.geboorte || ''}</td>
            <td contenteditable="true">${p.geboorteplaats || ''}</td>
            <td contenteditable="true">${p.overlijden || ''}</td>
            <td contenteditable="true">${p.overlijdensplaats || ''}</td>
            <td contenteditable="true">${p.vaderID || ''}</td>
            <td contenteditable="true">${p.moederID || ''}</td>
            <td contenteditable="true">${p.partnerID || ''}</td>
            <td contenteditable="true">${p.huwelijksdatum || ''}</td>
            <td contenteditable="true">${p.huwelijksplaats || ''}</td>
            <td contenteditable="true">${p.opmerkingen || ''}</td>
            <td contenteditable="true">${p.adres || ''}</td>
            <td contenteditable="true">${p.contactInfo || ''}</td>
            <td contenteditable="true">${p.url || ''}</td>
        `;
        tableBody.appendChild(row);
    });

    // 5. Event listener: wijzigingen automatisch opslaan bij blur
    tableBody.querySelectorAll('tr').forEach((row, index) => {
        row.querySelectorAll('td[contenteditable="true"]').forEach((cell, cellIndex) => {
            cell.addEventListener('blur', () => {
                const kolommen = [
                    'doopnaam','roepnaam','prefix','achternaam','geslacht','geboorte','geboorteplaats',
                    'overlijden','overlijdensplaats','vaderID','moederID','partnerID',
                    'huwelijksdatum','huwelijksplaats','opmerkingen','adres','contactInfo','url'
                ];
                stamboomData[index][kolommen[cellIndex]] = cell.textContent; // opslaan in array
                localStorage.setItem('stamboomData', JSON.stringify(stamboomData)); // opslaan
            });
        });
    });
}

// 6. Zoek knop functionaliteit
searchBtn.addEventListener('click', () => {
    const query = searchInput.value.toLowerCase();
    const root = stamboomData.find(p => 
        p.ID.toLowerCase() === query ||
        (p.voornaam && p.voornaam.toLowerCase().includes(query)) ||
        (p.achternaam && p.achternaam.toLowerCase().includes(query))
    );
    if(root){
        renderTabel(root);
    } else {
        alert('Persoon niet gevonden!');
    }
});

// 7. Init: render tabel voor eerste persoon als default
if(stamboomData.length > 0) renderTabel(stamboomData[0]);

