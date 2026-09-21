import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { PROVIDER, BOLOLO } from "../brand/doc-info.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoSrcDir = path.join(__dirname, "..", "brand");
const logoDark = "4ds-logo-header.png";
fs.copyFileSync(path.join(logoSrcDir, logoDark), path.join(__dirname, logoDark));

const invoiceNo = "INV-4DS-BOLOLO-2026-001";
const issueDate = "14 September 2026";
const dueDate = "21 September 2026";
const agreementRef = BOLOLO.agreementCode;

const outHtml = path.join(__dirname, "Bololo_Security_4DS_Tax_Invoice.html");
const outPdf = path.join(__dirname, "Bololo_Security_4DS_Tax_Invoice.pdf");
const outDesktop = path.join(
  "C:\\Users\\Toxic\\Desktop",
  "Bololo_Security_4DS_Tax_Invoice.pdf",
);

const css = `
:root {
  --ink: #141414;
  --muted: #5c5c5c;
  --line: #d8d8d8;
  --soft: #f5f5f6;
  --red: #c9302c;
  --dark: #111;
}
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  font-family: "Segoe UI", Calibri, Arial, Helvetica, sans-serif;
  color: var(--ink); background: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
@page { size: A4; margin: 0; }
.page {
  width: 210mm; height: 297mm;
  padding: 12mm 15mm 14mm;
  position: relative; overflow: hidden; background: #fff;
}
.topbar {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding-bottom: 6px; border-bottom: 3px solid var(--dark); margin-bottom: 5mm;
}
.brand strong { display: block; font-size: 13pt; font-weight: 800; letter-spacing: 0.02em; }
.brand span { display: block; font-size: 8.5pt; color: var(--muted); margin-top: 2px; line-height: 1.45; }
.logo { height: 32px; width: auto; display: block; background: transparent; object-fit: contain; }
.doc-title {
  text-align: right;
}
.doc-title h1 {
  margin: 0 0 3px; font-size: 20pt; font-weight: 800; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--dark);
}
.doc-title .meta { font-size: 9pt; color: var(--muted); line-height: 1.55; }
.doc-title .meta b { color: var(--ink); font-weight: 700; }

.parties {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5mm;
  margin-bottom: 5mm;
}
.party {
  background: var(--soft); border-top: 3px solid var(--dark);
  padding: 3.2mm 4mm 3mm;
  min-height: 28mm;
}
.party.bill { border-top-color: var(--red); }
.party .label {
  font-size: 7.5pt; letter-spacing: 0.12em; text-transform: uppercase;
  font-weight: 750; color: var(--muted); margin-bottom: 2.5mm;
}
.party strong { display: block; font-size: 11.5pt; margin-bottom: 1.5mm; }
.party p { margin: 0 0 1mm; font-size: 9pt; line-height: 1.45; color: #333; }

.banner {
  display: grid; grid-template-columns: 1.2fr 1fr 1fr;
  gap: 3mm; margin-bottom: 4.5mm;
}
.banner .cell {
  border: 1px solid var(--line); padding: 3mm 3.5mm; background: #fff;
}
.banner .k {
  font-size: 7pt; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); font-weight: 750;
}
.banner strong { display: block; margin-top: 1.5mm; font-size: 10.5pt; }

table {
  width: 100%; border-collapse: collapse; margin-bottom: 3.5mm;
  font-size: 8.8pt; line-height: 1.35;
}
th {
  background: var(--dark); color: #fff; text-align: left;
  padding: 7px 9px; font-size: 7.5pt; letter-spacing: 0.06em; text-transform: uppercase;
}
td {
  border-bottom: 1px solid var(--line); padding: 7px 9px; vertical-align: top;
}
td.num, th.num { text-align: right; white-space:nowrap; }
td.desc strong { display: block; font-size: 9.5pt; margin-bottom: 1.5mm; }
td.desc span { color: #444; font-size: 8.5pt; }
tr.discount td { background: #f8e8e7; }
tr.discount td.num { color: var(--red); font-weight: 700; }

.totals-wrap {
  display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 5mm;
  margin-bottom: 4mm; align-items: start;
}
.notes {
  font-size: 8.6pt; line-height: 1.5; color: #333;
}
.notes h3 {
  margin: 0 0 2mm; font-size: 8.5pt; letter-spacing: 0.08em;
  text-transform: uppercase; font-weight: 750;
}
.notes ul { margin: 0; padding-left: 4.2mm; }
.notes li { margin-bottom: 1.4mm; }
.share-box {
  margin-top: 4mm; border: 1px solid var(--dark); padding: 3.5mm 4mm;
  background: var(--soft);
}
.share-box strong { display: block; font-size: 9.5pt; margin-bottom: 1.5mm; }
.share-box p { margin: 0; font-size: 8.5pt; line-height: 1.45; color: #333; }

.totals {
  border: 1px solid var(--line);
}
.totals .row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 2.8mm 4mm; border-bottom: 1px solid var(--line); font-size: 9.5pt;
}
.totals .row:last-child { border-bottom: 0; }
.totals .row.due {
  background: var(--dark); color: #fff; font-size: 12pt; font-weight: 800;
}
.totals .row .muted { color: var(--muted); }
.totals .row.due .muted { color: rgba(255,255,255,0.7); }

.pay {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4mm;
  margin-bottom: 3mm;
}
.pay .box {
  border: 1px solid var(--line); padding: 3.5mm 4mm;
}
.pay h3 {
  margin: 0 0 2mm; font-size: 8pt; letter-spacing: 0.1em;
  text-transform: uppercase; font-weight: 750; color: var(--muted);
}
.pay p { margin: 0 0 1.2mm; font-size: 9pt; line-height: 1.45; }
.pay .blank {
  display: inline-block; min-width: 42mm; border-bottom: 1px solid #999;
  height: 12px; vertical-align: bottom;
}

.foot {
  position: absolute; left: 15mm; right: 15mm; bottom: 8mm;
  display: flex; justify-content: space-between; align-items: flex-end;
  font-size: 7.5pt; color: #888; border-top: 1px solid #ddd; padding-top: 4px;
}
.accent {
  position: absolute; left: 0; top: 0; width: 4mm; height: 100%;
  background: linear-gradient(180deg, var(--red), #7a1512);
}
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Tax Invoice ${invoiceNo} | ${PROVIDER.short} → ${BOLOLO.client}</title>
<style>${css}</style>
</head>
<body>
<section class="page">
  <div class="accent" aria-hidden="true"></div>

  <div class="topbar">
    <div class="brand">
      <img class="logo" src="${logoDark}" alt="4DS" />
      <strong style="margin-top:3mm">${PROVIDER.legal}</strong>
      <span>Trading as ${PROVIDER.trading}<br/>
      Reg ${PROVIDER.reg} · ${PROVIDER.country}<br/>
      ${PROVIDER.web} · Prepared by ${PROVIDER.owner}</span>
    </div>
    <div class="doc-title">
      <h1>Tax Invoice</h1>
      <div class="meta">
        Invoice no. <b>${invoiceNo}</b><br/>
        Issue date <b>${issueDate}</b><br/>
        Payment due <b>${dueDate}</b><br/>
        Agreement <b>${agreementRef}</b>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="label">From</div>
      <strong>${PROVIDER.legal}</strong>
      <p>${PROVIDER.trading} · ${PROVIDER.product}</p>
      <p>${PROVIDER.country}</p>
      <p>${PROVIDER.web}</p>
      <p>Owner: ${PROVIDER.owner}</p>
    </div>
    <div class="party bill">
      <div class="label">Bill to</div>
      <strong>${BOLOLO.client}</strong>
      <p>Digital security management system</p>
      <p>Client legal entity: to be completed on signature</p>
      <p>Registration: to be completed on signature</p>
      <p>Attention: Authorised representative</p>
    </div>
  </div>

  <div class="banner">
    <div class="cell">
      <div class="k">Commercial model</div>
      <strong>Once-off build + monthly share</strong>
    </div>
    <div class="cell">
      <div class="k">Standard value</div>
      <strong>R115,000.00</strong>
    </div>
    <div class="cell">
      <div class="k">Amount due now</div>
      <strong>R10,000.00</strong>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:14mm">#</th>
        <th>Description</th>
        <th class="num" style="width:28mm">Qty</th>
        <th class="num" style="width:34mm">Unit (ZAR)</th>
        <th class="num" style="width:36mm">Amount (ZAR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>01</td>
        <td class="desc">
          <strong>Software development &amp; implementation — ${PROVIDER.product}</strong>
          <span>Design, development, configuration and handover of the Bololo Security digital security management system (control room, client portal, officer / technician apps, and related operational modules as agreed).</span>
        </td>
        <td class="num">1</td>
        <td class="num">115,000.00</td>
        <td class="num">115,000.00</td>
      </tr>
      <tr class="discount">
        <td>02</td>
        <td class="desc">
          <strong>Special growth / introductory discount</strong>
          <span>Once-off commercial discount reducing the standard development value to the agreed fee of R10,000.00 (≈ 91.3% discount).</span>
        </td>
        <td class="num">1</td>
        <td class="num">−105,000.00</td>
        <td class="num">−105,000.00</td>
      </tr>
      <tr>
        <td>03</td>
        <td class="desc">
          <strong>Ongoing monthly revenue share — 30%</strong>
          <span>Not billed on this invoice. From go-live, ${BOLOLO.client} pays ${PROVIDER.short} <b>30%</b> of monthly client payments processed through, attributable to, or generated in connection with the System. Invoiced monthly separately against verified revenue.</span>
        </td>
        <td class="num">—</td>
        <td class="num">Monthly</td>
        <td class="num">As earned</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="notes">
      <h3>Payment schedule (once-off fee)</h3>
      <ul>
        <li><strong>Deposit R3,000.00</strong> — due on acceptance / signing of the agreement (or against this invoice).</li>
        <li><strong>Final R7,000.00</strong> — due on substantial completion, before final handover / production launch.</li>
        <li>Total once-off development fee payable: <strong>R10,000.00</strong>.</li>
      </ul>
      <div class="share-box">
        <strong>Ongoing: 30% of monthly client payments</strong>
        <p>In addition to the R10,000.00 once-off fee, ${BOLOLO.client} pays ${PROVIDER.short} <strong>30%</strong> of monthly client payments connected to the System. Example: clients pay R50,000 → share due R15,000. Billed monthly separately.</p>
      </div>
      <div class="share-box" style="margin-top:3mm;background:#fff">
        <strong>Banking details</strong>
        <p>Account name: ____________________ &nbsp; Bank: ____________________</p>
        <p>Account no.: ____________________ &nbsp; Branch: ____________________</p>
        <p>Payment reference: <strong>${invoiceNo}</strong></p>
      </div>
    </div>
    <div class="totals">
      <div class="row"><span class="muted">Subtotal (standard value)</span><strong>R115,000.00</strong></div>
      <div class="row"><span class="muted">Discount</span><strong>− R105,000.00</strong></div>
      <div class="row"><span class="muted">VAT</span><strong>Not charged / as applicable</strong></div>
      <div class="row due"><span class="muted">Amount due (once-off)</span><span>R10,000.00</span></div>
      <div class="row"><span class="muted">Due date</span><strong>${dueDate}</strong></div>
    </div>
  </div>

  <div class="pay" style="display:block">
    <div class="box">
      <h3>Notes</h3>
      <p>This invoice covers the once-off development fee only. Monthly 30% revenue-share invoices will be issued separately against verified client payments. Quote <strong>${invoiceNo}</strong> on all payments. Questions: ${PROVIDER.web} · ${PROVIDER.owner}</p>
    </div>
  </div>

  <div class="foot">
    <span>${PROVIDER.short} · ${BOLOLO.client} · ${invoiceNo} · Confidential</span>
    <span>Page 01</span>
  </div>
</section>
</body>
</html>`;

fs.writeFileSync(outHtml, html, "utf8");
console.log("Wrote HTML:", outHtml);

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const result = spawnSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${outPdf}`,
    "--print-to-pdf-no-header",
    outHtml,
  ],
  { encoding: "utf8" },
);
if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "Chrome print failed");
  process.exit(result.status || 1);
}

fs.copyFileSync(outPdf, outDesktop);
for (const p of [outPdf, outDesktop]) {
  console.log("Wrote PDF:", p, "bytes:", fs.statSync(p).size);
}

const pub = path.join(
  "C:\\Users\\Toxic\\Desktop\\Security Tracking App\\apps\\admin\\public\\documents",
);
if (fs.existsSync(pub)) {
  fs.copyFileSync(outPdf, path.join(pub, "Bololo_Security_4DS_Tax_Invoice.pdf"));
  console.log("Copied to public/documents");
}
