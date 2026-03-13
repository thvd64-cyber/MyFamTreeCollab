// ======================= js/schema.js v0.1.0 =======================
// Centrale datastructuur voor MyFamTreeCollab
// Beheert: schema velden, CSV parsing, header validatie en legacy migratie

(function(){ // self-executing functie voorkomt globale variabelen

'use strict'; // activeert strengere JS validatie

// ======================= SCHEMA INFO =======================

const SCHEMA_VERSION = "0.1.0"; // versie van datastructuur

const MAX_COLUMNS = 22; // maximale aantal kolommen toegestaan in CSV

// ======================= HOOFDVELDEN (1–14) =======================
// deze velden hebben betekenis voor de applicatie

const FIELDS = [

"ID",               // uniek persoon ID
"Doopnaam",         // officiële naam
"Roepnaam",         // roepnaam
"Prefix",           // tussenvoegsel
"Achternaam",       // familienaam
"Geslacht",         // M / V / X
"Geboortedatum",    // yyyy-mm-dd
"Geboorteplaats",   // plaats geboorte
"Overlijdensdatum", // yyyy-mm-dd
"Overlijdensplaats",// plaats overlijden
"VaderID",          // verwijzing vader
"MoederID",         // verwijzing moeder
"PartnerID",        // meerdere partners met |
"Opmerkingen"       // vrije tekst

];

const CORE_FIELD_COUNT = FIELDS.length; // aantal schema velden (14)

// ======================= LEGACY HEADERS =======================
// oudere CSV structuren die automatisch gemigreerd worden

const LEGACY_HEADERS = [

[
"ID","Doopnaam","Roepnaam","Prefix","Achternaam","Geslacht",
"Geboortedatum","Geboorteplaats","Overlijdensdatum","Overlijdensplaats",
"VaderID","MoederID","PartnerID",
"Huwelijksdatum","Huwelijksplaats",
"Opmerkingen","Huisadressen","ContactInfo","URL"
]

];

// ======================= SPECIALE VELDEN =======================

const DATE_FIELDS = [

"Geboortedatum",    // geboortedatum moet datum parsing krijgen
"Overlijdensdatum"  // overlijdensdatum moet datum parsing krijgen

];

const GESLACHT_VALUES = {

nl:["M","V","X"],   // Nederlandse waarden
en:["M","F","X"]    // Engelse waarden

};

const DEFAULT_GESLACHT = "X"; // standaard waarde

// ======================= CSV HELPER =======================

// split CSV regel maar laat komma's binnen quotes intact
function splitCSV(line){

return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

}

// verwijdert CSV quotes en escaped quotes
function cleanValue(value){

return (value || "")
.replace(/^"|"$/g,"") // verwijder begin en eind quotes
.replace(/""/g,'"'); // converteer dubbele quotes

}

// ======================= HEADER VALIDATIE =======================

// controleert alleen eerste 14 kolommen
function validateHeader(headerLine){

const header = splitCSV(headerLine).map(h=>h.trim());

for(let i=0;i<CORE_FIELD_COUNT;i++) // controleer alleen kernvelden
if(header[i] !== FIELDS[i])
return false;

return true; // header is geldig

}

// ======================= HEADER TYPE DETECTIE =======================

function normalizeHeader(headerLine){

const header = splitCSV(headerLine).map(h=>h.trim());

if(validateHeader(headerLine)) // check huidige schema
return {type:"current", header};

for(const legacy of LEGACY_HEADERS) // check legacy headers

if(header.join(",") === legacy.join(","))

return {type:"legacy", header};

return {type:"unknown", header};

}

// ======================= LEEG OBJECT =======================

function createEmptyPersoon(){

const obj = {}; // maak nieuw object

FIELDS.forEach(field => obj[field] = ""); // initialiseer velden

obj.Geslacht = DEFAULT_GESLACHT; // standaard geslacht

return obj;

}

// ======================= VALIDATIE =======================

function validatePerson(obj, lang="nl"){

if(!obj.ID) return false; // ID verplicht

if(!GESLACHT_VALUES[lang].includes(obj.Geslacht)) // geslacht check
return false;

return true;

}

// ======================= LEGACY MIGRATIE =======================

function migrateLegacyRow(values, header){

const obj = createEmptyPersoon(); // maak leeg schema object

FIELDS.forEach(field=>{ // loop door schema velden

const index = header.indexOf(field); // zoek positie in legacy header

if(index !== -1)
obj[field] = cleanValue(values[index]); // kopieer waarde

});

return obj;

}

// ======================= CSV → OBJECT =======================

function csvRowToObject(row, headerInfo){

const values = splitCSV(row); // split CSV regel

if(values.length > MAX_COLUMNS) // limiet controle
values.length = MAX_COLUMNS;

if(headerInfo.type === "legacy") // legacy structuur
return migrateLegacyRow(values, headerInfo.header);

const obj = createEmptyPersoon(); // maak nieuw object

FIELDS.forEach((field,i)=>{ // vul schema velden

let value = cleanValue(values[i]); // haal waarde op

if(DATE_FIELDS.includes(field) && value){ // datum parsing

const date = new Date(value);

obj[field] = isNaN(date) ? "" : date;

}
else{

obj[field] = value;

}

});

return obj;

}

// ======================= OBJECT → CSV =======================

function objectToCSVRow(obj){

return FIELDS.map(field=>{ // loop door schema velden

let value = obj[field] ?? "";

if(DATE_FIELDS.includes(field) && value instanceof Date)

value = value.toISOString().split("T")[0]; // datum formaat

return `"${String(value).replace(/"/g,'""')}"`; // CSV escape

}).join(",");

}

// ======================= PARTNER HELPERS =======================

function parsePartners(partnerField){

return partnerField
? partnerField.split("|").map(s=>s.trim()).filter(Boolean)
: [];

}

function stringifyPartners(arr){

return arr.join("|");

}

// ======================= EXPORT =======================

window.StamboomSchema = {

version: SCHEMA_VERSION, // schema versie
fields: FIELDS, // kernvelden
coreFieldCount: CORE_FIELD_COUNT, // aantal schema velden
maxColumns: MAX_COLUMNS, // maximaal aantal CSV kolommen

validateHeader, // header validatie
normalizeHeader, // header type detectie

empty: createEmptyPersoon, // leeg object
validate: validatePerson, // basis validatie

fromCSV: csvRowToObject, // CSV → object
toCSV: objectToCSVRow, // object → CSV

parsePartners, // partner parser
stringifyPartners, // partner formatter

GESLACHT_VALUES // toegestane geslacht waarden

};

})(); // einde schema module
