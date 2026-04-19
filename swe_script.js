// ── Software Engineering Companies Data ─────────────────────
 
let FIRMS = [];
let query = "";
let sortMode = "default";
 
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
 
function renderCard(name) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="card__header">
      <div class="card__initials">${initials(name)}</div>
    </div>
    <div class="card__name">${name}</div>
    <div class="card__type">Software Engineering Company</div>
    <div class="card__actions">
      <a class="btn-primary" href="${linkedInJobsUrl(name)}" target="_blank" rel="noopener noreferrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        LinkedIn Jobs
      </a>
      <a class="btn-career btn-career--fallback" href="${linkedInInternUrl(name)}" target="_blank" rel="noopener noreferrer" title="Search intern jobs on LinkedIn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Intern Search
      </a>
      <a class="btn-secondary" href="${glassdoorUrl(name)}" target="_blank" rel="noopener noreferrer" title="View on Glassdoor">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Reviews
      </a>
    </div>
  `;
  return card;
}
 
function applyFilters() {
  const q = query.trim().toLowerCase();
  let filtered = FIRMS.filter(name => !q || name.toLowerCase().includes(q));
 
  if (sortMode === "alpha") {
    filtered = [...filtered].sort((a, b) => a.localeCompare(b));
  }
 
  const grid = document.getElementById("cardsGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";
  if (!filtered.length) { empty.hidden = false; return; }
  empty.hidden = true;
 
  const frag = document.createDocumentFragment();
  filtered.forEach(n => frag.appendChild(renderCard(n)));
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
 
  const sortEl = document.getElementById("sortSelect");
  if (sortEl) {
    sortEl.addEventListener("change", e => {
      sortMode = e.target.value;
      applyFilters();
    });
  }

  applyFilters();
}

init();
