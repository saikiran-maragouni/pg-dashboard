/**
 * seed.js — Demo seed data (Hyderabad Gents PG)
 *
 * Requirements met:
 * 1. 24 beds across 3 floors (Ground, 1st, 2nd)
 * 2. Mix of 4-sharing (₹6,000-7,000), 3-sharing (₹8,000-9,000), 2-sharing (₹10,000-12,000)
 * 3. 15 occupied, 9 vacant (vacant on every floor, Room G02 completely vacant, Room 101 with exactly 1 vacant bed)
 * 4. 15 common Hyderabad male names, no duplicates, fake phones 98765 00001..00015
 * 5. Rent states:
 *    - Exactly 1 due TODAY (dueOffset 0)
 *    - 2 due soon (dueOffsets 2, 4)
 *    - Exactly 4 overdue: ~2d, ~5d, ~9d, ~16d (dueOffsets -2, -5, -9, -16)
 *    - 8 paid with due dates 11–25 days ahead
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return YYYY-MM-DD string for today + offsetDays in local time. */
function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Data definitions ────────────────────────────────────────────────────────

/**
 * Room layout: [roomNumber, floor, bedLetters[], rentPerBed]
 * Total 9 rooms, 24 beds:
 * - 4-sharing: G03 (₹6,500)
 * - 3-sharing: G01 (₹8,000), 101 (₹8,500), 103 (₹8,500), 202 (₹9,000)
 * - 2-sharing: G02 (₹11,000), 102 (₹12,000), 201 (₹10,500), 203 (₹11,500)
 */
const ROOMS = [
  // Ground floor (Floor 0) — 9 beds total
  ['G01', 0, ['A', 'B', 'C'],           8000], // 3-sharing (2 occ, 1 vac)
  ['G02', 0, ['A', 'B'],               11000], // 2-sharing — COMPLETELY VACANT ROOM (2 vac)
  ['G03', 0, ['A', 'B', 'C', 'D'],      6500], // 4-sharing (3 occ, 1 vac)

  // 1st floor (Floor 1) — 8 beds total
  ['101', 1, ['A', 'B', 'C'],           8500], // 3-sharing — EXACTLY 1 VACANT BED (2 occ, 1 vac)
  ['102', 1, ['A', 'B'],               12000], // 2-sharing (1 occ, 1 vac)
  ['103', 1, ['A', 'B', 'C'],           8500], // 3-sharing (2 occ, 1 vac)

  // 2nd floor (Floor 2) — 7 beds total
  ['201', 2, ['A', 'B'],               10500], // 2-sharing (2 occ, 0 vac)
  ['202', 2, ['A', 'B', 'C'],           9000], // 3-sharing (2 occ, 1 vac)
  ['203', 2, ['A', 'B'],               11500], // 2-sharing (1 occ, 1 vac)
];

/**
 * Tenant assignments keyed by BedID.
 * 15 occupied beds, 15 unique Hyderabad male names, 15 sequential fake numbers.
 *
 * Rent states:
 * - Overdue (4 beds):
 *   - 203-A: Harish  (-16d overdue)
 *   - 103-B: Naresh  (-9d overdue)
 *   - 101-B: Suresh  (-5d overdue)
 *   - G01-B: Venkat  (-2d overdue)
 * - Due today (1 bed):
 *   - G03-B: Rahul   (0d: due TODAY)
 * - Due soon (2 beds):
 *   - 202-B: Pradeep (+2d: due in 2d)
 *   - G03-A: Sai     (+4d: due in 4d)
 * - Paid (8 beds, next due in 11–25 days):
 *   - G01-A: Ravi     (+18d)
 *   - G03-C: Kiran    (+15d)
 *   - 101-A: Mahesh   (+13d)
 *   - 102-A: Anil     (+25d)
 *   - 103-A: Srinivas (+11d)
 *   - 201-A: Kalyan   (+19d)
 *   - 201-B: Vikram   (+16d)
 *   - 202-A: Sandeep  (+22d)
 */
const TENANTS = {
  // Ground floor (5 occupied)
  'G01-A': ['Ravi',     '98765 00001', 'paid',  18, -12],
  'G01-B': ['Venkat',   '98765 00002', 'due',   -2, -32], // Overdue (2 days)
  // G01-C: vacant
  // G02-A, G02-B: completely vacant room
  'G03-A': ['Sai',      '98765 00003', 'due',    4, -26], // Due soon (4 days)
  'G03-B': ['Rahul',    '98765 00004', 'due',    0, -30], // Due TODAY
  'G03-C': ['Kiran',    '98765 00005', 'paid',  15, -15],
  // G03-D: vacant

  // 1st floor (5 occupied)
  '101-A': ['Mahesh',   '98765 00006', 'paid',  13, -17],
  '101-B': ['Suresh',   '98765 00007', 'due',   -5, -35], // Overdue (5 days)
  // 101-C: vacant (Room 101 has exactly one vacant bed)
  '102-A': ['Anil',     '98765 00008', 'paid',  25,  -5],
  // 102-B: vacant
  '103-A': ['Srinivas', '98765 00009', 'paid',  11, -19],
  '103-B': ['Naresh',   '98765 00010', 'due',   -9, -39], // Overdue (9 days)
  // 103-C: vacant

  // 2nd floor (5 occupied)
  '201-A': ['Kalyan',   '98765 00011', 'paid',  19, -11],
  '201-B': ['Vikram',   '98765 00012', 'paid',  16, -14],
  '202-A': ['Sandeep',  '98765 00013', 'paid',  22,  -8],
  '202-B': ['Pradeep',  '98765 00014', 'due',    2, -28], // Due soon (2 days)
  // 202-C: vacant
  '203-A': ['Harish',   '98765 00015', 'due',  -16, -46], // Overdue (16 days)
  // 203-B: vacant
};

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build the complete seed dataset.
 * @returns {Array<Object>} 24 bed-row objects
 */
export function buildSeedData() {
  const beds = [];

  for (const [room, floor, letters, rent] of ROOMS) {
    for (const bed of letters) {
      const bedId  = `${room}-${bed}`;
      const tenant = TENANTS[bedId];

      if (tenant) {
        const [name, phone, payStatus, dueOff, paidOff] = tenant;
        beds.push({
          BedID:         bedId,
          Room:          room,
          Floor:         floor,
          Bed:           bed,
          Status:        'occupied',
          TenantName:    name,
          Phone:         phone,
          RentAmount:    rent,
          DueDate:       dateStr(dueOff),
          LastPaidDate:  dateStr(paidOff),
          PaymentStatus: payStatus,
        });
      } else {
        beds.push({
          BedID:         bedId,
          Room:          room,
          Floor:         floor,
          Bed:           bed,
          Status:        'vacant',
          TenantName:    '',
          Phone:         '',
          RentAmount:    rent,
          DueDate:       '',
          LastPaidDate:  '',
          PaymentStatus: '',
        });
      }
    }
  }

  return beds;
}
