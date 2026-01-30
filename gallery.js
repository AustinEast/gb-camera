const MANIFEST_URL = "./manifest.json";

const PRESET_PALETTES = [
  { id: "pocket", name: "Pocket", colors: ["#1a1a1a", "#555555", "#aaaaaa", "#f2f2f2"] },
  { id: "dmg", name: "DMG", colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] },
  { id: "blue", name: "Ocean", colors: ["#06101a", "#173a5e", "#5aa6d6", "#d7f3ff"] },
  { id: "hot", name: "Infra", colors: ["#12060a", "#5a1130", "#d83b5c", "#ffe6d5"] },
  { id: "bitter", name: "Bittersweet", colors: ["#282328", "#545c7e", "#c56981", "#a3a29a"] },
  { id: "icecream", name: "Ice Cream", colors: ["#7c3f58", "#eb6b6f", "#f9a875", "#fff6d3"] },
  { id: "demi", name: "Demichrome", colors: ["#211e20", "#555568", "#a0a08b", "#e9efec"] },
  { id: "mist", name: "Mist", colors: ["#2d1b00", "#1e606e", "#5ab9a8", "#c4f0c2"] },
  { id: "soda", name: "Soda Cap", colors: ["#2176cc", "#ff7d6e", "#fca6ac", "#e8e7cb"] },
  { id: "gold", name: "Gold", colors: ["#210b1b", "#4d222c", "#9d654c", "#cfab51"] },
  { id: "redblood", name: "Red Blood", colors: [ "#120a19", "#5e4069","#7e1f23", "#c4181f"] },
  { id: "mooncrystal", name: "Moon Crystal", colors: ["#ffe2db", "#d9a7c6", "#8d89c7", "#755f9c"] },
  { id: "kankei", name: "Kanki", colors: ["#ffffff", "#f42e1f", "#2f256b", "#060608"] },
  { id: "honey", name: "Honey", colors: ["#3e3a42", "#877286", "#f0b695", "#e9f5da"] },
  { id: "softserve", name: "Soft Serve", colors: ["#e64270", "#64c1bd", "#ead762", "#e3e6e8"] },
  { id: "pong", name: "Pong", colors: ["#5c4bff", "#fdfff2", "#14e1ff", "#ff7ad6"] },
  { id: "rettie", name: "Rettie Punk", colors: ["#151c18", "#094466", "#cc1242", "#f0745c"] },
  { id: "voltage", name: "Voltage Warning", colors: ["#0b3d02", "#635650", "#d3ae21", "#d4c9c3"] },
];

const LS_CUSTOM_KEY = "gbcam_custom_palettes_v1";
const LS_LAST_PALETTE_KEY = "gbcam_last_palette_v1";

const els = {
  grid: document.getElementById("grid"),
  paletteSelect: document.getElementById("paletteSelect"),
  savePaletteBtn: document.getElementById("savePaletteBtn"),
  resetPaletteBtn: document.getElementById("resetPaletteBtn"),
  copyLinkBtn: document.getElementById("copyLinkBtn"),
  c0: document.getElementById("c0"),
  c1: document.getElementById("c1"),
  c2: document.getElementById("c2"),
  c3: document.getElementById("c3"),

  // lightbox
  lightbox: document.getElementById("lightbox"),
  lbBackdrop: document.getElementById("lightboxBackdrop"),
  lbClose: document.getElementById("lbClose"),
  lbPrev: document.getElementById("lbPrev"),
  lbNext: document.getElementById("lbNext"),
  lbWrap: document.getElementById("lightboxCanvasWrap"),
  lbCanvas: document.getElementById("lightboxCanvas"),
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const v = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function paletteToParam(colors) {
  return colors.map(c => c.replace("#", "")).join(",");
}

function paramToPalette(str) {
  const parts = str.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length !== 4) return null;
  const colors = parts.map(p => "#" + p.replace("#", ""));
  if (!colors.every(c => /^#[0-9a-fA-F]{6}$/.test(c) || /^#[0-9a-fA-F]{3}$/.test(c))) return null;
  return colors.map(c => (c.length === 4 ? "#" + c[1]+c[1]+c[2]+c[2]+c[3]+c[3] : c));
}

function loadCustomPalettes() {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(p => p && typeof p.id === "string" && Array.isArray(p.colors) && p.colors.length === 4)
      .map(p => ({ id: p.id, name: p.name ?? p.id, colors: p.colors }));
  } catch {
    return [];
  }
}

function saveCustomPalettes(list) {
  localStorage.setItem(LS_CUSTOM_KEY, JSON.stringify(list));
}

function rebuildPaletteSelect() {
  const custom = loadCustomPalettes();
  const groups = [
    { label: "Presets", items: PRESET_PALETTES },
    { label: "Custom", items: custom },
  ];

  els.paletteSelect.innerHTML = "";
  for (const g of groups) {
    if (!g.items.length) continue;
    const og = document.createElement("optgroup");
    og.label = g.label;
    for (const p of g.items) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      og.appendChild(opt);
    }
    els.paletteSelect.appendChild(og);
  }

  els.paletteSelect.value = localStorage.getItem(LS_LAST_PALETTE_KEY) || PRESET_PALETTES[0].id;
}

