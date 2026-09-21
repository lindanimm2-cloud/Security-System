import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

import { PROVIDER, ISSUE, ON_SIGNATURE, BOLOLO } from "../brand/doc-info.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outHtml = path.join(__dirname, "Bololo_Security_4DS_Software_Development_Revenue_Share_Agreement.html");
const outPdfDocs = path.join(__dirname, "Bololo_Security_4DS_Software_Development_Revenue_Share_Agreement.pdf");
const outPdfDesktop = path.join(
  "C:\\Users\\Toxic\\Desktop",
  "Bololo_Security_4DS_Software_Development_Revenue_Share_Agreement.pdf",
);

const logoSrcDir = path.join(__dirname, "..", "brand");
const logoDark = "4ds-logo-header.png";
const logoLight = "4ds-logo-cover.png";
for (const file of [logoDark, logoLight]) {
  fs.copyFileSync(path.join(logoSrcDir, file), path.join(__dirname, file));
}

const css = `
:root {
  --ink: #111;
  --muted: #666;
  --line: #d0d0d0;
  --zebra: #f3f3f3;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  font-family: "Segoe UI", Arial, Helvetica, sans-serif;
  color: var(--ink);
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@page { size: A4; margin: 0; }
.page {
  width: 210mm;
  height: 297mm;
  padding: 16mm 18mm 20mm;
  position: relative;
  page-break-after: always;
  overflow: hidden;
  background: #fff;
}
.page:last-child { page-break-after: auto; }
.cover {
  background-color: #161616;
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E"),
    linear-gradient(165deg, #1f1f1f 0%, #121212 55%, #171717 100%);
  background-blend-mode: soft-light, normal;
  color: #fff;
  padding: 18mm 20mm 20mm;
}
.cover * { color: #fff; }
.cover-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32mm;
}
.cover-eyebrow {
  font-size: 10pt;
  letter-spacing: 0.01em;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(255,255,255,0.9);
  display: inline-block;
  margin-top: 4px;
}
.logo {
  height: 28px;
  width: auto;
  display: block;
  background: transparent;
  border: 0 !important;
  box-shadow: none !important;
  object-fit: contain;
}
.logo-lg {
  height: 52px;
  width: auto;
  background: transparent;
  padding: 0;
}
.cover-hero {
  margin: 0 0 11mm;
  max-width: 162mm;
}
.cover-hero h1 {
  margin: 0 0 7px;
  font-size: 30pt;
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1.05;
}
.cover-hero .sub {
  margin: 0 0 9px;
  font-size: 13.5pt;
  font-weight: 400;
  line-height: 1.35;
}
.cover-hero .doc-type {
  margin: 0;
  font-size: 10pt;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.5;
  max-width: 155mm;
}
.cover-intro {
  font-size: 10pt;
  line-height: 1.7;
  max-width: 162mm;
  margin: 0 0 14mm;
  opacity: 0.96;
}
.meta-grid {
  display: grid;
  grid-template-columns: 52mm 1fr;
  row-gap: 12px;
  column-gap: 10px;
  font-size: 10.5pt;
  line-height: 1.5;
  margin-bottom: 18mm;
  align-items: center;
}
.meta-grid .label { font-weight: 700; }
.meta-grid .value {
  border-bottom: 1px solid rgba(255,255,255,0.5);
  min-height: 20px;
  padding-bottom: 2px;
}
.cover-foot {
  position: absolute;
  left: 20mm;
  right: 20mm;
  bottom: 18mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 9.5pt;
  line-height: 1.65;
}
.cover-foot strong { display: block; margin-bottom: 4px; }
.doc-control {
  font-size: 8.5pt;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
  font-weight: 700;
  margin: -10mm 0 8mm;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #bbb;
  margin-bottom: 8mm;
}
.sec-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.sec-num {
  background: #111;
  color: #fff;
  font-weight: 700;
  font-size: 12pt;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.sec-title h1 {
  margin: 0;
  font-size: 15.5pt;
  font-weight: 700;
  line-height: 1.2;
}
.lede {
  font-size: 10pt;
  line-height: 1.6;
  margin: 0 0 4.5mm;
  color: #222;
}
.clause {
  font-size: 10pt;
  line-height: 1.62;
  margin: 0 0 3.8mm;
}
.clause strong.num { font-weight: 700; }
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.4pt;
  line-height: 1.45;
  margin: 0 0 4.5mm;
}
th, td {
  border: 1px solid #c8c8c8;
  padding: 7px 9px;
  vertical-align: top;
  text-align: left;
}
th {
  background: #111;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-size: 8.8pt;
}
tr:nth-child(even) td { background: var(--zebra); }
.totals td { font-weight: 700; background: #ececec !important; }
.note {
  font-size: 9.3pt;
  line-height: 1.58;
  color: #333;
  margin: 0 0 4mm;
}
.page-footer {
  position: absolute;
  left: 18mm;
  right: 18mm;
  bottom: 10mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8pt;
  color: #888;
  border-top: 1px solid #ccc;
  padding-top: 6px;
}
.toc {
  list-style: none;
  margin: 0 0 6mm;
  padding: 0;
  font-size: 10.5pt;
  line-height: 1.85;
}
.toc li { display: flex; gap: 10px; }
.toc .n {
  width: 18px;
  font-weight: 700;
  flex: 0 0 auto;
}
h2.block {
  margin: 1mm 0 3mm;
  font-size: 11pt;
  font-weight: 700;
}
.sig td { height: 22px; }
`;

