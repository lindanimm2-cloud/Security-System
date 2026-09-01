import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outHtml = path.join(__dirname, "ACG_Security_4DS_Nexus_Software_Services_Agreement.html");
const outPdf = path.join(
  "C:\\Users\\Toxic\\Desktop",
  "ACG_Security_4DS_Nexus_Software_Services_Agreement.pdf"
);

const logoDark = "4ds-logo-header.png";
const logoLight = "4ds-logo-cover.png";

const css = `
:root {
  --ink: #111;
  --muted: #666;
  --line: #d0d0d0;
  --zebra: #f3f3f3;
  --cover: #1c1c1c;
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
  padding: 16mm 18mm 18mm;
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
  margin-bottom: 34mm;
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
  height: 26px;
  width: auto;
  display: block;
  background: #000;
  border: 0 !important;
  box-shadow: none !important;
  object-fit: contain;
}
.logo-lg {
  height: 42px;
  width: auto;
  background: #000;
  padding: 0;
}
.cover-hero {
  margin: 0 0 11mm;
  max-width: 155mm;
}
.cover-hero h1 {
  margin: 0 0 7px;
  font-size: 32pt;
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
  max-width: 145mm;
}
.cover-intro {
  font-size: 10pt;
  line-height: 1.7;
  max-width: 158mm;
  margin: 0 0 16mm;
  opacity: 0.96;
}
.meta-grid {
  display: grid;
  grid-template-columns: 48mm 1fr;
  row-gap: 13px;
  column-gap: 10px;
  font-size: 10.5pt;
  line-height: 1.5;
  margin-bottom: 22mm;
  align-items: center;
}
.meta-grid .label { font-weight: 700; }
.meta-grid .value {
  border-bottom: 1px solid rgba(255,255,255,0.5);
  min-height: 20px;
  padding-bottom: 2px;
}
.checks { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; }
.chk {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}
.box {
  width: 11px;
  height: 11px;
  border: 1.5px solid currentColor;
  display: inline-block;
  flex: 0 0 auto;
  background: transparent;
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
.cover-foot .prepared {
  line-height: 1.7;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #bbb;
  margin-bottom: 9mm;
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
  font-size: 16pt;
  font-weight: 700;
  line-height: 1.2;
}
.lede {
  font-size: 10pt;
  line-height: 1.6;
  margin: 0 0 5mm;
  color: #222;
}
.clause {
  font-size: 10pt;
  line-height: 1.62;
  margin: 0 0 4.2mm;
}
.clause strong.num { font-weight: 700; }
.clause + .clause { margin-top: 0; }
.defs dt {
  font-weight: 700;
  display: inline;
}
.defs dd {
  display: inline;
  margin: 0;
}
.defs p { margin: 0 0 2.5mm; line-height: 1.62; font-size: 10pt; }
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.4pt;
  line-height: 1.45;
  margin: 0 0 5mm;
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
td.opt {
  width: 22px;
  text-align: center;
  vertical-align: middle;
}
td.cap { width: 42mm; font-weight: 600; }
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
  margin: 0;
  padding: 0;
  font-size: 10.5pt;
  line-height: 1.85;
}
.toc li {
  display: flex;
  gap: 10px;
}
.toc .n {
  width: 18px;
  font-weight: 700;
  flex: 0 0 auto;
}
.sig-lines td { height: 16px; }
.write-lines {
  margin: 2mm 0 5mm;
}
.write-lines div {
  border-bottom: 1px solid #bbb;
  height: 16px;
  margin-bottom: 10px;
}
h2.block {
  margin: 0 0 3mm;
  font-size: 11pt;
  font-weight: 700;
}
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
  <span>4DS Solutions | ACG Security Software Services Agreement</span>
  <span>${String(page).padStart(2, "0")}</span>
</div>`;
}

function page(inner) {
  return `<section class="page">${inner}</section>`;
}

function optRow(cap, desc) {
  return `<tr><td class="opt"><span class="box"></span></td><td class="cap">${cap}</td><td>${desc}</td></tr>`;
}

function selectIntro() {
  return `<p class="lede">Select only the capabilities ACG Security requires. The final selections are priced through the Commercial Schedule and Feature Selection &amp; Commercial Sign-Off. Unticked items are excluded unless later added by written Change Request.</p>`;
}

function capabilityTable(rows) {
  return `<table>
<thead><tr><th style="width:18mm">OPTION</th><th style="width:48mm">CAPABILITY</th><th>DESCRIPTION</th></tr></thead>
<tbody>${rows.map(([c, d]) => optRow(c, d)).join("")}</tbody>
</table>`;
}

const pages = [];

// COVER
pages.push(`<section class="page cover">
  <div class="cover-top">
    <div class="cover-eyebrow">ACG Security software services agreement</div>
    <img class="logo logo-lg" src="${logoLight}" alt="4DS" />
  </div>
  <div class="cover-hero">
    <h1>ACG SECURITY</h1>
    <p class="sub">Integrated Security Technology Platform</p>
    <p class="doc-type">Software Development, Licensing &amp; Managed Technology Services Agreement</p>
  </div>
  <p class="cover-intro">This Agreement establishes the contractual framework for the design, development, configuration, deployment, support and optional operation of the ACG Security digital security platform. Features are selected by the Client in the Feature Selection Schedule and only selected features form part of the contracted scope.</p>
  <div class="meta-grid">
    <div class="label">Prepared for:</div><div class="value">ACG Security</div>
    <div class="label">Agreement date:</div><div class="value"></div>
    <div class="label">Client legal entity:</div><div class="value"></div>
    <div class="label">Client registration no.:</div><div class="value"></div>
    <div class="label">Selected commercial model:</div>
    <div class="checks">
      <span class="chk"><span class="box"></span> Ownership</span>
      <span class="chk"><span class="box"></span> Managed</span>
      <span class="chk"><span class="box"></span> Hybrid / custom</span>
    </div>
    <div class="label">Contract term:</div>
    <div class="checks">
      <span class="chk"><span class="box"></span> 1 year</span>
      <span class="chk"><span class="box"></span> 3 years</span>
      <span class="chk"><span class="box"></span> 5 years</span>
      <span class="chk"><span class="box"></span> 10-year framework</span>
      <span class="chk"><span class="box"></span> Custom</span>
    </div>
  </div>
  <div class="cover-foot">
    <div class="prepared">
      <strong>Prepared by:</strong>
      Owner: Lindani Maphumulo<br/>
      4DS Solutions (Pty) Ltd<br/>
      K2025567725<br/>
      South Africa<br/>
      www.4dsnexus.co.za
    </div>
    <div>www.4dsnexus.co.za</div>
  </div>
</section>`);

