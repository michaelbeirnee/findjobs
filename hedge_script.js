// ── Hedge Funds Data ─────────────────────────────────────────
// Top 100 Hedge Funds ranked by AUM
 
// ── Runtime state ────────────────────────────────────────────
let FIRMS = [];
let INTERN_STATUS = {};
let query = "";
let sortMode = "rank";
let activeBands = new Set(["Top 50", "51-100"]);
let showInternOnly = false;
 
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
  const internData = INTERN_STATUS[firm.name] || {};
  const hasIntern = internData.hasInternPosting === true;
  const careerUrl = internData.careerUrl || firm.careerUrl || null;
 
  const card = document.createElement("div");
  card.className = "card" + (hasIntern ? " card--has-intern" : "");
 
  // Intern badge HTML
  const internBadgeHtml = hasIntern ? `
    <div class="card__intern-badge">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
      </svg>
      Intern Posting Open
    </div>` : "";
 
  // Career / website button
  const careerBtnHtml = careerUrl
    ? `<a class="btn-career"
          href="${careerUrl}"
          target="_blank" rel="noopener noreferrer"
          title="View career page">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <rect x="2" y="7" width="20" height="14" rx="2"/>
           <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
         </svg>
         Careers
       </a>`
    : `<a class="btn-career btn-career--fallback"
          href="${linkedInInternUrl(firm.name)}"
          target="_blank" rel="noopener noreferrer"
          title="Search intern jobs on LinkedIn">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
         </svg>
         Intern Search
       </a>`;
 
  // Job count from intern status
  const internJobs = internData.jobs || [];
  const jobCountHtml = hasIntern && internJobs.length > 0
    ? `<div class="card__job-count">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
         </svg>
         ${internJobs.length} open position${internJobs.length !== 1 ? "s" : ""}
       </div>`
    : "";
 
  const companyPageUrl = `company.html?firm=${encodeURIComponent(firm.name)}&type=hedge`;
 
  card.innerHTML = `
    ${internBadgeHtml}
    <div class="card__header">
      <div class="card__initials">${initials(firm.name)}</div>
      <span class="card__presence-pill presence-h">#${firm.rank}</span>
    </div>
    <div class="card__name">${firm.name}</div>
    <div class="card__type">Hedge Fund · ${firm.aum} AUM · ${firm.location || "N/A"}</div>
    ${jobCountHtml}
    <div class="card__actions">
      <a class="card__view-jobs"
         href="${companyPageUrl}"
         title="View intern job listings for ${firm.name}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
        View Jobs
      </a>
      ${careerBtnHtml}
      <a class="btn-primary" href="${linkedInJobsUrl(firm.name)}" target="_blank" rel="noopener noreferrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        LinkedIn Jobs
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
    if (showInternOnly) {
      const s = INTERN_STATUS[f.name];
      if (!s || !s.hasInternPosting) return false;
    }
    return true;
  });
 
  if (sortMode === "alpha") filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortMode === "intern") {
    filtered.sort((a, b) => {
      const aIntern = (INTERN_STATUS[a.name] || {}).hasInternPosting ? 0 : 1;
      const bIntern = (INTERN_STATUS[b.name] || {}).hasInternPosting ? 0 : 1;
      return aIntern - bIntern || a.rank - b.rank;
    });
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
 
  document.getElementById("resultsCount").textContent = `Showing ${filtered.length} of ${FIRMS.length} funds`;
}
 
async function init() {
  const res = await fetch("hedge_funds_data.json");
  FIRMS = await res.json();
  document.getElementById("totalCount").textContent = FIRMS.length;
 
  // Load intern status
  try {
    const statusRes = await fetch("hedge_intern_status.json");
    if (statusRes.ok) {
      const data = await statusRes.json();
      INTERN_STATUS = data.firms || {};
 
      if (data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        const el = document.getElementById("lastChecked");
        if (el) {
          el.textContent = `Postings last checked: ${date.toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric"
          })}`;
          el.hidden = false;
        }
      }
 
      const internCount = Object.values(INTERN_STATUS).filter(s => s.hasInternPosting).length;
      const internEl = document.getElementById("internCount");
      if (internEl) internEl.textContent = internCount;
 
      const toggleLabel = document.getElementById("internToggleLabel");
      if (toggleLabel && internCount > 0) {
        toggleLabel.textContent = `Intern postings only (${internCount} found)`;
      }
    }
  } catch (_) {
    // hedge_intern_status.json not available yet
  }
 
  // Search
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
 
  // Sort
  document.getElementById("sortSelect").addEventListener("change", e => { sortMode = e.target.value; applyFilters(); });
 
  // Band filters
  document.querySelectorAll('input[name="band"]').forEach(cb => cb.addEventListener("change", () => {
    activeBands = new Set([...document.querySelectorAll('input[name="band"]:checked')].map(i => i.value));
    applyFilters();
  }));
 
  // Intern-only toggle
  const internToggle = document.getElementById("internOnlyToggle");
  if (internToggle) {
    internToggle.addEventListener("change", () => {
      showInternOnly = internToggle.checked;
      applyFilters();
    });
  }
 
  applyFilters();
}
 
init();