const MANIFEST_URL = "./manifest.json";

const PRESET_PALETTES = [
  { id: "pocket", name: "Pocket", colors: ["#1a1a1a", "#555555", "#aaaaaa", "#f2f2f2"] },
  { id: "dmg", name: "DMG", colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] },
  { id: "blue", name: "Ocean", colors: ["#06101a", "#173a5e", "#5aa6d6", "#d7f3ff"] },
  { id: "hot", name: "Infra", colors: ["#12060a", "#5a1130", "#d83b5c", "#ffe6d5"] },
  { id: "bitter", name: "Bittersweet", colors: ["#282328", "#545c7e", "#c56981", "#a3a29a"] },
  { id: "negative", name: "Negative", colors: ["#c7c7c7", "#707070", "#3b3b3b", "#121212"] },
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
  { id: "watermelon", name: "Watermelon", colors: ["#d71d1d", "#ff6666", "#8cb389", "#7dff7a"] },
];

const LS_CUSTOM_KEY = "gbcam_custom_palettes_v1";
const LS_LAST_PALETTE_KEY = "gbcam_last_palette_v1";
const DEV_MODE_QUERY_PARAM = "dev";

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
  devPanel: document.getElementById("devPanel"),
  reorderToggleBtn: document.getElementById("reorderToggleBtn"),
  copyManifestBtn: document.getElementById("copyManifestBtn"),
  resetManifestBtn: document.getElementById("resetManifestBtn"),
  devStatus: document.getElementById("devStatus"),

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

  //const defaultId = window.matchMedia("(prefers-color-scheme: dark)").matches ? "pocketdark" : "pocket";
  const defaultId = "pocket";
  els.paletteSelect.value = localStorage.getItem(LS_LAST_PALETTE_KEY) || defaultId;
}

function getPaletteById(id) {
  const custom = loadCustomPalettes();
  return PRESET_PALETTES.find(p => p.id === id) || custom.find(p => p.id === id) || null;
}

// ---- Gallery state ----

/** @type {{file: string, hidden: boolean, featured: boolean}[]} */
let files = [];

/** @type {{file: string, hidden: boolean, featured: boolean}[]} */
let originalManifestFiles = [];

// cache: file -> { w,h, toneIndex }
const cache = new Map();

let activePalette = PRESET_PALETTES[0].colors.slice();

// Lightbox index (into files)
let lbIndex = 0;
let isDeveloperMode = false;
let isReorderMode = false;
let dragIndex = null;
let gridResizeObserver = null;

function getVisibleFiles() {
  return files.filter((entry) => !entry.hidden);
}