function header(num, title) {
  return `<div class="page-header">
  <div class="sec-title">
    <div class="sec-num">${num}</div>
    <h1>${title}</h1>
  </div>
  <img class="logo" src="${logoDark}" alt="4DS" />
</div>`;
}

function footer(page) {
  return `<div class="page-footer">
  <span>${PROVIDER.short} • ${BOLOLO.client} • ${BOLOLO.agreementCode} • v${ISSUE.version} • Confidential</span>
  <span>${String(page).padStart(2, "0")}</span>
</div>`;
}

function page(inner) {
  return `<section class="page">${inner}</section>`;
}

const pages = [];

pages.push(`<section class="page cover">
  <div class="cover-top">
    <div class="cover-eyebrow">Bololo Security software services agreement</div>
    <img class="logo logo-lg" src="${logoLight}" alt="4DS" />
  </div>
  <div class="cover-hero">
    <h1>BOLOLO SECURITY</h1>
    <p class="sub">Digital Security Management System</p>
    <p class="doc-type">Software Development, Implementation &amp; Revenue-Share Agreement</p>
  </div>
  <p class="cover-intro">This Agreement sets out the terms under which ${PROVIDER.short} will design, develop, configure and implement a digital security management system for ${BOLOLO.client}, and the commercial terms of the agreed development fee and ongoing revenue share.</p>
  <div class="meta-grid">
    <div class="label">Prepared for:</div><div class="value">${BOLOLO.client}</div>
    <div class="label">Document:</div><div class="value">${BOLOLO.agreementCode} · v${ISSUE.version} · ${ISSUE.date}</div>
    <div class="label">Agreement date:</div><div class="value">${ON_SIGNATURE}</div>
    <div class="label">Client legal entity:</div><div class="value">${ON_SIGNATURE}</div>
    <div class="label">Client registration no.:</div><div class="value">${ON_SIGNATURE}</div>
    <div class="label">Commercial model:</div><div class="value">R10,000.00 development fee + 10% monthly revenue share</div>
    <div class="label">Document status:</div><div class="value">For signature · ${BOLOLO.agreementClass}</div>
  </div>
  <div class="cover-foot">
    <div class="prepared">
      <strong>Prepared by:</strong>
      ${PROVIDER.owner}<br/>
      ${PROVIDER.legal}<br/>
      ${PROVIDER.reg} · ${PROVIDER.country}<br/>
      ${PROVIDER.web}
    </div>
    <div>${BOLOLO.agreementClass}</div>
  </div>
</section>`);

pages.push(page(`${header("00", "Contents")}
<ol class="toc">
${[
  "Parties & Appointment",
  "Purpose of Agreement",
  "Project Scope",
  "Project Fee, Discount & Payment",
  "Recurring Revenue Share",
  "Revenue Reporting & Payment",
  "Third-Party Services",
  "Development, Delivery & Responsibilities",
  "Support, Hosting & Continuity",
  "Ownership & Intellectual Property",
  "Confidentiality, Data Protection & Access",
  "Late Payment, Termination & Liability",
  "Changes, Entire Agreement & Acceptance",
  "Signatures",
]
  .map((t, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><span>${t}</span></li>`)
  .join("")}
