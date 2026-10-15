/**
 * app.js — Beautiful Modern UI/UX Redesign
 *
 * Designed with 15+ years of product design principles:
 * - Tabular typography with Plus Jakarta Sans & tabular-nums for financial metrics
 * - Tactile physical keycard feel for bed tiles with occupancy & sharing badges
 * - Occupancy percentage visual progress meter on summary card
 * - Pulsing emergency status banner for overdue collections
 * - Modern avatar chips for tenants with 1-tap call touch targets
 * - Elevated frosted-glass bottom navigation dock with active pill indicator
 * - Polished bottom sheet modal with mobile drag pill
 * - Full backward compatibility with existing data layer and state management
 */

import { PG_NAME } from './config.js';
import { fetchRows, saveRow, resetDemoData } from './api.js';
import {
  isOverdue,
  isDueSoon,
  formatINR,
  floorLabel,
  getDueRelativeText,
  getTodayStr,
  addDaysToToday,
  addOneCalendarMonth,
  subtractOneCalendarMonth,
} from './helpers.js';

// ─── State ───────────────────────────────────────────────────────────────────

let allBeds = [];
let currentTab = 'beds';
let tenantSearchQuery = '';
let currentRentFilter = 'all';
let isVacantOnly = false; // In-memory only filter for Beds tab

// In-flight operation lock per bed to prevent double-taps
const inFlightBeds = new Set();

// Active toast timer
let toastTimer = null;

// Currently selected bed in bottom sheet
let activeSheetBedId = null;

// ─── DOM Elements ────────────────────────────────────────────────────────────

const $loading = document.getElementById('loading');
const $dashboard = document.getElementById('dashboard');
const $updatedAt = document.getElementById('updatedAt');
const $pgTitle = document.getElementById('pgTitle');

// Header menu
const $menuBtn = document.getElementById('menuBtn');
const $menuDropdown = document.getElementById('menuDropdown');
const $menuResetBtn = document.getElementById('menuResetBtn');

// Beds view
const $viewBeds = document.getElementById('viewBeds');
const $summaryCards = document.getElementById('summaryCards');
const $overdueBar = document.getElementById('overdueBar');
const $legend = document.getElementById('legend');
const $vacantFilterChip = document.getElementById('vacantFilterChip');
const $vacantCountBadge = document.getElementById('vacantCountBadge');
const $bedGrid = document.getElementById('bedGrid');

// Tenants view
const $viewTenants = document.getElementById('viewTenants');
const $tenantSearch = document.getElementById('tenantSearch');
const $tenantSearchClear = document.getElementById('tenantSearchClear');
const $tenantCount = document.getElementById('tenantCount');
const $tenantList = document.getElementById('tenantList');

// Rent view
const $viewRent = document.getElementById('viewRent');
const $rentFilterBtns = document.querySelectorAll('.rent-filter-btn');
const $rentFilterSummary = document.getElementById('rentFilterSummary');
const $rentList = document.getElementById('rentList');

// Bottom Nav
const $tabBtns = document.querySelectorAll('.tab-nav-btn');

// Bed Detail Sheet
const $bedSheetBackdrop = document.getElementById('bedSheetBackdrop');
const $bedSheetModal = document.getElementById('bedSheetModal');
const $sheetBedId = document.getElementById('sheetBedId');
const $sheetRoomSub = document.getElementById('sheetRoomSub');
const $sheetStatusBadge = document.getElementById('sheetStatusBadge');
const $sheetCloseBtn = document.getElementById('sheetCloseBtn');
const $sheetContent = document.getElementById('sheetContent');
const $sheetActions = document.getElementById('sheetActions');

// Toast
const $toastContainer = document.getElementById('toastContainer');
const $toastIcon = document.getElementById('toastIcon');
const $toastMessage = document.getElementById('toastMessage');
const $toastActionBtn = document.getElementById('toastActionBtn');
const $toastCloseBtn = document.getElementById('toastCloseBtn');

// ─── Toast System ────────────────────────────────────────────────────────────

function showToast(message, options = {}, durationMs = 6000) {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  $toastMessage.textContent = message;

  if (options.isError) {
    $toastIcon.textContent = '⚠';
    $toastIcon.className = 'text-rose-400 text-base flex-shrink-0';
  } else {
    $toastIcon.textContent = '✓';
    $toastIcon.className = 'text-emerald-400 text-base flex-shrink-0';
  }

  if (options.actionLabel && typeof options.onAction === 'function') {
    $toastActionBtn.textContent = options.actionLabel;
    $toastActionBtn.classList.remove('hidden');
    $toastActionBtn.onclick = () => {
      hideToast();
      options.onAction();
    };
  } else {
    $toastActionBtn.classList.add('hidden');
    $toastActionBtn.onclick = null;
  }

  $toastContainer.classList.remove('hidden');
  requestAnimationFrame(() => {
    $toastContainer.classList.remove('translate-y-8', 'opacity-0');
    $toastContainer.classList.add('translate-y-0', 'opacity-100');
  });

  toastTimer = setTimeout(() => {
    hideToast();
  }, durationMs);
}

