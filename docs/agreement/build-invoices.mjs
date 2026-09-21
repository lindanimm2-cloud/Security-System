import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { PROVIDER, BANK, BOLOLO } from "../brand/doc-info.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoSrcDir = path.join(__dirname, "..", "brand");
const logoDark = "4ds-logo-header.png";
fs.copyFileSync(path.join(logoSrcDir, logoDark), path.join(__dirname, logoDark));

const desktopDir = path.join("C:\\Users\\Toxic\\Desktop", "4DS Invoices");
fs.mkdirSync(desktopDir, { recursive: true });

const pubDir = path.join(
  "C:\\Users\\Toxic\\Desktop\\Security Tracking App\\apps\\admin\\public\\documents",
);

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function bankBlock(reference) {
  return `<div class="bank">
  <h3>Banking details</h3>
  <div class="bank-grid">
    <div><span>Bank</span><strong>${BANK.bank}</strong></div>
    <div><span>Account name</span><strong>${BANK.accountName}</strong></div>
    <div><span>Account number</span><strong>${BANK.accountNumber}</strong></div>
    <div><span>Branch code</span><strong>${BANK.branchCode}</strong></div>
    <div><span>Account type</span><strong>${BANK.accountType}</strong></div>
    <div><span>Registration</span><strong>${BANK.registration}</strong></div>
  </div>
  <p class="bank-ref">Payment reference: <strong>${reference}</strong> · Once-off development fee only · Quote this invoice on payment</p>
</div>`;
}

function sharedCss() {
  return `
:root {
  --ink: #141414;
  --muted: #5a5a5a;
  --line: #d4d4d4;
  --soft: #f4f4f5;
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
  width: 210mm;
  height: 297mm;
  padding: 12mm 15mm 20mm;
  position: relative;
  overflow: hidden;
  background: #fff;
}
.accent {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3.5mm;
  background: linear-gradient(180deg, var(--red), #7a1512);
}
.topbar {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm;
  padding-bottom: 4mm; border-bottom: 2.5px solid var(--dark); margin-bottom: 4.5mm;
}
.brand strong { display: block; font-size: 12pt; font-weight: 800; margin-top: 2.5mm; }
.brand .sub { display: block; font-size: 8pt; color: var(--muted); margin-top: 1.5mm; line-height: 1.45; }
.logo { height: 30px; width: auto; display: block; background: transparent; object-fit: contain; }
.doc-title { text-align: right; flex: 0 0 auto; }
.doc-title h1 {
  margin: 0 0 3px; font-size: 18pt; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.doc-title .meta { font-size: 8.5pt; color: var(--muted); line-height: 1.55; }
.doc-title .meta b { color: var(--ink); }

.parties {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm;
  margin-bottom: 4mm;
}
.party {
  background: var(--soft); border-top: 3px solid var(--dark);
  padding: 2.5mm 3mm; min-height: 22mm;
}
.party.bill { border-top-color: var(--red); }
.party .label {
  font-size: 7pt; letter-spacing: 0.12em; text-transform: uppercase;
  font-weight: 750; color: var(--muted); margin-bottom: 2mm;
}
.party strong { display: block; font-size: 11pt; margin-bottom: 1mm; }
.party p { margin: 0 0 0.8mm; font-size: 8.5pt; line-height: 1.4; color: #333; }
.party .fill {
  display: block; border-bottom: 1px solid #bbb; min-height: 11px; margin: 2px 0 4px;
}

.banner {
  display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 2.5mm;
  margin-bottom: 3.5mm;
}
.banner .cell { border: 1px solid var(--line); padding: 2.5mm 3mm; }
.banner .k {
  font-size: 6.5pt; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); font-weight: 750;
}
.banner strong { display: block; margin-top: 1mm; font-size: 10pt; }

.body { }

table {
  width: 100%; border-collapse: collapse; margin-bottom: 3mm;
  font-size: 8.2pt; line-height: 1.3;
}
th {
  background: var(--dark); color: #fff; text-align: left;
  padding: 5px 7px; font-size: 7pt; letter-spacing: 0.06em; text-transform: uppercase;
}
td { border-bottom: 1px solid var(--line); padding: 5px 7px; vertical-align: top; }
td.num, th.num { text-align: right; white-space: nowrap; }
td.desc strong { display: block; font-size: 9pt; margin-bottom: 1mm; }
td.desc span { color: #444; font-size: 8pt; }
tr.discount td { background: #f8e8e7; }
tr.discount td.num { color: var(--red); font-weight: 700; }
tr.blank td { height: 8mm; }

.totals-wrap {
  display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3.5mm;
  margin-bottom: 3mm; align-items: start;
}
.notes { font-size: 8pt; line-height: 1.45; color: #333; }
.notes h3 {
  margin: 0 0 1.5mm; font-size: 7.5pt; letter-spacing: 0.08em;
  text-transform: uppercase; font-weight: 750;
}
.notes ul { margin: 0 0 2.5mm; padding-left: 4mm; }
.notes li { margin-bottom: 1mm; }
.callout {
  border: 1px solid var(--dark); padding: 2.8mm 3.2mm; background: var(--soft); margin-bottom: 2.5mm;
}
.callout strong { display: block; font-size: 9pt; margin-bottom: 1mm; }
.callout p { margin: 0; font-size: 8pt; line-height: 1.4; }

.totals { border: 1px solid var(--line); }
.totals .row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 2.2mm 3.5mm; border-bottom: 1px solid var(--line); font-size: 9pt;
}
.totals .row:last-child { border-bottom: 0; }
.totals .row.due { background: var(--dark); color: #fff; font-size: 11pt; font-weight: 800; }
.totals .muted { color: var(--muted); }
.totals .row.due .muted { color: rgba(255,255,255,0.72); }

.bank {
  border: 1px solid var(--line); padding: 2.5mm 3mm; margin: 0 0 0; background: #fff;
}
.bank h3 {
  margin: 0 0 1.5mm; font-size: 7.5pt; letter-spacing: 0.1em;
  text-transform: uppercase; font-weight: 750; color: var(--muted);
}
.bank-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5mm 3mm;
}
.bank-grid span {
  display: block; font-size: 6.5pt; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--muted); font-weight: 700;
}
.bank-grid strong { display: block; font-size: 8.5pt; margin-top: 0.4mm; }
.bank-ref { margin: 2mm 0 0; font-size: 8pt; }

.note-line {
  font-size: 7.8pt; color: #444; line-height: 1.4; margin: 2.5mm 0 0;
}

.foot {
  position: absolute;
  left: 15mm;
  right: 15mm;
  bottom: 8mm;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 7pt; color: #888;
  border-top: 1px solid #ddd; padding-top: 3px;
  background: #fff;
  z-index: 2;
}
`;
}