// CONTENTS
pages.push(page(`${header("00", "Contents")}
<ol class="toc">
${[
  "Agreement Overview & Definitions",
  "Parties & Appointment",
  "Scope & Feature Selection",
  "Client Protection Portal",
  "Control Room & Operations",
  "Officer Field Application",
  "Technician Application",
  "Supervisor & Management",
  "Medical / Ambulance Module",
  "Communications, Maps, CCTV & Integrations",
  "Roles, Permissions & Audit",
  "Implementation, Testing & Acceptance",
  "Support, Maintenance & Managed Services",
  "Fees, Payment & Commercial Options",
  "Third-Party Costs & Client Accounts",
  "Change Control & Additional Work",
  "Intellectual Property, Data & Security",
  "Confidentiality & Privacy",
  "Warranties, Liability & Service Limitations",
  "Term, Suspension & Termination",
  "Dispute Resolution & General Terms",
  "Feature Selection & Commercial Sign-Off",
  "Signatures",
]
  .map((t, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><span>${t}</span></li>`)
  .join("")}
</ol>
<p class="note" style="margin-top:8mm"><strong>Commercial status:</strong> This Agreement becomes binding when signed by authorised representatives of both parties. The selected features, pricing, term and service level must be completed before signature.</p>
${footer(2)}`));

// 01
pages.push(page(`${header("01", "Agreement Overview & Definitions")}
<p class="clause"><strong class="num">1.1 Purpose.</strong> 4DS Solutions will provide ACG Security with a configurable digital security technology platform connecting clients, the control room, field officers, technicians, supervisors and, where selected, medical/ambulance operations. The platform is based on the 4DS Nexus technology stack with role-specific portals and a central API/data layer.</p>
<p class="clause"><strong class="num">1.2 Contract principle.</strong> The platform is modular. ACG Security is not required to purchase every feature. The Owner or authorised Client representative must select either <strong>ALL FEATURES</strong> or individual modules in Schedule 22. Only selected features, together with the applicable commercial option, form part of the contracted scope.</p>
<p class="clause"><strong class="num">1.3 Definitions.</strong></p>
<div class="defs">
  <p><strong>“Platform”</strong> means the ACG Security implementation of the 4DS Nexus technology stack.</p>
  <p><strong>“Feature Schedule”</strong> means Schedule 22.</p>
  <p><strong>“Client”</strong> means ACG Security.</p>
  <p><strong>“Provider”</strong> means 4DS Solutions (Pty) Ltd.</p>
  <p><strong>“Go-Live”</strong> means the date on which the agreed production scope is made available for operational use.</p>
  <p><strong>“Change Request”</strong> means a written request for work outside the selected scope.</p>
