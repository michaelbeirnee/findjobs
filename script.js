// ── IBR Investment Banks Data ────────────────────────────────
// Source: Investment Banking Recruiting Boutiques (IBR)
// Compiled by Knoton Fung, UCLA
// "Student Presence" = intern volume: Very High (many), High (≥4), Moderate (≥2), Low (≤1)
 
const IBR_BANKS = [
  // ── Very High ──────────────────────────────────────────────
  { name: "Vermilion Rock Advisors",            presence: "Very High" },
  { name: "Excalibur Investment Banking",       presence: "Very High" },
  { name: "InvestBank Corporation",             presence: "Very High" },
  { name: "Versailles Group, Ltd.",             presence: "Very High" },
  { name: "MD Global Partners, LLC",            presence: "Very High" },
  { name: "George + Company IB",                presence: "Very High" },
  { name: "Aureate Capital",                    presence: "Very High" },
  { name: "52 Capital Partners",                presence: "Very High" },
  { name: "Harbor Ridge Capital",               presence: "Very High" },
  { name: "The Opes Group",                     presence: "Very High" },
  { name: "41 North LLC",                       presence: "Very High" },
  { name: "Takenaka Partners LLC",              presence: "Very High" },
  { name: "The Amazing Group, LLC",             presence: "Very High" },
  { name: "Wellesley Hills Financial",          presence: "Very High" },
  { name: "Renewable Advisors",                 presence: "Very High" },
  { name: "Springer Capital",                   presence: "Very High" },
  { name: "Herculean Group",                    presence: "Very High" },
  { name: "Esposito Intellectual Enterprises",  presence: "Very High" },
  { name: "Halifax West",                       presence: "Very High" },
  { name: "Tuck Advisors",                      presence: "Very High" },
  { name: "Concordia Capital",                  presence: "Very High" },
  { name: "Integrus Partners",                  presence: "Very High" },
  { name: "Roadmap Advisors",                   presence: "Very High" },
  { name: "Icarus Fund",                        presence: "Very High" },
  { name: "Cedar Street Capital",               presence: "Very High" },
  { name: "S.C.E. Partners",                    presence: "Very High" },
  { name: "AugCap",                             presence: "Very High" },
  { name: "Baird Augustine",                    presence: "Very High" },
  { name: "KCC Capital Partners",               presence: "Very High" },
  { name: "Waterbrook Advisors",                presence: "Very High" },
  { name: "Independent Investment Bankers Corp.",presence: "Very High" },
 
  // ── High ───────────────────────────────────────────────────
  { name: "Brooks, Houghton & Co",              presence: "High" },
  { name: "Innovus Advisors",                   presence: "High" },
  { name: "Calabasas Capital",                  presence: "High" },
  { name: "Westlake Securities",                presence: "High" },
  { name: "Bardi Co.",                          presence: "High" },
  { name: "Xnergy",                             presence: "High" },
  { name: "Evercap Advisors",                   presence: "High" },
  { name: "New York Bay Capital",               presence: "High" },
  { name: "American Discovery Capital",         presence: "High" },
  { name: "Harbor View Advisors",               presence: "High" },
  { name: "Cambridge Wilkinson",                presence: "High" },
  { name: "Montminy & Co.",                     presence: "High" },
  { name: "Alta Capital Partners",              presence: "High" },
  { name: "Alderman & Company",                 presence: "High" },
  { name: "Impact Capital Group",               presence: "High" },
  { name: "Berkery, Noyes & Co., LLC",          presence: "High" },
  { name: "Crossroads Capital, LLC",            presence: "High" },
  { name: "Progress Partners",                  presence: "High" },
  { name: "Cappello Group, Inc.",               presence: "High" },
  { name: "Diamond Capital Advisors",           presence: "High" },
  { name: "Black Legend Capital",               presence: "High" },
  { name: "InvestmentBank.com",                 presence: "High" },
  { name: "Colton Alexander",                   presence: "High" },
  { name: "Horizon Partners",                   presence: "High" },
  { name: "AQ Technology Partners",             presence: "High" },
  { name: "Horatius Group",                     presence: "High" },
  { name: "New Century Capital",                presence: "High" },
  { name: "Solganick & Co.",                    presence: "High" },
  { name: "Castle Placement",                   presence: "High" },
  { name: "Colebrooke Capital, LLC.",           presence: "High" },
  { name: "CB Capital Partners",                presence: "High" },
  { name: "The Shaughnessy Group",              presence: "High" },
  { name: "Bridge Street Advisors",             presence: "High" },
  { name: "Madison Park Group",                 presence: "High" },
  { name: "ReVera Capital",                     presence: "High" },
  { name: "Mirus Capital Advisors",             presence: "High" },
  { name: "Asia Renaissance IB",                presence: "High" },
  { name: "Sutton Capital Partners",            presence: "High" },
  { name: "Coady Diemar Partners",              presence: "High" },
  { name: "Asgaard Capital, LLC",               presence: "High" },
  { name: "STEP Strategy Advisors",             presence: "High" },
  { name: "Fortitude Advisors",                 presence: "High" },
  { name: "Columbia West Capital",              presence: "High" },
  { name: "Crotalus Advisors",                  presence: "High" },
  { name: "ComCap",                             presence: "High" },
  { name: "Raymond Leigh & Partners",           presence: "High" },
  { name: "Centerstone Capital",                presence: "High" },
  { name: "David N. Deutsch & Co",              presence: "High" },
  { name: "Seahorn Capital Group",              presence: "High" },
  { name: "King's Ransom Group",                presence: "High" },
  { name: "Genoa Partners LLC",                 presence: "High" },
 
  // ── Moderate ───────────────────────────────────────────────
  { name: "Reynolds Advisory",                  presence: "Moderate" },
  { name: "Palm Tree LLC",                      presence: "Moderate" },
  { name: "Pharus",                             presence: "Moderate" },
  { name: "Watertower Advisors",                presence: "Moderate" },
  { name: "Viant Group",                        presence: "Moderate" },
  { name: "Fallbrook Capital",                  presence: "Moderate" },
  { name: "Shea & Company",                     presence: "Moderate" },
  { name: "Independence Point",                 presence: "Moderate" },
  { name: "Rush Street Capital",                presence: "Moderate" },
  { name: "Landmark Ventures",                  presence: "Moderate" },
  { name: "DelMorgan & Co.",                    presence: "Moderate" },
  { name: "Silverwood Partners",                presence: "Moderate" },
  { name: "Bryant Park Capital",                presence: "Moderate" },
  { name: "Park Lane",                          presence: "Moderate" },
  { name: "TM Capital Corp.",                   presence: "Moderate" },
  { name: "Navidar",                            presence: "Moderate" },
  { name: "Arrowroot Advisors",                 presence: "Moderate" },
  { name: "AGRA Capital",                       presence: "Moderate" },
  { name: "martinwolf",                         presence: "Moderate" },
  { name: "Young America Capital",              presence: "Moderate" },
  { name: "BDO Capital Advisors, LLC",          presence: "Moderate" },
  { name: "Jett Capital Advisors",              presence: "Moderate" },
  { name: "Woodside Capital Partners",          presence: "Moderate" },
  { name: "The Peakstone Group",                presence: "Moderate" },
  { name: "Oaklins DeSilva+Phillips",           presence: "Moderate" },
  { name: "Mid-Market Securities",              presence: "Moderate" },
  { name: "JEGI CLARITY",                       presence: "Moderate" },
  { name: "733Park",                            presence: "Moderate" },
  { name: "Calder Capital",                     presence: "Moderate" },
  { name: "PTB",                                presence: "Moderate" },
  { name: "Meritage Partners",                  presence: "Moderate" },
  { name: "Trafalgar Capital Partners",         presence: "Moderate" },
  { name: "Software Equity Group",              presence: "Moderate" },
  { name: "Nfluence Partners",                  presence: "Moderate" },
  { name: "Gabriel Horn Capital",               presence: "Moderate" },
  { name: "Sycamore Canyon Capital",            presence: "Moderate" },
  { name: "BlackRose Group",                    presence: "Moderate" },
 
  // ── Low ────────────────────────────────────────────────────
  { name: "Envisage Advisors",                  presence: "Low" },
  { name: "PEAK Technology Partners",           presence: "Low" },
  { name: "Cohen & Company",                    presence: "Low" },
  { name: "Watertower Group",                   presence: "Low" },
  { name: "Grand Avenue Capital",               presence: "Low" },
  { name: "Boustead Securities",                presence: "Low" },
  { name: "ROTH Capital Partners",              presence: "Low" },
  { name: "LockeBridge Capital",                presence: "Low" },
  { name: "Drake Star",                         presence: "Low" },
  { name: "SilverMile Capital",                 presence: "Low" },
  { name: "Madison Street Capital",             presence: "Low" },
  { name: "Edgemont Partners",                  presence: "Low" },
  { name: "Hum Capital",                        presence: "Low" },
  { name: "GTK Partners",                       presence: "Low" },
  { name: "Westcove Partners",                  presence: "Low" },
  { name: "Salem Partners LLC",                 presence: "Low" },
  { name: "WestPark Capital, Inc.",             presence: "Low" },
  { name: "Northern Edge Advisors",             presence: "Low" },
  { name: "Greif & Co.",                        presence: "Low" },
  { name: "England & Company",                  presence: "Low" },
  { name: "BDA Partners",                       presence: "Low" },
  { name: "Parcrest Advisors",                  presence: "Low" },
  { name: "Brock Capital Group",                presence: "Low" },
  { name: "Aleutian Capital Group",             presence: "Low" },
  { name: "Alantra",                            presence: "Low" },
  { name: "Janney Montgomery Scott",            presence: "Low" },
  { name: "Layer 7 Capital",                    presence: "Low" },
  { name: "QInvest LLC",                        presence: "Low" },
  { name: "Redmount Mergers & Acquisitions",    presence: "Low" },
  { name: "CapM Advisors",                      presence: "Low" },
  { name: "Frisch Capital Partners",            presence: "Low" },
  { name: "Agile Equity",                       presence: "Low" },
  { name: "Sigma Capital Group",                presence: "Low" },
  { name: "Scura Partners",                     presence: "Low" },
  { name: "Newport Valuations",                 presence: "Low" },
  { name: "Big Path Capital",                   presence: "Low" },
  { name: "Methuselah Advisors",                presence: "Low" },
  { name: "CEC Capital",                        presence: "Low" },
  { name: "Pars Capital Partners",              presence: "Low" },
  { name: "R.L. Hulett",                        presence: "Low" },
  { name: "LSH Partners",                       presence: "Low" },
  { name: "Kinected Advisors",                  presence: "Low" },
  { name: "BroadSpan Capital LLC",              presence: "Low" },
  { name: "M+A Squared, LLC",                   presence: "Low" },
  { name: "TAG FIG",                            presence: "Low" },
  { name: "Emory & Co., LLC",                   presence: "Low" },
  { name: "Park Avenue Capital",                presence: "Low" },
  { name: "Broad Street Capital Group",         presence: "Low" },
  { name: "Freedom Capital Markets",            presence: "Low" },
  { name: "Robinson & Co Banking",              presence: "Low" },
  { name: "REV Global",                         presence: "Low" },
  { name: "WaveEdge Capital",                   presence: "Low" },
  { name: "Stump & Company",                    presence: "Low" },
  { name: "Vista Point Advisors",               presence: "Low" },
  { name: "Merritt Healthcare Advisors",        presence: "Low" },
];
 
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
 
