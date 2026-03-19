/* common.js — shared helpers used by all three pages */

const API = "";   // same origin

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function fmt$$(n) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a").forEach(a => {
    const href = a.getAttribute("href").split("/").pop();
    if (href === current || (current === "" && href === "index.html")) {
      a.classList.add("active");
    }
  });
}

const CHART_COLORS = [
  "#c8a96e","#5b9bd5","#4caf82","#e05c5c","#b39ddb",
  "#f0c040","#67c8c0","#e08050","#a0c870","#d070a0",
  "#70a0e0","#e0a030","#a0e070","#e070d0","#70e0a0",
];

function chartDefaults() {
  Chart.defaults.color = "#8a8890";
  Chart.defaults.borderColor = "#2e2e38";
  Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
}
