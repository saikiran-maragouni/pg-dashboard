/**
 * PG Dashboard — Google Apps Script Backend
 *
 * Deploy as web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Sheet tab: "Beds"
 * Columns: BedID (formula), Room, Floor, Bed, Status, TenantName, Phone,
 *          RentAmount, DueDate, LastPaidDate, PaymentStatus
 */

const SHEET_NAME = 'Beds';

// ─── GET: Return all bed rows as JSON ────────────────────────────────────────

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ success: false, error: 'Sheet "Beds" not found' });
    }

    const data = sheet.getDataRange().getValues();
    // Need at least a header row + one data row
    if (data.length < 2) {
      return jsonResponse({ success: true, data: [] });
    }

    const headers = data[0];
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      let hasData = false;

      for (let j = 0; j < headers.length; j++) {
        let value = data[i][j];

        // Convert Date objects to YYYY-MM-DD strings for JSON
        if (value instanceof Date) {
          value = Utilities.formatDate(
            value,
            Session.getScriptTimeZone(),
            'yyyy-MM-dd'
          );
        }

        row[headers[j]] = value;
        if (value !== '') hasData = true;
      }

      // Skip completely empty rows or rows without a BedID
      if (hasData && row.BedID) {
        rows.push(row);
      }
    }

    return jsonResponse({ success: true, data: rows });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

// ─── POST: Update one row by BedID ──────────────────────────────────────────

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { bedId, fields } = payload;

    if (!bedId || !fields) {
      return jsonResponse({ success: false, error: 'Missing bedId or fields' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ success: false, error: 'Sheet "Beds" not found' });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const bedIdCol = headers.indexOf('BedID');

    if (bedIdCol === -1) {
      return jsonResponse({ success: false, error: 'BedID column not found' });
    }

    // Find the row that matches bedId
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][bedIdCol]) === String(bedId)) {
        targetRow = i + 1; // Sheet rows are 1-indexed
        break;
      }
    }

    if (targetRow === -1) {
      return jsonResponse({ success: false, error: 'BedID not found: ' + bedId });
    }

    // Write each field; skip BedID (it's a formula) and unknown columns
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'BedID') continue;
      const colIndex = headers.indexOf(key);
      if (colIndex === -1) continue;
      sheet.getRange(targetRow, colIndex + 1).setValue(value);
    }

    return jsonResponse({ success: true, bedId: bedId });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