function applyPageBackground() {
  document.body.style.background = activePalette[3];
  document.body.style.color = activePalette[0];
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

function setDevStatus(message) {
  if (els.devStatus) {
    els.devStatus.textContent = message;
  }
}

function setDeveloperMode(enabled) {
  isDeveloperMode = enabled;
  els.devPanel.hidden = !enabled;
  document.body.classList.toggle("developer-mode", enabled);

  if (!enabled) {
    setReorderMode(false);
    setDevStatus("Developer mode hidden. Press Shift+Option+D to show it again.");
    return;
  }

  setDevStatus("Drag or delete items, then copy the current manifest JSON.");
}

function setReorderMode(enabled) {
  isReorderMode = enabled;
  dragIndex = null;

  els.reorderToggleBtn.setAttribute("aria-pressed", String(enabled));
  els.reorderToggleBtn.textContent = enabled ? "Reorder On" : "Reorder Off";
  document.body.classList.toggle("reorder-mode", enabled);

  if (enabled && isLightboxOpen()) {
    closeLightbox();
  }

  buildGrid();
  if (!enabled) {
    setDevStatus("Reorder mode disabled. Delete, copy, or reset the manifest from developer mode.");
    return;
  }

  setDevStatus("Reorder mode enabled. Drag a photo tile onto another tile to move it.");
}

function toggleDeveloperMode() {
  setDeveloperMode(!isDeveloperMode);
}

function toggleReorderMode() {
  if (!isDeveloperMode) return;
  setReorderMode(!isReorderMode);
}

function moveFile(sourceIndex, targetIndex) {
  if (sourceIndex === targetIndex) return false;
  if (sourceIndex < 0 || sourceIndex >= files.length) return false;
  if (targetIndex < 0 || targetIndex > files.length) return false;

  const next = files.slice();
  const [moved] = next.splice(sourceIndex, 1);
  const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  next.splice(insertionIndex, 0, moved);
  files = next;
  const visibleFiles = getVisibleFiles();
  lbIndex = clamp(lbIndex, 0, Math.max(0, visibleFiles.length - 1));
  return true;
}

function getDropIndex(item, fallbackIndex, event) {
  const rect = item.getBoundingClientRect();
  const afterTarget = event.clientY > rect.top + rect.height / 2 || event.clientX > rect.left + rect.width / 2;
  return afterTarget ? fallbackIndex + 1 : fallbackIndex;
}

function clearDragState() {
  dragIndex = null;
  for (const element of els.grid.querySelectorAll(".dragging, .drop-target")) {
    element.classList.remove("dragging", "drop-target");
  }
}

function getManifestText() {
  return `${JSON.stringify(files, null, 2)}
`;
}

function flashButtonText(button, activeText, idleText) {
  if (!button) return;
  button.textContent = activeText;
  window.setTimeout(() => {
    button.textContent = idleText;
  }, 900);
}

async function copyManifestToClipboard() {
  const manifestText = getManifestText();
  try {
    await navigator.clipboard.writeText(manifestText);
    flashButtonText(els.copyManifestBtn, "Manifest Copied", "Copy manifest.json");
    setDevStatus(`Copied manifest.json with ${files.length} entries to the clipboard.`);
  } catch {
    prompt("Copy this manifest:", manifestText);
    setDevStatus("Clipboard access was blocked, so the manifest was opened in a prompt.");
  }
}

function resetManifest() {
  clearDragState();
  files = originalManifestFiles.slice();
  const visibleFiles = getVisibleFiles();
  lbIndex = clamp(lbIndex, 0, Math.max(0, visibleFiles.length - 1));

  if (isLightboxOpen()) {
    closeLightbox();
  }

  buildGrid();
  setDevStatus(`Restored ${files.length} entries from manifest.json.`);
}

function toggleFeatured(index) {
  if (index < 0 || index >= files.length) return null;

  const entry = files[index];
  files[index] = { ...entry, featured: !entry.featured };
  return files[index];
}

function toggleHidden(index) {
  if (index < 0 || index >= files.length) return null;

  const entry = files[index];
  const wasHidden = entry.hidden;
  files[index] = { ...entry, hidden: !wasHidden };
  return files[index];
}

function deleteFileAt(index) {
  return toggleHidden(index);
}

function getInitialDeveloperMode() {
  const url = new URL(location.href);
  return url.searchParams.get(DEV_MODE_QUERY_PARAM) === "1";
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

  // Handle legacy format: string[] -> new format: {file, hidden}[]
  if (Array.isArray(json) && json.every(x => typeof x === "string")) {
    const converted = json.map(f => ({ file: f, hidden: false, featured: false }));
    originalManifestFiles = converted.slice();
    files = converted.slice();
    return;
  }

  // Handle current format: {file, hidden, featured?}[]
  if (Array.isArray(json) && json.every(x => x && typeof x.file === "string" && typeof x.hidden === "boolean")) {
    const normalized = json.map((entry) => ({
      file: entry.file,
      hidden: entry.hidden,
      featured: typeof entry.featured === "boolean" ? entry.featured : false,
    }));
    originalManifestFiles = normalized.slice();
    files = normalized.slice();
    return;
  }
  throw new Error("manifest.json should be an array of strings (file paths) or objects with {file, hidden, featured?}.");
}

async function loadToneIndex(fileEntry) {
  // Handle both legacy string and new {file, hidden} format
  const file = typeof fileEntry === "string" ? fileEntry : fileEntry.file;
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
  // Render at the next integer scale, then CSS-fit to the cell.
  // This avoids large gaps when target width falls between integer multiples.
  const fudge = 2;
  const fitWidth = Math.max(entry.w, targetW - fudge);
  const intScale = Math.max(1, Math.ceil(fitWidth / entry.w));

  const bufW = entry.w * intScale;
  const bufH = entry.h * intScale;

  canvas.width = bufW;
  canvas.height = bufH;

  // 2) fractional CSS scale to fit cell width exactly
  const desired = Math.max(entry.w, targetW);
  const cssScale = desired / bufW;

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

function createGridItem(fileEntry, idx, isHidden) {
  const item = document.createElement("div");
  item.className = "item";
  item.setAttribute("data-file", fileEntry.file);
  item.setAttribute("data-idx", String(idx));
  item.setAttribute("data-hidden", String(isHidden));
  item.draggable = isReorderMode;
  item.classList.toggle("reorderable", isReorderMode);
  if (isHidden) item.classList.add("hidden-item");
  if (fileEntry.featured) item.classList.add("featured-item");

  const preview = document.createElement("button");
  preview.className = "itemPreview";
  preview.type = "button";
  preview.draggable = isReorderMode;
  preview.setAttribute("aria-label", isReorderMode ? `Reorder image ${idx + 1}` : `Open image ${idx + 1}`);

  const canvas = document.createElement("canvas");
  canvas.className = "gbcCanvas";

  preview.appendChild(canvas);
  item.appendChild(preview);

  if (isDeveloperMode) {
    const actions = document.createElement("div");
    actions.className = "itemActions";

    const actionBtn = document.createElement("button");
    actionBtn.className = "itemAction btn";
    actionBtn.type = "button";
    actionBtn.textContent = isHidden ? "↺" : "✖";
    actionBtn.title = isHidden ? "Restore" : "Hide";
    actionBtn.setAttribute("aria-label", isHidden ? `Restore image ${idx + 1}` : `Hide image ${idx + 1} from manifest`);
    actionBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const entry = toggleHidden(idx);
      if (!entry) return;

      buildGrid();
      setDevStatus(entry.hidden ? `Marked ${entry.file} as deleted.` : `Restored ${entry.file} to the manifest.`);
    });

    const featureBtn = document.createElement("button");
    featureBtn.className = "itemAction btn";
    featureBtn.type = "button";
    featureBtn.textContent = fileEntry.featured ? "❐" : "⛶";
    featureBtn.title = fileEntry.featured ? "Use normal size" : "Use full-group size";
    featureBtn.setAttribute("aria-label", fileEntry.featured
      ? `Use normal size for image ${idx + 1}`
      : `Use full-group size for image ${idx + 1}`);
    featureBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const entry = toggleFeatured(idx);
      if (!entry) return;

      buildGrid();
      setDevStatus(entry.featured
        ? `Expanded ${entry.file} to full-group size.`
        : `Returned ${entry.file} to normal size.`);
    });

    actions.appendChild(featureBtn);
    actions.appendChild(actionBtn);
    item.appendChild(actions);
  }

  preview.addEventListener("click", () => {
    if (isReorderMode || isHidden) return;
    openLightbox(idx);
  });

  item.addEventListener("dragstart", (event) => {
    if (!isReorderMode) return;
    dragIndex = idx;
    item.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(idx));
  });

  item.addEventListener("dragover", (event) => {
    if (!isReorderMode || dragIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    item.classList.add("drop-target");
  });

  item.addEventListener("dragleave", () => {
    item.classList.remove("drop-target");
  });

  item.addEventListener("drop", (event) => {
    if (!isReorderMode || dragIndex === null) return;
    event.preventDefault();
    item.classList.remove("drop-target");

    // If dragging a hidden item to visible section, unhide it
    if (files[dragIndex].hidden && !isHidden) {
      files[dragIndex].hidden = false;
    }
    // If dragging a visible item to hidden section, hide it
    if (!files[dragIndex].hidden && isHidden) {
      files[dragIndex].hidden = true;
    }

    const targetIndex = getDropIndex(item, idx, event);
    const changed = moveFile(dragIndex, targetIndex);
    clearDragState();

    if (!changed) return;

    setDevStatus(`Moved image ${dragIndex + 1} to position ${Math.max(1, Math.min(targetIndex, files.length))}.`);
    buildGrid();
  });

  item.addEventListener("dragend", clearDragState);

  // kick off load+render
  loadToneIndex(fileEntry).then((entry) => {
    const wrapW = Math.floor(item.clientWidth || preview.clientWidth);
    drawToCanvas(canvas, entry, wrapW);
  }).catch(console.error);

  return item;
}

