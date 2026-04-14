let FIRMS = [];
let query = "";
let sortMode = "rank";
let activeBands = new Set(["Top 50", "51-100"]);

function initials(name) {
  const words = name.replace(/[^a-zA-Z0-9\s&+]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
}

function linkedInJobsUrl(name) {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name)}&position=1&pageNum=0`;
}

function linkedInInternUrl(name) {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name + " intern")}&position=1&pageNum=0`;
}

function glassdoorUrl(name) {
  return `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(name)}`;
}

function rankBand(f) {
  return f.rank <= 50 ? "Top 50" : "51-100";
}

function renderCard(firm) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="card__header">
      <div class="card__initials">${initials(firm.name)}</div>
      <span class="card__presence-pill presence-h">#${firm.rank}</span>
    </div>
    <div class="card__name">${firm.name}</div>
    <div class="card__type">Hedge Fund · ${firm.aum} AUM · ${firm.location || "N/A"}</div>
    <div class="card__actions">
      <a class="btn-career" href="${linkedInJobsUrl(firm.name)}" target="_blank" rel="noopener noreferrer">LinkedIn Jobs</a>
      <a class="btn-primary" href="${linkedInInternUrl(firm.name)}" target="_blank" rel="noopener noreferrer">Intern Jobs</a>
      <a class="btn-secondary" href="${glassdoorUrl(firm.name)}" target="_blank" rel="noopener noreferrer">Reviews</a>
    </div>
  `;
  return card;
}

function applyFilters() {
  const q = query.trim().toLowerCase();
  let filtered = FIRMS.filter(f => activeBands.has(rankBand(f)) && (!q || f.name.toLowerCase().includes(q)));
  if (sortMode === "alpha") filtered.sort((a, b) => a.name.localeCompare(b.name));
  else filtered.sort((a, b) => a.rank - b.rank);

  const grid = document.getElementById("cardsGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";
  if (!filtered.length) { empty.hidden = false; return; }
  empty.hidden = true;

  const frag = document.createDocumentFragment();
  filtered.forEach(f => frag.appendChild(renderCard(f)));
  grid.appendChild(frag);

  document.getElementById("resultsCount").textContent = `Showing ${filtered.length} of ${FIRMS.length} funds`;
}

async function init() {
  const res = await fetch("hedge_funds_data.json");
  FIRMS = await res.json();
  document.getElementById("totalCount").textContent = FIRMS.length;

  document.getElementById("searchInput").addEventListener("input", e => {
    query = e.target.value;
    document.getElementById("clearSearch").hidden = !query;
    applyFilters();
  });
  document.getElementById("clearSearch").addEventListener("click", () => {
    query = "";
    document.getElementById("searchInput").value = "";
    document.getElementById("clearSearch").hidden = true;
    applyFilters();
  });
  document.getElementById("sortSelect").addEventListener("change", e => { sortMode = e.target.value; applyFilters(); });
  document.querySelectorAll('input[name="band"]').forEach(cb => cb.addEventListener("change", () => {
    activeBands = new Set([...document.querySelectorAll('input[name="band"]:checked')].map(i => i.value));
    applyFilters();
  }));

  applyFilters();
}

init();
