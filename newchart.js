const API = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

function years(a,b){return Array.from({length:b-a+1},(_,i)=>String(a+i));}

let AREA_NAME_BY_CODE = {};

document.addEventListener("DOMContentLoaded", async () => {
  const areaCode = sessionStorage.getItem("wk6_area_code") || "SSS";
  await loadAreas();
  const birthsJson = await postFor(areaCode, "vm01"); // Births
  const deathsJson = await postFor(areaCode, "vm11"); // Deaths
  render(birthsJson, deathsJson, areaCode);
});

async function loadAreas(){
  const res = await fetch(API);
  const meta = await res.json();
  const areaVar = (meta.variables||[]).find(v=>v.code==="Alue");
  AREA_NAME_BY_CODE = {};
  areaVar.values.forEach((code,i)=>{ AREA_NAME_BY_CODE[code]=areaVar.valueTexts[i]; });
}

async function postFor(areaCode, infoCode){
  const body = {
    query:[
      { code:"Vuosi", selection:{ filter:"item", values:years(2000,2021) } },
      { code:"Alue",  selection:{ filter:"item", values:[areaCode] } },
      { code:"Tiedot",selection:{ filter:"item", values:[infoCode] } }
    ],
    response:{ format:"json-stat2" }
  };
  const res = await fetch(API,{
    method:"POST",
    headers:{ "content-type":"application/json", accept:"application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

function render(birthsJson, deathsJson, areaCode){
  const labels = years(2000, 2021);
  const births = birthsJson.value.map(Number); 
  const deaths = deathsJson.value.map(Number); 
  const areaTitle = areaCode==="SSS" ? "whole country" : (AREA_NAME_BY_CODE[areaCode]||areaCode);

  const container = document.querySelector("#chart");
  container.innerHTML = "";

  new frappe.Chart("#chart",{
    title:`Births and deaths in ${areaTitle}`,
    data:{
      labels,
      datasets:[
        { name:"Deaths", values:deaths },    
        { name:"Births", values:births }     
      ]
    },
    type:"bar",
    height:450,
    colors:["#63d0ff","#363636"]
  });
}