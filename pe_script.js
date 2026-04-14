// ── Private Equity Firms Data ────────────────────────────────
// Top 100 PE Firms ranked by AUM
// Tiers: Mega Fund (≥$75B), Large Fund ($40B–$75B), Upper Mid-Market ($25B–$40B), Mid-Market (<$25B)
 
// ── Runtime state ────────────────────────────────────────────
let PE_FIRMS     = [];      // populated from pe_firms_data.json
let INTERN_STATUS = {};     // populated from pe_intern_status.json
 
// ── Tier helpers ─────────────────────────────────────────────
const TIER_ORDER = { "Mega Fund": 0, "Large Fund": 1, "Upper Mid-Market": 2, "Mid-Market": 3 };
 
const TIER_CLASS = {
  "Mega Fund":        "tier-mega",
  "Large Fund":       "tier-large",
  "Upper Mid-Market": "tier-uppermid",
  "Mid-Market":       "tier-mid",
};
 
const TIER_AUM_LABEL = {
  "Mega Fund":        "AUM ≥ $75B",
  "Large Fund":       "$40B – $75B",
  "Upper Mid-Market": "$25B – $40B",
  "Mid-Market":       "< $25B",
};
 
// ── Utility: get initials ────────────────────────────────────
function initials(name) {
  const words = name.replace(/[^a-zA-Z0-9\s&+]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1][0] || "")).toUpperCase();
}
 
// ── Utility: LinkedIn jobs URL ───────────────────────────────
function linkedInJobsUrl(firmName) {
  const encoded = encodeURIComponent(firmName);
  return `https://www.linkedin.com/jobs/search/?keywords=${encoded}&f_C=&position=1&pageNum=0`;
}
 
// ── Utility: LinkedIn intern-specific jobs URL ───────────────
function linkedInInternUrl(firmName) {
  const encoded = encodeURIComponent(firmName + " intern");
  return `https://www.linkedin.com/jobs/search/?keywords=${encoded}&position=1&pageNum=0`;
}
 
// ── Utility: Glassdoor URL ───────────────────────────────────
function glassdoorUrl(firmName) {
  const encoded = encodeURIComponent(firmName);
  return `https://www.glassdoor.com/Search/results.htm?keyword=${encoded}`;
}
 
function getFirmSectionKey(firm) {
  return firm.tier || "Mid-Market";
}
 
// ── Render a single card ─────────────────────────────────────
function renderCard(firm) {
  const internData  = INTERN_STATUS[firm.name] || {};
  const hasIntern   = internData.hasInternPosting === true;
 
  const careerUrl   = internData.careerUrl || firm.careerUrl || null;
 
  const card = document.createElement("div");
  card.className = "card card--pe" + (hasIntern ? " card--has-intern" : "");
  card.dataset.tier = firm.tier;
 
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
  const internJobs  = internData.jobs || [];
  const jobCountHtml = hasIntern && internJobs.length > 0
    ? `<div class="card__job-count">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
         </svg>
         ${internJobs.length} open position${internJobs.length !== 1 ? "s" : ""}
       </div>`
    : "";
 
  const companyPageUrl = `company.html?firm=${encodeURIComponent(firm.name)}&type=pe`;
 
  card.innerHTML = `
    ${internBadgeHtml}
    <div class="card__header">
      <div class="card__initials card__initials--pe">${initials(firm.name)}</div>
      <span class="card__presence-pill ${TIER_CLASS[firm.tier]}">${firm.tier}</span>
    </div>
    <div class="card__name">${firm.name}</div>
    <div class="card__type card__type--pe">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      #${firm.rank} &middot; ${firm.aum} AUM &middot; ${firm.location}
    </div>
    <div class="card__interns card__interns--pe">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      ${TIER_AUM_LABEL[firm.tier]}
    </div>
    ${jobCountHtml}
    <div class="card__actions">
      <a class="card__view-jobs card__view-jobs--pe"
         href="${companyPageUrl}"
         title="View intern job listings for ${firm.name}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
        View Jobs
      </a>
      ${careerBtnHtml}
      <a class="btn-primary"
         href="${linkedInJobsUrl(firm.name)}"
         target="_blank" rel="noopener noreferrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        LinkedIn Jobs
      </a>
      <a class="btn-secondary"
         href="${glassdoorUrl(firm.name)}"
         target="_blank" rel="noopener noreferrer"
         title="View on Glassdoor">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Reviews
      </a>
    </div>
  `;
 
  return card;
}
 
// ── State ────────────────────────────────────────────────────
let searchQuery = "";
let activeTiers = new Set(["Mega Fund", "Large Fund", "Upper Mid-Market", "Mid-Market"]);
let sortMode = "rank";
let showInternOnly = false;
 
// ── Filter & render ──────────────────────────────────────────
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
 
  let filtered = PE_FIRMS.filter(f => {
    if (!activeTiers.has(f.tier)) return false;
    if (q && !f.name.toLowerCase().includes(q)) return false;
    if (showInternOnly) {
      const s = INTERN_STATUS[f.name];
      if (!s || !s.hasInternPosting) return false;
    }
    return true;
  });
 
  if (sortMode === "alpha") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === "intern") {
    filtered.sort((a, b) => {
      const aIntern = (INTERN_STATUS[a.name] || {}).hasInternPosting ? 0 : 1;
      const bIntern = (INTERN_STATUS[b.name] || {}).hasInternPosting ? 0 : 1;
      return aIntern - bIntern || a.rank - b.rank;
    });
  } else {
    // rank (default)
    filtered.sort((a, b) => a.rank - b.rank);
  }
 
  renderGrid(filtered);
  updateResultsBar(filtered.length);
}
 