</div>
<p class="clause"><strong class="num">1.4 Precedence.</strong> If there is a conflict, the signed Feature Schedule and Commercial Schedule prevail over general descriptions, demonstrations, mock-ups or earlier discussions to the extent of the conflict.</p>
${footer(3)}`));

// 02
pages.push(page(`${header("02", "Parties & Appointment")}
<table>
<thead><tr><th style="width:42mm">PARTY</th><th>DETAILS</th></tr></thead>
<tbody>
<tr><td><strong>Provider</strong></td><td>4DS Solutions (Pty) Ltd — K2025567725 — South Africa</td></tr>
<tr><td><strong>Client</strong></td><td>ACG Security — Legal name: _______________________________</td></tr>
<tr><td><strong>Client registration</strong></td><td>________________________________________________________</td></tr>
<tr><td><strong>Client address</strong></td><td>________________________________________________________</td></tr>
<tr><td><strong>Authorised representative</strong></td><td>Name: ____________________ &nbsp;&nbsp; Title: ____________________</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">2.1 Appointment.</strong> The Client appoints the Provider to perform the selected services and deliver the selected platform modules, and the Provider accepts that appointment subject to this Agreement.</p>
<p class="clause"><strong class="num">2.2 No implied scope.</strong> A feature appearing in a demonstration, roadmap, technical inventory or discussion is not automatically included unless selected in Schedule 22 or expressly included in a signed Change Request.</p>
<p class="clause"><strong class="num">2.3 Client authority.</strong> The person signing for ACG Security warrants that they are authorised to bind the Client or have obtained the necessary internal approval.</p>
${footer(4)}`));

// 03
pages.push(page(`${header("03", "Scope & Feature Selection")}
<p class="clause"><strong class="num">3.1 Owner choice.</strong> Before implementation, the Owner/authorised representative must complete Schedule 22 by selecting <strong>ALL FEATURES</strong>, <strong>CUSTOM SELECTION</strong> or <strong>PHASED SELECTION</strong>. Where ALL FEATURES is selected, all modules listed in Schedule 22 are included, subject to exclusions, dependencies, third-party costs and agreed commercial limits.</p>
<p class="clause"><strong class="num">3.2 Individual selection.</strong> If ALL FEATURES is not selected, every required module must be ticked. Unticked modules are expressly excluded from the initial scope and may be added later through a Change Request, revised quotation or written addendum.</p>
<p class="clause"><strong class="num">3.3 Dependencies.</strong> Some features depend on third-party APIs, devices, CCTV systems, alarm panels, mapping services, payment services, mobile operating systems, app-store approvals or other infrastructure. Integration remains subject to credentials, technical compatibility, approvals, usage charges and provider availability.</p>
<p class="clause"><strong class="num">3.4 Commercial logic.</strong> The price schedule is intentionally modular. ACG may purchase only the components required. The individual reference prices provide a transparent value breakdown; the <strong>ALL FEATURES</strong> package receives a separate strategic bundle price.</p>
<table>
<thead><tr><th style="width:48mm">SELECTION</th><th>MEANING</th></tr></thead>
<tbody>
<tr><td><span class="box"></span> ALL FEATURES</td><td>All modules in Schedule 22 are selected, subject to exclusions/dependencies and the agreed bundle price.</td></tr>
<tr><td><span class="box"></span> CUSTOM SELECTION</td><td>Only individually ticked modules are selected and priced.</td></tr>
<tr><td><span class="box"></span> PHASED SELECTION</td><td>Selected modules may be delivered in agreed implementation phases.</td></tr>
</tbody>
</table>
<p class="note"><strong>Selected scope reference:</strong> Schedule 22 must be signed/initialled by both parties. ACG Security may not rely on an unticked feature as part of the contracted deliverable.</p>
${footer(5)}`));

// 04 Client Portal
pages.push(page(`${header("04", "Client Protection Portal")}
${selectIntro()}
${capabilityTable([
  ["Dashboard & protection status", "Dashboard, notifications and Light/Dark/System theme"],
  ["Panic & emergency", "Panic, Silent Panic, Medical Emergency, Fire Emergency and Emergency Hub"],
  ["Emergency contacts & calls", "Emergency contacts, control-room calling and in-app/emergency calling"],
  ["Incidents & evidence", "Incident history, evidence vault and incident-linked media"],
  ["Family Safety", "Family Chat, Safe Zones, Family Tracking and family member messaging"],
  ["Vehicle Security", "Phone tracking, theft recovery, geofence zones and theft reporting"],
  ["Home Security", "Property registration, Away/Stay/Night/Disarm, sensors, Home Panic and camera access"],
  ["Personal Security", "Location, emergency and security update cards"],
  ["Subscription & billing", "Subscriptions, billing, documents, upgrades, debit-order workflow and receipts"],
  ["Client profile", "GPS permissions, medical profile and contacts"],
])}
${footer(6)}`));

// 05 Control Room
pages.push(page(`${header("05", "Control Room & Operations")}
${selectIntro()}
${capabilityTable([
  ["Ops Board", "Operational dashboard, incident queue and KPIs"],
  ["Live Map", "Clients, officers, fleet, client vehicles, incidents, properties and trails"],
  ["CCTV / Surveillance", "Sites, dashcams, triggers, acknowledge, dispatch, false alarm and resolve"],
  ["Incidents", "Reporting, dispatch, maps, documents, reports and resolution"],
  ["Dispatch", "Auto-assign/reassign, nearest available, emergency notify all and officer roster"],
  ["Customers / CRM", "Customer profiles, subscriptions, loyalty, discounts, invitations and billing"],
  ["Fleet", "Units, call signs, vehicles, crew, operations teams and maintenance status"],
  ["Officers", "Profiles, rank, zone, status, map, dispatch and calls"],
  ["Documents", "Folders, uploads, incident links, pin/unpin and deletion"],
  ["Communications", "Client chat, directory, call history, attachments, audio/video/phone"],
  ["Teams & Users", "Branches, teams, user creation and access management"],
  ["Analytics", "Incidents, officers, live map and operational statistics"],
  ["Settings & Audit", "Permissions, alerts/escalation, security, billing, integrations and audit logs"],
  ["Sales / Store / Install Jobs", "Optional sales, store, installation and job management workflows"],
  ["Developer desk", "Optional developer role, error tickets and support workflow"],
])}
${footer(7)}`));

// 06 Officer
pages.push(page(`${header("06", "Officer Field Application")}
${selectIntro()}
${capabilityTable([
  ["Officer dashboard", "Emergency banner, dispatch chat and operational status"],
  ["Jobs queue", "Accept / En route / On scene / Complete"],
  ["Officer SOS", "Check-ins, request backup, need medic and call supervisor"],
  ["Live map & navigation", "Live map and navigation"],
  ["Evidence", "Record video, photos, live camera and save to dispatch"],
  ["Incident reports", "Assignment reports and new field incidents"],
  ["Calls", "Dispatch, internal, WhatsApp and phone calling"],
  ["Crew chat", "Dispatch/team chat, attachments, emoji, audio, video and phone"],
  ["Officer profile", "Rank, status and theme"],
])}
${footer(8)}`));

// 07 Technician
pages.push(page(`${header("07", "Technician Application")}
${selectIntro()}
${capabilityTable([
  ["Today's jobs", "Job queue, due-soon filters and job board"],
  ["Installation workflow", "Accept → Navigate → Site check → Install → Test → Signature → Complete"],
  ["Checklist & equipment", "Equipment confirmation and serial capture"],
  ["QR / equipment status", "QR scan, mark installed and defective equipment"],
  ["Photos", "Take, upload, retake and delete"],
  ["Customer communication", "Call, WhatsApp and navigation"],
  ["Control room", "Call, chat, issue reporting, resolve and escalate"],
  ["Team & inventory", "Team chat, parts/inventory and stock requests"],
  ["Camera commissioning", "Property, name, location, channel and placement"],
  ["Technician profile", "Job access and team access"],
])}
${footer(9)}`));

// 08 Supervisor
pages.push(page(`${header("08", "Supervisor & Management")}
${selectIntro()}
${capabilityTable([
  ["Supervisor dashboard", "KPIs — On duty / On scene / Available / Need attention"],
  ["Officer map", "Full operational map"],
  ["Shifts / roster", "Shift and roster visibility"],
  ["Patrol", "Checkpoint logging"],
  ["Performance", "Officer performance dashboard"],
  ["Supervisor support", "Support chat and calls"],
  ["Manager operations", "Operational management"],
  ["Branches / teams / staff", "Branch, team and staff management"],
  ["Role administration", "Role and permission administration"],
  ["Finance visibility", "Finance/billing visibility where authorised"],
])}
${footer(10)}`));

// 09 Medical
pages.push(page(`${header("09", "Medical / Ambulance Module")}
${selectIntro()}
${capabilityTable([
  ["Medical queue", "Ambulance request intake"],
  ["Medical dispatcher", "Dispatcher dashboard"],
  ["Crew board", "Crew board"],
  ["Operations map", "Medical operations map"],
  ["Medical crew profile", "Crew profile"],
  ["Medical status workflow", "ACCEPTED → EN_ROUTE → ARRIVED → TRANSPORT → HOSPITAL → HANDOVER"],
  ["Unit allocation", "Recommend unit / allocate crew"],
  ["Client medical profile", "Blood, allergies, medications, conditions and instructions"],
  ["Medical / fire emergency", "Requests from client portal"],
])}
${footer(11)}`));

// 10 Comms
pages.push(page(`${header("10", "Communications, Maps, CCTV & Integrations")}
${selectIntro()}
${capabilityTable([
  ["Internal calls", "Internal calls / dispatch line"],
  ["Phone calling", "Phone calling"],
  ["WhatsApp", "WhatsApp communication"],
  ["In-app calling", "Audio / video calling"],
  ["Chat", "Attachments, emoji and internal communications"],
  ["Google Maps", "Navigation and location services"],
  ["CCTV", "Site feeds, dashcams and event triggers"],
  ["Push notifications", "Application notifications"],
  ["Email", "Email notifications"],
  ["SMS", "SMS / messaging provider"],
  ["Payments", "Payment gateway / subscription billing"],
  ["Debit orders", "Debit-order workflow"],
  ["Alarm / sensor / access control", "Third-party security device integrations"],
  ["App stores", "App Store / Google Play deployment"],
  ["Other integration", "Other: ____________________________________"],
])}
${footer(12)}`));

// 11 Roles
pages.push(page(`${header("11", "Roles, Permissions & Audit")}
<p class="lede">The Platform uses role-based access. The Owner may select the roles required for ACG Security. Access should be limited to each employee's operational responsibility.</p>
<table>
<thead><tr><th style="width:16mm">SELECT</th><th style="width:48mm">ROLE</th><th>INDICATIVE ACCESS</th></tr></thead>
<tbody>
${[
  ["USER / CLIENT", "Client portal, panic, home, vehicles, family, billing"],
  ["FAMILY MEMBER", "Limited family tracking / chat"],
  ["OFFICER", "Jobs, evidence, reports, SOS"],
  ["TECHNICIAN", "Install jobs, cameras, stock"],
  ["DISPATCHER", "Map, CCTV, incidents, dispatch, communications"],
  ["SUPERVISOR", "Roster, patrol, performance"],
  ["MANAGER", "Operations plus permitted store/installation functions"],
  ["TENANT ADMIN", "Staff, clients, finance"],
  ["OWNER", "Full business/platform access subject to restricted developer-only functions"],
  ["SUPER ADMIN", "Platform-wide administration"],
  ["SALES", "Customers, leads, installs, chat"],
  ["DEVELOPER", "Error tickets and support"],
  ["MEDICAL DISPATCHER / CREW", "Ambulance queue / crew workflow"],
]
  .map(
    ([r, a]) =>
      `<tr><td class="opt"><span class="box"></span></td><td class="cap">${r}</td><td>${a}</td></tr>`
  )
  .join("")}