function hideToast() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  $toastContainer.classList.remove('translate-y-0', 'opacity-100');
  $toastContainer.classList.add('translate-y-8', 'opacity-0');
  setTimeout(() => {
    $toastContainer.classList.add('hidden');
  }, 300);
}

$toastCloseBtn.addEventListener('click', hideToast);

// ─── Single applyChange Pipeline ─────────────────────────────────────────────

export async function applyChange(bedId, updates, label) {
  if (inFlightBeds.has(bedId)) return;
  inFlightBeds.add(bedId);

  const idx = allBeds.findIndex(b => b.BedID === bedId);
  if (idx === -1) {
    inFlightBeds.delete(bedId);
    return;
  }

  // 1. Snapshot the old row
  const oldRowSnapshot = { ...allBeds[idx] };

  // 2. Optimistic in-memory update & instant UI re-render
  allBeds[idx] = { ...allBeds[idx], ...updates };
  renderAllViews();

  if (activeSheetBedId === bedId) {
    renderBedSheet(allBeds[idx]);
  }

  try {
    // 3. Background save
    const savedRow = await saveRow(bedId, updates);

    // 4. On success: replace row with returned row
    allBeds[idx] = savedRow;

    // Toast with Undo (6 seconds)
    showToast(label, {
      actionLabel: 'Undo',
      onAction: () => {
        applyChange(bedId, oldRowSnapshot, `Restored ${bedId}`);
      },
    }, 6000);
  } catch (err) {
    // 5. On failure: restore snapshot, re-render, error toast with Retry
    allBeds[idx] = oldRowSnapshot;
    renderAllViews();
    if (activeSheetBedId === bedId) {
      renderBedSheet(allBeds[idx]);
    }

    showToast(`Failed: ${err.message}`, {
      isError: true,
      actionLabel: 'Retry',
      onAction: () => {
        applyChange(bedId, updates, label);
      },
    }, 6000);
  } finally {
    inFlightBeds.delete(bedId);
    renderRent();
  }
}

// ─── Tab Navigation & URL Hash ───────────────────────────────────────────────

function switchTab(tabId, updateHash = true) {
  const validTabs = ['beds', 'tenants', 'rent'];
  if (!validTabs.includes(tabId)) tabId = 'beds';
  currentTab = tabId;

  if (updateHash && window.location.hash !== `#${tabId}`) {
    window.location.hash = tabId;
  }

  $viewBeds.classList.toggle('hidden', tabId !== 'beds');
  $viewTenants.classList.toggle('hidden', tabId !== 'tenants');
  $viewRent.classList.toggle('hidden', tabId !== 'rent');

  $tabBtns.forEach(btn => {
    const isTarget = btn.dataset.tab === tabId;
    const iconWrap = btn.querySelector('div');
    if (isTarget) {
      btn.className = 'tab-nav-btn flex-1 flex flex-col items-center justify-center h-full min-h-[48px] text-blue-600 font-bold transition-all';
      if (iconWrap) iconWrap.className = 'flex flex-col items-center justify-center py-1 px-3 rounded-2xl bg-blue-50 text-blue-600 font-bold transition-all';
    } else {
      btn.className = 'tab-nav-btn flex-1 flex flex-col items-center justify-center h-full min-h-[48px] text-slate-400 hover:text-slate-600 font-semibold transition-all';
      if (iconWrap) iconWrap.className = 'flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all';
    }
  });

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  switchTab(hash || 'beds', false);
}

// ─── TAB 1: BEDS (Summary, Vacant Filter, & Grid) ─────────────────────────────

function computeSummary(beds) {
  let filled = 0, vacant = 0, collected = 0, pending = 0, overdueCount = 0;

  for (const b of beds) {
    if (b.Status === 'occupied') {
      filled++;
      const rent = Number(b.RentAmount) || 0;
      if (b.PaymentStatus === 'paid') {
        collected += rent;
      } else if (b.PaymentStatus === 'due') {
        pending += rent;
        if (isOverdue(b)) overdueCount++;
      }
    } else {
      vacant++;
    }
  }

  return { filled, vacant, total: beds.length, collected, pending, overdueCount };
}

