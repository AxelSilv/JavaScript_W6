const API = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

function years(from, to) {
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(String(i));
  return arr;
}

let AREA_NAME_BY_CODE = {};
let AREA_CODE_BY_NAME = {};
let chart = null;
let currentLabels = [];
let currentValues = [];
let currentAreaTitle = "";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadAreas();
    const data = await postForArea("SSS");
    renderChart(data, "SSS");
  } catch {
    document.querySelector("#chart").textContent = "Data fetch failed.";
  }

  document.getElementById("submit-data").addEventListener("click", async () => {
    const txt = document.getElementById("input-area").value.trim();
    if (!txt) return;
    const code = findAreaCode(txt);
    if (!code) { alert("Municipality not found."); return; }
    try {
      const data = await postForArea(code);
      renderChart(data, code);
    } catch {
      alert("Fetching data failed.");
    }
  });

  document.getElementById("add-data").addEventListener("click", () => {
    if (currentValues.length < 2) return;
    const deltas = [];
    for (let i = 1; i < currentValues.length; i++) {
      deltas.push(currentValues[i] - currentValues[i - 1]);
    }
    const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const nextValue = currentValues[currentValues.length - 1] + meanDelta;
    const lastLabel = currentLabels[currentLabels.length - 1];
    const nextLabel = /^\d+$/.test(lastLabel) ? String(Number(lastLabel) + 1) : `${lastLabel}*`;
    currentLabels = [...currentLabels, nextLabel];
    currentValues = [...currentValues, nextValue];
    drawChart();
  });
});

async function loadAreas() {
  const res = await fetch(API);
  const meta = await res.json();
  const areaVar = (meta.variables || []).find(v => v.code === "Alue");
  const codes = areaVar.values;
  const names = areaVar.valueTexts;
  AREA_NAME_BY_CODE = {};
  AREA_CODE_BY_NAME = {};
  codes.forEach((code, i) => {
    const name = names[i];
    AREA_NAME_BY_CODE[code] = name;
    AREA_CODE_BY_NAME[name.toLowerCase()] = code;
  });
}

function findAreaCode(input) {
  const direct = input.toUpperCase();
  if (AREA_NAME_BY_CODE[direct]) return direct;
  return AREA_CODE_BY_NAME[input.toLowerCase()] || null;
}

async function postForArea(areaCode) {
  const body = {
    query: [
      { code: "Vuosi",  selection: { filter: "item", values: years(2000, 2021) } },
      { code: "Alue",   selection: { filter: "item", values: [areaCode] } },
      { code: "Tiedot", selection: { filter: "item", values: ["vaesto"] } }
    ],
    response: { format: "json-stat2" }
  };
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

function renderChart(json, areaCode) {
  currentLabels = years(2000, 2021);
  currentValues = json.value.map(Number);
  currentAreaTitle = areaCode === "SSS" ? "whole country" : (AREA_NAME_BY_CODE[areaCode] || areaCode);
  drawChart();
}

function drawChart() {
  const container = document.querySelector("#chart");
  container.innerHTML = "";
  chart = new frappe.Chart("#chart", {
    title: `Population growth in ${currentAreaTitle}`,
    data: {
      labels: currentLabels,
      datasets: [{ name: "Population", values: currentValues }]
    },
    type: "line",
    height: 450,
    colors: ["#eb5146"],
    lineOptions: { hideDots: 0, dotSize: 3, regionFill: 0 }
  });
}