</tbody>
</table>
<p class="note"><strong>Audit.</strong> Administrative activity, access, incident actions and other agreed system events may be recorded in audit logs. Permissions can be controlled at module and action level.</p>
${footer(13)}`));

// 12 Implementation
pages.push(page(`${header("12", "Implementation, Testing & Acceptance")}
<p class="clause"><strong class="num">12.1 Phased delivery.</strong> Implementation may be performed through discovery, UI/UX and platform configuration, CRM/control-room configuration, field applications, integrations, testing, deployment and training.</p>
<table>
<thead><tr><th style="width:48mm">PHASE</th><th>DELIVERY</th></tr></thead>
<tbody>
<tr><td>1. Discovery</td><td>Scope confirmation, technical planning, accounts, data and feature selection</td></tr>
<tr><td>2. Platform foundation</td><td>Core platform, authentication, roles and agreed portals</td></tr>
<tr><td>3. Operations</td><td>Control room, incidents, dispatch, CRM, officers, fleet and selected modules</td></tr>
<tr><td>4. Field applications</td><td>Officer / technician / supervisor / medical modules selected in Schedule 22</td></tr>
<tr><td>5. Integrations</td><td>Selected maps, CCTV, communications, payments and third-party integrations</td></tr>
<tr><td>6. QA &amp; launch</td><td>Testing, defect correction, deployment, training and agreed go-live</td></tr>
<tr><td>7. Managed service</td><td>Support, monitoring and improvements where the managed option is selected</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">12.2 Acceptance.</strong> A feature is accepted when it materially performs the agreed acceptance criteria in the Feature Schedule, subject to documented defects that do not prevent reasonable operational use. Minor defects may be corrected during the agreed support period.</p>
<p class="clause"><strong class="num">12.3 Client dependencies.</strong> ACG Security must provide timely approvals, access, data, credentials, device information and third-party cooperation reasonably required for delivery. Delays caused by missing Client inputs may move the implementation schedule.</p>
${footer(14)}`));

// 13 Support
pages.push(page(`${header("13", "Support, Maintenance & Managed Services")}
<p class="lede">If a managed-service option is selected, the monthly fee is a technology management service rather than hosting alone. The selected service areas below define what the recurring fee covers.</p>
<table>
<thead><tr><th style="width:16mm">SELECT</th><th style="width:48mm">SERVICE AREA</th><th>INCLUDED ONLY IF SELECTED</th></tr></thead>
<tbody>
${[
  ["Platform management", "Monitoring, configuration and operational care"],
  ["Application maintenance", "Bug fixes, compatibility maintenance and routine updates"],
  ["Security / monitoring", "Monitoring, security updates and agreed alerting"],
  ["Technical support", "Operational support and troubleshooting"],
  ["Continuous development", "Only within an expressly agreed development allocation; not unlimited"],
  ["Governance / reporting", "Service reporting, review meetings and roadmap management"],
  ["Catalogue / data administration", "Only where expressly allowed in the Commercial Schedule"],
  ["SLA", "Response / resolution targets set out in the signed SLA schedule"],
]
  .map(
    ([r, a]) =>
      `<tr><td class="opt"><span class="box"></span></td><td class="cap">${r}</td><td>${a}</td></tr>`
  )
  .join("")}
