// ── Recent Postings Page: shows all jobs grouped by discovery date ──
 
const PRESENCE_CLASS = {
  "Very High": "presence-vh",
  "High":      "presence-h",
  "Moderate":  "presence-m",
  "Low":       "presence-l",
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
  // dateStr is "YYYY-MM-DD"
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
function renderTimelineJobCard(job, firmName, firmPresence) {
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
  const companyPageUrl = `company.html?firm=${encodeURIComponent(firmName)}`;
 
  const presencePill = firmPresence
    ? `<span class="card__presence-pill ${PRESENCE_CLASS[firmPresence] || ""}">${escapeHtml(firmPresence)}</span>`
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
        ${presencePill}
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
 
// ── Main page logic ─────────────────────────────────────────
async function init() {
  let firms = [];
  let internStatus = {};
  let lastUpdated = null;
 
  try {
    const firmsRes = await fetch("firms_data.json");
    firms = await firmsRes.json();
  } catch (e) {
    console.error("Failed to load firms_data.json", e);
  }
 
  // Build a lookup for firm presence
  const firmPresenceMap = {};
  firms.forEach(f => { firmPresenceMap[f.name] = f.presence; });
 
  try {
    const statusRes = await fetch("intern_status.json");
    if (statusRes.ok) {
      const data = await statusRes.json();
      internStatus = data.firms || {};
      lastUpdated = data.lastUpdated;
 
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
    }
  } catch (_) {}
 
  // Collect all jobs with their firm names, adding firstSeen
  const allJobs = [];
  const firmsWithJobs = new Set();
 
  for (const [firmName, firmData] of Object.entries(internStatus)) {
    if (!firmData.hasInternPosting) continue;
    const jobs = firmData.jobs || [];
    for (const job of jobs) {
      // Use firstSeen if available, otherwise fall back to lastChecked date
      let firstSeen = job.firstSeen;
      if (!firstSeen && firmData.lastChecked) {
        firstSeen = firmData.lastChecked.split("T")[0];
      }
      if (!firstSeen) {
        firstSeen = new Date().toISOString().split("T")[0];
      }
      allJobs.push({
        ...job,
        firstSeen,
        firmName,
        firmPresence: firmPresenceMap[firmName] || null,
      });
      firmsWithJobs.add(firmName);
    }
  }
 
  // Sort jobs by firstSeen descending, then firm name
  allJobs.sort((a, b) => {
    if (a.firstSeen !== b.firstSeen) return b.firstSeen.localeCompare(a.firstSeen);
    return a.firmName.localeCompare(b.firmName);
  });
 
  // Group by firstSeen date
  const grouped = new Map();
  for (const job of allJobs) {
    if (!grouped.has(job.firstSeen)) {
      grouped.set(job.firstSeen, []);
    }
    grouped.get(job.firstSeen).push(job);
  }
 
  // Count today's jobs
  const todayStr = new Date().toISOString().split("T")[0];
  const todayJobs = grouped.get(todayStr) || [];
 
  // Update stats
  document.getElementById("totalJobs").textContent = allJobs.length;
  document.getElementById("totalFirms").textContent = firmsWithJobs.size;
  document.getElementById("statTotal").textContent = allJobs.length;
  document.getElementById("statFirms").textContent = firmsWithJobs.size;
  document.getElementById("statToday").textContent = todayJobs.length;
  document.getElementById("resultsCount").textContent =
    `${allJobs.length} posting${allJobs.length !== 1 ? "s" : ""} across ${grouped.size} date${grouped.size !== 1 ? "s" : ""}`;
 
  // Render timeline
  const timeline = document.getElementById("timeline");
  const emptyState = document.getElementById("emptyState");
  const dateNav = document.getElementById("dateNav");
 
  if (allJobs.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
 
  const frag = document.createDocumentFragment();
  const navFrag = document.createDocumentFragment();
 
  for (const [dateStr, jobs] of grouped) {
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
      <span class="recent-date-count">${jobs.length} posting${jobs.length !== 1 ? "s" : ""}</span>
    `;
    section.appendChild(header);
 
    const jobsList = document.createElement("div");
    jobsList.className = "jobs-list";
    for (const job of jobs) {
      jobsList.appendChild(renderTimelineJobCard(job, job.firmName, job.firmPresence));
    }
    section.appendChild(jobsList);
 
    frag.appendChild(section);
 
    // Sidebar date nav link
    const navLink = document.createElement("a");
    navLink.className = "recent-date-nav__link";
    navLink.href = `#date-${dateStr}`;
    navLink.innerHTML = `
      <span class="recent-date-nav__date">${new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      <span class="recent-date-nav__count">${jobs.length}</span>
    `;
    navFrag.appendChild(navLink);
  }
 
  timeline.appendChild(frag);
  dateNav.appendChild(navFrag);
}
 
document.addEventListener("DOMContentLoaded", init);