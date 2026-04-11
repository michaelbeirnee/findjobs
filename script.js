// ── IBR Investment Banks Data ────────────────────────────────
// Source: Investment Banking Recruiting Boutiques (IBR)
// Compiled by Knoton Fung, UCLA
// "Student Presence" = intern volume: Very High (many), High (≥4), Moderate (≥2), Low (≤1)
//
// Firm data (name, presence, website, careerUrl) is loaded from firms_data.json.
// Intern posting status is loaded daily from intern_status.json via GitHub Actions.
 
// ── Runtime state ────────────────────────────────────────────
let IBR_BANKS    = [];      // populated from firms_data.json
let INTERN_STATUS = {};     // populated from intern_status.json  { firmName: { hasInternPosting, careerUrl, lastChecked, status } }
 
// ── Presence helpers ─────────────────────────────────────────
const PRESENCE_ORDER = { "Very High": 0, "High": 1, "Moderate": 2, "Low": 3 };
 
const PRESENCE_CLASS = {
  "Very High": "presence-vh",
  "High":      "presence-h",
  "Moderate":  "presence-m",
  "Low":       "presence-l",
};
 
const PRESENCE_INTERN_LABEL = {
  "Very High": "Many interns",
  "High":      "≥ 4 interns",
  "Moderate":  "≥ 2 interns",
  "Low":       "≤ 1 intern",
};

const BULGE_BRACKET_BANKS = new Set([
  "Goldman Sachs",
  "J.P. Morgan",
  "Morgan Stanley",
  "Bank of America",
  "Citigroup",
  "Barclays",
  "UBS",
  "Deutsche Bank",
  "Wells Fargo Securities",
]);

const MIDDLE_MARKET_BANKS = new Set([
  "Jefferies",
  "RBC Capital Markets",
  "BMO Capital Markets",
  "Stifel",
  "Piper Sandler",
  "William Blair",
  "Raymond James",
  "Lincoln International",
  "Harris Williams",
  "Houlihan Lokey",
  "KeyBanc Capital Markets",
  "Citizens JMP",
]);

const BULGE_BRACKET_ALIASES = [
  "goldman sachs",
  "jp morgan",
  "j p morgan",
  "jpmorgan",
  "morgan stanley",
  "bank of america",
  "bofa",
  "citigroup",
  "citi",
  "barclays",
  "ubs",
  "deutsche bank",
  "wells fargo securities",
  "wells fargo",
];

const MIDDLE_MARKET_ALIASES = [
  "jefferies",
  "rbc capital markets",
  "rbc",
  "bmo capital markets",
  "bmo",
  "stifel",
  "piper sandler",
  "william blair",
  "raymond james",
  "lincoln international",
  "harris williams",
  "houlihan lokey",
  "keybanc capital markets",
  "keybanc",
  "citizens jmp",
  "citizens",
  "alantra",
];
 
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

function normalizeFirmName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getFirmSectionKey(firm) {
  const explicitCategory = String(firm.category || firm.segment || firm.type || "")
    .toLowerCase()
    .trim();

  if (explicitCategory.includes("bulge")) return "bulgeBracket";
  if (
    explicitCategory.includes("middle market") ||
    explicitCategory === "mm" ||
    explicitCategory === "middle"
  ) {
    return "middleMarket";
  }
  if (explicitCategory.includes("boutique")) return "boutiques";

  if (BULGE_BRACKET_BANKS.has(firm.name)) return "bulgeBracket";
  if (MIDDLE_MARKET_BANKS.has(firm.name)) return "middleMarket";

  const normalizedName = normalizeFirmName(firm.name);
  if (BULGE_BRACKET_ALIASES.some(alias => normalizedName.includes(alias))) {
    return "bulgeBracket";
  }
  if (MIDDLE_MARKET_ALIASES.some(alias => normalizedName.includes(alias))) {
    return "middleMarket";
  }

  return "boutiques";
}
 
