/* user.js — Visitor / User interface logic */

const STYLES = [
  "Impressionism","Realism","Abstract","Surrealism","Expressionism",
  "Modernism","Baroque","Romanticism","Pop Art","Minimalism",
  "Renaissance","Cubism","Art Nouveau","Symbolism","Neoclassicism",
];

let artworkPage = 1;
let artworkTotal = 0;
const PAGE_SIZE = 24;

let artistPage = 1;
let artistTotal = 0;
const ARTIST_PAGE_SIZE = 48;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  setActiveNav();
  chartDefaults();
  populateStyleSelects();
  await Promise.all([
    loadGallery(),
    loadStats(),
    loadArtwork(1),
    loadArtists(1),
    loadCharts(),
  ]);
});

function populateStyleSelects() {
  [document.getElementById("filter-style"), document.getElementById("artist-style-filter")]
    .forEach(sel => {
      STYLES.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s; opt.textContent = s;
        sel.appendChild(opt);
      });
    });
}

// ── Gallery hero ──────────────────────────────────────────────────────────────
async function loadGallery() {
  const g = await apiFetch("/api/gallery");
  const hero = document.getElementById("gallery-hero");
  hero.innerHTML = `
    <h1>${escHtml(g.name)}</h1>
    <div class="meta">
      <span>📍 ${escHtml(g.address)}</span>
      <span>🕐 ${escHtml(g.openhours)}</span>
    </div>`;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  const s = await apiFetch("/api/analytics/summary");
  const grid = document.getElementById("stats-grid");
  const cards = [
    ["total_artwork",   "Total Artwork",    v => v.toLocaleString()],
    ["sold_artwork",    "Pieces Sold",      v => v.toLocaleString()],
    ["total_revenue",   "Total Revenue",    v => fmt$$(v)],
    ["total_artists",   "Artists",          v => v.toLocaleString()],
    ["total_customers", "Registered Guests",v => v.toLocaleString()],
    ["total_likes",     "Total Likes",      v => v.toLocaleString()],
  ];
  grid.innerHTML = cards.map(([key, label, fmt]) => `
    <div class="stat-card">
      <div class="value">${fmt(Number(s[key]))}</div>
      <div class="label">${label}</div>
    </div>`).join("");
}

// ── Artwork grid ──────────────────────────────────────────────────────────────
async function loadArtwork(page = 1) {
  artworkPage = page;
  const style   = document.getElementById("filter-style").value;
  const minP    = document.getElementById("filter-min").value;
  const maxP    = document.getElementById("filter-max").value;
  const sold    = document.getElementById("filter-sold").value;

  const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
  if (style) params.set("style", style);
  if (minP)  params.set("min_price", minP);
  if (maxP)  params.set("max_price", maxP);
  if (sold !== "") params.set("is_sold", sold);

  const grid = document.getElementById("artwork-grid");
  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const data = await apiFetch(`/api/artwork?${params}`);
    artworkTotal = data.total;
    grid.innerHTML = data.data.length
      ? data.data.map(aw => artworkCard(aw)).join("")
      : '<p class="text-muted">No artwork matches the current filters.</p>';
    renderPagination("artwork-pagination", artworkPage, artworkTotal, PAGE_SIZE, loadArtwork);
  } catch (e) {
    grid.innerHTML = `<p class="text-muted text-red">Error: ${escHtml(e.message)}</p>`;
  }
}

function artworkCard(aw) {
  const soldBadge = aw.issold
    ? `<span class="badge badge-sold">Sold</span>`
    : `<span class="badge badge-avail">Available</span>`;
  return `
    <div class="artwork-card">
      <div class="title">${escHtml(aw.title)}</div>
      <div class="artist">${escHtml(aw.artist_name)}</div>
      <div class="artist">${escHtml(aw.year ?? aw.yearmade)}</div>
      <span class="badge badge-style">${escHtml(aw.style)}</span>
      ${soldBadge}
      <div class="price">${fmt$$(aw.price)}</div>
    </div>`;
}

function clearFilters() {
  ["filter-style","filter-sold"].forEach(id => document.getElementById(id).value = "");
  ["filter-min","filter-max"].forEach(id => document.getElementById(id).value = "");
  loadArtwork(1);
}

