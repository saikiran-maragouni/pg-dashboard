# Sunrise PG — Lite Admin Dashboard

A fast, mobile-first admin dashboard for hostel & PG owners to track beds and rent collections on mobile and desktop. Zero build step, vanilla JS, powered by Tailwind CSS CDN.

---

## 🚀 Live Demo & Local Preview

Run a local HTTP server:

```bash
# Python
python -m http.server 8080

# Or Node.js
npx serve .
```

Open `http://localhost:8080` in your phone browser or desktop.

---

## ☁️ Deploy to Cloudflare Pages (Free, Instant)

1. Push this repository to GitHub or GitLab.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/):
   - Go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
   - Select this repository.
3. In the Build settings:
   - **Framework preset**: `None`
   - **Build command**: *(leave completely blank)*
   - **Build output directory**: `/` *(leave empty or enter repo root)*
4. Click **Save and Deploy**. Your dashboard is live on `<your-project>.pages.dev` with HTTPS and global CDN.

---

## 🏷️ How to Rename the PG for Client Demos

Open [`config.js`](config.js) and change `PG_NAME`:

```javascript
// config.js
export const PG_NAME = 'Sri Sai Luxury PG'; // change this
export const PG_CITY = 'Hyderabad';
```

The header and page title will update automatically.

---

## 🔄 How to Reset Demo Data

Two ways to restore the clean seed data anytime during or after a demo:

1. **From the UI (Header menu)**:
   - Tap the three dots menu (**⋮**) in the top right header on any tab.
   - Tap **Reset demo data**.
   - Confirm when prompted. All 24 beds, occupancy, and rent statuses will immediately reset to default.

2. **Via Test Page**:
   - Open `/test.html` and click **Reset Demo Data**.

---

## 📱 Add to Home Screen (PWA Feel)

The dashboard includes a `manifest.json`, theme color meta tag, and icons:
- **On iPhone (Safari)**: Tap Share icon (square with arrow) → **Add to Home Screen**.
- **On Android (Chrome)**: Tap the three dots menu → **Add to Home screen** / **Install app**.

It launches fullscreen without browser address bars for a native app feel when presenting door-to-door.

---

## 🔌 Connecting to Google Sheets (Future Production)

[`apps-script/Code.gs`](apps-script/Code.gs) contains the Google Apps Script backend. When ready to connect to a real Google Sheet, swap [`api.js`](api.js) internals to point to the deployed web app URL without touching any UI code.
