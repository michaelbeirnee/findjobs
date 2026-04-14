// ── Recent Postings Page: shows all jobs from IB + PE grouped by discovery date ──
 
const PRESENCE_CLASS = {
  "Very High": "presence-vh",
  "High":      "presence-h",
  "Moderate":  "presence-m",
  "Low":       "presence-l",
};
 
const TIER_CLASS = {
  "Mega Fund":        "tier-mega",
  "Large Fund":       "tier-large",
  "Upper Mid-Market": "tier-uppermid",
  "Mid-Market":       "tier-mid",
};
 
function initials(name) {
  const words = name.replace(/[^a-zA-Z0-9\s&+]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1][0] || "")).toUpperCase();
}
 
function linkedInInternUrl(firmName) {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(firmName + " intern")}&position=1&pageNum=0`;
}
 
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
 
function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
 
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
 
function relativeDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return "1 week ago";
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return "";
}
 
// ── Render a single job card in the timeline ────────────────────
function renderTimelineJobCard(job, firmName, firmPresence, firmType) {
  const card = document.createElement("div");
  card.className = "job-card";
 
  const gradBadge = job.graduationDate
    ? `<span class="job-card__grad">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
         </svg>
         Graduation: ${escapeHtml(job.graduationDate)}
       </span>`
    : "";
 
  const description = job.description
    ? `<p class="job-card__desc">${escapeHtml(job.description)}</p>`
    : "";
 
  const applyUrl = job.applyUrl || "#";
  const companyPageUrl = firmType === "pe"
    ? `company.html?firm=${encodeURIComponent(firmName)}&type=pe`
    : `company.html?firm=${encodeURIComponent(firmName)}`;
 
  // Presence or tier pill
  let presencePill = "";
  if (firmType === "pe" && firmPresence) {
    const cls = TIER_CLASS[firmPresence] || "";
    presencePill = `<span class="card__presence-pill ${cls}">${escapeHtml(firmPresence)}</span>`;
  } else if (firmPresence) {
    const cls = PRESENCE_CLASS[firmPresence] || "";
    presencePill = `<span class="card__presence-pill ${cls}">${escapeHtml(firmPresence)}</span>`;
  }
 
  // Type badge (IB or PE)
  const typeBadgeClass = firmType === "pe" ? "firm-type-badge--pe" : "firm-type-badge--ib";
  const typeBadgeLabel = firmType === "pe" ? "PE" : "IB";
  const typeBadge = `<span class="firm-type-badge ${typeBadgeClass}">${typeBadgeLabel}</span>`;
 
  // Location badge
  const locationBadge = job.firmLocation
    ? `<span class="job-card__location">
         <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
         </svg>
         ${escapeHtml(job.firmLocation)}
       </span>`
    : "";
 
  card.innerHTML = `
    <div class="job-card__header">
      <div class="job-card__title-row">
        <h3 class="job-card__title">${escapeHtml(job.title)}</h3>
        <span class="job-card__badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
          Intern
        </span>
      </div>
      <p class="job-card__firm">
        <a href="${escapeAttr(companyPageUrl)}" class="recent-firm-link">${escapeHtml(firmName)}</a>
        ${typeBadge}
        ${presencePill}
        ${locationBadge}
      </p>
    </div>
    ${description}
    <div class="job-card__meta">
      ${gradBadge}
    </div>
    <div class="job-card__actions">
      <a class="btn-career" href="${escapeAttr(applyUrl)}" target="_blank" rel="noopener noreferrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Apply Now
      </a>
      <a class="btn-primary" href="${linkedInInternUrl(firmName)}" target="_blank" rel="noopener noreferrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        LinkedIn Intern Jobs
      </a>
    </div>
  `;
 
  return card;
}
 
// ── Collect jobs from an intern status object ──────────────────
function collectJobs(internStatus, firmLookup, firmType, locationLookup) {
  const jobs = [];
  for (const [firmName, firmData] of Object.entries(internStatus)) {
    if (!firmData.hasInternPosting) continue;
    const firmJobs = firmData.jobs || [];
    for (const job of firmJobs) {
      let firstSeen = job.firstSeen;
      if (!firstSeen && firmData.lastChecked) {
        firstSeen = firmData.lastChecked.split("T")[0];
      }
      if (!firstSeen) {
        firstSeen = new Date().toISOString().split("T")[0];
      }
      jobs.push({
        ...job,
        firstSeen,
        firmName,
        firmPresence: firmLookup[firmName] || null,
        firmType,
        firmLocation: locationLookup[firmName] || null,
      });
    }
  }
  return jobs;
}
 
// ── Render the timeline from a filtered set of jobs ────────────
function renderTimeline(jobs) {
  const timeline = document.getElementById("timeline");
  const emptyState = document.getElementById("emptyState");
  const dateNav = document.getElementById("dateNav");
  const resultsCount = document.getElementById("resultsCount");
  const emptyStateMsg = document.getElementById("emptyStateMsg");
  const emptyStateSub = document.getElementById("emptyStateSub");
 
  // Clear previous content
  timeline.innerHTML = "";
  dateNav.innerHTML = "";
 
  // Group by firstSeen date
  const grouped = new Map();
  for (const job of jobs) {
    if (!grouped.has(job.firstSeen)) {
      grouped.set(job.firstSeen, []);
    }
    grouped.get(job.firstSeen).push(job);
  }
 
  // Update results count
  resultsCount.textContent =
    `${jobs.length} posting${jobs.length !== 1 ? "s" : ""} across ${grouped.size} date${grouped.size !== 1 ? "s" : ""}`;
 
  if (jobs.length === 0) {
    emptyState.hidden = false;
    emptyStateMsg.textContent = "No postings match your filters.";
    emptyStateSub.textContent = "Try broadening your search or clearing filters.";
    return;
  }
  emptyState.hidden = true;
 
  const frag = document.createDocumentFragment();
  const navFrag = document.createDocumentFragment();
 
  for (const [dateStr, dateJobs] of grouped) {
    // Date section
    const section = document.createElement("div");
    section.className = "recent-date-section";
    section.id = `date-${dateStr}`;
 
    const relative = relativeDate(dateStr);
    const relativeHtml = relative ? `<span class="recent-date-relative">${relative}</span>` : "";
 
    const header = document.createElement("div");
    header.className = "recent-date-header";
    header.innerHTML = `
      <div class="recent-date-marker">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <h2 class="recent-date-title">${formatDate(dateStr)}</h2>
      ${relativeHtml}
      <span class="recent-date-count">${dateJobs.length} posting${dateJobs.length !== 1 ? "s" : ""}</span>
    `;
    section.appendChild(header);
 
    const jobsList = document.createElement("div");
    jobsList.className = "jobs-list";
    for (const job of dateJobs) {
      jobsList.appendChild(renderTimelineJobCard(job, job.firmName, job.firmPresence, job.firmType));
    }
    section.appendChild(jobsList);
 
    frag.appendChild(section);
 
    // Sidebar date nav link
    const navLink = document.createElement("a");
    navLink.className = "recent-date-nav__link";
    navLink.href = `#date-${dateStr}`;
    navLink.innerHTML = `
      <span class="recent-date-nav__date">${new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      <span class="recent-date-nav__count">${dateJobs.length}</span>
    `;
    navFrag.appendChild(navLink);
  }
 
  timeline.appendChild(frag);
  dateNav.appendChild(navFrag);
}
 
