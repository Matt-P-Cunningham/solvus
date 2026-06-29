/**
 * FertiCalc Storage Layer
 *
 * Detects environment and uses the right persistence mechanism:
 * - Electron desktop: IPC to main process → writes JSON to userData folder
 * - Web browser: localStorage
 * - SSR / test: in-memory fallback
 */

const IS_ELECTRON = typeof window !== 'undefined' && window.electronAPI != null;
const STORAGE_KEY = 'ferticalc_data';

// ─── Schema ───────────────────────────────────────────────────
// { recipes: { [name]: { targets, options, date } }, products: [...customProducts] }

function getDefault() {
  return { recipes: {}, products: [] };
}

// ─── localStorage helpers ─────────────────────────────────────
function lsRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefault();
  } catch { return getDefault(); }
}

function lsWrite(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
  catch { return false; }
}

// ─── Public API ───────────────────────────────────────────────
export async function loadAll() {
  if (IS_ELECTRON) {
    try {
      const data = await window.electronAPI.loadData();
      return data || getDefault();
    } catch { return getDefault(); }
  }
  return lsRead();
}

export async function saveAll(data) {
  if (IS_ELECTRON) {
    try { await window.electronAPI.saveData(data); return true; }
    catch { return false; }
  }
  return lsWrite(data);
}

export async function saveRecipe(name, recipe) {
  const data = await loadAll();
  data.recipes[name] = { ...recipe, date: new Date().toLocaleDateString() };
  return saveAll(data);
}

export async function deleteRecipe(name) {
  const data = await loadAll();
  delete data.recipes[name];
  return saveAll(data);
}

export async function saveProducts(products) {
  const data = await loadAll();
  data.products = products;
  return saveAll(data);
}

export async function loadRecipes() {
  const data = await loadAll();
  return data.recipes || {};
}

export async function loadProducts() {
  const data = await loadAll();
  return data.products || [];
}
