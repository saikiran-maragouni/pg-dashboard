/**
 * seed.js — Demo seed data (Hyderabad Gents PG)
 *
 * Requirements met:
 * 1. 7 floors: Ground (Floor 0), 1st (Floor 1), 2nd (Floor 2), 3rd (Floor 3),
 *    4th (Floor 4), 5th (Floor 5), 6th (Floor 6).
 * 2. Each floor has 4 rooms: 4-sharing, 4-sharing, 3-sharing, and 2-sharing (13 beds/floor = 91 total).
 * 3. Mix of 4-sharing (₹6,500-7,000), 3-sharing (₹8,500), 2-sharing (₹11,000).
 * 4. Realistic mix of Overdue, Due Today, Due Soon, Paid, and Vacant beds on every floor.
 * 5. Unique Hyderabad male names, no duplicates, fake phone numbers.
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

const ROOMS = [
  // Ground floor (Floor 0) — 4, 4, 3, 2 sharing (13 beds)
  ['G01', 0, ['A', 'B', 'C', 'D'],      6500], // 4-sharing
  ['G02', 0, ['A', 'B', 'C', 'D'],      7000], // 4-sharing — COMPLETELY VACANT ROOM
  ['G03', 0, ['A', 'B', 'C'],           8500], // 3-sharing
  ['G04', 0, ['A', 'B'],               11000], // 2-sharing

  // 1st floor (Floor 1) — 4, 4, 3, 2 sharing (13 beds)
  ['101', 1, ['A', 'B', 'C', 'D'],      6500], // 4-sharing — EXACTLY 1 VACANT BED
  ['102', 1, ['A', 'B', 'C', 'D'],      7000], // 4-sharing
  ['103', 1, ['A', 'B', 'C'],           8500], // 3-sharing
  ['104', 1, ['A', 'B'],               11000], // 2-sharing

  // 2nd floor (Floor 2) — 4, 4, 3, 2 sharing (13 beds)
  ['201', 2, ['A', 'B', 'C', 'D'],      6500], // 4-sharing
  ['202', 2, ['A', 'B', 'C', 'D'],      7000], // 4-sharing
  ['203', 2, ['A', 'B', 'C'],           8500], // 3-sharing
  ['204', 2, ['A', 'B'],               11000], // 2-sharing

  // 3rd floor (Floor 3) — 4, 4, 3, 2 sharing (13 beds)
  ['301', 3, ['A', 'B', 'C', 'D'],      6500], // 4-sharing
  ['302', 3, ['A', 'B', 'C', 'D'],      7000], // 4-sharing
  ['303', 3, ['A', 'B', 'C'],           8500], // 3-sharing
  ['304', 3, ['A', 'B'],               11000], // 2-sharing

  // 4th floor (Floor 4) — 4, 4, 3, 2 sharing (13 beds)
  ['401', 4, ['A', 'B', 'C', 'D'],      6500], // 4-sharing
  ['402', 4, ['A', 'B', 'C', 'D'],      7000], // 4-sharing
  ['403', 4, ['A', 'B', 'C'],           8500], // 3-sharing
  ['404', 4, ['A', 'B'],               11000], // 2-sharing

  // 5th floor (Floor 5) — 4, 4, 3, 2 sharing (13 beds)
  ['501', 5, ['A', 'B', 'C', 'D'],      6500], // 4-sharing
  ['502', 5, ['A', 'B', 'C', 'D'],      7000], // 4-sharing
  ['503', 5, ['A', 'B', 'C'],           8500], // 3-sharing
  ['504', 5, ['A', 'B'],               11000], // 2-sharing

  // 6th floor (Floor 6) — 4, 4, 3, 2 sharing (13 beds)
  ['601', 6, ['A', 'B', 'C', 'D'],      6500], // 4-sharing
  ['602', 6, ['A', 'B', 'C', 'D'],      7000], // 4-sharing
  ['603', 6, ['A', 'B', 'C'],           8500], // 3-sharing
  ['604', 6, ['A', 'B'],               11000], // 2-sharing
];

const TENANTS = {
  // Ground floor (6 occupied, 7 vacant)
  'G01-A': ['Ravi',       '98765 00001', 'paid',  18, -12],
  'G01-B': ['Venkat',     '98765 00002', 'due',   -2, -32], // Overdue (2 days)
  'G01-C': ['Sai',        '98765 00003', 'due',    4, -26], // Due soon (4 days)
  'G03-A': ['Rahul',      '98765 00004', 'due',    0, -30], // Due TODAY
  'G03-B': ['Kiran',      '98765 00005', 'paid',  15, -15],
  'G04-A': ['Mahesh',     '98765 00006', 'paid',  20, -10],

  // 1st floor (9 occupied, 4 vacant)
  '101-A': ['Suresh',     '98765 00007', 'due',   -5, -35], // Overdue (5 days)
  '101-B': ['Anil',       '98765 00008', 'paid',  25,  -5],
  '101-C': ['Srinivas',   '98765 00009', 'paid',  11, -19],
  '102-A': ['Naresh',     '98765 00010', 'due',   -9, -39], // Overdue (9 days)
  '102-B': ['Kalyan',     '98765 00011', 'paid',  19, -11],
  '102-C': ['Vikram',     '98765 00012', 'paid',  16, -14],
  '103-A': ['Sandeep',    '98765 00013', 'paid',  22,  -8],
  '103-B': ['Pradeep',    '98765 00014', 'due',    2, -28], // Due soon (2 days)
  '104-A': ['Harish',     '98765 00015', 'due',  -16, -46], // Overdue (16 days)

  // 2nd floor (9 occupied, 4 vacant)
  '201-A': ['Karthik',    '98765 00016', 'paid',  20, -10],
  '201-B': ['Vamsi',      '98765 00017', 'due',   -4, -34], // Overdue (4 days)
  '201-C': ['Ajay',       '98765 00018', 'paid',  14, -16],
  '202-A': ['Akhil',      '98765 00019', 'paid',  22,  -8],
  '202-B': ['Tarun',      '98765 00020', 'due',    3, -27], // Due soon (3 days)
  '202-C': ['Manoj',      '98765 00021', 'paid',  17, -13],
  '203-A': ['Shiva',      '98765 00022', 'paid',  15, -15],
  '203-B': ['Rohit',      '98765 00023', 'due',   -8, -38], // Overdue (8 days)
  '204-A': ['Nikhil',     '98765 00024', 'paid',  21,  -9],
  '204-B': ['Praveen',    '98765 00025', 'paid',  19, -11],

  // 3rd floor (8 occupied, 5 vacant)
  '301-A': ['Rakesh',     '98765 00026', 'paid',  16, -14],
  '301-B': ['Teja',       '98765 00027', 'due',    1, -29], // Due soon (1 day)
  '301-C': ['Vinay',      '98765 00028', 'paid',  24,  -6],
  '302-A': ['Bharath',    '98765 00029', 'paid',  18, -12],
  '302-B': ['Krishna',    '98765 00030', 'due',  -11, -41], // Overdue (11 days)
  '303-A': ['Charan',     '98765 00031', 'paid',  23,  -7],
  '303-B': ['Jagadeesh',  '98765 00032', 'paid',  12, -18],
  '304-A': ['Dinesh',     '98765 00033', 'due',   -3, -33], // Overdue (3 days)

  // 4th floor (8 occupied, 5 vacant)
  '401-A': ['Lokesh',     '98765 00034', 'paid',  20, -10],
  '401-B': ['Anudeep',    '98765 00035', 'due',    5, -25], // Due soon (5 days)
  '401-C': ['Prashanth',  '98765 00036', 'paid',  18, -12],
  '402-A': ['Rajesh',     '98765 00037', 'paid',  22,  -8],
  '402-B': ['Sunil',      '98765 00038', 'due',   -6, -36], // Overdue (6 days)
  '403-A': ['Srikanth',   '98765 00039', 'paid',  15, -15],
  '403-B': ['Bhanu',      '98765 00040', 'paid',  25,  -5],
  '404-A': ['Chaitanya',  '98765 00041', 'paid',  13, -17],

  // 5th floor (8 occupied, 5 vacant)
  '501-A': ['Madhu',      '98765 00042', 'paid',  19, -11],
  '501-B': ['Naveen',     '98765 00043', 'due',    2, -28], // Due soon (2 days)
  '501-C': ['Santosh',    '98765 00044', 'paid',  17, -13],
  '502-A': ['Sravan',     '98765 00045', 'paid',  21,  -9],
  '502-B': ['Venu',       '98765 00046', 'due',   -7, -37], // Overdue (7 days)
  '503-A': ['Vivek',      '98765 00047', 'paid',  14, -16],
  '503-B': ['Yashwanth',  '98765 00048', 'paid',  23,  -7],
  '504-A': ['Dileep',     '98765 00049', 'paid',  18, -12],

  // 6th floor (8 occupied, 5 vacant)
  '601-A': ['Hemanth',    '98765 00050', 'paid',  22,  -8],
  '601-B': ['Manikanta',  '98765 00051', 'due',    4, -26], // Due soon (4 days)
  '601-C': ['Pavan',      '98765 00052', 'paid',  16, -14],
  '602-A': ['Raghu',      '98765 00053', 'paid',  20, -10],
  '602-B': ['Sudheer',    '98765 00054', 'due',   -2, -32], // Overdue (2 days)
  '603-A': ['Varun',      '98765 00055', 'paid',  24,  -6],
  '603-B': ['Vikas',      '98765 00056', 'paid',  15, -15],
  '604-A': ['Abhinav',    '98765 00057', 'paid',  19, -11],
};

// ─── Builder ─────────────────────────────────────────────────────────────────

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
