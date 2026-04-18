// ── Software Engineering Companies Data ─────────────────────
// Top 50 SWE companies ranked by headcount & global footprint
 
let FIRMS = [];
let query = "";
let sortMode = "rank";
let activeBands = new Set(["Top 10", "11-25", "26-50"]);
let activeFootprints = new Set();
 
function initials(name) {
  const stripped = name.replace(/\([^)]*\)/g, "").trim();
  const words = stripped.replace(/[^a-zA-Z0-9\s&+]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
}
 
function linkedInJobsUrl(name) {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name + " software engineer")}&position=1&pageNum=0`;
}
 
function linkedInInternUrl(name) {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name + " software engineer intern")}&position=1&pageNum=0`;
}
 
function glassdoorUrl(name) {
  return `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(name)}`;
}
 
function formatHeadcount(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return n.toString();
}
 
function rankBand(f) {
  if (f.rank <= 10) return "Top 10";
  if (f.rank <= 25) return "11-25";
  return "26-50";
}
 
function renderCard(firm) {
  const card = document.createElement("div");
  card.className = "card";
 
  const totalSwe = (firm.sweUS || 0) + (firm.sweIntl || 0);
 
  const europeHtml = firm.europeOffices && firm.europeOffices.length
    ? `<div class="card__offices">
         <strong>Europe:</strong> ${firm.europeOffices.join(", ")}
       </div>`
    : "";
 
  const otherHtml = firm.otherOffices && firm.otherOffices.length
    ? `<div class="card__offices">
         <strong>Global:</strong> ${firm.otherOffices.join(", ")}
       </div>`
    : "";
 
  card.innerHTML = `
    <div class="card__header">
      <div class="card__initials">${initials(firm.name)}</div>
      <span class="card__presence-pill presence-h">#${firm.rank}</span>
    </div>
    <div class="card__name">${firm.name}</div>
    <div class="card__type">SWE Company · ~${formatHeadcount(totalSwe)} engineers worldwide</div>
    <div class="card__swe-stats">
      <div class="swe-stat"><span>${formatHeadcount(firm.sweUS)}</span><small>US SWEs</small></div>
      <div class="swe-stat"><span>${formatHeadcount(firm.sweIntl)}</span><small>Non-US SWEs</small></div>
    </div>
    ${europeHtml}
    ${otherHtml}
    <div class="card__actions">
      <a class="btn-primary" href="${linkedInJobsUrl(firm.name)}" target="_blank" rel="noopener noreferrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        LinkedIn Jobs
      </a>
      <a class="btn-career btn-career--fallback" href="${linkedInInternUrl(firm.name)}" target="_blank" rel="noopener noreferrer" title="Search intern jobs on LinkedIn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Intern Search
      </a>
      <a class="btn-secondary" href="${glassdoorUrl(firm.name)}" target="_blank" rel="noopener noreferrer" title="View on Glassdoor">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Reviews
      </a>
    </div>
  `;
  return card;
}
 
function applyFilters() {
  const q = query.trim().toLowerCase();
  let filtered = FIRMS.filter(f => {
    if (!activeBands.has(rankBand(f))) return false;
    if (q && !f.name.toLowerCase().includes(q)) return false;
    if (activeFootprints.has("europe") && !(f.europeOffices && f.europeOffices.length)) return false;
    if (activeFootprints.has("global") && !(f.otherOffices && f.otherOffices.length)) return false;
    return true;
  });
 
  if (sortMode === "alpha") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === "us") {
    filtered.sort((a, b) => b.sweUS - a.sweUS);
  } else if (sortMode === "intl") {
    filtered.sort((a, b) => b.sweIntl - a.sweIntl);
  } else if (sortMode === "total") {
    filtered.sort((a, b) => (b.sweUS + b.sweIntl) - (a.sweUS + a.sweIntl));
  } else {
    filtered.sort((a, b) => a.rank - b.rank);
  }
 
  const grid = document.getElementById("cardsGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";
  if (!filtered.length) { empty.hidden = false; return; }
  empty.hidden = true;
 
  const frag = document.createDocumentFragment();
  filtered.forEach(f => frag.appendChild(renderCard(f)));
  grid.appendChild(frag);
 
  document.getElementById("resultsCount").textContent = `Showing ${filtered.length} of ${FIRMS.length} companies`;
}
 
async function init() {
  const res = await fetch("swe_firms_data.json");
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
 
  document.getElementById("sortSelect").addEventListener("change", e => {
    sortMode = e.target.value;
    applyFilters();
  });
 
  document.querySelectorAll('input[name="band"]').forEach(cb => cb.addEventListener("change", () => {
    activeBands = new Set([...document.querySelectorAll('input[name="band"]:checked')].map(i => i.value));
    applyFilters();
  }));
 
  document.querySelectorAll('input[name="footprint"]').forEach(cb => cb.addEventListener("change", () => {
    activeFootprints = new Set([...document.querySelectorAll('input[name="footprint"]:checked')].map(i => i.value));
    applyFilters();
  }));
 
  applyFilters();
}
 
init();