</tbody>
</table>
<p class="note"><strong>Important:</strong> Managed service does not mean unlimited development. Major new modules, material integrations and major workflow changes are separately scoped unless expressly allocated.</p>
${footer(15)}`));

// 14 Fees
pages.push(page(`${header("14", "Fees, Payment & Commercial Options")}
<p class="clause"><strong class="num">14.1 Commercial model.</strong> ACG Security may choose a once-off ownership-oriented implementation, a managed technology model, or a hybrid/custom arrangement. The pricing below is inserted as a proposed commercial schedule for negotiation and final signature.</p>
<table>
<thead><tr><th style="width:36mm">OPTION</th><th>COMMERCIAL STRUCTURE</th><th style="width:42mm">PROPOSED ACG PRICE</th></tr></thead>
<tbody>
<tr><td><strong>A — Ownership</strong></td><td>Once-off strategic implementation / ownership-oriented delivery. Future major modules and material changes quoted separately.</td><td><strong>R195,000 once-off</strong></td></tr>
<tr><td><strong>B — Managed</strong></td><td>R75,000 implementation/upfront + recurring managed technology service.</td><td><strong>R75,000 upfront + R45,000/month</strong></td></tr>
<tr><td><strong>C — Hybrid / Custom</strong></td><td>Selected modules plus custom managed services; priced from the module schedule and agreed service allocation.</td><td><strong>To be agreed</strong></td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">14.2 Transparent value breakdown — full platform reference value</strong></p>
<table>
<thead><tr><th style="width:16mm">SELECT</th><th>MODULE / WORKSTREAM</th><th style="width:32mm">REFERENCE VALUE</th></tr></thead>
<tbody>
${[
  ["Core Platform & Architecture", "R55,000"],
  ["Client Protection Portal", "R45,000"],
  ["Control Room & Operations", "R65,000"],
  ["Officer Field Application", "R35,000"],
  ["Technician Application", "R30,000"],
  ["Supervisor & Management", "R20,000"],
  ["Medical / Ambulance Module", "R25,000"],
  ["CCTV, Maps, Communications & Integrations", "R45,000"],
  ["Roles, Security & Audit", "R20,000"],
  ["QA, Deployment, Training & Launch", "R25,000"],
]
  .map(
    ([m, v]) =>
      `<tr><td class="opt"><span class="box"></span></td><td>${m}</td><td>${v}</td></tr>`
  )
  .join("")}
<tr class="totals"><td></td><td>REFERENCE VALUE — FULL PLATFORM</td><td>R365,000</td></tr>
<tr class="totals"><td></td><td>ACG STRATEGIC ALL-FEATURES PRICE</td><td>R195,000</td></tr>
<tr class="totals"><td></td><td>STRATEGIC VALUE / DISCOUNT</td><td>R170,000</td></tr>
</tbody>
</table>
<p class="note"><strong>Why the bundle price is lower:</strong> The individual reference values establish the commercial value of the underlying workstreams (R365,000). Where ACG selects the complete platform, 4DS applies a strategic bundled price of <strong>R195,000</strong>, representing a commercial benefit of <strong>R170,000</strong> against the reference value. This is a client-specific strategic price and should not be interpreted as 4DS standard market pricing.</p>
${footer(16)}`));

// 14 continued
pages.push(page(`${header("14", "Fees, Payment & Commercial Options — Selection Logic")}
<p class="clause"><strong class="num">14.3 Custom selection pricing.</strong> If CUSTOM SELECTION is chosen, the selected reference values are added together. The parties may then agree a project discount, payment schedule and/or managed-service component in the Commercial Schedule. ACG therefore pays only for the modules it chooses.</p>
<table>
<thead><tr><th>EXAMPLE SELECTION</th><th>MODULES SELECTED</th><th style="width:36mm">REFERENCE TOTAL</th></tr></thead>
<tbody>
<tr><td>Client + Control Room</td><td>R45,000 + R65,000</td><td>R110,000</td></tr>
<tr><td>Client + Control Room + Officer</td><td>R45,000 + R65,000 + R35,000</td><td>R145,000</td></tr>
<tr><td>Full security operations</td><td>Control Room + Officer + Technician + Supervisor</td><td>R150,000</td></tr>
<tr><td>Full platform</td><td>All listed modules</td><td>R365,000 reference → R195,000 strategic bundle</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">14.4 Managed model.</strong> The proposed managed structure is <strong>R75,000 upfront + R45,000 per month</strong>. The first-year cash value is <strong>R615,000</strong> (R75,000 upfront plus 12 × R45,000). The monthly service is for the selected managed-service areas and does not include unlimited new development.</p>
<table>
<thead><tr><th style="width:58mm">COMMERCIAL FIELD</th><th>PROPOSED / AGREED</th></tr></thead>
<tbody>
<tr><td>Implementation / upfront fee</td><td>R75,000 for Managed model</td></tr>
<tr><td>Monthly managed service</td><td>R45,000 / month</td></tr>
<tr><td>First-year cash value</td><td>R615,000</td></tr>
<tr><td>Annual escalation / review</td><td>__________ % / __________</td></tr>
<tr><td>Contract term</td><td>
  <span class="chk"><span class="box"></span> 1 year</span>
  <span class="chk"><span class="box"></span> 3 years</span>
  <span class="chk"><span class="box"></span> 5 years</span>
  <span class="chk"><span class="box"></span> 10-year framework</span>
  <span class="chk"><span class="box"></span> Custom</span>
