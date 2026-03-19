/* staff.js — Staff portal logic */

const STYLES_STAFF = [
  "Impressionism","Realism","Abstract","Surrealism","Expressionism",
  "Modernism","Baroque","Romanticism","Pop Art","Minimalism",
  "Renaissance","Cubism","Art Nouveau","Symbolism","Neoclassicism",
];

let activeStaffID = null;
let custPage = 1;
const CUST_PAGE_SIZE = 25;

window.addEventListener("DOMContentLoaded", async () => {
  setActiveNav();
  populateStyleSelect();
  await Promise.all([loadStaffSelector(), loadArtistSelect(), loadCustomers(1)]);
});

function populateStyleSelect() {
  const sel = document.getElementById("new-style");
  STYLES_STAFF.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s;
    sel.appendChild(opt);
  });
}

// ── Staff selector ────────────────────────────────────────────────────────────
async function loadStaffSelector() {
  const staff = await apiFetch("/api/staff");
  const sel = document.getElementById("staff-select");
  staff.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.staffid;
    opt.textContent = `${s.name} — ${s.role}`;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => {
    activeStaffID = sel.value ? Number(sel.value) : null;
    const chosen = staff.find(s => s.staffid === activeStaffID);
    document.getElementById("staff-info").textContent = chosen
      ? `📞 ${chosen.phonenum}  ·  Role: ${chosen.role}`
      : "";
    loadHandles();
  });
}

// ── Handled artwork table ─────────────────────────────────────────────────────
async function loadHandles() {
  const area = document.getElementById("handles-area");
  if (!activeStaffID) {
    area.innerHTML = '<p class="text-muted">Select a staff member above.</p>';
    return;
  }
  area.innerHTML = '<div class="spinner"></div>';
  try {
    const rows = await apiFetch(`/api/staff/${activeStaffID}/handles`);
    if (!rows.length) {
      area.innerHTML = '<p class="text-muted">No artwork currently assigned.</p>';
      return;
    }
    area.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Title</th><th>Artist</th><th>Style</th><th>Year</th><th>Price</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${rows.map(aw => handlesRow(aw)).join("")}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    area.innerHTML = `<p class="text-muted text-red">Error: ${escHtml(e.message)}</p>`;
  }
}

function handlesRow(aw) {
  const sold = aw.issold;
  return `<tr id="handles-row-${aw.artworkid}">
    <td>${aw.artworkid}</td>
    <td>${escHtml(aw.title)}</td>
    <td>${escHtml(aw.artist_name)}</td>
    <td><span class="badge badge-style">${escHtml(aw.style)}</span></td>
    <td>${aw.yearmade ?? aw.year}</td>
    <td>${fmt$$(aw.price)}</td>
    <td>${sold
      ? '<span class="badge badge-sold">Sold</span>'
      : '<span class="badge badge-avail">Available</span>'
    }</td>
    <td class="flex gap-1">
      ${!sold ? `<button class="btn btn-primary btn-sm" onclick="markSold(${aw.artworkid})">Mark Sold</button>` : ""}
      <button class="btn btn-danger btn-sm" onclick="unassign(${aw.artworkid})">Unassign</button>
    </td>
  </tr>`;
}

async function markSold(artworkID) {
  try {
    await apiFetch(`/api/artwork/${artworkID}`, {
      method: "PUT",
      body: JSON.stringify({ isSold: true }),
    });
    toast("Artwork marked as sold.");
    loadHandles();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function unassign(artworkID) {
  if (!activeStaffID) return;
  try {
    await apiFetch(`/api/handles/${activeStaffID}/${artworkID}`, { method: "DELETE" });
    toast("Artwork unassigned.");
    loadHandles();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function assignArtwork() {
  if (!activeStaffID) { toast("Select a staff member first.", "error"); return; }
  const artworkID = Number(document.getElementById("assign-artwork-id").value);
  if (!artworkID) { toast("Enter a valid Artwork ID.", "error"); return; }
  try {
    await apiFetch("/api/handles", {
      method: "POST",
      body: JSON.stringify({ staffID: activeStaffID, artworkID }),
    });
    toast("Artwork assigned successfully.");
    document.getElementById("assign-artwork-id").value = "";
    loadHandles();
  } catch (e) {
    toast(e.message, "error");
  }
}

// ── Artist select for new-artwork form ────────────────────────────────────────
async function loadArtistSelect() {
  const sel = document.getElementById("new-artist-id");
  // Load first 300 artists (all seeded)
  const data = await apiFetch("/api/artists?page=1&page_size=300");
  data.data.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.artistid;
    opt.textContent = `${a.name} (${a.style})`;
    sel.appendChild(opt);
  });
}

async function addArtwork() {
  const body = {
    title:    document.getElementById("new-title").value.trim(),
    yearMade: Number(document.getElementById("new-year").value),
    style:    document.getElementById("new-style").value,
    price:    Number(document.getElementById("new-price").value),
    artistID: Number(document.getElementById("new-artist-id").value),
    galleryID: 1,
  };
  if (!body.title || !body.yearMade || !body.price || !body.artistID) {
    toast("Please fill in all fields.", "error");
    return;
  }
  try {
    const aw = await apiFetch("/api/artwork", { method: "POST", body: JSON.stringify(body) });
    toast(`Artwork "${aw.title}" added (ID ${aw.artworkid}).`);
    // clear form
    ["new-title","new-year","new-price"].forEach(id => document.getElementById(id).value = "");
  } catch (e) {
    toast(e.message, "error");
  }
}

// ── Customer lookup ───────────────────────────────────────────────────────────
async function loadCustomers(page = 1) {
  custPage = page;
  const search = document.getElementById("cust-search").value;
  const params = new URLSearchParams({
    page, page_size: CUST_PAGE_SIZE,
    sort_by: "moneyspent", order: "desc",
  });
  if (search) params.set("search", search);

  try {
    const data = await apiFetch(`/api/customers?${params}`);
    const tbody = document.getElementById("cust-tbody");
    tbody.innerHTML = data.data.map(c => `
      <tr>
        <td>${c.customerid}</td>
        <td>${escHtml(c.name)}</td>
        <td>${escHtml(c.phonenum)}</td>
        <td>${escHtml(c.email)}</td>
        <td>${fmt$$(c.moneyspent)}</td>
      </tr>`).join("");
    renderStaffPagination(page, data.total);
  } catch (e) {
    toast(e.message, "error");
  }
}

function renderStaffPagination(currentPage, total) {
  const totalPages = Math.ceil(total / CUST_PAGE_SIZE);
  const el = document.getElementById("cust-pagination");
  if (totalPages <= 1) { el.innerHTML = ""; return; }
  let html = `<button onclick="loadCustomers(${Math.max(1, currentPage-1)})" ${currentPage===1?"disabled":""}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
      html += `<button class="${p===currentPage?"active":""}" onclick="loadCustomers(${p})">${p}</button>`;
    else if (Math.abs(p - currentPage) === 3)
      html += `<span class="page-info">…</span>`;
  }
  html += `<button onclick="loadCustomers(${Math.min(totalPages, currentPage+1)})" ${currentPage===totalPages?"disabled":""}>›</button>`;
  html += `<span class="page-info">${total.toLocaleString()} customers</span>`;
  el.innerHTML = html;
}