// ── Render a single card ─────────────────────────────────────
function renderCard(firm) {
  const internData  = INTERN_STATUS[firm.name] || {};
  const hasIntern   = internData.hasInternPosting === true;
 
  // Career URL: prefer the verified one from intern_status, then firms_data, then LinkedIn intern search
  const careerUrl   = internData.careerUrl || firm.careerUrl || null;
  const websiteUrl  = firm.website || null;
 
  const card = document.createElement("div");
  card.className = "card" + (hasIntern ? " card--has-intern" : "");
  card.dataset.presence = firm.presence;
 
  // Intern badge HTML (only shown when a posting was found)
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
 
  card.innerHTML = `
    ${internBadgeHtml}
    <div class="card__header">
      <div class="card__initials">${initials(firm.name)}</div>
      <span class="card__presence-pill ${PRESENCE_CLASS[firm.presence]}">${firm.presence}</span>
    </div>
    <div class="card__name">${firm.name}</div>
    <div class="card__type">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      Verified Investment Bank
    </div>
    <div class="card__interns">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ${PRESENCE_INTERN_LABEL[firm.presence]}
    </div>
    <div class="card__actions">
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
let activePresence = new Set(["Very High", "High", "Moderate", "Low"]);
let sortMode = "presence"; // "presence" | "alpha"
let showInternOnly = false;
 
// ── Filter & render ──────────────────────────────────────────
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
 
  let filtered = IBR_BANKS.filter(f => {
    if (!activePresence.has(f.presence)) return false;
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
      return aIntern - bIntern || PRESENCE_ORDER[a.presence] - PRESENCE_ORDER[b.presence] || a.name.localeCompare(b.name);
    });
  } else {
    filtered.sort((a, b) => PRESENCE_ORDER[a.presence] - PRESENCE_ORDER[b.presence] || a.name.localeCompare(b.name));
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
    boutiques: [],
    bulgeBracket: [],
    middleMarket: [],
  };

  firms.forEach(firm => {
    sectionBuckets[getFirmSectionKey(firm)].push(firm);
  });

  const sections = [
    { key: "boutiques", label: "Boutiques" },
    { key: "bulgeBracket", label: "Bulge Bracket Banks" },
    { key: "middleMarket", label: "Middle Market Banks" },
  ].filter(section => sectionBuckets[section.key].length > 0);

  if (sections.length === 1 && sections[0].key === "boutiques") {
    sections[0].label = "IBR Boutique Firms";
  }

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
    `Showing ${count} of ${IBR_BANKS.length} firms`;
}
 
// ── Stats sidebar ────────────────────────────────────────────
function updateStats() {
  const counts = { "Very High": 0, "High": 0, "Moderate": 0, "Low": 0 };
  IBR_BANKS.forEach(f => counts[f.presence]++);
  document.getElementById("statVH").textContent = counts["Very High"];
  document.getElementById("statH").textContent  = counts["High"];
  document.getElementById("statM").textContent  = counts["Moderate"];
  document.getElementById("statL").textContent  = counts["Low"];
  document.getElementById("totalCount").textContent = IBR_BANKS.length;
 
  // Intern count
  const internCount = Object.values(INTERN_STATUS).filter(s => s.hasInternPosting).length;
  const internEl = document.getElementById("internCount");
  if (internEl) internEl.textContent = internCount;
}
 
// ── Load data from JSON files ────────────────────────────────
async function loadData() {
  // Load firms data
  const firmsRes = await fetch("firms_data.json");
  IBR_BANKS = await firmsRes.json();
 
  // Load intern status (best-effort — may not exist yet before first scraper run)
  try {
    const statusRes = await fetch("intern_status.json");
    if (statusRes.ok) {
      const data = await statusRes.json();
      INTERN_STATUS = data.firms || {};
 
      // Show last-checked timestamp
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
 
      // Update intern toggle label with count
      const internCount = Object.values(INTERN_STATUS).filter(s => s.hasInternPosting).length;
      const toggleLabel = document.getElementById("internToggleLabel");
      if (toggleLabel && internCount > 0) {
        toggleLabel.textContent = `Intern postings only (${internCount} found)`;
      }
    }
  } catch (_) {
    // intern_status.json not available yet — no badges shown
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
 
  // Presence filters
  document.querySelectorAll("input[name='presence']").forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        activePresence.add(cb.value);
      } else {
        activePresence.delete(cb.value);
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