// ── Utility: Glassdoor URL ───────────────────────────────────
function glassdoorUrl(firmName) {
  const encoded = encodeURIComponent(firmName);
  return `https://www.glassdoor.com/Search/results.htm?keyword=${encoded}`;
}
 
// ── Render a single card ─────────────────────────────────────
function renderCard(firm) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.presence = firm.presence;
 
  card.innerHTML = `
    <div class="card__header">
      <div class="card__initials">${initials(firm.name)}</div>
      <span class="card__presence-pill ${PRESENCE_CLASS[firm.presence]}">${firm.presence}</span>
    </div>
    <div class="card__name">${firm.name}</div>
    <div class="card__type">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      Verified Investment Bank
    </div>
    <div class="card__interns">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ${PRESENCE_INTERN_LABEL[firm.presence]}
    </div>
    <div class="card__actions">
      <a class="btn-primary"
         href="${linkedInJobsUrl(firm.name)}"
         target="_blank" rel="noopener noreferrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Find Jobs
      </a>
      <a class="btn-secondary"
         href="${glassdoorUrl(firm.name)}"
         target="_blank" rel="noopener noreferrer"
         title="View on Glassdoor">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
 
// ── Filter & render ──────────────────────────────────────────
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
 
  let filtered = IBR_BANKS.filter(f => {
    if (!activePresence.has(f.presence)) return false;
    if (q && !f.name.toLowerCase().includes(q)) return false;
    return true;
  });
 
  if (sortMode === "alpha") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.sort((a, b) => PRESENCE_ORDER[a.presence] - PRESENCE_ORDER[b.presence] || a.name.localeCompare(b.name));
  }
 
  renderGrid(filtered);
  updateResultsBar(filtered.length);
}
 
function renderGrid(firms) {
  const grid = document.getElementById("cardsGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";
 
  if (firms.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  const frag = document.createDocumentFragment();
  firms.forEach(f => frag.appendChild(renderCard(f)));
  grid.appendChild(frag);
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
}
 
// ── Event listeners ──────────────────────────────────────────
function init() {
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
}
 
document.addEventListener("DOMContentLoaded", init);