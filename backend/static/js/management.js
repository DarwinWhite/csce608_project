/* management.js — Management console logic */

const STYLES_M = [
  "Impressionism","Realism","Abstract","Surrealism","Expressionism",
  "Modernism","Baroque","Romanticism","Pop Art","Minimalism",
  "Renaissance","Cubism","Art Nouveau","Symbolism","Neoclassicism",
];

const MEDIUMS_M = [
  "Oil on canvas","Watercolor","Acrylic","Sculpture","Photography",
  "Digital","Charcoal","Mixed Media","Pastel","Fresco","Ink",
  "Lithograph","Bronze cast","Gouache","Encaustic",
];

const ROLES_M = [
  "Gallery Manager","Curator","Registrar","Sales Associate",
  "Art Advisor","Receptionist","Security Officer","Conservator",
  "Archivist","Events Coordinator",
];

let awPage = 1, awTotal = 0;
let artPage = 1, artTotal = 0;
let cPage = 1, cTotal = 0;

const AW_SIZE  = 25;
const ART_SIZE = 50;
const C_SIZE   = 50;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  setActiveNav();
  chartDefaults();
  setupTabs();
  populateSelectsM();
  await Promise.all([
    mgmt.loadArtwork(1),
    mgmt.loadArtists(1),
    mgmt.loadCustomers(1),
    mgmt.loadStaff(),
    loadArtistSelectM(),
  ]);
});

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "analytics") loadAnalytics();
    });
  });
}

function populateSelectsM() {
  fillSelect("aw-style",  STYLES_M);
  fillSelect("art-style", STYLES_M);
  fillSelect("art-medium",MEDIUMS_M);
  fillSelect("s-role",    ROLES_M);
  // Add styles to artwork filter dropdown
  const fsel = document.getElementById("aw-filter-style");
  STYLES_M.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s;
    fsel.appendChild(opt);
  });
}

function fillSelect(id, values) {
  const sel = document.getElementById(id);
  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
}

async function loadArtistSelectM() {
  const data = await apiFetch("/api/artists?page=1&page_size=300");
  const sel = document.getElementById("aw-artist");
  data.data.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.artistid;
    opt.textContent = `${a.name} (${a.style})`;
    sel.appendChild(opt);
  });
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(title, bodyHtml, onSave) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHtml;
  document.getElementById("modal-save-btn").onclick = onSave;
  document.getElementById("edit-modal").style.display = "flex";
}

function closeModal(e) {
  if (e.target === document.getElementById("edit-modal"))
    document.getElementById("edit-modal").style.display = "none";
}

function modalFieldValue(id) {
  return document.getElementById(id)?.value ?? "";
}

