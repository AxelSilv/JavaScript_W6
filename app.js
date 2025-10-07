const API = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

function years(from, to) {
  let yearSupport = [];
  for (let i = from; i <= to; i++) yearSupport.push(String(i));
  return yearSupport;
}

let AREA_NAME_BY_CODE = {};
let AREA_CODE_BY_NAME = {};
let chart = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadAreas();
    const data = await postForArea("SSS");
    window.populationData = data;
    renderChart(data, "SSS");
  } catch (err) {
    console.error("Init error:", err);
    document.querySelector("#chart").textContent = "Data fetch failed.";
  }

  document.getElementById("submit-data").addEventListener("click", async () => {
    const txt = document.getElementById("input-area").value.trim();
    if (!txt) return;
    const code = findAreaCode(txt);
    if (!code) {
      alert("Municipality not found. Try the official name (case-insensitive), e.g. Helsinki.");
      return;
    }
    try {
      const data = await postForArea(code);
      renderChart(data, code);
    } catch (e) {
      console.error(e);
      alert("Fetching data failed for: " + (AREA_NAME_BY_CODE[code] || code));
    }
  });
});

async function loadAreas() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`Meta HTTP ${res.status}`);
  const meta = await res.json();
  const areaVar = (meta.variables || []).find(v => v.code === "Alue");
  if (!areaVar) throw new Error("Area variable not found in metadata.");
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
  const byName = AREA_CODE_BY_NAME[input.toLowerCase()];
  return byName || null;
}

async function postForArea(areaCode) {
  const requestBody = {
    query: [
      { code: "Vuosi", selection: { filter: "item", values: years(1990, 2024) } },
      { code: "Alue", selection: { filter: "item", values: [areaCode] } },
      { code: "Tiedot", selection: { filter: "item", values: ["vaesto"] } }
    ],
    response: { format: "json-stat2" }
  };
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(requestBody)
  });
  if (!res.ok) throw new Error(`POST HTTP ${res.status}`);
  return res.json();
}

function renderChart(json, areaCode) {
  const idx = json.dimension.Vuosi.category.index;
  const labels = [];
  const values = [];
  for (let y = 2000; y <= 2021; y++) {
    const key = String(y);
    labels.push(key);
    values.push(Number(json.value[idx[key]]));
  }
  const areaName = AREA_NAME_BY_CODE[areaCode] || areaCode;
  const data = { labels, datasets: [{ name: "Population", values }] };
  if (!chart) {
    chart = new frappe.Chart("#chart", {
      title: `Population of ${areaName} (2000–2021)`,
      data,
      type: "line",
      height: 450,
      colors: ["#eb5146"],
      lineOptions: { hideDots: 1, regionFill: 0 }
    });
  } else {
    chart.update(data);
    chart.parent.querySelector(".title").textContent = `Population of ${areaName} (2000–2021)`;
  }
}