function renderSummaryCards(s) {
  const occPct = s.total > 0 ? Math.round((s.filled / s.total) * 100) : 0;

  $summaryCards.innerHTML = `
    <!-- Beds filled with Progress Bar -->
    <div class="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupancy</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-100">${occPct}%</span>
        </div>
        <p class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
          ${s.filled}<span class="text-sm sm:text-base font-semibold text-slate-400">/${s.total}</span>
        </p>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${occPct}%"></div>
      </div>
    </div>

    <!-- Vacant Beds -->
    <div class="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vacant</span>
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <p class="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight tabular-nums">
          ${s.vacant}
        </p>
      </div>
      <p class="text-[11px] font-semibold text-slate-400 mt-3 truncate flex items-center gap-1">
        <span>✨</span> Ready to assign
      </p>
    </div>

    <!-- Rent Collected -->
    <div class="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected</span>
        <span class="w-5 h-5 rounded-md font-bold bg-blue-50 text-blue-600 flex items-center justify-center text-xs">₹</span>
      </div>
      <p class="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums truncate">
        ${formatINR(s.collected)}
      </p>
      <p class="text-[11px] font-semibold text-emerald-600 mt-2 flex items-center gap-1 truncate">
        <span>✓</span> Received
      </p>
    </div>

    <!-- Rent Pending -->
    <div class="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</span>
        <span class="w-5 h-5 rounded-md font-bold bg-amber-50 text-amber-700 flex items-center justify-center text-xs">⏳</span>
      </div>
      <p class="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums truncate">
        ${formatINR(s.pending)}
      </p>
      <p class="text-[11px] font-semibold text-amber-600 mt-2 flex items-center gap-1 truncate">
        <span>•</span> To collect
      </p>
    </div>
  `;
}

