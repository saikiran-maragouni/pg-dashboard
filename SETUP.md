# PG Dashboard — Stage 1 Setup

## 1. Create the Google Sheet

1. Open [Google Sheets](https://sheets.google.com) → create a **blank** spreadsheet.
2. Rename the first tab to **Beds** (right-click the tab → Rename).
3. Add these headers in **row 1**, one per column:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| BedID | Room | Floor | Bed | Status | TenantName | Phone | RentAmount | DueDate | LastPaidDate | PaymentStatus |

4. Add a **test row** in row 2:

| A (formula) | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| `=B2&"-"&D2` | 101 | 1 | A | occupied | Ravi | 9000000001 | 8000 | 2026-11-01 | 2026-10-01 | paid |

> **Column A (BedID) is always a formula**: `=B2&"-"&D2`.  Copy this formula down for every new row. Never type BedID manually.

5. Optionally add one more test row (row 3):

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| `=B3&"-"&D3` | 101 | 1 | B | vacant | | | | | | |

---

## 2. Add the Apps Script

1. In the spreadsheet, go to **Extensions → Apps Script**.
2. Delete any existing code in the editor.
3. Paste the entire contents of [`apps-script/Code.gs`](apps-script/Code.gs).
4. Press **Ctrl+S** to save. Name the project "PG Dashboard" when prompted.

---

## 3. Deploy as Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon ⚙ → select **Web app**.
3. Set:
   - **Description**: `v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. **Authorize** the app when prompted (review permissions → allow).
6. Copy the **Web app URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## 4. Test the Fetch

### Option A: Open in browser (quick check)
Paste the web app URL directly in a browser tab. You should see JSON like:
```json
{"success":true,"data":[{"BedID":"101-A","Room":101,...}]}
```

### Option B: Use the dashboard test page
Since the frontend uses ES modules, you need a local HTTP server (not `file://`):

```bash
# Python (any version you have)
python -m http.server 8080

# Or Node.js
npx serve .
```

Then open `http://localhost:8080`, paste your web app URL, and click **Fetch Beds**.

---

## Sheet Structure Reference

| Column | Type | Notes |
|--------|------|-------|
| BedID | Formula | `=B{row}&"-"&D{row}` — unique key, never edit manually |
| Room | Number | e.g. 101, 202 |
| Floor | Number | 0 = Ground, 1, 2, 3… |
| Bed | Text | A, B, C… |
| Status | Text | `vacant` or `occupied` |
| TenantName | Text | First name only, blank if vacant |
| Phone | Text/Number | Fake for demo, blank if vacant |
| RentAmount | Number | Monthly rent in ₹ |
| DueDate | Date | Next due date (YYYY-MM-DD) |
| LastPaidDate | Date | Last payment date (YYYY-MM-DD) |
| PaymentStatus | Text | `paid` or `due` only. Overdue is computed in the frontend. |