// ── Artists grid ──────────────────────────────────────────────────────────────
async function loadArtists(page = 1) {
  artistPage = page;
  const style = document.getElementById("artist-style-filter").value;
  const params = new URLSearchParams({ page, page_size: ARTIST_PAGE_SIZE });
  if (style) params.set("style", style);

  const grid = document.getElementById("artist-grid");
  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const data = await apiFetch(`/api/artists?${params}`);
    artistTotal = data.total;
    grid.innerHTML = data.data.map(a => `
      <div class="artist-card">
        <div class="a-name">${escHtml(a.name)}</div>
        <div class="a-meta">
          <span class="badge badge-style">${escHtml(a.style)}</span>
          <span class="text-muted"> · ${escHtml(a.medium)}</span>
        </div>
        <div class="a-meta mt-1 text-muted">${a.artwork_count} work${a.artwork_count !== 1 ? "s" : ""} in gallery</div>
      </div>`).join("");
    renderPagination("artist-pagination", artistPage, artistTotal, ARTIST_PAGE_SIZE, loadArtists);
  } catch (e) {
    grid.innerHTML = `<p class="text-muted text-red">Error: ${escHtml(e.message)}</p>`;
  }
}

// ── Pagination helper ─────────────────────────────────────────────────────────
function renderPagination(containerId, currentPage, total, pageSize, callback) {
  const totalPages = Math.ceil(total / pageSize);
  const el = document.getElementById(containerId);
  if (totalPages <= 1) { el.innerHTML = ""; return; }

  let html = `<button onclick="${callback.name}(${Math.max(1, currentPage - 1)})" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;

  // show limited page buttons
  const range = 2;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= range) {
      html += `<button class="${p === currentPage ? 'active' : ''}" onclick="${callback.name}(${p})">${p}</button>`;
    } else if (Math.abs(p - currentPage) === range + 1) {
      html += `<span class="page-info">…</span>`;
    }
  }

  html += `<button onclick="${callback.name}(${Math.min(totalPages, currentPage + 1)})" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;
  html += `<span class="page-info">${total.toLocaleString()} total</span>`;
  el.innerHTML = html;
}

// ── Charts ────────────────────────────────────────────────────────────────────
async function loadCharts() {
  const [byStyle, soldData, byYear, priceDist] = await Promise.all([
    apiFetch("/api/analytics/artwork-by-style"),
    apiFetch("/api/analytics/sold-vs-available"),
    apiFetch("/api/analytics/artwork-by-year"),
    apiFetch("/api/analytics/price-distribution"),
  ]);

  // Bar: artwork by style
  new Chart(document.getElementById("chart-style"), {
    type: "bar",
    data: {
      labels: byStyle.map(r => r.style),
      datasets: [{
        label: "Artwork Count",
        data: byStyle.map(r => r.count),
        backgroundColor: CHART_COLORS,
        borderRadius: 4,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  // Pie: sold vs available
  const soldMap = {};
  soldData.forEach(r => soldMap[r.issold] = r.count);
  new Chart(document.getElementById("chart-sold"), {
    type: "pie",
    data: {
      labels: ["Available", "Sold"],
      datasets: [{
        data: [soldMap[false] ?? soldMap["false"] ?? 0, soldMap[true] ?? soldMap["true"] ?? 0],
        backgroundColor: ["#e05c5c", "#4caf82"],
        borderWidth: 0,
      }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });

  // Line: artwork by year (top 40 years by artwork count)
  const topYears = [...byYear].sort((a, b) => b.count - a.count).slice(0, 40).sort((a, b) => a.year - b.year);
  new Chart(document.getElementById("chart-year"), {
    type: "line",
    data: {
      labels: topYears.map(r => r.year),
      datasets: [{
        label: "Artwork Count",
        data: topYears.map(r => r.count),
        borderColor: "#c8a96e",
        backgroundColor: "rgba(200,169,110,0.15)",
        tension: 0.3,
        fill: true,
        pointRadius: 3,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  // Bar: price distribution
  new Chart(document.getElementById("chart-price"), {
    type: "bar",
    data: {
      labels: priceDist.map(r => r.bucket),
      datasets: [{
        label: "Artwork Count",
        data: priceDist.map(r => r.count),
        backgroundColor: "#5b9bd5",
        borderRadius: 4,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });
}