</td></tr>
<tr><td>Payment due</td><td>________________________________________</td></tr>
<tr><td>Deposit / milestone schedule</td><td>________________________________________</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">14.5 Payment default.</strong> Amounts not paid when due may result in suspension of non-critical services after written notice, subject to applicable law and any agreed cure period. Suspension does not waive amounts already due.</p>
${footer(17)}`));

// 15 Third party
pages.push(page(`${header("15", "Third-Party Costs & Client Accounts")}
<table>
<thead><tr><th style="width:58mm">COST / ACCOUNT</th><th>COMMERCIAL TREATMENT</th></tr></thead>
<tbody>
<tr><td>Hosting / cloud infrastructure</td><td>Client-paid or passed through at cost, as agreed</td></tr>
<tr><td>Domain / DNS</td><td>Client-owned and Client-paid</td></tr>
<tr><td>Apple Developer account</td><td>Client-owned; third-party fee paid by Client</td></tr>
<tr><td>Google Play Console</td><td>Client-owned; third-party fee paid by Client</td></tr>
<tr><td>Payment gateways</td><td>Provider transaction charges paid by Client</td></tr>
<tr><td>WhatsApp / SMS</td><td>Usage/provider fees paid by Client</td></tr>
<tr><td>Maps / location APIs</td><td>Usage fees where applicable</td></tr>
<tr><td>CCTV / alarm / hardware</td><td>Hardware, licences and provider charges unless expressly included</td></tr>
<tr><td>Professional legal / compliance services</td><td>Separate external cost unless expressly included</td></tr>
</tbody>
</table>
<p class="note">ACG Security should own its domain, business data, app-store accounts, payment accounts and critical third-party service accounts where practical so that it retains control of its digital assets.</p>
${footer(18)}`));

// 16 Change
pages.push(page(`${header("16", "Change Control & Additional Work")}
<p class="clause"><strong class="num">16.1 Change requests.</strong> ACG Security may request new features, additional integrations, additional branches, additional users, material workflow changes, new applications or other work outside the selected scope.</p>
<p class="clause"><strong class="num">16.2 Written approval.</strong> The Provider may provide a quotation or change order stating scope, price, dependencies, delivery impact and revised acceptance criteria. No material out-of-scope work is required to be performed until approved in writing.</p>
<p class="clause"><strong class="num">16.3 Feature activation.</strong> A previously unticked feature can be activated through a signed addendum, change order or revised Feature Schedule. The Provider may charge an implementation fee, recurring fee or both.</p>
<p class="clause"><strong class="num">16.4 Roadmap items.</strong> Future POS/WMS/advanced AI/advanced route optimisation or other roadmap functionality is not included merely because it appears in a roadmap. Future modules are separately scoped unless expressly selected and priced.</p>
<p class="clause"><strong class="num">16.5 Commercial protection.</strong> Changes to price should correspond to changes in scope, term, payment commitment, service level and/or development commitment.</p>
${footer(19)}`));

// 17 IP
pages.push(page(`${header("17", "Intellectual Property, Data & Security")}
<p class="clause"><strong class="num">17.1 Provider technology.</strong> The Provider retains ownership of its pre-existing software frameworks, reusable components, development methodologies, templates, libraries, internal tooling and general-purpose technology unless expressly transferred in writing.</p>
<p class="clause"><strong class="num">17.2 Client-specific deliverables.</strong> ACG Security receives the rights expressly granted in the final agreement for commissioned ACG-specific deliverables, subject to payment of all amounts due and any third-party/open-source licensing terms.</p>
<p class="clause"><strong class="num">17.3 Client data.</strong> ACG Security retains ownership of its business and customer data. The Provider may process data to deliver, secure, support and maintain the contracted services.</p>
<p class="clause"><strong class="num">17.4 Security.</strong> The Provider will apply agreed security controls appropriate to the contracted platform. No system can guarantee zero cyber risk, uninterrupted availability or prevention of every attack.</p>
<p class="clause"><strong class="num">17.5 Privacy.</strong> The parties will cooperate on appropriate privacy/data-protection arrangements, including access controls, data handling, retention and incident procedures. Where required, the parties should obtain professional legal advice regarding POPIA and other applicable obligations.</p>
<p class="clause"><strong class="num">17.6 Account ownership.</strong> Where practical, ACG Security should own its domain, business data, app-store accounts, payment accounts and critical third-party service accounts.</p>
${footer(20)}`));

// 18 Confidentiality
pages.push(page(`${header("18", "Confidentiality & Privacy")}
<p class="clause"><strong class="num">18.1 Confidential information.</strong> Each party shall keep confidential information received from the other party confidential and use it only for purposes connected with this Agreement.</p>
<p class="clause"><strong class="num">18.2 Permitted disclosure.</strong> Disclosure may be made to employees, professional advisers, subcontractors or service providers who require the information and are bound by appropriate confidentiality obligations, or where disclosure is required by law.</p>
<p class="clause"><strong class="num">18.3 Commercial confidentiality.</strong> Pricing, discounts, architecture, development methodology, scope, commercial concessions and other non-public commercial information shall be treated as confidential unless the parties agree otherwise in writing.</p>
<p class="clause"><strong class="num">18.4 Security incidents.</strong> Each party shall notify the other within a reasonable period after becoming aware of a material security incident affecting the other party's confidential information or contracted platform, subject to lawful and operational constraints.</p>
<p class="clause"><strong class="num">18.5 Survival.</strong> Confidentiality obligations survive termination for so long as the information remains confidential, subject to applicable law.</p>
${footer(21)}`));

// 19 Warranties
pages.push(page(`${header("19", "Warranties, Liability & Service Limitations")}
<p class="clause"><strong class="num">19.1 Professional performance.</strong> The Provider will perform the contracted services with reasonable skill and care.</p>
<p class="clause"><strong class="num">19.2 No absolute guarantee.</strong> The Platform is a technology system and cannot guarantee that every incident will be detected, that every response will succeed, that a security event will be prevented, or that third-party services will always be available.</p>
<p class="clause"><strong class="num">19.3 Client operational responsibility.</strong> ACG Security remains responsible for its physical security operations, officer conduct, licensing, dispatch decisions, emergency procedures, equipment maintenance and compliance obligations unless expressly transferred by written agreement.</p>
<p class="clause"><strong class="num">19.4 Third parties.</strong> The Provider is not responsible for outages, policy changes, API changes, approval delays, pricing changes or failures of third-party providers outside its reasonable control.</p>
<p class="clause"><strong class="num">19.5 Limitation.</strong> The parties should agree a reasonable cap on liability in the Commercial Schedule, with appropriate exclusions for matters that cannot lawfully be limited. Independent legal advice is recommended before final signature.</p>
<p class="clause"><strong class="num">19.6 Insurance.</strong> Each party remains responsible for maintaining insurance appropriate to its business and contractual responsibilities, unless otherwise agreed.</p>
${footer(22)}`));

// 20 Term
pages.push(page(`${header("20", "Term, Suspension & Termination")}
<table>
<thead><tr><th style="width:48mm">TERM FIELD</th><th>AGREED</th></tr></thead>
<tbody>
<tr><td>Commencement date</td><td>____________________</td></tr>
<tr><td>Initial term</td><td>
  <span class="chk"><span class="box"></span> 1 year</span>
  <span class="chk"><span class="box"></span> 3 years</span>
  <span class="chk"><span class="box"></span> 5 years</span>
  <span class="chk"><span class="box"></span> 10-year framework</span>
  <span class="chk"><span class="box"></span> Other</span>
