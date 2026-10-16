/**
 * api.js — Local data layer (localStorage-backed)
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  ⚠️  SWAP THIS FILE'S INTERNALS FOR THE APPS SCRIPT VERSION        │
 * │     WHEN A CLIENT GOES LIVE.                                        │
 * │                                                                     │
 * │  The exported signatures stay the same:                             │
 * │    fetchRows()              → Promise<Array<Object>>                │
 * │    saveRow(bedId, updates)  → Promise<Object>                       │
 * │    resetDemoData()          → Array<Object>                         │
 * │                                                                     │
 * │  Replace each function body to call the Apps Script web app         │
 * │  (see apps-script/Code.gs) instead of localStorage.                 │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Functions are async to match the Apps Script version's interface,
 * even though localStorage is synchronous.
 */

import { buildSeedData } from './seed.js';

const STORAGE_KEY    = 'pg_dashboard_beds';
const SCHEMA_VERSION = 4;

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Load beds from localStorage. Returns null if missing or version mismatch. */
function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== SCHEMA_VERSION) return null;
    return parsed.beds;
  } catch {
    return null;
  }
}

/** Persist beds array to localStorage with schema version tag. */
function saveStore(beds) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: SCHEMA_VERSION, beds })
  );
}

/** Auto-seed on first load or after a schema version bump. */
function initIfNeeded() {
  if (!loadStore()) {
    resetDemoData();
  }
}

// ─── Exported API ────────────────────────────────────────────────────────────

/**
 * Fetch all bed rows.
 * @returns {Promise<Array<Object>>}
 */
export async function fetchRows() {
  initIfNeeded();
  return loadStore();
}

/**
 * Update one bed row by BedID. Merges `updates` into the existing row.
 * @param {string} bedId   - e.g. "101-A"
 * @param {Object} updates - column→value pairs, e.g. { Status: 'vacant' }
 * @returns {Promise<Object>} The updated row
 */
export async function saveRow(bedId, updates) {
  initIfNeeded();
  const beds = loadStore();
  const idx  = beds.findIndex(b => b.BedID === bedId);
  if (idx === -1) throw new Error('BedID not found: ' + bedId);

  Object.assign(beds[idx], updates);
  saveStore(beds);
  return beds[idx];
}

/**
 * Wipe all data and re-seed from scratch. Restores the demo defaults.
 * @returns {Array<Object>} The freshly seeded data
 */
export function resetDemoData() {
  const beds = buildSeedData();
  saveStore(beds);
  return beds;
}
