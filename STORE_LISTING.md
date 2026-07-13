# SalaryLens — Chrome Web Store Submission

Everything below is copy-paste ready for the Chrome Web Store developer dashboard
(https://chrome.google.com/webstore/devconsole). Upload artifact: **`salarylens.zip`** (v1.0.0).

---

## 1. Upload package
- **File:** `salarylens.zip` (repackaged from `dist/`, ~114 KB)
- **Manifest version:** 3
- **Extension version:** 1.0.0
- One-time Chrome developer registration fee: **$5** (your Google account).

---

## 2. Store listing

**Name**
```
SalaryLens — CTC to In-Hand Decoder
```

**Short description** (max 132 chars)
```
See real monthly in-hand for any Indian CTC — right on LinkedIn & Naukri. EPF, tax, stock & estimates decoded.
```

**Category:** Productivity
**Language:** English

**Detailed description**
```
"₹18 LPA" is not ₹1.5 lakh a month. SalaryLens instantly decodes any Indian CTC
into what actually lands in your bank — right on the job post.

WHAT IT DOES
• Reads the salary on LinkedIn & Naukri job pages and shows your real monthly in-hand.
• No salary listed? It estimates pay from role, seniority and 90+ top employers —
  and honestly says "not enough data" when it can't tell.
• Separates cash (base + bonus) from stock/RSU, so your take-home reflects reality,
  not the headline number.
• Open the popup any time to plug in your own numbers and see a full breakdown.

ACCURATE BY DESIGN
• New tax regime FY25-26 with the 87A rebate.
• EPF (12% of basic), gratuity and professional tax modelled.
• Clear segmented breakdown: in-hand, EPF, tax, bonus and stock.

100% PRIVATE
• Runs entirely on your device. No sign-up. No tracking. No data leaves Chrome.
• The only permission used is "storage" — to remember your last inputs locally.

Free. Built for Indian engineers, by an Indian engineer.
Works on: linkedin.com/jobs and naukri.com.
```

**Single purpose** (required field)
```
SalaryLens converts an Indian CTC (cost-to-company) figure into an accurate
monthly in-hand estimate and displays it on supported job listing pages.
```

---

## 3. Graphic assets  (all in `store-assets/`)

| Asset | Size | File |
|---|---|---|
| Store icon | 128×128 | `store-icon-128.png` |
| Screenshot 1 | 1280×800 | `screenshot-1.png` — real take-home hero |
| Screenshot 2 | 1280×800 | `screenshot-2.png` — works on the job post |
| Screenshot 3 | 1280×800 | `screenshot-3.png` — estimates when salary is hidden |
| Screenshot 4 | 1280×800 | `screenshot-4.png` — cash vs stock |
| Screenshot 5 | 1280×800 | `screenshot-5.png` — private by design |
| Small promo tile | 440×280 | `promo-small-440x280.png` (optional) |
| Marquee promo tile | 1400×560 | `promo-marquee-1400x560.png` (optional) |

At least 1 screenshot is required; upload all 5 for a stronger listing.

---

## 4. Privacy tab (required because manifest declares `storage`)

**Permission justification — `storage`**
```
Used only to save the user's last-entered salary inputs and preferences locally
in the browser (chrome.storage.local) so they persist between sessions. No data
is transmitted anywhere.
```

**Host permission / content script justification** (linkedin.com/jobs, naukri.com)
```
The content script runs only on LinkedIn job pages and Naukri to read the salary
text already visible on the page and overlay the calculated in-hand figure.
It does not read, collect, or transmit any personal or page data off the device.
```

**Data usage disclosures** — check ALL of these:
- [x] Does NOT collect or use user data beyond what is needed for the single purpose.
- [x] Does NOT sell or transfer user data to third parties.
- [x] Does NOT use or transfer user data for purposes unrelated to the single purpose.
- [x] Does NOT use or transfer user data to determine creditworthiness / for lending.
- "What user data do you collect?": **None.**

**Privacy policy URL** — Chrome requires a hosted URL. Paste the text below into a
public page (a GitHub Pages / Notion / gist page works) and put its URL here:
```
SalaryLens Privacy Policy

SalaryLens does not collect, store, transmit, or sell any personal data.
All calculations happen locally in your browser. The extension uses Chrome's
local storage only to remember the salary values you last entered, on your own
device. It makes no network requests and contacts no external servers.
Removing the extension deletes this locally stored data.

Contact: <your email>
```

---

## 5. Pre-submit checklist
- [ ] Pay the $5 Chrome developer registration (one time).
- [ ] Upload `salarylens.zip`.
- [ ] Paste name, short + detailed description, single purpose.
- [ ] Set category = Productivity, language = English.
- [ ] Upload `store-icon-128.png` + the 5 screenshots (+ promo tiles optionally).
- [ ] Fill Privacy tab: storage + host justifications, data disclosures, privacy policy URL.
- [ ] Submit for review (first review typically a few days).

> Note: I can't submit or pay on your behalf — those steps need your Google login and
> the $5 fee. Everything else (package, graphics, copy) is ready above.