function getPaletteById(id) {
  const custom = loadCustomPalettes();
  return PRESET_PALETTES.find(p => p.id === id) || custom.find(p => p.id === id) || null;
}

// ---- Gallery state ----

/** @type {string[]} */
let files = [];

// cache: file -> { w,h, toneIndex }
const cache = new Map();

let activePalette = PRESET_PALETTES[0].colors.slice();

// Lightbox index (into files)
let lbIndex = 0;

function applyPageBackground() {
  document.body.style.background = activePalette[3];
}

function setPalette(colors) {
  activePalette = colors.slice();

  els.c0.value = activePalette[0];
  els.c1.value = activePalette[1];
  els.c2.value = activePalette[2];
  els.c3.value = activePalette[3];

  applyPageBackground();
  renderAllGrid();
  if (isLightboxOpen()) renderLightbox();
}

function onSwatchChange() {
  setPalette([els.c0.value, els.c1.value, els.c2.value, els.c3.value]);
}

function onPaletteSelectChange() {
  const id = els.paletteSelect.value;
  const p = getPaletteById(id);
  if (!p) return;
  localStorage.setItem(LS_LAST_PALETTE_KEY, id);
  setPalette(p.colors);
}

function onSavePalette() {
  const name = prompt("Name this palette:", "Custom Palette");
  if (!name) return;

  const custom = loadCustomPalettes();
  const id = "custom_" + crypto.randomUUID().slice(0, 8);
  custom.unshift({ id, name, colors: activePalette.slice() });
  saveCustomPalettes(custom);

  rebuildPaletteSelect();
  els.paletteSelect.value = id;
  localStorage.setItem(LS_LAST_PALETTE_KEY, id);
}

function onResetPalette() {
  const p = getPaletteById(els.paletteSelect.value);
  if (!p) return;
  setPalette(p.colors);
}

async function onCopyLink() {
  const url = new URL(location.href);
  url.searchParams.set("pal", paletteToParam(activePalette));
  try {
    await navigator.clipboard.writeText(url.toString());
    els.copyLinkBtn.textContent = "Copied";
    setTimeout(() => (els.copyLinkBtn.textContent = "Copy Link"), 900);
  } catch {
    prompt("Copy this link:", url.toString());
  }
}

// ---- Load + quantize ----