// ── Pagination (generic) ──────────────────────────────────────────────────────
function renderPag(containerId, currentPage, total, pageSize, fnName) {
  const totalPages = Math.ceil(total / pageSize);
  const el = document.getElementById(containerId);
  if (totalPages <= 1) { el.innerHTML = ""; return; }
  let html = `<button onclick="${fnName}(${Math.max(1, currentPage-1)})" ${currentPage===1?"disabled":""}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
      html += `<button class="${p===currentPage?"active":""}" onclick="${fnName}(${p})">${p}</button>`;
    else if (Math.abs(p - currentPage) === 3)
      html += `<span class="page-info">…</span>`;
  }
  html += `<button onclick="${fnName}(${Math.min(totalPages, currentPage+1)})" ${currentPage===totalPages?"disabled":""}>›</button>`;
  html += `<span class="page-info">${total.toLocaleString()} total</span>`;
  el.innerHTML = html;
}

// ── Namespace to allow calling from HTML onclick attrs ────────────────────────
const mgmt = {

  // ── ARTWORK ─────────────────────────────────────────────────────────────────
  async loadArtwork(page = 1) {
    awPage = page;
    const style  = document.getElementById("aw-filter-style").value;
    const avail  = document.getElementById("aw-filter-avail").checked;
    const params = new URLSearchParams({ page, page_size: AW_SIZE });
    if (style) params.set("style", style);
    if (avail) params.set("is_sold", "false");

    try {
      const data = await apiFetch(`/api/artwork?${params}`);
      awTotal = data.total;
      document.getElementById("aw-tbody").innerHTML = data.data.map(aw => `
        <tr>
          <td>${aw.artworkid}</td>
          <td>${escHtml(aw.title)}</td>
          <td>${escHtml(aw.artist_name)}</td>
          <td><span class="badge badge-style">${escHtml(aw.style)}</span></td>
          <td>${aw.yearmade}</td>
          <td>${fmt$$(aw.price)}</td>
          <td>${aw.issold
            ? '<span class="badge badge-sold">Sold</span>'
            : '<span class="badge badge-avail">Available</span>'}</td>
          <td class="flex gap-1">
            <button class="btn btn-secondary btn-sm" onclick="mgmt.editArtwork(${aw.artworkid})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="mgmt.deleteArtwork(${aw.artworkid})">Delete</button>
          </td>
        </tr>`).join("");
      renderPag("aw-pagination", awPage, awTotal, AW_SIZE, "mgmt.loadArtwork");
    } catch (e) { toast(e.message, "error"); }
  },

  async addArtwork() {
    const body = {
      title:    document.getElementById("aw-title").value.trim(),
      yearMade: Number(document.getElementById("aw-year").value),
      style:    document.getElementById("aw-style").value,
      price:    Number(document.getElementById("aw-price").value),
      artistID: Number(document.getElementById("aw-artist").value),
      isSold:   document.getElementById("aw-sold").value === "true",
      galleryID: 1,
    };
    if (!body.title || !body.yearMade || !body.price || !body.artistID) {
      toast("Fill all fields.", "error"); return;
    }
    try {
      await apiFetch("/api/artwork", { method: "POST", body: JSON.stringify(body) });
      toast("Artwork added.");
      mgmt.loadArtwork(1);
    } catch (e) { toast(e.message, "error"); }
  },

  async editArtwork(id) {
    const aw = await apiFetch(`/api/artwork/${id}`);
    const styleOpts = STYLES_M.map(s =>
      `<option value="${s}" ${s === aw.style ? "selected" : ""}>${s}</option>`).join("");
    openModal(`Edit Artwork #${id}`, `
      <div class="form-grid">
        <div class="form-group"><label>Title</label><input id="m-title" value="${escHtml(aw.title)}"></div>
        <div class="form-group"><label>Year</label><input id="m-year" type="number" value="${aw.yearmade}"></div>
        <div class="form-group"><label>Style</label><select id="m-style">${styleOpts}</select></div>
        <div class="form-group"><label>Price ($)</label><input id="m-price" type="number" step="0.01" value="${aw.price}"></div>
        <div class="form-group"><label>Sold?</label>
          <select id="m-sold">
            <option value="false" ${!aw.issold?"selected":""}>No</option>
            <option value="true"  ${aw.issold?"selected":""}>Yes</option>
          </select>
        </div>
      </div>`, async () => {
        await apiFetch(`/api/artwork/${id}`, { method: "PUT", body: JSON.stringify({
          title:    modalFieldValue("m-title"),
          yearMade: Number(modalFieldValue("m-year")),
          style:    modalFieldValue("m-style"),
          price:    Number(modalFieldValue("m-price")),
          isSold:   modalFieldValue("m-sold") === "true",
        })});
        document.getElementById("edit-modal").style.display = "none";
        toast("Artwork updated.");
        mgmt.loadArtwork(awPage);
    });
  },

  async deleteArtwork(id) {
    if (!confirm(`Delete artwork #${id}?`)) return;
    try {
      await apiFetch(`/api/artwork/${id}`, { method: "DELETE" });
      toast("Artwork deleted.");
      mgmt.loadArtwork(awPage);
    } catch (e) { toast(e.message, "error"); }
  },

  // ── ARTISTS ─────────────────────────────────────────────────────────────────
  async loadArtists(page = 1) {
    artPage = page;
    try {
      const data = await apiFetch(`/api/artists?page=${page}&page_size=${ART_SIZE}`);
      artTotal = data.total;
      document.getElementById("artists-tbody").innerHTML = data.data.map(a => `
        <tr>
          <td>${a.artistid}</td>
          <td>${escHtml(a.name)}</td>
          <td><span class="badge badge-style">${escHtml(a.style)}</span></td>
          <td>${escHtml(a.medium)}</td>
          <td>${a.artwork_count}</td>
          <td class="flex gap-1">
            <button class="btn btn-secondary btn-sm" onclick="mgmt.editArtist(${a.artistid})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="mgmt.deleteArtist(${a.artistid})">Delete</button>
          </td>
        </tr>`).join("");
      renderPag("artists-pagination", artPage, artTotal, ART_SIZE, "mgmt.loadArtists");
    } catch (e) { toast(e.message, "error"); }
  },

  async addArtist() {
    const body = {
      name:   document.getElementById("art-name").value.trim(),
      style:  document.getElementById("art-style").value,
      medium: document.getElementById("art-medium").value,
    };
    if (!body.name) { toast("Name required.", "error"); return; }
    try {
      await apiFetch("/api/artists", { method: "POST", body: JSON.stringify(body) });
      toast("Artist added.");
      document.getElementById("art-name").value = "";
      mgmt.loadArtists(1);
    } catch (e) { toast(e.message, "error"); }
  },

  async editArtist(id) {
    const a = await apiFetch(`/api/artists/${id}`);
    const styleOpts  = STYLES_M.map(s => `<option value="${s}" ${s===a.style?"selected":""}>${s}</option>`).join("");
    const medOpts    = MEDIUMS_M.map(m => `<option value="${m}" ${m===a.medium?"selected":""}>${m}</option>`).join("");
    openModal(`Edit Artist #${id}`, `
      <div class="form-grid">
        <div class="form-group"><label>Name</label><input id="m-aname" value="${escHtml(a.name)}"></div>
        <div class="form-group"><label>Style</label><select id="m-astyle">${styleOpts}</select></div>
        <div class="form-group"><label>Medium</label><select id="m-amed">${medOpts}</select></div>
      </div>`, async () => {
        await apiFetch(`/api/artists/${id}`, { method: "PUT", body: JSON.stringify({
          name: modalFieldValue("m-aname"),
          style: modalFieldValue("m-astyle"),
          medium: modalFieldValue("m-amed"),
        })});
        document.getElementById("edit-modal").style.display = "none";
        toast("Artist updated.");
        mgmt.loadArtists(artPage);
    });
  },

  async deleteArtist(id) {
    if (!confirm(`Delete artist #${id} and all their artwork?`)) return;
    try {
      await apiFetch(`/api/artists/${id}`, { method: "DELETE" });
      toast("Artist deleted.");
      mgmt.loadArtists(artPage);
    } catch (e) { toast(e.message, "error"); }
  },

  // ── CUSTOMERS ────────────────────────────────────────────────────────────────
  async loadCustomers(page = 1) {
    cPage = page;
    const search = document.getElementById("c-search").value;
    const sort   = document.getElementById("c-sort").value;
    const order  = sort === "moneyspent" ? "desc" : "asc";
    const params = new URLSearchParams({ page, page_size: C_SIZE, sort_by: sort, order });
    if (search) params.set("search", search);
    try {
      const data = await apiFetch(`/api/customers?${params}`);
      cTotal = data.total;
      document.getElementById("customers-tbody").innerHTML = data.data.map(c => `
        <tr>
          <td>${c.customerid}</td>
          <td>${escHtml(c.name)}</td>
          <td>${escHtml(c.phonenum)}</td>
          <td>${escHtml(c.email)}</td>
          <td>${fmt$$(c.moneyspent)}</td>
          <td class="flex gap-1">
            <button class="btn btn-secondary btn-sm" onclick="mgmt.editCustomer(${c.customerid})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="mgmt.deleteCustomer(${c.customerid})">Delete</button>
          </td>
        </tr>`).join("");
      renderPag("c-pagination", cPage, cTotal, C_SIZE, "mgmt.loadCustomers");
    } catch (e) { toast(e.message, "error"); }
  },

  async addCustomer() {
    const body = {
      name:     document.getElementById("c-name").value.trim(),
      phoneNum: document.getElementById("c-phone").value.trim(),
      email:    document.getElementById("c-email").value.trim(),
    };
    if (!body.name || !body.email) { toast("Name and email required.", "error"); return; }
    try {
      await apiFetch("/api/customers", { method: "POST", body: JSON.stringify(body) });
      toast("Customer added.");
      ["c-name","c-phone","c-email"].forEach(id => document.getElementById(id).value = "");
      mgmt.loadCustomers(1);
    } catch (e) { toast(e.message, "error"); }
  },

  async editCustomer(id) {
    const c = await apiFetch(`/api/customers/${id}`);
    openModal(`Edit Customer #${id}`, `
      <div class="form-grid">
        <div class="form-group"><label>Name</label><input id="m-cname" value="${escHtml(c.name)}"></div>
        <div class="form-group"><label>Phone</label><input id="m-cphone" value="${escHtml(c.phonenum)}"></div>
        <div class="form-group"><label>Email</label><input id="m-cemail" value="${escHtml(c.email)}"></div>
        <div class="form-group"><label>Money Spent ($)</label><input id="m-cspent" type="number" step="0.01" value="${c.moneyspent}"></div>
      </div>`, async () => {
        await apiFetch(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify({
          name:      modalFieldValue("m-cname"),
          phoneNum:  modalFieldValue("m-cphone"),
          email:     modalFieldValue("m-cemail"),
          moneySpent: Number(modalFieldValue("m-cspent")),
        })});
        document.getElementById("edit-modal").style.display = "none";
        toast("Customer updated.");
        mgmt.loadCustomers(cPage);
    });
  },

  async deleteCustomer(id) {
    if (!confirm(`Delete customer #${id}?`)) return;
    try {
      await apiFetch(`/api/customers/${id}`, { method: "DELETE" });
      toast("Customer deleted.");
      mgmt.loadCustomers(cPage);
    } catch (e) { toast(e.message, "error"); }
  },

  // ── STAFF ────────────────────────────────────────────────────────────────────
  async loadStaff() {
    try {
      const rows = await apiFetch("/api/staff");
      document.getElementById("staff-tbody").innerHTML = rows.map(s => `
        <tr>
          <td>${s.staffid}</td>
          <td>${escHtml(s.name)}</td>
          <td>${escHtml(s.phonenum)}</td>
          <td><span class="badge badge-role">${escHtml(s.role)}</span></td>
          <td>${s.handles_count}</td>
          <td class="flex gap-1">
            <button class="btn btn-secondary btn-sm" onclick="mgmt.editStaff(${s.staffid})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="mgmt.deleteStaff(${s.staffid})">Delete</button>
          </td>
        </tr>`).join("");
    } catch (e) { toast(e.message, "error"); }
  },

  async addStaff() {
    const body = {
      name:     document.getElementById("s-name").value.trim(),
      phoneNum: document.getElementById("s-phone").value.trim(),
      role:     document.getElementById("s-role").value,
      galleryID: 1,
    };
    if (!body.name) { toast("Name required.", "error"); return; }
    try {
      await apiFetch("/api/staff", { method: "POST", body: JSON.stringify(body) });
      toast("Staff member added.");
      ["s-name","s-phone"].forEach(id => document.getElementById(id).value = "");
      mgmt.loadStaff();
    } catch (e) { toast(e.message, "error"); }
  },

  async editStaff(id) {
    const s = await apiFetch(`/api/staff/${id}`);
    const roleOpts = ROLES_M.map(r => `<option value="${r}" ${r===s.role?"selected":""}>${r}</option>`).join("");
    openModal(`Edit Staff #${id}`, `
      <div class="form-grid">
        <div class="form-group"><label>Name</label><input id="m-sname" value="${escHtml(s.name)}"></div>
        <div class="form-group"><label>Phone</label><input id="m-sphone" value="${escHtml(s.phonenum)}"></div>
        <div class="form-group"><label>Role</label><select id="m-srole">${roleOpts}</select></div>
      </div>`, async () => {
        await apiFetch(`/api/staff/${id}`, { method: "PUT", body: JSON.stringify({
          name:     modalFieldValue("m-sname"),
          phoneNum: modalFieldValue("m-sphone"),
          role:     modalFieldValue("m-srole"),
          galleryID: s.galleryid ?? 1,
        })});
        document.getElementById("edit-modal").style.display = "none";
        toast("Staff updated.");
        mgmt.loadStaff();
    });
  },

  async deleteStaff(id) {
    if (!confirm(`Delete staff member #${id}?`)) return;
    try {
      await apiFetch(`/api/staff/${id}`, { method: "DELETE" });
      toast("Staff deleted.");
      mgmt.loadStaff();
    } catch (e) { toast(e.message, "error"); }
  },
};

