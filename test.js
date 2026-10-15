/**
 * app.js — Stage 1B: Local data test
 *
 * Auto-loads seed data into a table, provides Toggle Status to test
 * saveRow(), and a Reset button to restore the seed via resetDemoData().
 */

import { fetchRows, saveRow, resetDemoData } from './api.js';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $status    = document.getElementById('status');
const $tableWrap = document.getElementById('tableWrap');
const $tableBody = document.getElementById('tableBody');
const $updatedAt = document.getElementById('updatedAt');
const $btnLoad   = document.getElementById('btnLoad');
const $btnReset  = document.getElementById('btnReset');
const $btnToggle = document.getElementById('btnToggle');
const $testBedId = document.getElementById('testBedId');

/** Human-readable floor labels. Index = floor number. */
const FLOOR_NAMES = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Show a coloured status message. */
function showStatus(msg, type = 'info') {
  const colors = {
    info:    'text-blue-600',
    success: 'text-green-600',
    error:   'text-red-600',
  };
  $status.className = `mb-3 text-sm font-medium ${colors[type] || ''}`;
  $status.textContent = msg;
}

/** Today as YYYY-MM-DD for overdue comparison. */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ─── Render ──────────────────────────────────────────────────────────────────

/** Build the data table from an array of bed objects. */
function renderTable(beds) {
  const today = todayStr();
  $tableBody.innerHTML = '';

  for (const b of beds) {
    const floor   = FLOOR_NAMES[b.Floor] ?? `Floor ${b.Floor}`;
    const overdue = b.PaymentStatus === 'due' && b.DueDate && b.DueDate < today;

    // Status badge
    const statusCls = b.Status === 'occupied'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-500';

    // Payment badge
    let payBadge = '—';
    if (b.PaymentStatus) {
      const payCls = overdue
        ? 'bg-red-100 text-red-700'
        : b.PaymentStatus === 'paid'
          ? 'bg-green-100 text-green-700'
          : 'bg-yellow-100 text-yellow-700';
      const payLabel = overdue ? 'overdue' : b.PaymentStatus;
      payBadge = `<span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${payCls}">${payLabel}</span>`;
    }

    const tr = document.createElement('tr');
    tr.className = 'border-t border-gray-100 hover:bg-gray-50';
    tr.innerHTML = `
      <td class="px-3 py-2 font-mono font-medium">${b.BedID}</td>
      <td class="px-3 py-2">${floor}</td>
      <td class="px-3 py-2">
        <span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${statusCls}">${b.Status}</span>
      </td>
      <td class="px-3 py-2">${b.TenantName || '—'}</td>
      <td class="px-3 py-2 text-right font-mono">₹${b.RentAmount.toLocaleString('en-IN')}</td>
      <td class="px-3 py-2">${payBadge}</td>
      <td class="px-3 py-2 font-mono text-xs">${b.DueDate || '—'}</td>
    `;
    $tableBody.appendChild(tr);
  }

  $tableWrap.classList.remove('hidden');
  $updatedAt.textContent = `Updated at ${new Date().toLocaleTimeString()}`;
  $updatedAt.classList.remove('hidden');
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Load all rows and render. */
async function loadData() {
  try {
    const beds = await fetchRows();
    showStatus(`✅ ${beds.length} beds loaded`, 'success');
    renderTable(beds);
  } catch (err) {
    showStatus(`❌ ${err.message}`, 'error');
  }
}

/** Wipe localStorage and re-seed. */
async function resetData() {
  resetDemoData();
  showStatus('🔄 Demo data reset to defaults', 'success');
  await loadData();
}

/** Toggle a bed's Status between occupied ↔ vacant via saveRow(). */
async function toggleStatus() {
  const bedId = $testBedId.value.trim();
  if (!bedId) { showStatus('Enter a BedID first.', 'error'); return; }

  try {
    const beds = await fetchRows();
    const bed  = beds.find(b => b.BedID === bedId);
    if (!bed) { showStatus(`BedID "${bedId}" not found.`, 'error'); return; }

    const newStatus = bed.Status === 'occupied' ? 'vacant' : 'occupied';
    await saveRow(bedId, { Status: newStatus });
    showStatus(`✅ ${bedId}: ${bed.Status} → ${newStatus}`, 'success');
    await loadData(); // re-render to confirm
  } catch (err) {
    showStatus(`❌ ${err.message}`, 'error');
  }
}

// ─── Wire up & auto-load ────────────────────────────────────────────────────
$btnLoad.addEventListener('click', loadData);
$btnReset.addEventListener('click', resetData);
$btnToggle.addEventListener('click', toggleStatus);

// Show data immediately on page open
loadData();