</ol>
<p class="note"><strong>Commercial status:</strong> This Agreement becomes binding when signed by authorised representatives of both parties. The R10,000.00 development fee, payment schedule and 10% monthly revenue share form part of the contracted commercial terms.</p>
<p class="note">Governing law: Republic of South Africa. This document should be reviewed by a South African attorney before execution where either party requires independent legal advice.</p>
${footer(2)}`));

pages.push(page(`${header("01", "Parties & Appointment")}
<table>
<thead><tr><th style="width:46mm">PARTY</th><th>DETAILS</th></tr></thead>
<tbody>
<tr><td><strong>Provider</strong></td><td>${PROVIDER.legal}, trading as ${PROVIDER.trading}<br/>Registration: ${PROVIDER.reg} · ${PROVIDER.country}<br/>${PROVIDER.web}</td></tr>
<tr><td><strong>Client</strong></td><td>${BOLOLO.client}<br/>Legal name: ${ON_SIGNATURE}</td></tr>
<tr><td><strong>Client registration</strong></td><td>${ON_SIGNATURE}</td></tr>
<tr><td><strong>Client address</strong></td><td>${ON_SIGNATURE}</td></tr>
<tr><td><strong>Effective date</strong></td><td>${ON_SIGNATURE}</td></tr>
<tr><td><strong>Authorised representative</strong></td><td>Name: ____________________ &nbsp;&nbsp; Position: ____________________</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">1.1 Appointment.</strong> Bololo Security appoints 4DS Solutions to design, develop, configure and implement the digital security management system described in this Agreement, and 4DS Solutions accepts that appointment subject to these terms.</p>
<p class="clause"><strong class="num">1.2 Authority.</strong> The person signing for each party warrants that they are authorised to bind that party, or have obtained the necessary internal approval.</p>
<p class="clause"><strong class="num">1.3 Definitions.</strong> In this Agreement, <strong>“System”</strong> means the specifically commissioned digital security management system/application for Bololo Security; <strong>“Development Fee”</strong> means the agreed amount of R10,000.00; and <strong>“Revenue Share”</strong> means the ongoing 10% share of applicable monthly client payments described in clause 4.</p>
${footer(3)}`));

pages.push(page(`${header("02", "Purpose of Agreement")}
<p class="clause"><strong class="num">2.1 Purpose.</strong> This Agreement sets out the terms under which 4DS Solutions will design, develop, configure and implement a digital security management system/application for Bololo Security. The System is intended to provide a centralised platform for managing security operations, clients, security services and related activities.</p>
<p class="clause"><strong class="num">2.2 Nature of the System.</strong> The System is a technology management and communication tool. It does not replace trained security personnel, emergency services or appropriate security procedures.</p>
<h2 class="block">03 · Project Scope</h2>
<p class="clause"><strong class="num">3.1 Initial system.</strong> The initial System may include:</p>
<table>
<thead><tr><th style="width:58mm">AREA</th><th>INCLUDED FUNCTIONALITY (AS AGREED)</th></tr></thead>
<tbody>
<tr><td>Client &amp; property</td><td>Client management; client/property profiles; property information</td></tr>
<tr><td>Operations</td><td>Security service management; site management; patrol/security activity records; operational status tracking</td></tr>
<tr><td>Personnel</td><td>Security officers and personnel management; staff/officer management; user accounts; role-based access</td></tr>
<tr><td>Incidents &amp; alerts</td><td>Incident reporting; alerts; notifications; system activity records and reporting</td></tr>
<tr><td>Administration</td><td>Administrative and management dashboards</td></tr>
<tr><td>Client / mobile (where agreed)</td><td>Security information; emergency/panic functionality; notifications; incident reporting; communication; property information; account information</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">3.2 Future functionality.</strong> Future functionality such as CCTV, GPS/fleet tracking, officer applications, supervisor/control-room functions, patrols, payment integrations, advanced reporting, AI and third-party integrations may be added by separate agreement or quotation. Such items are not included merely because they are listed as possible future work.</p>
${footer(4)}`));

pages.push(page(`${header("04", "Project Fee, Discount & Payment")}
<p class="clause"><strong class="num">4.1 Development fee.</strong> The total initial development and implementation fee is <strong>R10,000.00</strong>.</p>
<p class="clause"><strong class="num">4.2 Commercial value.</strong> The parties acknowledge that the development, design, configuration, implementation and associated functionality comprising the agreed security management system represents a standard commercial development value of <strong>R115,000.00</strong>.</p>
<p class="clause"><strong class="num">4.3 Growing-company discount.</strong> 4DS Solutions has agreed to provide Bololo Security with the System at a substantially reduced introductory price because Bololo Security is a growing company and 4DS Solutions wishes to support its growth by making the technology more accessible at an early stage of the Company’s development.</p>
<p class="clause"><strong class="num">4.4 Discount amount.</strong> This special arrangement reduces the standard commercial value from R115,000.00 to an agreed development price of R10,000.00, representing a discount of <strong>R105,000.00</strong> (approximately 91.3%).</p>
<table>
<thead><tr><th>COMMERCIAL ITEM</th><th style="width:48mm">AMOUNT</th></tr></thead>
<tbody>
<tr><td>Standard commercial development value</td><td>R115,000.00</td></tr>
<tr><td>Special growth / introductory discount</td><td>− R105,000.00</td></tr>
<tr class="totals"><td>Agreed development price</td><td>R10,000.00</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">4.5 No precedent price.</strong> The R10,000.00 price is a special strategic/introductory commercial arrangement for Bololo Security and does not establish R10,000.00 as the standard or future price for equivalent systems, additional modules, integrations, support services or future projects. Similar systems supplied to other security companies or third parties may be quoted at 4DS Solutions’ prevailing commercial rates, which may be substantially higher.</p>
<p class="clause"><strong class="num">4.6 Discount does not waive rights.</strong> The discount does not waive 4DS Solutions’ intellectual-property rights, development methodologies, reusable software components, frameworks or commercial pricing structure.</p>
${footer(5)}`));

pages.push(page(`${header("04", "Payment Schedule")}
<p class="clause"><strong class="num">4.7 Payment schedule.</strong> The Development Fee is payable as follows:</p>
<table>
<thead><tr><th>MILESTONE</th><th>WHEN DUE</th><th style="width:36mm">AMOUNT</th></tr></thead>
<tbody>
<tr><td>Deposit</td><td>Upon acceptance / signing of this Agreement</td><td>R3,000.00</td></tr>
<tr><td>Final payment</td><td>Upon substantial completion and before final handover or production launch</td><td>R7,000.00</td></tr>
<tr class="totals"><td>Total Development Fee</td><td></td><td>R10,000.00</td></tr>
</tbody>
</table>
<h2 class="block">05 · Recurring Revenue Share</h2>
<p class="clause"><strong class="num">5.1 Revenue share.</strong> In addition to the once-off Development Fee, Bololo Security agrees to pay 4DS Solutions a recurring revenue share equal to <strong>10%</strong> of monthly client payments processed through, attributable to, or generated in connection with the System/application.</p>
<p class="clause"><strong class="num">5.2 Separate and continuing.</strong> The 10% revenue share is separate from the R10,000.00 Development Fee and does not expire merely because the Development Fee has been fully paid.</p>
<p class="clause"><strong class="num">5.3 Worked example.</strong> If 100 clients each pay R500 per month, total monthly client revenue is R50,000 and the 4DS revenue share is R5,000.</p>
<table>
<thead><tr><th>EXAMPLE</th><th>CALCULATION</th></tr></thead>
<tbody>
<tr><td>Clients using the System</td><td>100</td></tr>
<tr><td>Monthly fee per client</td><td>R500.00</td></tr>
<tr><td>Total monthly client payments</td><td>R50,000.00</td></tr>
<tr class="totals"><td>4DS revenue share (10%)</td><td>R5,000.00</td></tr>
</tbody>
</table>
<p class="note">The example is illustrative only. The actual amount payable is 10% of applicable monthly client payments as defined in this Agreement.</p>
${footer(6)}`));

pages.push(page(`${header("06", "Revenue Reporting & Payment")}
<p class="clause"><strong class="num">6.1 Reporting.</strong> Bololo Security shall provide accurate information regarding active clients using the System and monthly payments received from such clients.</p>
<p class="clause"><strong class="num">6.2 System records.</strong> Where payment functionality is integrated, system records may be used to calculate the revenue share.</p>
<p class="clause"><strong class="num">6.3 Off-system payments.</strong> Payments received outside the System but relating to clients using the application must be accurately reported.</p>
<p class="clause"><strong class="num">6.4 Due date.</strong> The revenue share is payable within <strong>7 calendar days</strong> after each calendar month unless otherwise agreed in writing.</p>
<p class="clause"><strong class="num">6.5 Verification.</strong> 4DS Solutions may reasonably request supporting information to verify calculations.</p>
<h2 class="block">07 · Third-Party Services</h2>
<p class="clause"><strong class="num">7.1 Separate charges.</strong> Payment gateways, SMS providers, WhatsApp services, mapping services, hosting/cloud providers, notification services and other third-party platforms may charge separate fees.</p>
<p class="clause"><strong class="num">7.2 Not included in revenue share.</strong> Such fees are not included in the 10% revenue share unless expressly agreed in writing and remain the responsibility of Bololo Security unless included in a separate quotation.</p>
<table>
<thead><tr><th style="width:58mm">THIRD-PARTY COST</th><th>TREATMENT</th></tr></thead>
<tbody>
<tr><td>Payment gateways</td><td>Client-paid unless separately quoted</td></tr>
<tr><td>SMS / WhatsApp / notifications</td><td>Client-paid unless separately quoted</td></tr>
<tr><td>Mapping / location services</td><td>Client-paid unless separately quoted</td></tr>
<tr><td>Hosting / cloud / domain / database / APIs</td><td>Charged separately unless expressly included</td></tr>
</tbody>
</table>
${footer(7)}`));

pages.push(page(`${header("08", "Development, Delivery & Responsibilities")}
<p class="clause"><strong class="num">8.1 Reasonable efforts.</strong> 4DS Solutions will use commercially reasonable efforts to develop and implement the agreed System. The process may include requirements confirmation, database/system setup, UI development, core functionality, access/security configuration, testing, bug fixing, deployment and handover.</p>
<p class="clause"><strong class="num">8.2 Timelines.</strong> Timelines may vary depending on requirements, feedback, third-party integrations and information supplied by Bololo Security.</p>
<p class="clause"><strong class="num">8.3 Client responsibilities.</strong> Bololo Security will:</p>
<table>
<thead><tr><th style="width:12mm">NO.</th><th>RESPONSIBILITY</th></tr></thead>
<tbody>
<tr><td>8.3.1</td><td>Provide accurate business information, branding and content</td></tr>
<tr><td>8.3.2</td><td>Provide timely feedback and approvals</td></tr>
<tr><td>8.3.3</td><td>Ensure information supplied may lawfully be used</td></tr>
<tr><td>8.3.4</td><td>Manage authorised System access</td></tr>
<tr><td>8.3.5</td><td>Pay amounts due</td></tr>
<tr><td>8.3.6</td><td>Accurately report monthly revenue</td></tr>
<tr><td>8.3.7</td><td>Comply with applicable laws and regulations governing its security operations</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">8.4 Defects.</strong> 4DS Solutions will correct genuine technical defects in originally agreed functionality during the initial implementation period at no additional development charge. A defect is functionality that does not operate substantially according to the agreed specification.</p>
<p class="clause"><strong class="num">8.5 Not defects.</strong> New features, business-rule changes, redesigns, integrations or additional modules are not defects and may be quoted separately. Verbal requests do not automatically constitute an agreement to provide additional work free of charge.</p>
${footer(8)}`));

pages.push(page(`${header("09", "Support, Hosting & Continuity")}
<p class="clause"><strong class="num">9.1 Ongoing support.</strong> Ongoing support, maintenance, hosting, monitoring, upgrades and additional development may be provided under a separate monthly support agreement or quotation. The 10% revenue share does not automatically include unlimited custom development.</p>
<p class="clause"><strong class="num">9.2 Hosting.</strong> Hosting and infrastructure may use third-party providers. Hosting, domain, database, SMS, API and other infrastructure costs may be charged separately unless expressly included.</p>
<p class="clause"><strong class="num">9.3 Third-party outages.</strong> 4DS Solutions is not responsible for outages caused by third-party infrastructure, payment gateways, networks or external services outside its reasonable control.</p>
<p class="clause"><strong class="num">9.4 Availability.</strong> 4DS Solutions will make reasonable efforts to maintain System availability. Temporary interruptions may occur due to maintenance, upgrades, infrastructure failures, cyber incidents, third-party outages or circumstances outside reasonable control.</p>
<h2 class="block">10 · Ownership &amp; Intellectual Property</h2>
<p class="clause"><strong class="num">10.1 Licence to use.</strong> Upon receipt of the full R10,000.00 Development Fee, Bololo Security will have the right to use the specifically commissioned System for its business operations.</p>
<p class="clause"><strong class="num">10.2 4DS retained rights.</strong> 4DS Solutions retains ownership of its pre-existing code, frameworks, reusable components, templates, methodologies, generic architecture, internal tools and reusable development processes unless otherwise agreed in writing.</p>
<p class="clause"><strong class="num">10.3 No resale of framework.</strong> Bololo Security may not resell or commercially license the underlying 4DS framework to third parties without written permission.</p>
<p class="clause"><strong class="num">10.4 Revenue-share rights.</strong> The parties acknowledge that the 10% monthly revenue share is a separate ongoing commercial component of the arrangement. Payment of the R10,000.00 Development Fee does not terminate or buy out the 10% revenue-share arrangement. The revenue share continues while Bololo Security provides paid services to clients through, by means of, or using the System/application, unless the parties agree otherwise in writing.</p>
<p class="clause"><strong class="num">10.5 Non-circumvention.</strong> Bololo Security shall not deliberately restructure, redirect or manipulate client payments for the primary purpose of avoiding the agreed 10% revenue share where those clients continue to use the System/application. The parties agree to act in good faith and maintain accurate records.</p>
${footer(9)}`));

pages.push(page(`${header("11", "Confidentiality, Data Protection & Access")}
<p class="clause"><strong class="num">11.1 Confidentiality.</strong> Both parties shall keep confidential business, client, pricing, technical, security and financial information confidential, except where disclosure is authorised, necessary for legitimate business purposes or required by law.</p>
<p class="clause"><strong class="num">11.2 Data protection.</strong> The parties shall take reasonable steps to protect personal and business information. Bololo Security remains responsible for ensuring it has lawful authority to collect and process customer information. Where applicable, the parties shall comply with South African privacy requirements, including POPIA.</p>
<p class="clause"><strong class="num">11.3 Security measures.</strong> 4DS Solutions will implement reasonable technical measures appropriate to the agreed architecture, but no internet-connected system can be guaranteed completely immune from cyberattacks or security incidents.</p>
<p class="clause"><strong class="num">11.4 Access control.</strong> The System may include role-based access controls. Bololo Security is responsible for protecting administrator credentials, removing former users, maintaining appropriate permissions, not sharing credentials and reporting suspected unauthorised access.</p>
<p class="clause"><strong class="num">11.5 Restriction of access.</strong> 4DS Solutions may restrict access where reasonably necessary to protect the System from misuse, security threats or non-payment.</p>
<h2 class="block">12 · Late Payment, Termination &amp; Liability</h2>
<p class="clause"><strong class="num">12.1 Late payment.</strong> If amounts remain unpaid, 4DS Solutions may provide written notice requiring payment and may temporarily suspend relevant services, System access or support if the matter is not resolved within a reasonable period. Suspension does not remove amounts already owed.</p>
<p class="clause"><strong class="num">12.2 Termination.</strong> Either party may request termination by written notice. Termination does not remove accrued payment obligations. Outstanding development fees and revenue-share payments remain payable. The treatment of the System and revenue-share arrangement following discontinuation shall be agreed in writing.</p>
<p class="clause"><strong class="num">12.3 Limitation of liability.</strong> 4DS Solutions shall not be liable for indirect, consequential or unforeseeable losses arising from use of the System, including losses caused by third-party outages, payment gateway failures, internet/mobile failures, device failures, incorrect information, unauthorised account use, cyber incidents outside reasonable control, misuse of the System, or failure of security personnel to respond appropriately.</p>
${footer(10)}`));

pages.push(page(`${header("13", "Changes, Entire Agreement & Acceptance")}
<p class="clause"><strong class="num">13.1 Changes to scope.</strong> Functionality outside the original agreed scope may be treated as a change request and quoted separately. Verbal requests do not automatically constitute an agreement to provide additional work free of charge.</p>
<p class="clause"><strong class="num">13.2 Entire agreement.</strong> This Agreement represents the understanding between the parties concerning the initial development, implementation and revenue-share arrangement. Material changes should be recorded in writing and accepted by both parties.</p>
<p class="clause"><strong class="num">13.3 Governing law.</strong> This Agreement is governed by the laws of the Republic of South Africa.</p>
<p class="clause"><strong class="num">13.4 Acceptance.</strong> By signing below, both parties confirm that they have read and understood this Agreement; agree to the R10,000.00 discounted development fee; agree to the R3,000.00 deposit and R7,000.00 final payment; agree to the ongoing 10% monthly revenue share; and understand that additional development outside the agreed scope may incur additional charges.</p>
<h2 class="block">Commercial summary</h2>
<table>
<thead><tr><th>ITEM</th><th style="width:52mm">AMOUNT / TERM</th></tr></thead>
<tbody>
<tr><td>Commercial value</td><td>R115,000.00</td></tr>
<tr><td>Special growth discount</td><td>− R105,000.00</td></tr>
<tr class="totals"><td>Agreed development price</td><td>R10,000.00</td></tr>
<tr><td>Deposit (on signing)</td><td>R3,000.00</td></tr>
<tr><td>Final payment (before handover / launch)</td><td>R7,000.00</td></tr>
<tr class="totals"><td>Ongoing revenue share</td><td>10% of applicable monthly client payments</td></tr>
</tbody>
</table>
<p class="note">The Development Fee and the Revenue Share are separate. Payment of the Development Fee does not terminate the Revenue Share.</p>
${footer(11)}`));

pages.push(page(`${header("14", "Signatures")}
<p class="lede">By signing below, the parties confirm that they have read and understood this Agreement and agree to be bound by its terms, including the R10,000.00 development fee, the payment schedule, and the ongoing 10% monthly revenue share.</p>
<table>
<thead><tr><th>FOR 4DS SOLUTIONS (PTY) LTD</th><th>FOR BOLOLO SECURITY</th></tr></thead>
<tbody>
<tr class="sig"><td>Representative: _________________________</td><td>Representative: _________________________</td></tr>
<tr class="sig"><td>Position: _______________________________</td><td>Position: _______________________________</td></tr>
<tr class="sig"><td>Signature: ______________________________</td><td>Signature: ______________________________</td></tr>
<tr class="sig"><td>Date: ___________________________________</td><td>Date: ___________________________________</td></tr>
<tr><td>Company stamp (if applicable):<br/><br/><br/></td><td>Company stamp (if applicable):<br/><br/><br/></td></tr>
</tbody>
</table>
<table>
<thead><tr><th>WITNESS 1</th><th>WITNESS 2</th></tr></thead>
<tbody>
<tr class="sig"><td>Name: __________________________________</td><td>Name: __________________________________</td></tr>
<tr class="sig"><td>Signature: ______________________________</td><td>Signature: ______________________________</td></tr>
<tr class="sig"><td>Date: ___________________________________</td><td>Date: ___________________________________</td></tr>
</tbody>
</table>
<p class="note"><strong>Before signature:</strong> Bololo Security should confirm its exact legal entity name, registration details and signatory authority. Independent legal review is recommended where either party requires it. This document is a commercial technology agreement and is not a substitute for legal advice.</p>
<p class="note">Document ${BOLOLO.agreementCode} · ${PROVIDER.short} and ${BOLOLO.client} · Issued ${ISSUE.date} · v${ISSUE.version} · ${BOLOLO.agreementClass}</p>
${footer(12)}`));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Bololo Security | 4DS Solutions Software Development, Implementation &amp; Revenue-Share Agreement</title>
<style>${css}</style>
</head>
<body>
${pages.join("\n")}
</body>
</html>`;

fs.writeFileSync(outHtml, html, "utf8");
console.log("Wrote HTML:", outHtml);

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
function printPdf(target) {
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${target}`,
      "--print-to-pdf-no-header",
      outHtml,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || "Chrome print failed");
    process.exit(result.status || 1);
  }
}

printPdf(outPdfDocs);
fs.copyFileSync(outPdfDocs, outPdfDesktop);

for (const p of [outPdfDocs, outPdfDesktop]) {
  const st = fs.statSync(p);
  console.log("Wrote PDF:", p, "bytes:", st.size);
}