function renderOverdueBar(count) {
  if (count > 0) {
    $overdueBar.className = 'rounded-2xl p-3.5 sm:p-4 mb-4 bg-gradient-to-r from-rose-50/90 via-red-50 to-rose-50 border border-rose-200 cursor-pointer transition-all hover:shadow-md active:scale-[0.99] flex items-center justify-between shadow-xs';
    $overdueBar.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="relative flex h-3 w-3 flex-shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>
        <div>
          <p class="text-xs sm:text-sm font-extrabold text-rose-950 leading-tight">
            ${count} Overdue Payment${count === 1 ? '' : 's'}
          </p>
          <p class="text-[11px] text-rose-700 font-medium mt-0.5">Immediate attention required • Tap to resolve</p>
        </div>
      </div>
      <span class="text-xs font-bold text-rose-700 bg-white/90 px-3 py-1.5 rounded-xl border border-rose-200/80 shadow-xs flex items-center gap-1 flex-shrink-0">
        Review →
      </span>
    `;
  } else {
    $overdueBar.className = 'rounded-2xl p-3.5 mb-4 bg-white/70 border border-slate-200/80 shadow-xs flex items-center justify-between';
    $overdueBar.innerHTML = `
      <div class="flex items-center gap-2 text-slate-400">
        <span class="text-emerald-500 font-bold">✓</span>
        <p class="text-xs font-semibold">All rent collections are up to date</p>
      </div>
    `;
  }
}

function renderLegend() {
  const items = [
    ['bg-emerald-500', 'Vacant'],
    ['bg-blue-500',    'Paid'],
    ['bg-amber-500',   'Due Soon'],
    ['bg-rose-500',    'Overdue'],
  ];

  $legend.innerHTML = `
    <div class="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] text-slate-600 px-1">
      ${items.map(([dotColor, label]) => `
        <span class="flex items-center gap-1.5 font-semibold">
          <span class="w-2 h-2 rounded-full ${dotColor}"></span>${label}
        </span>
      `).join('')}
    </div>
  `;
}

function groupByFloorAndRoom(beds) {
  const sorted = [...beds].sort((a, b) => {
    if (a.Floor !== b.Floor) return a.Floor - b.Floor;
    if (a.Room !== b.Room)   return a.Room.localeCompare(b.Room);
    return a.Bed.localeCompare(b.Bed);
  });

  const floors = new Map();
  for (const bed of sorted) {
    if (!floors.has(bed.Floor)) floors.set(bed.Floor, new Map());
    const rooms = floors.get(bed.Floor);
    if (!rooms.has(bed.Room)) rooms.set(bed.Room, []);
    rooms.get(bed.Room).push(bed);
  }
  return floors;
}

function tileClasses(bed) {
  if (bed.Status === 'vacant') {
    return 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950 hover:bg-emerald-100/60 hover:border-emerald-300 ring-emerald-500/10';
  }
  if (isOverdue(bed)) {
    return 'bg-rose-50/80 border-rose-200/90 text-rose-950 hover:bg-rose-100/70 hover:border-rose-300 ring-rose-500/10';
  }
  if (isDueSoon(bed)) {
    return 'bg-amber-50/80 border-amber-200/90 text-amber-950 hover:bg-amber-100/70 hover:border-amber-300 ring-amber-500/10';
  }
  return 'bg-blue-50/70 border-blue-200/90 text-blue-950 hover:bg-blue-100/60 hover:border-blue-300 ring-blue-500/10';
}

function getDotColor(bed) {
  if (bed.Status === 'vacant') return 'bg-emerald-500';
  if (isOverdue(bed)) return 'bg-rose-500';
  if (isDueSoon(bed)) return 'bg-amber-500';
  return 'bg-blue-500';
}

function renderBedGrid(beds) {
  const displayedBeds = isVacantOnly
    ? beds.filter(b => b.Status === 'vacant')
    : beds;

  const vacantCount = beds.filter(b => b.Status === 'vacant').length;

  if (isVacantOnly) {
    $vacantFilterChip.className = 'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 bg-emerald-600 text-white border-emerald-600 shadow-sm min-h-[36px] active:scale-95';
    $vacantCountBadge.textContent = `${vacantCount} vacant beds`;
    $vacantCountBadge.classList.remove('hidden');
  } else {
    $vacantFilterChip.className = 'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 min-h-[36px] shadow-xs active:scale-95';
    $vacantCountBadge.classList.add('hidden');
  }

  if (displayedBeds.length === 0) {
    $bedGrid.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500 shadow-sm">
        <p class="text-base font-bold text-slate-700 mb-1">No vacant beds</p>
        <p class="text-xs text-slate-400">All beds in the PG are currently occupied.</p>
      </div>
    `;
    return;
  }

  const floors = groupByFloorAndRoom(displayedBeds);
  let html = '';

  for (const [floorNum, rooms] of floors) {
    // Count beds on this floor
    const floorBedsTotal = [...rooms.values()].reduce((sum, list) => sum + list.length, 0);

    html += `
      <div class="mb-5">
        <div class="flex items-center justify-between mb-2.5 px-1">
          <h2 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            ${floorLabel(floorNum)} Floor
          </h2>
          <span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            ${floorBedsTotal} ${isVacantOnly ? 'Vacant' : ''} Bed${floorBedsTotal === 1 ? '' : 's'}
          </span>
        </div>
    `;

    for (const [roomName, roomBeds] of rooms) {
      const roomRent = roomBeds[0]?.RentAmount ? formatINR(roomBeds[0].RentAmount) : '';

      html += `
        <div class="bg-white rounded-2xl border border-slate-200/80 p-3.5 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300/80 transition-all">
          <div class="flex items-center justify-between mb-2.5 px-0.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-extrabold text-slate-800 tracking-tight">Room ${roomName}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                ${roomBeds.length}-Sharing
              </span>
            </div>
            ${roomRent ? `
              <span class="text-[11px] font-bold text-slate-400 tabular-nums">
                ${roomRent}<span class="font-normal text-[10px]">/bed</span>
              </span>
            ` : ''}
          </div>
          <div class="flex flex-wrap gap-2.5">
      `;

      for (const bed of roomBeds) {
        const colors  = tileClasses(bed);
        const overdue = isOverdue(bed);
        const dotColor = getDotColor(bed);

        const nameHtml = bed.TenantName
          ? `<p class="text-xs leading-tight mt-1 truncate font-bold text-slate-900">${bed.TenantName}</p>`
          : '<p class="text-xs leading-tight mt-1 font-bold text-emerald-700 flex items-center gap-0.5"><span>+</span> Vacant</p>';

        html += `
          <button
            type="button"
            data-bed-id="${bed.BedID}"
            class="bed-tile-btn group relative rounded-2xl border-2 p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-95 shadow-xs flex-1 min-w-[95px] max-w-[150px] ${colors}"
          >
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-extrabold tracking-tight font-mono">${bed.BedID}</span>
              <span class="w-2 h-2 rounded-full ${dotColor} flex-shrink-0"></span>
            </div>
            ${nameHtml}
            ${overdue ? `
              <span class="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                OVERDUE
              </span>
            ` : ''}
          </button>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `</div>`;
  }

  $bedGrid.innerHTML = html;

  document.querySelectorAll('.bed-tile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openBedSheet(btn.dataset.bedId);
    });
  });
}

// ─── TAB 2: TENANTS (Search & Contact List) ──────────────────────────────────

function getPaymentBadgeHtml(bed) {
  if (isOverdue(bed)) {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200/80">Overdue</span>`;
  }
  if (isDueSoon(bed)) {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200/80">Due Soon</span>`;
  }
  if (bed.PaymentStatus === 'paid') {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80">Paid</span>`;
  }
  return `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200/80">Due</span>`;
}

function renderTenants() {
  const query = tenantSearchQuery.trim().toLowerCase();
  const rawDigits = query.replace(/\D/g, '');

  const occupied = allBeds.filter(b => b.Status === 'occupied' && b.TenantName);

  const filtered = occupied.filter(b => {
    if (!query) return true;
    const nameMatch  = b.TenantName.toLowerCase().includes(query);
    const roomMatch  = String(b.Room).toLowerCase().includes(query);
    const bedMatch   = b.BedID.toLowerCase().includes(query);
    const phoneClean = (b.Phone || '').replace(/\D/g, '');
    const phoneMatch = rawDigits && phoneClean.includes(rawDigits);
    return nameMatch || roomMatch || bedMatch || phoneMatch;
  });

  filtered.sort((a, b) => a.TenantName.localeCompare(b.TenantName));

  const totalOccupied = occupied.length;
  if (!query) {
    $tenantCount.textContent = `${totalOccupied} TENANT${totalOccupied === 1 ? '' : 'S'}`;
  } else {
    $tenantCount.textContent = `${filtered.length} OF ${totalOccupied} TENANTS MATCHING`;
  }

  if (filtered.length === 0) {
    $tenantList.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500 shadow-sm">
        <p class="text-base font-bold text-slate-700 mb-1">No tenants found</p>
        <p class="text-xs text-slate-400">Try a different name, room, bed, or phone number</p>
      </div>
    `;
    return;
  }

  $tenantList.innerHTML = filtered.map(b => {
    const cleanPhone = (b.Phone || '').replace(/\s+/g, '');
    const badge = getPaymentBadgeHtml(b);
    const initial = (b.TenantName || '?').charAt(0).toUpperCase();

    return `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
            ${initial}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 class="text-sm font-bold text-slate-900 truncate">${b.TenantName}</h3>
              <button
                type="button"
                data-bed-id="${b.BedID}"
                class="tenant-bed-pill text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
              >
                ${b.BedID}
              </button>
              ${badge}
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span>Room ${b.Room} (${floorLabel(b.Floor)})</span>
              <span>•</span>
              <span class="font-bold text-slate-800 tabular-nums">${formatINR(b.RentAmount)}/mo</span>
            </div>
          </div>
        </div>

        ${cleanPhone ? `
          <a
            href="tel:${cleanPhone}"
            aria-label="Call ${b.TenantName}"
            class="flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-95 transition-all flex-shrink-0 border border-blue-100 shadow-xs"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
          </a>
        ` : ''}
      </div>
    `;
  }).join('');

  document.querySelectorAll('.tenant-bed-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      openBedSheet(btn.dataset.bedId);
    });
  });
}

// ─── TAB 3: RENT (Prioritized Collection List) ────────────────────────────────

function getSortedAndFilteredRent() {
  const occupied = allBeds.filter(b => b.Status === 'occupied');

  const overdueBeds = [];
  const dueSoonBeds = [];
  const otherBeds   = [];

  for (const b of occupied) {
    if (isOverdue(b)) {
      overdueBeds.push(b);
    } else if (isDueSoon(b)) {
      dueSoonBeds.push(b);
    } else {
      otherBeds.push(b);
    }
  }

  overdueBeds.sort((a, b) => (a.DueDate || '').localeCompare(b.DueDate || ''));
  dueSoonBeds.sort((a, b) => (a.DueDate || '').localeCompare(b.DueDate || ''));
  otherBeds.sort((a, b) => (a.DueDate || '').localeCompare(b.DueDate || ''));

  const prioritizedAll = [...overdueBeds, ...dueSoonBeds, ...otherBeds];

  let result = [];
  if (currentRentFilter === 'overdue') {
    result = overdueBeds;
  } else if (currentRentFilter === 'due_soon') {
    result = dueSoonBeds;
  } else if (currentRentFilter === 'paid') {
    result = occupied.filter(b => b.PaymentStatus === 'paid');
    result.sort((a, b) => (a.DueDate || '').localeCompare(b.DueDate || ''));
  } else {
    result = prioritizedAll;
  }

  return { result };
}

function renderRent() {
  $rentFilterBtns.forEach(btn => {
    const active = btn.dataset.filter === currentRentFilter;
    if (active) {
      btn.className = 'rent-filter-btn px-4 py-2 rounded-xl text-xs font-bold border min-h-[44px] transition-all whitespace-nowrap bg-blue-600 text-white border-blue-600 shadow-xs';
    } else {
      btn.className = 'rent-filter-btn px-4 py-2 rounded-xl text-xs font-semibold border min-h-[44px] transition-all whitespace-nowrap bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
    }
  });

  const { result } = getSortedAndFilteredRent();
  const totalAmount = result.reduce((sum, b) => sum + (Number(b.RentAmount) || 0), 0);
  const filterLabels = {
    all: 'Total Collections',
    overdue: 'Overdue Rent',
    due_soon: 'Due Soon',
    paid: 'Paid Rent',
  };
  const label = filterLabels[currentRentFilter] || 'Total';
  $rentFilterSummary.innerHTML = `
    <span class="text-xs font-bold text-slate-800">${label}:</span>
    <span class="text-xs font-extrabold text-blue-600 tabular-nums ml-1">${result.length} beds (${formatINR(totalAmount)})</span>
  `;

  if (result.length === 0) {
    $rentList.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500 shadow-sm">
        <p class="text-base font-bold text-slate-700 mb-1">No rent records</p>
        <p class="text-xs text-slate-400">There are no beds matching the "${label}" filter</p>
      </div>
    `;
    return;
  }

  $rentList.innerHTML = result.map(b => {
    const overdue = isOverdue(b);
    const dueSoon = isDueSoon(b);
    const badge   = getPaymentBadgeHtml(b);
    const relNote = getDueRelativeText(b);
    const isDueOrOverdue = b.PaymentStatus === 'due';
    const isPendingSave = inFlightBeds.has(b.BedID);
    const initial = (b.TenantName || '?').charAt(0).toUpperCase();

    let rowBorder = 'border-slate-200/80';
    let relNoteColor = 'text-slate-500';
    let avatarBg = 'bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700';

    if (overdue) {
      rowBorder = 'border-rose-200 bg-rose-50/20';
      relNoteColor = 'text-rose-600 font-bold';
      avatarBg = 'bg-rose-100 text-rose-700';
    } else if (dueSoon) {
      rowBorder = 'border-amber-200 bg-amber-50/20';
      relNoteColor = 'text-amber-700 font-bold';
      avatarBg = 'bg-amber-100 text-amber-800';
    }

    return `
      <div class="bg-white rounded-2xl border ${rowBorder} p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-xl ${avatarBg} font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
            ${initial}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 class="text-sm font-bold text-slate-900 truncate">${b.TenantName || '—'}</h3>
              <button
                type="button"
                data-bed-id="${b.BedID}"
                class="rent-bed-pill text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
              >
                ${b.BedID}
              </button>
              ${badge}
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span>Due ${b.DueDate || '—'}</span>
              ${relNote ? `<span class="${relNoteColor}">(${relNote})</span>` : ''}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2.5 flex-shrink-0">
          <div class="text-right">
            <p class="text-sm font-extrabold text-slate-900 tabular-nums">${formatINR(b.RentAmount)}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Room ${b.Room}</p>
          </div>

          ${isDueOrOverdue ? `
            <button
              type="button"
              data-bed-id="${b.BedID}"
              ${isPendingSave ? 'disabled' : ''}
              class="rent-mark-paid-btn px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold min-h-[44px] transition-all ml-1 shadow-xs active:scale-95 flex items-center gap-1"
            >
              <span>✓</span> ${isPendingSave ? 'Saving…' : 'Paid'}
            </button>
          ` : `
            <button
              type="button"
              data-bed-id="${b.BedID}"
              ${isPendingSave ? 'disabled' : ''}
              class="rent-mark-unpaid-btn px-2.5 py-2 bg-white hover:bg-amber-50 active:bg-amber-100 text-amber-800 border border-amber-300 disabled:opacity-50 rounded-xl text-xs font-bold min-h-[44px] transition-all ml-1 shadow-xs active:scale-95 flex items-center gap-1"
            >
              <span>↩</span> ${isPendingSave ? 'Saving…' : 'Unpaid'}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.rent-mark-paid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bedId = btn.dataset.bedId;
      const bed = allBeds.find(b => b.BedID === bedId);
      if (!bed) return;

      const updates = {
        PaymentStatus: 'paid',
        LastPaidDate: getTodayStr(),
        DueDate: addOneCalendarMonth(bed.DueDate),
      };
      applyChange(bedId, updates, `Marked rent paid for ${bed.TenantName || bedId}`);
    });
  });

  document.querySelectorAll('.rent-mark-unpaid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bedId = btn.dataset.bedId;
      const bed = allBeds.find(b => b.BedID === bedId);
      if (!bed) return;

      const updates = {
        PaymentStatus: 'due',
        DueDate: subtractOneCalendarMonth(bed.DueDate),
        LastPaidDate: '',
      };
      applyChange(bedId, updates, `Marked rent unpaid for ${bed.TenantName || bedId}`);
    });
  });

  document.querySelectorAll('.rent-bed-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      openBedSheet(btn.dataset.bedId);
    });
  });
}