// ── Main page logic ─────────────────────────────────────────
async function init() {
  // Load IB data
  let ibFirms = [];
  let ibInternStatus = {};
  let lastUpdatedIB = null;
 
  // Load PE data
  let peFirms = [];
  let peInternStatus = {};
  let lastUpdatedPE = null;
 
  // Fetch all data in parallel
  const [ibFirmsRes, peFirmsRes, ibStatusRes, peStatusRes] = await Promise.all([
    fetch("firms_data.json").catch(() => null),
    fetch("pe_firms_data.json").catch(() => null),
    fetch("intern_status.json").catch(() => null),
    fetch("pe_intern_status.json").catch(() => null),
  ]);
 
  if (ibFirmsRes && ibFirmsRes.ok) {
    ibFirms = await ibFirmsRes.json();
  }
  if (peFirmsRes && peFirmsRes.ok) {
    peFirms = await peFirmsRes.json();
  }
  if (ibStatusRes && ibStatusRes.ok) {
    const data = await ibStatusRes.json();
    ibInternStatus = data.firms || {};
    lastUpdatedIB = data.lastUpdated;
  }
  if (peStatusRes && peStatusRes.ok) {
    const data = await peStatusRes.json();
    peInternStatus = data.firms || {};
    lastUpdatedPE = data.lastUpdated;
  }
 
  // Show last-checked timestamp (use the most recent of the two)
  const lastUpdated = lastUpdatedIB || lastUpdatedPE;
  if (lastUpdated) {
    const date = new Date(lastUpdated);
    const el = document.getElementById("lastChecked");
    if (el) {
      el.textContent = `Postings last checked: ${date.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
      })}`;
      el.hidden = false;
    }
  }
 
  // Build lookups for firm presence/tier
  const ibPresenceMap = {};
  ibFirms.forEach(f => { ibPresenceMap[f.name] = f.presence; });
 
  const peTierMap = {};
  peFirms.forEach(f => { peTierMap[f.name] = f.tier; });
 
  // Build location lookup from PE firms (IB firms don't have location data)
  const locationLookup = {};
  peFirms.forEach(f => { if (f.location) locationLookup[f.name] = f.location; });
 
  // Collect all jobs from both sources
  const ibJobs = collectJobs(ibInternStatus, ibPresenceMap, "ib", locationLookup);
  const peJobs = collectJobs(peInternStatus, peTierMap, "pe", locationLookup);
  const allJobs = [...ibJobs, ...peJobs];
 
  const firmsWithJobs = new Set();
  allJobs.forEach(j => firmsWithJobs.add(j.firmName));
 
  // Sort jobs by firstSeen descending, then firm name
  allJobs.sort((a, b) => {
    if (a.firstSeen !== b.firstSeen) return b.firstSeen.localeCompare(a.firstSeen);
    return a.firmName.localeCompare(b.firmName);
  });
 
  // Count today's jobs
  const todayStr = new Date().toISOString().split("T")[0];
  const todayJobs = allJobs.filter(j => j.firstSeen === todayStr);
 
  // Update stats
  document.getElementById("totalJobs").textContent = allJobs.length;
  document.getElementById("totalFirms").textContent = firmsWithJobs.size;
  document.getElementById("statTotal").textContent = allJobs.length;
  document.getElementById("statFirms").textContent = firmsWithJobs.size;
  document.getElementById("statToday").textContent = todayJobs.length;
 
  // Populate location filter dropdown
  const locations = new Set();
  allJobs.forEach(j => { if (j.firmLocation) locations.add(j.firmLocation); });
  const sortedLocations = [...locations].sort();
  const locationSelect = document.getElementById("locationFilter");
  for (const loc of sortedLocations) {
    const opt = document.createElement("option");
    opt.value = loc;
    opt.textContent = loc;
    locationSelect.appendChild(opt);
  }
 
  // ── Filter + render logic ────────────────────────────────
  const searchInput = document.getElementById("jobSearch");
 
  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedLocation = locationSelect.value;
 
    const filtered = allJobs.filter(job => {
      // Location filter
      if (selectedLocation && job.firmLocation !== selectedLocation) return false;
 
      // Text search across title, description, and firm name
      if (query) {
        const haystack = [
          job.title || "",
          job.description || "",
          job.firmName || "",
          job.firmLocation || "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
 
      return true;
    });
 
    renderTimeline(filtered);
  }
 
  // Initial render
  if (allJobs.length === 0) {
    document.getElementById("emptyState").hidden = false;
    document.getElementById("resultsCount").textContent = "0 postings across 0 dates";
    return;
  }
 
  applyFilters();
 
  // Wire up filter events
  searchInput.addEventListener("input", applyFilters);
  locationSelect.addEventListener("change", applyFilters);
}
 
document.addEventListener("DOMContentLoaded", init);