function wrapHtml(title, bodyInner) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>${sharedCss()}</style>
</head>
<body>
<section class="page">
  <div class="accent" aria-hidden="true"></div>
  ${bodyInner}
</section>
</body>
</html>`;
}

function headerBlock(metaLines) {
  return `<div class="topbar">
  <div class="brand">
    <img class="logo" src="${logoDark}" alt="4DS" />
    <strong>${PROVIDER.legal}</strong>
    <span class="sub">Trading as ${PROVIDER.trading}<br/>
    Reg ${PROVIDER.reg} · ${PROVIDER.country}<br/>
    ${PROVIDER.web} · ${PROVIDER.owner}</span>
  </div>
  <div class="doc-title">
    <h1>Tax Invoice</h1>
    <div class="meta">${metaLines}</div>
  </div>
</div>`;
}

function printPdf(htmlPath, pdfPath) {
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--print-to-pdf-no-header",
      `--print-to-pdf=${pdfPath}`,
      htmlPath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || "Chrome print failed");
    process.exit(result.status || 1);
  }
}

function writeInvoice({ fileBase, title, html }) {
  const htmlPath = path.join(__dirname, `${fileBase}.html`);
  const pdfPath = path.join(__dirname, `${fileBase}.pdf`);
  const deskPath = path.join(desktopDir, `${fileBase}.pdf`);
  fs.writeFileSync(htmlPath, html, "utf8");
  printPdf(htmlPath, pdfPath);
  fs.copyFileSync(pdfPath, deskPath);
  if (fs.existsSync(pubDir)) {
    fs.copyFileSync(pdfPath, path.join(pubDir, `${fileBase}.pdf`));
  }
  console.log("Wrote", fileBase + ".pdf", "bytes:", fs.statSync(pdfPath).size);
}

/* ── 1. Bololo filled invoice ─────────────────────────────────── */
const bololoNo = "INV-4DS-BOLOLO-2026-001";
const issueDate = "14 September 2026";
const dueDate = "21 September 2026";

writeInvoice({
  fileBase: "Bololo_Security_4DS_Tax_Invoice",
  title: `Tax Invoice ${bololoNo}`,
  html: wrapHtml(
    `Tax Invoice ${bololoNo} | ${PROVIDER.short} → ${BOLOLO.client}`,
    `${headerBlock(`Invoice no. <b>${bololoNo}</b><br/>
        Issue date <b>${issueDate}</b><br/>
        Payment due <b>${dueDate}</b><br/>
        Agreement <b>${BOLOLO.agreementCode}</b>`)}
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
    <div class="cell"><div class="k">Commercial model</div><strong>Once-off build + monthly share</strong></div>
    <div class="cell"><div class="k">Standard value</div><strong>R115,000.00</strong></div>
    <div class="cell"><div class="k">Amount due now</div><strong>R10,000.00</strong></div>
  </div>
  <div class="body">
    <table>
      <thead>
        <tr>
          <th style="width:12mm">#</th>
          <th>Description</th>
          <th class="num" style="width:22mm">Qty</th>
          <th class="num" style="width:30mm">Unit (ZAR)</th>
          <th class="num" style="width:32mm">Amount (ZAR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>01</td>
          <td class="desc">
            <strong>Software development &amp; implementation — ${PROVIDER.product}</strong>
            <span>Design, build, configure and hand over the Bololo Security system (control room, client portal, officer / technician apps).</span>
          </td>
          <td class="num">1</td>
          <td class="num">115,000.00</td>
          <td class="num">115,000.00</td>
        </tr>
        <tr class="discount">
          <td>02</td>
          <td class="desc">
            <strong>Special growth / introductory discount</strong>
            <span>Once-off discount to the agreed fee of R10,000.00 (≈ 91.3%).</span>
          </td>
          <td class="num">1</td>
          <td class="num">−105,000.00</td>
          <td class="num">−105,000.00</td>
        </tr>
        <tr>
          <td>03</td>
          <td class="desc">
            <strong>Ongoing monthly revenue share — 30%</strong>
            <span>Not billed here. From go-live: <b>30%</b> of monthly client payments connected to the System, billed monthly separately.</span>
          </td>
          <td class="num">—</td>
          <td class="num">Monthly</td>
          <td class="num">As earned</td>
        </tr>
      </tbody>
    </table>
    <div class="totals-wrap">
      <div class="notes">
        <h3>Payment schedule (once-off)</h3>
        <ul>
          <li><strong>Deposit R3,000.00</strong> — on acceptance / signing.</li>
          <li><strong>Final R7,000.00</strong> — on substantial completion, before handover.</li>
          <li>Total once-off fee: <strong>R10,000.00</strong>.</li>
        </ul>
        <div class="callout">
          <strong>Ongoing: 30% of monthly client payments</strong>
          <p>Example: clients pay R50,000 → share due R15,000. Billed monthly separately.</p>
        </div>
      </div>
      <div class="totals">
        <div class="row"><span class="muted">Subtotal (standard)</span><strong>R115,000.00</strong></div>
        <div class="row"><span class="muted">Discount</span><strong>− R105,000.00</strong></div>
        <div class="row"><span class="muted">VAT</span><strong>As applicable</strong></div>
        <div class="row due"><span class="muted">Amount due now</span><span>R10,000.00</span></div>
        <div class="row"><span class="muted">Due date</span><strong>${dueDate}</strong></div>
      </div>
    </div>
    ${bankBlock(bololoNo)}
  </div>
  <div class="foot">
    <span>${PROVIDER.short} · ${BOLOLO.client} · ${bololoNo} · Confidential</span>
    <span>Page 01 / 01</span>
  </div>`,
  ),
});

/* ── 2. Generic blank tax invoice template ────────────────────── */
writeInvoice({
  fileBase: "4DS_Tax_Invoice_Template_Blank",
  title: "4DS Tax Invoice Template (Blank)",
  html: wrapHtml(
    `Tax Invoice Template | ${PROVIDER.short}`,
    `${headerBlock(`Invoice no. <b>INV-4DS-________-____</b><br/>
        Issue date <b>____________________</b><br/>
        Payment due <b>____________________</b><br/>
        Reference <b>____________________</b>`)}
  <div class="parties">
    <div class="party">
      <div class="label">From</div>
      <strong>${PROVIDER.legal}</strong>
      <p>${PROVIDER.trading} · ${PROVIDER.product}</p>
      <p>Reg ${PROVIDER.reg} · ${PROVIDER.country}</p>
      <p>${PROVIDER.web}</p>
      <p>Owner: ${PROVIDER.owner}</p>
    </div>
    <div class="party bill">
      <div class="label">Bill to</div>
      <strong>Client / company name</strong>
      <p>Legal entity: <span class="fill"></span></p>
      <p>Registration: <span class="fill"></span></p>
      <p>Address: <span class="fill"></span></p>
      <p>Attention: <span class="fill"></span></p>
    </div>
  </div>
  <div class="body">
    <table>
      <thead>
        <tr>
          <th style="width:12mm">#</th>
          <th>Description</th>
          <th class="num" style="width:22mm">Qty</th>
          <th class="num" style="width:30mm">Unit (ZAR)</th>
          <th class="num" style="width:32mm">Amount (ZAR)</th>
        </tr>
      </thead>
      <tbody>
        <tr class="blank"><td>01</td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
        <tr class="blank"><td>02</td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
        <tr class="blank"><td>03</td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
        <tr class="blank"><td>04</td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
      </tbody>
    </table>
    <div class="totals-wrap">
      <div class="notes">
        <h3>Notes / terms</h3>
        <p class="note-line" style="margin:0 0 1.5mm">Payment is due as stated above. Quote the invoice number as reference.</p>
        <p class="note-line" style="margin:0">Additional development outside agreed scope may be quoted separately.</p>
      </div>
      <div class="totals">
        <div class="row"><span class="muted">Subtotal</span><strong>R ____________</strong></div>
        <div class="row"><span class="muted">Discount</span><strong>R ____________</strong></div>
        <div class="row"><span class="muted">VAT</span><strong>R ____________</strong></div>
        <div class="row due"><span class="muted">Amount due</span><span>R ____________</span></div>
      </div>
    </div>
    ${bankBlock("INV-4DS-________")}
  </div>
  <div class="foot">
    <span>${PROVIDER.short} · Tax invoice template · Confidential</span>
    <span>Page 01 / 01</span>
  </div>`,
  ),
});

/* ── 3. Generic monthly revenue-share invoice template ────────── */
writeInvoice({
  fileBase: "4DS_Tax_Invoice_Template_Monthly_Share",
  title: "4DS Monthly Revenue Share Invoice Template",
  html: wrapHtml(
    `Monthly Revenue Share Invoice Template | ${PROVIDER.short}`,
    `${headerBlock(`Invoice no. <b>INV-4DS-SHARE-____-__</b><br/>
        Billing month <b>____________________</b><br/>
        Issue date <b>____________________</b><br/>
        Payment due <b>____________________</b>`)}
  <div class="parties">
    <div class="party">
      <div class="label">From</div>
      <strong>${PROVIDER.legal}</strong>
      <p>${PROVIDER.trading} · ${PROVIDER.product}</p>
      <p>Reg ${PROVIDER.reg} · ${PROVIDER.country}</p>
      <p>${PROVIDER.web}</p>
    </div>
    <div class="party bill">
      <div class="label">Bill to</div>
      <strong>Client / company name</strong>
      <p>Legal entity: <span class="fill"></span></p>
      <p>Registration: <span class="fill"></span></p>
      <p>Agreement ref: <span class="fill"></span></p>
      <p>Share rate: <span class="fill"></span> %</p>
    </div>
  </div>
  <div class="banner">
    <div class="cell"><div class="k">Gross client payments (month)</div><strong>R ____________</strong></div>
    <div class="cell"><div class="k">Agreed share %</div><strong>________ %</strong></div>
    <div class="cell"><div class="k">Share due</div><strong>R ____________</strong></div>
  </div>
  <div class="body">
    <table>
      <thead>
        <tr>
          <th style="width:12mm">#</th>
          <th>Description</th>
          <th class="num" style="width:28mm">Basis (ZAR)</th>
          <th class="num" style="width:22mm">Rate</th>
          <th class="num" style="width:32mm">Amount (ZAR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>01</td>
          <td class="desc">
            <strong>Monthly revenue share</strong>
            <span>Share of client payments processed through / attributable to / generated in connection with the System for the billing month stated above.</span>
          </td>
          <td class="num">____________</td>
          <td class="num">____ %</td>
          <td class="num">____________</td>
        </tr>
        <tr class="blank"><td>02</td><td class="desc"><strong>Adjustments / credits</strong><span>If any</span></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>
      </tbody>
    </table>
    <div class="totals-wrap">
      <div class="notes">
        <h3>Verification</h3>
        <p class="note-line">Gross monthly client payments: R ____________</p>
        <p class="note-line">Supporting schedule attached: Yes / No</p>
        <p class="note-line">Prepared / checked by: ____________________</p>
        <div class="callout" style="margin-top:3mm">
          <strong>Worked example</strong>
          <p>If clients pay R50,000 and the share is 30%, amount due = R15,000.</p>
        </div>
      </div>
      <div class="totals">
        <div class="row"><span class="muted">Gross client payments</span><strong>R ____________</strong></div>
        <div class="row"><span class="muted">Share %</span><strong>________ %</strong></div>
        <div class="row"><span class="muted">VAT</span><strong>As applicable</strong></div>
        <div class="row due"><span class="muted">Amount due</span><span>R ____________</span></div>
      </div>
    </div>
    ${bankBlock("INV-4DS-SHARE-____")}
  </div>
  <div class="foot">
    <span>${PROVIDER.short} · Monthly revenue-share invoice template · Confidential</span>
    <span>Page 01 / 01</span>
  </div>`,
  ),
});

console.log("Desktop folder:", desktopDir);