// ─── BED DETAIL SHEET / MODAL ────────────────────────────────────────────────

function openBedSheet(bedId) {
  const bed = allBeds.find(b => b.BedID === bedId);
  if (!bed) return;

  activeSheetBedId = bedId;
  renderBedSheet(bed);

  $bedSheetBackdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderBedSheet(bed) {
  $sheetBedId.textContent = bed.BedID;
  if ($sheetRoomSub) {
    $sheetRoomSub.textContent = `Room ${bed.Room} • ${floorLabel(bed.Floor)} Floor`;
  }

  const isOcc = bed.Status === 'occupied';
  const overdue = isOverdue(bed);
  const dueSoon = isDueSoon(bed);

  let badgeHtml = '';
  if (!isOcc) {
    badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Vacant</span>`;
  } else if (overdue) {
    badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Overdue</span>`;
  } else if (dueSoon) {
    badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">Due Soon</span>`;
  } else if (bed.PaymentStatus === 'paid') {
    badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Paid</span>`;
  } else {
    badgeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Due</span>`;
  }
  $sheetStatusBadge.innerHTML = badgeHtml;

  const cleanPhone = (bed.Phone || '').replace(/\s+/g, '');
  const relNote = getDueRelativeText(bed);

  let contentHtml = '';

  if (isOcc) {
    const initial = (bed.TenantName || '?').charAt(0).toUpperCase();

    contentHtml = `
      <!-- Tenant Hero Card -->
      <div class="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 border border-slate-200/80 mb-3 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
            ${initial}
          </div>
          <div>
            <h3 class="text-base font-extrabold text-slate-900 leading-tight">${bed.TenantName || '—'}</h3>
            <p class="text-xs font-semibold text-slate-500 mt-0.5">Assigned to Bed ${bed.BedID}</p>
          </div>
        </div>
        ${cleanPhone ? `
          <a
            href="tel:${cleanPhone}"
            aria-label="Call ${bed.TenantName}"
            class="flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
          </a>
        ` : ''}
      </div>

      <!-- Financial & Booking Details -->
      <div class="bg-slate-50/80 rounded-2xl p-4 text-xs space-y-3 border border-slate-200/80">
        <div class="flex justify-between items-center">
          <span class="text-slate-400 font-semibold">Monthly Rent</span>
          <span class="font-extrabold text-slate-900 text-sm tabular-nums">${formatINR(bed.RentAmount)}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400 font-semibold">Phone</span>
          ${cleanPhone ? `
            <a href="tel:${cleanPhone}" class="font-bold text-blue-600 hover:underline flex items-center gap-1">
              ${bed.Phone}
            </a>
          ` : '<span class="text-slate-400 font-medium">—</span>'}
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400 font-semibold">Due Date</span>
          <span class="font-bold text-slate-800">
            ${bed.DueDate || '—'}
            ${relNote ? `<span class="ml-1 text-[11px] font-extrabold ${overdue ? 'text-rose-600' : 'text-amber-700'}">(${relNote})</span>` : ''}
          </span>
        </div>
        ${bed.LastPaidDate ? `
          <div class="flex justify-between items-center">
            <span class="text-slate-400 font-semibold">Last Payment</span>
            <span class="font-bold text-slate-700">${bed.LastPaidDate}</span>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    contentHtml = `
      <div class="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 text-center shadow-xs">
        <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl mx-auto mb-3">
          ✨
        </div>
        <p class="text-base font-extrabold text-emerald-950">Bed is Currently Vacant</p>
        <p class="text-xs text-emerald-700 font-medium mt-1">Ready for immediate check-in and tenant assignment.</p>
      </div>
    `;
  }

  $sheetContent.innerHTML = contentHtml;

  const isSaving = inFlightBeds.has(bed.BedID);
  let actionsHtml = '';

  if (isOcc) {
    if (bed.PaymentStatus === 'due') {
      actionsHtml += `
        <button
          id="sheetBtnMarkPaid"
          ${isSaving ? 'disabled' : ''}
          class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-sm font-bold min-h-[50px] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span>✓</span> Mark as paid
        </button>
      `;
    } else if (bed.PaymentStatus === 'paid') {
      actionsHtml += `
        <button
          id="sheetBtnMarkUnpaid"
          ${isSaving ? 'disabled' : ''}
          class="w-full py-3.5 bg-white hover:bg-amber-50 active:bg-amber-100 text-amber-800 border-2 border-amber-300 rounded-2xl text-sm font-bold min-h-[50px] shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span>↩</span> Mark as unpaid
        </button>
      `;
    }

    actionsHtml += `
      <button
        id="sheetBtnMarkVacant"
        ${isSaving ? 'disabled' : ''}
        class="w-full py-3.5 bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-sm font-bold min-h-[50px] transition-all active:scale-95"
      >
        Mark vacant
      </button>
    `;
  } else {
    actionsHtml += `
      <button
        id="sheetBtnMarkOccupied"
        ${isSaving ? 'disabled' : ''}
        class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl text-sm font-bold min-h-[50px] shadow-sm transition-all active:scale-95"
      >
        Mark occupied
      </button>
    `;
  }

  $sheetActions.innerHTML = actionsHtml;

  const $btnMarkPaid = document.getElementById('sheetBtnMarkPaid');
  if ($btnMarkPaid) {
    $btnMarkPaid.addEventListener('click', () => {
      const updates = {
        PaymentStatus: 'paid',
        LastPaidDate: getTodayStr(),
        DueDate: addOneCalendarMonth(bed.DueDate),
      };
      closeBedSheet();
      applyChange(bed.BedID, updates, `Marked rent paid for ${bed.TenantName || bed.BedID}`);
    });
  }

  const $btnMarkUnpaid = document.getElementById('sheetBtnMarkUnpaid');
  if ($btnMarkUnpaid) {
    $btnMarkUnpaid.addEventListener('click', () => {
      const updates = {
        PaymentStatus: 'due',
        DueDate: subtractOneCalendarMonth(bed.DueDate),
        LastPaidDate: '',
      };
      closeBedSheet();
      applyChange(bed.BedID, updates, `Marked ${bed.TenantName || bed.BedID} as unpaid`);
    });
  }

  const $btnMarkVacant = document.getElementById('sheetBtnMarkVacant');
  if ($btnMarkVacant) {
    $btnMarkVacant.addEventListener('click', () => {
      const updates = {
        Status: 'vacant',
        TenantName: '',
        Phone: '',
        RentAmount: '',
        DueDate: '',
        LastPaidDate: '',
        PaymentStatus: '',
      };
      closeBedSheet();
      applyChange(bed.BedID, updates, `Marked ${bed.BedID} as vacant`);
    });
  }

  const $btnMarkOccupied = document.getElementById('sheetBtnMarkOccupied');
  if ($btnMarkOccupied) {
    $btnMarkOccupied.addEventListener('click', () => {
      const roomOccupied = allBeds.filter(b => b.Room === bed.Room && b.Status === 'occupied' && Number(b.RentAmount) > 0);

      let computedRent = 0;
      if (roomOccupied.length > 0) {
        computedRent = Number(roomOccupied[0].RentAmount);
      } else {
        const allOccupiedRents = allBeds
          .filter(b => b.Status === 'occupied' && Number(b.RentAmount) > 0)
          .map(b => Number(b.RentAmount))
          .sort((a, b) => a - b);

        if (allOccupiedRents.length > 0) {
          const mid = Math.floor(allOccupiedRents.length / 2);
          computedRent = allOccupiedRents.length % 2 !== 0
            ? allOccupiedRents[mid]
            : Math.round((allOccupiedRents[mid - 1] + allOccupiedRents[mid]) / 2);
        } else {
          computedRent = 8000;
        }
      }

      const updates = {
        Status: 'occupied',
        TenantName: 'New tenant',
        Phone: '',
        RentAmount: computedRent,
        DueDate: addDaysToToday(30),
        LastPaidDate: '',
        PaymentStatus: 'due',
      };

      closeBedSheet();
      applyChange(bed.BedID, updates, `Marked ${bed.BedID} as occupied`);
    });
  }
}

function closeBedSheet() {
  $bedSheetBackdrop.classList.add('hidden');
  document.body.style.overflow = '';
  activeSheetBedId = null;
}

$sheetCloseBtn.addEventListener('click', closeBedSheet);

$bedSheetBackdrop.addEventListener('click', (e) => {
  if (e.target === $bedSheetBackdrop) {
    closeBedSheet();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$bedSheetBackdrop.classList.contains('hidden')) {
      closeBedSheet();
    }
    if (!$menuDropdown.classList.contains('hidden')) {
      $menuDropdown.classList.add('hidden');
    }
  }
});