</td></tr>
<tr><td>Renewal</td><td>________________________________________</td></tr>
<tr><td>Notice period</td><td>__________ days</td></tr>
<tr><td>Annual review</td><td>
  <span class="chk"><span class="box"></span> Yes</span>
  <span class="chk"><span class="box"></span> No</span>
</td></tr>
<tr><td>Escalation</td><td>________________________________________</td></tr>
</tbody>
</table>
<p class="clause"><strong class="num">20.1 Term.</strong> This Agreement begins on the Commencement Date and continues for the Initial Term unless terminated earlier under this Agreement.</p>
<p class="clause"><strong class="num">20.2 Renewal.</strong> Renewal may be automatic or by written agreement as specified above.</p>
<p class="clause"><strong class="num">20.3 Termination for breach.</strong> Either party may terminate for material breach that remains uncured after written notice and a reasonable cure period, subject to applicable law.</p>
<p class="clause"><strong class="num">20.4 Non-payment.</strong> Persistent non-payment may result in suspension and/or termination after written notice and any agreed cure period.</p>
<p class="clause"><strong class="num">20.5 Exit.</strong> On termination, the parties will cooperate on an orderly handover, subject to payment of outstanding amounts and the agreed data-export/handover scope. Provider reusable technology remains Provider property unless separately transferred.</p>
${footer(23)}`));

// 21 Dispute
pages.push(page(`${header("21", "Dispute Resolution & General Terms")}
<p class="clause"><strong class="num">21.1 Governing law.</strong> This Agreement is intended to be governed by the laws of the Republic of South Africa, subject to mandatory legal requirements applicable to the parties.</p>
<p class="clause"><strong class="num">21.2 Good-faith resolution.</strong> The parties shall first attempt to resolve disputes through good-faith discussions between authorised representatives.</p>
<p class="clause"><strong class="num">21.3 Escalation.</strong> If unresolved, the dispute may be escalated to mediation, arbitration or a competent court as the parties specify in writing.</p>
<p class="clause"><strong class="num">21.4 Entire agreement.</strong> This Agreement and its signed schedules constitute the agreement between the parties concerning the selected services and supersede inconsistent prior scope discussions.</p>
<p class="clause"><strong class="num">21.5 Amendments.</strong> Amendments must be in writing and approved by authorised representatives.</p>
<p class="clause"><strong class="num">21.6 Assignment.</strong> Neither party may materially assign this Agreement without the other's written consent, except to a successor in connection with a bona fide restructuring or sale of substantially all relevant business assets, subject to applicable law.</p>
<p class="clause"><strong class="num">21.7 Force majeure.</strong> Neither party is liable for delay caused by events beyond reasonable control, including infrastructure failure, widespread outages, natural disasters, labour disruptions, government action or third-party service failure.</p>
<p class="clause"><strong class="num">21.8 Independent legal review.</strong> This document is a commercial technology agreement draft and should be reviewed and, where appropriate, amended by a South African attorney before execution.</p>
${footer(24)}`));

// 22 Feature selection
pages.push(page(`${header("22", "Feature Selection & Commercial Sign-Off")}
<p class="lede"><strong>INSTRUCTION TO OWNER:</strong> Select <strong>ALL FEATURES</strong> OR select the individual features required. If ALL FEATURES is selected, individual tick boxes may be left blank; ALL FEATURES controls. If CUSTOM SELECTION is selected, only ticked items are included. For CUSTOM SELECTION, the reference module prices in Section 14 are used to calculate the selected implementation value before any agreed discount.</p>
<h2 class="block">Master choice</h2>
<table>
<thead><tr><th>MASTER CHOICE</th><th style="width:22mm">SELECT</th></tr></thead>
<tbody>
<tr><td>ALL FEATURES — all modules in this Schedule</td><td class="opt"><span class="box"></span></td></tr>
<tr><td>CUSTOM SELECTION — only individually selected items</td><td class="opt"><span class="box"></span></td></tr>
<tr><td>PHASED — selected modules delivered in agreed phases</td><td class="opt"><span class="box"></span></td></tr>
</tbody>
</table>
<h2 class="block">Commercial selection</h2>
<table>
<thead><tr><th style="width:16mm">SELECT</th><th>COMMERCIAL OPTION</th><th style="width:52mm">PRICE</th></tr></thead>
<tbody>
<tr><td class="opt"><span class="box"></span></td><td>Ownership — full platform strategic bundle</td><td>R195,000 once-off</td></tr>
<tr><td class="opt"><span class="box"></span></td><td>Managed — implementation + managed service</td><td>R75,000 upfront + R45,000/month</td></tr>
<tr><td class="opt"><span class="box"></span></td><td>Hybrid / Custom</td><td>To be calculated from selected modules</td></tr>
</tbody>
</table>
<h2 class="block">Selected module checklist</h2>
<table>
<thead><tr><th style="width:16mm">SELECT</th><th>MODULE</th><th style="width:32mm">REFERENCE VALUE</th></tr></thead>
<tbody>
${[
  ["Core Platform & Architecture", "R55,000"],
  ["Client Protection Portal", "R45,000"],
  ["Control Room & Operations", "R65,000"],
  ["Officer Field Application", "R35,000"],
  ["Technician Application", "R30,000"],
  ["Supervisor & Management", "R20,000"],
  ["Medical / Ambulance Module", "R25,000"],
  ["CCTV, Maps, Communications & Integrations", "R45,000"],
  ["Roles, Security & Audit", "R20,000"],
  ["QA, Deployment, Training & Launch", "R25,000"],
]
  .map(
    ([m, v]) =>
      `<tr><td class="opt"><span class="box"></span></td><td>${m}</td><td>${v}</td></tr>`
  )
  .join("")}