function appendGroupedItems(container, entries, isHidden) {
  let pending = [];

  const flushPending = () => {
    if (!pending.length) return;

    const group = document.createElement("div");
    group.className = "galleryGroup";

    pending.forEach((fileEntry) => {
      const idx = files.indexOf(fileEntry);
      group.appendChild(createGridItem(fileEntry, idx, isHidden));
    });

    container.appendChild(group);
    pending = [];
  };

  for (const fileEntry of entries) {
    if (fileEntry.featured) {
      flushPending();

      const group = document.createElement("div");
      group.className = "galleryGroup featuredGroup";
      const idx = files.indexOf(fileEntry);
      group.appendChild(createGridItem(fileEntry, idx, isHidden));
      container.appendChild(group);
      continue;
    }

    pending.push(fileEntry);
    if (pending.length === 4) {
      flushPending();
    }
  }

  flushPending();
}

function buildGrid() {
  els.grid.innerHTML = "";

  const visibleItems = files.filter(f => !f.hidden);
  const hiddenItems = files.filter(f => f.hidden);

  if (!visibleItems.length && !hiddenItems.length) {
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.textContent = isDeveloperMode
      ? "No images in the working manifest. Use Reset manifest to restore the loaded file."
      : "No images available.";
    els.grid.appendChild(empty);
    return;
  }

  // Render visible items
  appendGroupedItems(els.grid, visibleItems, false);

  // Render deleted items section
  if (hiddenItems.length > 0 && isDeveloperMode) {
    const deletedHeading = document.createElement("div");
    deletedHeading.className = "recoveryHeading";
    deletedHeading.textContent = `Deleted Photos (${hiddenItems.length})`;
    els.grid.appendChild(deletedHeading);

    const recoverySection = document.createElement("div");
    recoverySection.className = "recoverySection";

    appendGroupedItems(recoverySection, hiddenItems, true);

    els.grid.appendChild(recoverySection);
  }
}