// ─── Re-render All Views ─────────────────────────────────────────────────────

function renderAllViews() {
  const summary = computeSummary(allBeds);
  renderSummaryCards(summary);
  renderOverdueBar(summary.overdueCount);
  renderLegend();
  renderBedGrid(allBeds);
  renderTenants();
  renderRent();
  $updatedAt.textContent = `Updated at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

// ─── Global Event Listeners ──────────────────────────────────────────────────

// Header "..." dropdown toggle
$menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  $menuDropdown.classList.toggle('hidden');
});

// Close menu on click outside
document.addEventListener('click', (e) => {
  if (!$menuDropdown.classList.contains('hidden') && !$menuBtn.contains(e.target)) {
    $menuDropdown.classList.add('hidden');
  }
});

// Reset demo data from menu
$menuResetBtn.addEventListener('click', async () => {
  $menuDropdown.classList.add('hidden');
  const confirmed = window.confirm('Reset all demo data to default? This will clear any local changes made during the demo.');
  if (confirmed) {
    resetDemoData();
    allBeds = await fetchRows();
    renderAllViews();
    showToast('Demo data reset to defaults');
  }
});

// "Vacant only" filter chip on Beds tab
$vacantFilterChip.addEventListener('click', () => {
  isVacantOnly = !isVacantOnly;
  renderBedGrid(allBeds);
});

// Bottom tabs navigation
$tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

window.addEventListener('hashchange', handleHashChange);

// Overdue alert bar jump to Rent tab
$overdueBar.addEventListener('click', () => {
  currentRentFilter = 'overdue';
  renderRent();
  switchTab('rent');
});

// Tenants live search
$tenantSearch.addEventListener('input', (e) => {
  tenantSearchQuery = e.target.value;
  $tenantSearchClear.classList.toggle('hidden', !tenantSearchQuery);
  renderTenants();
});

$tenantSearchClear.addEventListener('click', () => {
  tenantSearchQuery = '';
  $tenantSearch.value = '';
  $tenantSearchClear.classList.add('hidden');
  $tenantSearch.focus();
  renderTenants();
});

// Rent filter chips
$rentFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentRentFilter = btn.dataset.filter;
    renderRent();
  });
});

// ─── Initialization ──────────────────────────────────────────────────────────

async function init() {
  try {
    document.title = `${PG_NAME} — Dashboard`;
    $pgTitle.textContent = PG_NAME;

    allBeds = await fetchRows();
    renderAllViews();
    $loading.classList.add('hidden');
    $dashboard.classList.remove('hidden');
    handleHashChange();
  } catch (err) {
    $loading.innerHTML = `<p class="text-rose-500 text-sm">❌ ${err.message}</p>`;
  }
}

init();