async function fetchManifest() {
  const res = await fetch(MANIFEST_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  const json = await res.json();

  if (Array.isArray(json) && json.every(x => typeof x === "string")) {
    files = json;
    return;
  }
  throw new Error("manifest.json should be an array of strings (file paths).");
}

async function loadToneIndex(file) {
  if (cache.has(file)) return cache.get(file);

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.decoding = "async";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = file;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;

  const octx = off.getContext("2d", { willReadFrequently: true });
  octx.imageSmoothingEnabled = false;
  octx.drawImage(img, 0, 0);

  const data = octx.getImageData(0, 0, w, h).data;

  let minV = 255, maxV = 0;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const range = Math.max(1, maxV - minV);

  const toneIndex = new Uint8Array(w * h);
  let p = 0;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    const n = (v - minV) / range; // 0..1
    const t = Math.round(n * 3);  // 0..3
    toneIndex[p++] = clamp(t, 0, 3);
  }

  const entry = { w, h, toneIndex };
  cache.set(file, entry);
  return entry;
}

// ---- Rendering (pixel-perfect integer fit) ----

function computeScaleToWidth(targetW, imgW) {
  const s = Math.floor(targetW / imgW);
  return Math.max(1, s);
}

function drawToCanvas(canvas, entry, targetW) {
  // 1) integer scale (true pixel-perfect buffer)
  const fudge = 2;
  const intScale = Math.max(1, Math.floor((targetW - fudge) / entry.w));

  const bufW = entry.w * intScale;
  const bufH = entry.h * intScale;

  canvas.width = bufW;
  canvas.height = bufH;

  // 2) optional fractional CSS scale to fill the remaining gap
  const MAX_FILL_UPSCALE = 1.12; // allow up to +12% stretch
  const desired = targetW;       // fill the cell width
  const cssScale = Math.min(MAX_FILL_UPSCALE, Math.max(1, desired / bufW));

  const cssW = Math.round(bufW * cssScale);
  const cssH = Math.round(bufH * cssScale);

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const cctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  cctx.imageSmoothingEnabled = false;

  const rgb = activePalette.map(hexToRgb);
  const imageData = cctx.createImageData(bufW, bufH);
  const out = imageData.data;

  for (let y = 0; y < entry.h; y++) {
    for (let x = 0; x < entry.w; x++) {
      const t = entry.toneIndex[y * entry.w + x];
      const c = rgb[t];

      const ox0 = x * intScale;
      const oy0 = y * intScale;

      for (let dy = 0; dy < intScale; dy++) {
        let row = ((oy0 + dy) * bufW + ox0) * 4;
        for (let dx = 0; dx < intScale; dx++) {
          out[row] = c.r;
          out[row + 1] = c.g;
          out[row + 2] = c.b;
          out[row + 3] = 255;
          row += 4;
        }
      }
    }
  }

  cctx.putImageData(imageData, 0, 0);
}


// ---- Grid ----

function buildGrid() {
  els.grid.innerHTML = "";

  files.forEach((file, idx) => {
    const item = document.createElement("button");
    item.className = "item";
    item.type = "button";
    item.setAttribute("data-file", file);
    item.setAttribute("data-idx", String(idx));
    item.setAttribute("aria-label", `Open image ${idx + 1}`);

    // Remove button chrome
    item.style.border = "none";
    item.style.padding = "0";
    item.style.background = "transparent";

    const canvas = document.createElement("canvas");
    canvas.className = "gbcCanvas";

    item.appendChild(canvas);

    item.addEventListener("click", () => openLightbox(idx));

    els.grid.appendChild(item);

    // kick off load+render
    loadToneIndex(file).then((entry) => {
      const wrapW = Math.floor(item.clientWidth);
      drawToCanvas(canvas, entry, wrapW);
    }).catch(console.error);
  });
}

function renderAllGrid() {
  const items = els.grid.querySelectorAll(".item");
  for (const item of items) {
    const file = item.getAttribute("data-file");
    const canvas = item.querySelector("canvas");
    if (!file || !canvas) continue;

    const entry = cache.get(file);
    if (!entry) continue;

    const wrapW = Math.floor(item.clientWidth);
    drawToCanvas(canvas, entry, wrapW);
  }
}

// ---- Lightbox ----

function isLightboxOpen() {
  return els.lightbox.classList.contains("open");
}

function openLightbox(idx) {
  lbIndex = clamp(idx, 0, files.length - 1);
  els.lightbox.classList.add("open");
  els.lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  renderLightbox();
}

