// ── Company Page: shows intern job listings for a single firm (IB or PE) ──
 
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
 
const PRESENCE_INTERN_LABEL = {
  "Very High": "Many interns historically",
  "High":      "4+ interns historically",
  "Moderate":  "2+ interns historically",
  "Low":       "1 or fewer interns historically",
};
 
const TIER_AUM_LABEL = {
  "Mega Fund":        "AUM ≥ $75B",
  "Large Fund":       "$40B – $75B",
  "Upper Mid-Market": "$25B – $40B",
  "Mid-Market":       "< $25B",
};
 
function initials(name) {
  const words = name.replace(/[^a-zA-Z0-9\s&+]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1][0] || "")).toUpperCase();
}
 
function linkedInJobsUrl(firmName) {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(firmName)}&position=1&pageNum=0`;
}
 
function linkedInInternUrl(firmName) {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(firmName + " intern")}&position=1&pageNum=0`;
}
 
function glassdoorUrl(firmName) {
  return `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(firmName)}`;
}
 
// ── Render a single job listing card ────────────────────────
function renderJobCard(job, firmName) {
  const card = document.createElement("div");
  card.className = "job-card";
 
  const gradBadge = job.graduationDate
    ? `<span class="job-card__grad">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
         </svg>
         Graduation: ${job.graduationDate}
       </span>`
    : "";
 
  const description = job.description
    ? `<p class="job-card__desc">${escapeHtml(job.description)}</p>`
    : "";
 
  const applyUrl = job.applyUrl || "#";
 
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
      <p class="job-card__firm">${escapeHtml(firmName)}</p>
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
 
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
 
function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
 
// ── Main page logic ─────────────────────────────────────────
async function init() {
  // Get firm name and type from URL
  const params = new URLSearchParams(window.location.search);
  const firmName = params.get("firm");
  const firmType = params.get("type") || "ib"; // default to IB
 
  if (!firmName) {
    window.location.href = firmType === "pe" ? "pe.html" : "index.html";
    return;
  }
 
  const isPE = firmType === "pe";
 
  // Update back link based on type
  const backLink = document.getElementById("backLink");
  if (backLink) {
    backLink.href = isPE ? "pe.html" : "index.html";
  }
 
  // Update badge for PE
  if (isPE) {
    const badge = document.getElementById("verifiedBadge");
    if (badge) badge.className = "verified-badge verified-badge--pe";
    const badgeText = document.getElementById("badgeText");
    if (badgeText) badgeText.textContent = "Top 100 PE";
  } else {
    const badgeText = document.getElementById("badgeText");
    if (badgeText) badgeText.textContent = "IBR Verified";
  }
 
  // Update page title
  document.title = `${firmName} — Intern Jobs — FindJobs`;
 
  // Load data based on type
  const firmsFile = isPE ? "pe_firms_data.json" : "firms_data.json";
  const statusFile = isPE ? "pe_intern_status.json" : "intern_status.json";
 
  let firms = [];
  let internStatus = {};
 
  try {
    const firmsRes = await fetch(firmsFile);
    firms = await firmsRes.json();
  } catch (e) {
    console.error(`Failed to load ${firmsFile}`, e);
  }
 
  try {
    const statusRes = await fetch(statusFile);
    if (statusRes.ok) {
      const data = await statusRes.json();
      internStatus = data.firms || {};
 
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
    }
  } catch (_) {}
 
  // Find the firm in data
  const firm = firms.find(f => f.name === firmName);
  const status = internStatus[firmName] || {};
  const jobs = status.jobs || [];
 
  // ── Populate header ──
  const firmInitials = document.getElementById("firmInitials");
  const firmNameEl = document.getElementById("firmName");
  const firmPresencePill = document.getElementById("firmPresencePill");
  const firmPresenceLabel = document.getElementById("firmPresenceLabel");
  const firmDesc = document.getElementById("firmDescription");
 
  firmNameEl.textContent = firmName;
  firmInitials.textContent = initials(firmName);
 
  if (firm) {
    if (isPE) {
      // PE firm: use tier-based styling
      firmPresencePill.textContent = firm.tier;
      firmPresencePill.className = `card__presence-pill ${TIER_CLASS[firm.tier] || ""}`;
      firmPresenceLabel.textContent = `#${firm.rank} · ${firm.aum} AUM · ${firm.location}`;
      firmInitials.className = "company-hero__initials company-hero__initials--pe";
 
      // Update hero to PE purple
      const hero = document.querySelector(".hero");
      if (hero) hero.classList.add("hero--pe");
    } else {
      // IB firm: use presence-based styling
      firmPresencePill.textContent = firm.presence;
      firmPresencePill.className = `card__presence-pill ${PRESENCE_CLASS[firm.presence]}`;
      firmPresenceLabel.textContent = PRESENCE_INTERN_LABEL[firm.presence] || "";
      firmInitials.className = `company-hero__initials company-hero__initials--${firm.presence.toLowerCase().replace(/\s+/g, "")}`;
    }
 
    const jobWord = jobs.length === 1 ? "posting" : "postings";
    if (jobs.length > 0) {
      firmDesc.textContent = `${jobs.length} intern ${jobWord} found. Listings are refreshed daily from the career page.`;
    } else {
      firmDesc.textContent = `No active intern postings detected. Listings are checked daily.`;
    }
  }
 
  // ── Populate sidebar ──
  const careerUrl = status.careerUrl || (firm && firm.careerUrl) || null;
  const websiteUrl = (firm && firm.website) || null;
 
  const linkCareers = document.getElementById("linkCareers");
  if (careerUrl) {
    linkCareers.href = careerUrl;
    linkCareers.hidden = false;
  }
 
  const linkWebsite = document.getElementById("linkWebsite");
  if (websiteUrl) {
    linkWebsite.href = websiteUrl;
    linkWebsite.hidden = false;
  }
 
  document.getElementById("linkLinkedIn").href = linkedInJobsUrl(firmName);
  document.getElementById("linkGlassdoor").href = glassdoorUrl(firmName);
 
  document.getElementById("statJobCount").textContent = jobs.length;
 
  // Update sidebar credit
  const creditEl = document.querySelector(".sidebar__credit");
  if (creditEl) {
    if (isPE) {
      creditEl.innerHTML = `Source: <em>Top 100 Private Equity Firms by AUM</em>`;
    } else {
      creditEl.innerHTML = `Source: <em>Investment Banking Recruiting Boutiques (IBR)</em><br>Compiled by Knoton Fung, UCLA`;
    }
  }
 
  // Posting status
  const postingStatusEl = document.getElementById("postingStatus");
  if (status.hasInternPosting) {
    postingStatusEl.innerHTML = `
      <span class="status-dot status-dot--active"></span>
      Actively hiring interns
    `;
    postingStatusEl.className = "company-sidebar__status company-sidebar__status--active";
  } else if (status.status === "no_url") {
    postingStatusEl.innerHTML = `
      <span class="status-dot status-dot--unknown"></span>
      No career page found
    `;
    postingStatusEl.className = "company-sidebar__status company-sidebar__status--unknown";
  } else {
    postingStatusEl.innerHTML = `
      <span class="status-dot status-dot--inactive"></span>
      No intern postings detected
    `;
    postingStatusEl.className = "company-sidebar__status company-sidebar__status--inactive";
  }
 
  // ── Render jobs ──
  const jobsList = document.getElementById("jobsList");
  const emptyState = document.getElementById("emptyState");
  const resultsCount = document.getElementById("resultsCount");
 
  if (jobs.length > 0) {
    emptyState.hidden = true;
    resultsCount.textContent = `${jobs.length} intern position${jobs.length !== 1 ? "s" : ""} found`;
 
    const frag = document.createDocumentFragment();
    jobs.forEach(job => frag.appendChild(renderJobCard(job, firmName)));
    jobsList.appendChild(frag);
  } else {
    emptyState.hidden = false;
    resultsCount.textContent = "No positions found";
 
    // Show career page link in empty state if available
    const emptyCareerLink = document.getElementById("emptyCareerLink");
    if (careerUrl) {
      emptyCareerLink.href = careerUrl;
      emptyCareerLink.hidden = false;
    }
  }
}
 
document.addEventListener("DOMContentLoaded", init);