function renderAllGrid() {
  const items = els.grid.querySelectorAll(".item");
  for (const item of items) {
    const file = item.getAttribute("data-file");
    const canvas = item.querySelector("canvas");
    const preview = item.querySelector(".itemPreview");
    if (!file || !canvas) continue;

    const entry = cache.get(file);
    if (!entry) continue;

    const wrapW = Math.floor(item.clientWidth || (preview && preview.clientWidth));
    drawToCanvas(canvas, entry, wrapW);
  }
}

// ---- Lightbox ----

function isLightboxOpen() {
  return els.lightbox.classList.contains("open");
}

function openLightbox(idx) {
  const visibleFiles = getVisibleFiles();
  if (!visibleFiles.length) return;

  const selected = files[idx];
  if (!selected || selected.hidden) return;

  const visibleIndex = visibleFiles.findIndex((entry) => entry.file === selected.file);
  if (visibleIndex < 0) return;

  lbIndex = clamp(visibleIndex, 0, visibleFiles.length - 1);
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
  const visibleFiles = getVisibleFiles();
  if (!visibleFiles.length) return;
  lbIndex = (lbIndex - 1 + visibleFiles.length) % visibleFiles.length;
  renderLightbox();
}

function nextLightbox() {
  const visibleFiles = getVisibleFiles();
  if (!visibleFiles.length) return;
  lbIndex = (lbIndex + 1) % visibleFiles.length;
  renderLightbox();
}

function renderLightbox() {
  const visibleFiles = getVisibleFiles();
  if (!visibleFiles.length) {
    closeLightbox();
    return;
  }

  lbIndex = clamp(lbIndex, 0, visibleFiles.length - 1);
  const fileEntry = visibleFiles[lbIndex];
  const file = fileEntry.file;
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
  els.reorderToggleBtn.addEventListener("click", toggleReorderMode);
  els.copyManifestBtn.addEventListener("click", copyManifestToClipboard);
  els.resetManifestBtn.addEventListener("click", resetManifest);

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
    if (e.shiftKey && e.altKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      toggleDeveloperMode();
      return;
    }

    if (!isLightboxOpen()) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") prevLightbox();
    if (e.key === "ArrowRight") nextLightbox();
  });

  window.addEventListener("resize", () => {
    renderAllGrid();
    if (isLightboxOpen()) renderLightbox();
  });

  if (typeof ResizeObserver !== "undefined" && !gridResizeObserver) {
    gridResizeObserver = new ResizeObserver(() => {
      renderAllGrid();
      if (isLightboxOpen()) renderLightbox();
    });
    gridResizeObserver.observe(els.grid);
  }
}

// ---- Init ----

async function main() {
  setDeveloperMode(getInitialDeveloperMode());
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