// ── Analytics ─────────────────────────────────────────────────────────────────
let analyticsLoaded = false;
const chartInstances = {};

async function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;

  const [summary, revStyle, topCust, topArt, staffH, likedArt, byYear] = await Promise.all([
    apiFetch("/api/analytics/summary"),
    apiFetch("/api/analytics/revenue-by-style"),
    apiFetch("/api/analytics/top-customers"),
    apiFetch("/api/analytics/top-artists"),
    apiFetch("/api/analytics/staff-handles"),
    apiFetch("/api/analytics/liked-artists"),
    apiFetch("/api/analytics/artwork-by-year"),
  ]);

  // Summary stats
  const mgmtStats = document.getElementById("mgmt-stats");
  mgmtStats.innerHTML = [
    ["total_artwork",   "Total Artwork",    v => v.toLocaleString()],
    ["sold_artwork",    "Pieces Sold",      v => v.toLocaleString()],
    ["total_revenue",   "Total Revenue",    v => fmt$$(v)],
    ["total_artists",   "Artists",          v => v.toLocaleString()],
    ["total_customers", "Customers",        v => v.toLocaleString()],
    ["total_staff",     "Staff",            v => v.toLocaleString()],
    ["total_likes",     "Total Likes",      v => v.toLocaleString()],
  ].map(([key, label, fmt]) => `
    <div class="stat-card">
      <div class="value">${fmt(Number(summary[key]))}</div>
      <div class="label">${label}</div>
    </div>`).join("");

  // Revenue by style (horizontal bar)
  new Chart(document.getElementById("ch-rev-style"), {
    type: "bar",
    data: {
      labels: revStyle.map(r => r.style),
      datasets: [{
        label: "Revenue ($)",
        data: revStyle.map(r => Number(r.total_revenue)),
        backgroundColor: CHART_COLORS,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { callback: v => "$" + (v/1000).toFixed(0) + "k" } } },
    },
  });

  // Top customers
  new Chart(document.getElementById("ch-top-cust"), {
    type: "bar",
    data: {
      labels: topCust.map(r => r.name.split(" ")[0] + " " + (r.name.split(" ")[1]?.[0] ?? "") + "."),
      datasets: [{
        label: "Spent ($)",
        data: topCust.map(r => Number(r.moneyspent)),
        backgroundColor: "#c8a96e",
        borderRadius: 4,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => "$" + (v/1000).toFixed(0) + "k" } } },
    },
  });

  // Top artists
  new Chart(document.getElementById("ch-top-art"), {
    type: "bar",
    data: {
      labels: topArt.map(r => r.name.split(" ").slice(-1)[0]),
      datasets: [{
        label: "Artwork Count",
        data: topArt.map(r => r.artwork_count),
        backgroundColor: "#5b9bd5",
        borderRadius: 4,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  // Staff handles (doughnut)
  new Chart(document.getElementById("ch-staff"), {
    type: "doughnut",
    data: {
      labels: staffH.map(r => r.name.split(" ")[0]),
      datasets: [{
        data: staffH.map(r => r.handles_count),
        backgroundColor: CHART_COLORS,
        borderWidth: 0,
      }],
    },
    options: { plugins: { legend: { position: "right" } } },
  });

  // Most liked artists
  new Chart(document.getElementById("ch-liked"), {
    type: "bar",
    data: {
      labels: likedArt.map(r => r.name.split(" ").slice(-1)[0]),
      datasets: [{
        label: "Likes",
        data: likedArt.map(r => r.like_count),
        backgroundColor: "#4caf82",
        borderRadius: 4,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  // Artwork by year (line)
  new Chart(document.getElementById("ch-year"), {
    type: "line",
    data: {
      labels: byYear.map(r => r.year),
      datasets: [{
        label: "Artwork Count",
        data: byYear.map(r => r.count),
        borderColor: "#b39ddb",
        backgroundColor: "rgba(179,157,219,0.15)",
        tension: 0.3,
        fill: true,
        pointRadius: 2,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });
}