<tr class="totals"><td></td><td>FULL PLATFORM REFERENCE VALUE</td><td>R365,000</td></tr>
<tr class="totals"><td></td><td>ALL-FEATURES STRATEGIC PRICE</td><td>R195,000</td></tr>
<tr class="totals"><td></td><td>STRATEGIC VALUE / DISCOUNT</td><td>R170,000</td></tr>
</tbody>
</table>
${footer(25)}`));

// 22 worksheet
pages.push(page(`${header("22", "Feature Selection & Commercial Sign-Off — Pricing Worksheet")}
<p class="lede">For <strong>CUSTOM SELECTION:</strong> tick the required modules and write the selected amount below. The final signed amount overrides the reference values for the agreed project.</p>
<table>
<thead><tr><th>CUSTOM SELECTION CALCULATION</th><th style="width:48mm">AMOUNT</th></tr></thead>
<tbody>
<tr><td>Selected module reference subtotal</td><td>R ______________</td></tr>
<tr><td>Agreed project / strategic discount</td><td>R ______________</td></tr>
<tr><td>Agreed implementation price</td><td>R ______________</td></tr>
<tr><td>Optional additional integration work</td><td>R ______________</td></tr>
<tr><td>Optional training / onboarding</td><td>R ______________</td></tr>
<tr><td>Optional managed service</td><td>R ______________ / month</td></tr>
<tr><td>Third-party costs (estimated / at cost)</td><td>R ______________</td></tr>
<tr class="totals"><td>TOTAL ONCE-OFF AMOUNT</td><td>R ______________</td></tr>
<tr class="totals"><td>TOTAL MONTHLY AMOUNT</td><td>R ______________ / month</td></tr>
</tbody>
</table>
<p class="note"><strong>Special inclusions / exclusions:</strong></p>
<div class="write-lines"><div></div><div></div><div></div></div>
<p class="note"><strong>Owner acknowledgement:</strong> I confirm that I have selected the commercial model and features above and understand that unticked features are excluded unless added through written Change Request.</p>
<table>
<thead><tr><th>ACG SECURITY AUTHORISED REPRESENTATIVE</th><th>4DS SOLUTIONS</th></tr></thead>
<tbody>
<tr><td>Name: _________________________</td><td>Name: _________________________</td></tr>
<tr><td>Initials: ______________________</td><td>Initials: ______________________</td></tr>
<tr><td>Date: __________________________</td><td>Date: __________________________</td></tr>
</tbody>
</table>
${footer(26)}`));

// 23 Signatures
pages.push(page(`${header("23", "Signatures")}
<p class="lede">By signing below, the parties confirm that they have read and understood this Agreement, that the selected Feature Schedule forms part of the Agreement, and that only the selected features and agreed commercial terms are included in the contracted scope.</p>
<table>
<thead><tr><th>FOR 4DS SOLUTIONS (PTY) LTD</th><th>FOR ACG SECURITY</th></tr></thead>
<tbody>
<tr><td>Name: _________________________</td><td>Name: _________________________</td></tr>
<tr><td>Title: _________________________</td><td>Title: _________________________</td></tr>
<tr><td>Signature: _____________________</td><td>Signature: _____________________</td></tr>
<tr><td>Date: __________________________</td><td>Date: __________________________</td></tr>
<tr><td>Company stamp (if applicable):<br/><br/><br/></td><td>Company stamp (if applicable):<br/><br/><br/></td></tr>
</tbody>
</table>
<table>
<thead><tr><th>WITNESS 1</th><th>WITNESS 2</th></tr></thead>
<tbody>
<tr><td>Name: _________________________</td><td>Name: _________________________</td></tr>
<tr><td>Signature: _____________________</td><td>Signature: _____________________</td></tr>
<tr><td>Date: __________________________</td><td>Date: __________________________</td></tr>
</tbody>
</table>
<p class="note"><strong>Final legal review note:</strong> Before signature, ACG Security should confirm its exact legal entity name, registration details, signatory authority, agreed commercial figures, SLA, term, annual escalation, liability cap, data/privacy arrangements and any industry-specific compliance requirements.</p>
<p class="note"><strong>Commercial note:</strong> The module reference values and strategic pricing in this version are proposed commercial figures for discussion and should be confirmed in writing before execution. They are not a substitute for the final signed quotation, SLA or legal review.</p>
${footer(27)}`));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>ACG Security | 4DS Nexus Software Services Agreement</title>
<style>${css}</style>
</head>
<body>
${pages.join("\n")}
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
  { encoding: "utf8" }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "Chrome print failed");
  process.exit(result.status || 1);
}

console.log("Wrote PDF:", outPdf);
if (fs.existsSync(outPdf)) {
  const st = fs.statSync(outPdf);
  console.log("PDF size bytes:", st.size);
}
