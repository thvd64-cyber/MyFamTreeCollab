// ======================= js.timeline.js v0.0.0  =======================
// ======================= LIVE SEARCH HERGEBRUIKEN =======================
// we koppelen dezelfde liveSearch functie die al op je site bestaat
document.getElementById("liveSearchInput")
.addEventListener("input", liveSearch); // liveSearch komt uit je bestaande code

// ======================= RESULT CLICK OVERRIDE =======================
// wanneer een resultaat gekozen wordt tekenen we de tijdlijn
function selectPerson(personID){ // deze functie wordt al aangeroepen door je searchResults renderer
const person = peopleData.find(p => p.ID === personID); // persoon zoeken in bestaande dataset
drawTimeline(person); // tijdlijn tekenen met geselecteerde persoon
}

// ======================= TIMELINE FUNCTIE =======================
function drawTimeline(focusPerson){

const container = document.getElementById("timelineContainer"); // container ophalen
container.innerHTML = ""; // oude tijdlijn verwijderen

// ======================= SVG CANVAS =======================
const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // svg element maken
svg.setAttribute("width","3000"); // brede tijdlijn zodat veel jaren passen
svg.setAttribute("height","200"); // hoogte van de grafiek

container.appendChild(svg); // svg toevoegen aan container

// ======================= GEBOORTEJAREN BEREKENEN =======================
const years = peopleData.map(p => new Date(p.Geboortedatum).getFullYear()); // alle geboortejaren ophalen

const minYear = Math.min(...years); // oudste geboortejaar
const maxYear = Math.max(...years); // jongste geboortejaar


// ======================= JAAR NAAR PIXEL POSITIE =======================
function yearToX(year){

return ((year - minYear) / (maxYear - minYear)) * 2800 + 50; // jaar omzetten naar horizontale positie

}


// ======================= BASIS TIJDLIJN =======================
const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn element

baseLine.setAttribute("x1","50"); // begin positie
baseLine.setAttribute("y1","100");

baseLine.setAttribute("x2","2850"); // eind positie
baseLine.setAttribute("y2","100");

baseLine.setAttribute("stroke","black"); // kleur lijn

svg.appendChild(baseLine); // toevoegen aan svg


// ======================= PERSONEN TEKENEN =======================
peopleData.forEach(p => {

const year = new Date(p.Geboortedatum).getFullYear(); // geboortejaar ophalen

const x = yearToX(year); // x positie berekenen
const y = 100; // alle personen op dezelfde horizontale lijn


// punt tekenen
const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");

circle.setAttribute("cx",x); // x positie
circle.setAttribute("cy",y); // y positie
circle.setAttribute("r","6"); // grootte punt


// geselecteerde persoon highlighten
if(p.ID === focusPerson.ID){

circle.setAttribute("fill","red"); // focus persoon rood

}else{

circle.setAttribute("fill","black"); // overige zwart

}

svg.appendChild(circle); // punt toevoegen


// ======================= NAAM LABEL =======================
const name = p.Roepnaam + " " + (p.Prefix || "") + " " + p.Achternaam; // volledige naam samenstellen

const label = document.createElementNS("http://www.w3.org/2000/svg","text"); // tekst element maken

label.setAttribute("x",x + 10); // iets rechts van punt
label.setAttribute("y",y - 10); // iets boven punt

label.textContent = name + " (" + year + ")"; // tekst inhoud

svg.appendChild(label); // label toevoegen

});

}