function closeLightbox() {
  els.lightbox.classList.remove("open");
  els.lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function prevLightbox() {
  lbIndex = (lbIndex - 1 + files.length) % files.length;
  renderLightbox();
}

function nextLightbox() {
  lbIndex = (lbIndex + 1) % files.length;
  renderLightbox();
}

function renderLightbox() {
  const file = files[lbIndex];
  const wrapW = Math.floor(els.lbWrap.clientWidth);
  const wrapH = Math.floor(els.lbWrap.clientHeight);

  const entry = cache.get(file);
  const doDraw = (e) => {
    // Fit to BOTH width & height with integer scaling
    const s = Math.floor(Math.min(wrapW / e.w, wrapH / e.h));
    const scale = Math.max(1, s);

    const outW = e.w * scale;
    const outH = e.h * scale;

    els.lbCanvas.width = outW;
    els.lbCanvas.height = outH;
    els.lbCanvas.style.width = `${outW}px`;
    els.lbCanvas.style.height = `${outH}px`;

    const cctx = els.lbCanvas.getContext("2d", { alpha: false, desynchronized: true });
    cctx.imageSmoothingEnabled = false;

    const rgb = activePalette.map(hexToRgb);
    const imageData = cctx.createImageData(outW, outH);
    const out = imageData.data;

    for (let y = 0; y < e.h; y++) {
      for (let x = 0; x < e.w; x++) {
        const t = e.toneIndex[y * e.w + x];
        const c = rgb[t];

        const ox0 = x * scale;
        const oy0 = y * scale;

        for (let dy = 0; dy < scale; dy++) {
          let row = ((oy0 + dy) * outW + ox0) * 4;
          for (let dx = 0; dx < scale; dx++) {
            out[row] = c.r;
            out[row + 1] = c.g;
            out[row + 2] = c.b;
            out[row + 3] = 255;
            row += 4;
          }
        }
      }
    }

    cctx.putImageData(imageData, 0, 0);
  };

  if (entry) {
    doDraw(entry);
  } else {
    loadToneIndex(file).then(doDraw).catch(console.error);
  }
}

// ---- URL palette ----

function applyUrlPalette() {
  const url = new URL(location.href);
  const palParam = url.searchParams.get("pal");
  if (!palParam) return;

  const pal = paramToPalette(palParam);
  if (!pal) return;

  // apply without touching select
  setPalette(pal);
}

// ---- Bind ----

function bindUi() {
  els.paletteSelect.addEventListener("change", onPaletteSelectChange);
  els.savePaletteBtn.addEventListener("click", onSavePalette);
  els.resetPaletteBtn.addEventListener("click", onResetPalette);
  els.copyLinkBtn.addEventListener("click", onCopyLink);

  els.c0.addEventListener("input", onSwatchChange);
  els.c1.addEventListener("input", onSwatchChange);
  els.c2.addEventListener("input", onSwatchChange);
  els.c3.addEventListener("input", onSwatchChange);

  // Lightbox controls
  els.lbBackdrop.addEventListener("click", closeLightbox);
  els.lbClose.addEventListener("click", closeLightbox);
  els.lbPrev.addEventListener("click", prevLightbox);
  els.lbNext.addEventListener("click", nextLightbox);

  window.addEventListener("keydown", (e) => {
    if (!isLightboxOpen()) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") prevLightbox();
    if (e.key === "ArrowRight") nextLightbox();
  });

  window.addEventListener("resize", () => {
    renderAllGrid();
    if (isLightboxOpen()) renderLightbox();
  });
}

// ---- Init ----

async function main() {
  rebuildPaletteSelect();
  bindUi();

  await fetchManifest();

  const initial = getPaletteById(els.paletteSelect.value) || PRESET_PALETTES[0];
  setPalette(initial.colors);

  applyUrlPalette();
  buildGrid();
}

main().catch((err) => {
  console.error(err);
  els.grid.innerHTML = `<div style="padding:14px">Error: ${String(err?.message ?? err)}</div>`;
});