function renderGrid(firms) {
  const grid  = document.getElementById("cardsGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";
 
  if (firms.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
 
  const sectionBuckets = {
    "Mega Fund":        [],
    "Large Fund":       [],
    "Upper Mid-Market": [],
    "Mid-Market":       [],
  };
 
  firms.forEach(firm => {
    const key = getFirmSectionKey(firm);
    if (sectionBuckets[key]) {
      sectionBuckets[key].push(firm);
    }
  });
 
  const sections = [
    { key: "Mega Fund",        label: "Mega-Cap PE Funds" },
    { key: "Large Fund",       label: "Large-Cap PE Funds" },
    { key: "Upper Mid-Market", label: "Upper Mid-Market PE Funds" },
    { key: "Mid-Market",       label: "Mid-Market PE Funds" },
  ].filter(section => sectionBuckets[section.key].length > 0);
 
  const pageFrag = document.createDocumentFragment();
 
  sections.forEach(section => {
    const sectionFirms = sectionBuckets[section.key];
 
    const wrapper = document.createElement("section");
    wrapper.className = "bank-section";
 
    const heading = document.createElement("h3");
    heading.className = "bank-section__title";
    heading.textContent = `${section.label} (${sectionFirms.length})`;
    wrapper.appendChild(heading);
 
    const sectionGrid = document.createElement("div");
    sectionGrid.className = "cards cards--section";
    const sectionFrag = document.createDocumentFragment();
    sectionFirms.forEach(firm => sectionFrag.appendChild(renderCard(firm)));
    sectionGrid.appendChild(sectionFrag);
    wrapper.appendChild(sectionGrid);
 
    pageFrag.appendChild(wrapper);
  });
 
  grid.appendChild(pageFrag);
}
 
function updateResultsBar(count) {
  document.getElementById("resultsCount").textContent =
    `Showing ${count} of ${PE_FIRMS.length} firms`;
}
 
// ── Stats sidebar ────────────────────────────────────────────
function updateStats() {
  const counts = { "Mega Fund": 0, "Large Fund": 0, "Upper Mid-Market": 0, "Mid-Market": 0 };
  PE_FIRMS.forEach(f => counts[f.tier]++);
  document.getElementById("statMega").textContent     = counts["Mega Fund"];
  document.getElementById("statLarge").textContent    = counts["Large Fund"];
  document.getElementById("statUpperMid").textContent = counts["Upper Mid-Market"];
  document.getElementById("statMid").textContent      = counts["Mid-Market"];
  document.getElementById("totalCount").textContent   = PE_FIRMS.length;
 
  const internCount = Object.values(INTERN_STATUS).filter(s => s.hasInternPosting).length;
  const internEl = document.getElementById("internCount");
  if (internEl) internEl.textContent = internCount;
}
 
// ── Load data from JSON files ────────────────────────────────
async function loadData() {
  const firmsRes = await fetch("pe_firms_data.json");
  PE_FIRMS = await firmsRes.json();
 
  try {
    const statusRes = await fetch("pe_intern_status.json");
    if (statusRes.ok) {
      const data = await statusRes.json();
      INTERN_STATUS = data.firms || {};
 
      if (data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        const el   = document.getElementById("lastChecked");
        if (el) {
          el.textContent = `Postings last checked: ${date.toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric"
          })}`;
          el.hidden = false;
        }
      }
 
      const internCount = Object.values(INTERN_STATUS).filter(s => s.hasInternPosting).length;
      const toggleLabel = document.getElementById("internToggleLabel");
      if (toggleLabel && internCount > 0) {
        toggleLabel.textContent = `Intern postings only (${internCount} found)`;
      }
    }
  } catch (_) {
    // pe_intern_status.json not available yet
  }
}
 
// ── Event listeners ──────────────────────────────────────────
async function init() {
  await loadData();
 
  updateStats();
  applyFilters();
 
  // Search
  const searchInput = document.getElementById("searchInput");
  const clearBtn    = document.getElementById("clearSearch");
 
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    clearBtn.hidden = !searchQuery;
    applyFilters();
  });
 
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearBtn.hidden = true;
    searchInput.focus();
    applyFilters();
  });
 
  // Tier filters
  document.querySelectorAll("input[name='tier']").forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        activeTiers.add(cb.value);
      } else {
        activeTiers.delete(cb.value);
      }
      applyFilters();
    });
  });
 
  // Sort
  document.getElementById("sortSelect").addEventListener("change", e => {
    sortMode = e.target.value;
    applyFilters();
  });
 
  // Intern-only toggle
  const internToggle = document.getElementById("internOnlyToggle");
  if (internToggle) {
    internToggle.addEventListener("change", () => {
      showInternOnly = internToggle.checked;
      applyFilters();
    });
  }
}
 
document.addEventListener("DOMContentLoaded", init);