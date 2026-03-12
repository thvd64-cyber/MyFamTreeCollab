// ======================= DRAW TIMELINE =======================
function drawTimeline(data, focusPerson){

// container ophalen
const container = document.getElementById("timelineContainer");

// container leeg maken
container.innerHTML = "";


// svg canvas maken
const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");

svg.setAttribute("width","3000"); // brede timeline
svg.setAttribute("height","200");

container.appendChild(svg);


// ======================= JAAR RANGE =======================

// alle geboortejaren ophalen
const years = data.map(p => new Date(p.Geboortedatum).getFullYear());

// minimum jaar
const minYear = Math.min(...years);

// maximum jaar
const maxYear = Math.max(...years);


// ======================= JAAR → POSITIE =======================
function yearToX(year){

return ((year - minYear) / (maxYear - minYear)) * 2800 + 50;

}


// ======================= BASIS LIJN =======================

const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");

baseLine.setAttribute("x1","50");
baseLine.setAttribute("y1","100");
baseLine.setAttribute("x2","2850");
baseLine.setAttribute("y2","100");
baseLine.setAttribute("stroke","#000");

svg.appendChild(baseLine);


// ======================= PERSONEN =======================

data.forEach(p => {

// geboortejaar
const year = new Date(p.Geboortedatum).getFullYear();

// x positie
const x = yearToX(year);

// y positie
const y = 100;


// punt maken
const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");

circle.setAttribute("cx",x);
circle.setAttribute("cy",y);
circle.setAttribute("r","6");

// focus persoon highlighten
if(p.ID === focusPerson.ID){

circle.setAttribute("fill","red");

}else{

circle.setAttribute("fill","black");

}

svg.appendChild(circle);


// naam label
const name = p.Roepnaam + " " + (p.Prefix || "") + " " + p.Achternaam;

const label = document.createElementNS("http://www.w3.org/2000/svg","text");

label.setAttribute("x",x+10);
label.setAttribute("y",y-10);

label.textContent = name + " (" + year + ")";

svg.appendChild(label);

});

}
