import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

import { PROVIDER, ISSUE, BOLOLO } from "../brand/doc-info.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoSrcDir = path.join(__dirname, "..", "brand");
const logoDark = "4ds-logo-header.png";
const logoLight = "4ds-logo-cover.png";
for (const file of [logoDark, logoLight]) {
  fs.copyFileSync(path.join(logoSrcDir, file), path.join(__dirname, file));
}

const css = `
:root {
  --ink: #141414;
  --muted: #5c5c5c;
  --line: #d9d9d9;
  --paper: #f4f4f5;
  --red: #c9302c;
  --red-soft: #f8e8e7;
  --green: #1f7a46;
  --green-soft: #e8f5ee;
  --ok: #15803d;
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
  padding: 14mm 16mm 18mm;
  position: relative; page-break-after: always;
  overflow: hidden; background: #fff;
}
.page:last-child { page-break-after: auto; }
.cover {
  background:
    radial-gradient(ellipse at 88% 8%, rgba(201,48,44,0.22), transparent 42%),
    linear-gradient(165deg, #1a1a1a 0%, #101010 55%, #171717 100%);
  color: #fff; padding: 16mm 18mm 18mm;
}
.cover * { color: #fff; }
.cover-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14mm; }
.cover-eyebrow {
  font-size: 9.5pt; letter-spacing: 0.04em; text-transform: uppercase;
  padding-bottom: 7px; border-bottom: 1px solid rgba(255,255,255,0.85);
}
.logo { height: 24px; width: auto; display: block; background: transparent; object-fit: contain; }
.logo-lg { height: 46px; width: auto; background: transparent; }
.role-badge {
  display: inline-block; margin: 0 0 8mm;
  padding: 4px 12px; border: 1px solid rgba(255,255,255,0.35);
  font-size: 8.5pt; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700;
}
.cover-hero h1 { margin: 0 0 6px; font-size: 30pt; font-weight: 800; letter-spacing: 0.04em; line-height: 1; }
.cover-hero .sub { margin: 0 0 5px; font-size: 14pt; font-weight: 400; opacity: 0.92; }
.cover-hero .doc-type { margin: 0; font-size: 10pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #f3b4b1 !important; }
.cover-intro { font-size: 10pt; line-height: 1.65; max-width: 158mm; margin: 8mm 0 9mm; opacity: 0.94; }
.cover-pills { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10mm; }
.pill {
  font-size: 8pt; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 700;
  padding: 5px 9px; border: 1px solid rgba(255,255,255,0.28); border-radius: 99px;
}
.pill.on { background: var(--red); border-color: var(--red); }
.meta-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px 14px; font-size: 9.5pt;
}
.meta-grid .label { font-size: 7.5pt; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.65; font-weight: 700; }
.meta-grid .value { border-bottom: 1px solid rgba(255,255,255,0.35); padding-bottom: 3px; display: block; }
.meta-grid .pair { display: flex; flex-direction: column; gap: 2px; }
.doc-control {
  margin-top: 7mm; font-size: 8pt; letter-spacing: 0.04em; text-transform: uppercase;
  opacity: 0.8; font-weight: 700;
}
.cover-foot {
  position: absolute; left: 18mm; right: 18mm; bottom: 16mm;
  display: flex; justify-content: space-between; align-items: flex-end;
  font-size: 9pt; line-height: 1.55; opacity: 0.9;
}
.cover-foot strong { display: block; margin-bottom: 3px; }
.page-header {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding-bottom: 7px; border-bottom: 2px solid #111; margin-bottom: 6mm;
}
.sec-title { display: flex; align-items: center; gap: 9px; }
.sec-num {
  background: #111; color: #fff; font-weight: 800; font-size: 11pt;
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
}
.sec-title h1 { margin: 0; font-size: 14.5pt; font-weight: 750; }
.lede { font-size: 10pt; line-height: 1.55; margin: 0 0 4mm; color: #333; }
.clause { font-size: 9.6pt; line-height: 1.52; margin: 0 0 2.8mm; }
.clause strong.num { font-weight: 750; }
h2.block { margin: 0 0 2.6mm; font-size: 10.5pt; font-weight: 750; letter-spacing: 0.02em; }
.note { font-size: 8.8pt; line-height: 1.45; color: #555; margin: 2mm 0 0; }
.page-footer {
  position: absolute; left: 16mm; right: 16mm; bottom: 9mm;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 7.8pt; color: #888; border-top: 1px solid #ddd; padding-top: 5px;
}
.toc { list-style: none; margin: 0; padding: 0; }
.toc li {
  display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center;
  padding: 3.2mm 0; border-bottom: 1px solid #ececec; font-size: 10.2pt;
}
.toc .n { width: 22px; height: 22px; background: #111; color: #fff; font-size: 8pt; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.toc .pg { color: #888; font-variant-numeric: tabular-nums; }
.pipe {
  display: flex; align-items: stretch; gap: 0; margin: 0 0 4.5mm; flex-wrap: wrap;
}
.pipe-step {
  flex: 1 1 28mm; min-width: 28mm; background: #111; color: #fff; padding: 3.2mm 3mm 3mm;
  text-align: center; position: relative;
}
.pipe-step strong { display: block; font-size: 8pt; letter-spacing: 0.02em; }
.pipe-step span { display: block; font-size: 7pt; opacity: 0.7; margin-bottom: 2px; }
.pipe-step + .pipe-step { margin-left: 4px; }
.pipe-step + .pipe-step::before {
  content: ""; position: absolute; left: -4px; top: 50%; width: 0; height: 0;
  border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 4px solid #fff;
  transform: translateY(-50%);
}
.pipe.tight {
  display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; flex-wrap: nowrap;
}
.pipe.tight .pipe-step { min-width: 0; margin-left: 0; padding: 2.6mm 1.4mm 2.4mm; }
.pipe.tight .pipe-step + .pipe-step::before { display: none; }
.pipe.tight .pipe-step strong { font-size: 7pt; }
.pipe.tight .pipe-step span { font-size: 6.5pt; }
.support {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm;
  margin-top: 4mm; padding-top: 3mm; border-top: 1px solid var(--line);
}
.support .k { font-size: 7pt; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); font-weight: 750; }
.support strong { display: block; font-size: 9.5pt; margin: 1mm 0 0.8mm; }
.support p { margin: 0; font-size: 8pt; line-height: 1.4; color: #444; }
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 0 0 4mm; }
.tiles.three { grid-template-columns: 1fr 1fr 1fr; }
.tile {
  border: 1px solid var(--line); background: var(--paper); padding: 3.2mm 3.4mm 3mm;
  min-height: 22mm;
}
.tile .k { font-size: 7.4pt; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); font-weight: 750; }
.tile strong { display: block; font-size: 10pt; margin: 1.2mm 0 1mm; }
.tile p { margin: 0; font-size: 8.6pt; line-height: 1.4; color: #333; }
.led { width: 7px; height: 7px; border-radius: 99px; background: #22c55e; display: inline-block; margin-right: 5px; box-shadow: 0 0 0 3px rgba(34,197,94,0.18); }
.led.red { background: var(--red); box-shadow: 0 0 0 3px rgba(201,48,44,0.18); }
.led.amber { background: #d97706; box-shadow: 0 0 0 3px rgba(217,119,6,0.18); }
.split { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 4mm; margin: 0 0 4mm; align-items: start; }
.split-eq { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 0 0 4mm; }
.do, .dont {
  padding: 3.2mm 3.4mm; min-height: 38mm;
}
.do { background: var(--green-soft); border-top: 3px solid var(--green); }
.dont { background: var(--red-soft); border-top: 3px solid var(--red); }
.do h3, .dont h3 { margin: 0 0 2mm; font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; }
.do ul, .dont ul { margin: 0; padding-left: 4mm; font-size: 8.8pt; line-height: 1.45; }
.do li, .dont li { margin-bottom: 1.4mm; }
.callout {
  display: grid; grid-template-columns: 8mm 1fr; gap: 3mm; align-items: start;
  padding: 3mm 3.4mm; margin: 0 0 4mm; background: #111; color: #fff;
}
.callout.warn { background: var(--red); }
.callout.soft { background: var(--paper); color: var(--ink); border: 1px solid var(--line); }
.callout .mark { font-weight: 800; font-size: 12pt; line-height: 1; }
.callout p { margin: 0; font-size: 9pt; line-height: 1.45; }
.callout strong { display: block; margin-bottom: 1mm; font-size: 9.2pt; }
.phone {
  width: 58mm; border: 3px solid #111; border-radius: 14px; padding: 8px 8px 10px;
  background: #0b0b0b; color: #fff; margin: 0 auto;
}
.phone * { color: #fff; }
.phone-notch { width: 18mm; height: 4px; background: #333; border-radius: 4px; margin: 0 auto 6px; }
.phone-kicker { font-size: 6.5pt; letter-spacing: 0.12em; text-transform: uppercase; color: #9ca3af !important; }
.phone h4 { margin: 3px 0 2px; font-size: 11pt; }
.phone .status { font-size: 13pt; font-weight: 800; letter-spacing: 0.04em; color: #86efac !important; }
.phone .status.alert { color: #fca5a5 !important; }
.phone .row { display: flex; justify-content: space-between; font-size: 7pt; margin-top: 5px; opacity: 0.85; }
.panic {
  margin: 8px auto 2px; width: 28mm; height: 28mm; border-radius: 99px;
  background: radial-gradient(circle at 35% 30%, #ef4444, #991b1b);
  border: 3px solid #7f1d1d; display: flex; align-items: center; justify-content: center;
  font-size: 7.5pt; font-weight: 800; letter-spacing: 0.08em;
}
.desk {
  border: 1px solid #111; background: #fafafa; overflow: hidden; margin: 0 0 3.5mm;
}
.desk-bar {
  background: #111; color: #fff; display: flex; align-items: center; gap: 5px;
  padding: 3.5px 8px; font-size: 8pt;
}
.desk-bar i { width: 7px; height: 7px; border-radius: 99px; background: #555; display: inline-block; }
.desk-bar i:nth-child(1) { background: #ef4444; }
.desk-bar i:nth-child(2) { background: #f59e0b; }
.desk-bar i:nth-child(3) { background: #22c55e; }
.desk-body { display: grid; grid-template-columns: 28mm 1fr; min-height: 38mm; }
.rail { background: #1a1a1a; color: #ddd; padding: 4px 0; font-size: 7pt; }
.rail div { padding: 3.5px 8px; }
.rail .on { background: var(--red); color: #fff; font-weight: 700; }
.desk-main { padding: 6px 8px; font-size: 8pt; }
.kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 6px; }
.kpi b { display: block; font-size: 12pt; line-height: 1; }
.kpi span { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.06em; color: #666; }
.chip { display: inline-block; font-size: 7pt; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; background: #111; color: #fff; margin-right: 3px; }
.steps-v { margin: 0 0 4mm; }
.step-v {
  display: grid; grid-template-columns: 8mm 1fr; gap: 3mm; margin-bottom: 2.4mm; align-items: start;
}
.step-v .n {
  width: 7.2mm; height: 7.2mm; background: #111; color: #fff; font-size: 8.5pt; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.step-v p { margin: 0; font-size: 9.4pt; line-height: 1.4; }
.legend { display: flex; gap: 8px; flex-wrap: wrap; font-size: 7.5pt; margin: 0 0 3mm; color: #555; }
.legend b { display: inline-block; width: 8px; height: 8px; margin-right: 4px; vertical-align: -1px; }
`;

function header(num, title) {
  return `<div class="page-header">
  <div class="sec-title"><div class="sec-num">${num}</div><h1>${title}</h1></div>
  <img class="logo" src="${logoDark}" alt="4DS" />
</div>`;
}
function footer(docShort, pageNo, docCode) {
  const code = docCode ? ` · ${docCode}` : "";
  return `<div class="page-footer"><span>${PROVIDER.short} · ${BOLOLO.client} · ${docShort}${code} · v${ISSUE.version}</span><span>${String(pageNo).padStart(2, "0")}</span></div>`;
}
function page(inner) {
  return `<section class="page">${inner}</section>`;
}
function pills(active) {
  const all = ["Owner", "Control Room", "Installation", "Client", "Officer"];
  return `<div class="cover-pills">${all.map((p) => `<span class="pill${p === active ? " on" : ""}">${p}</span>`).join("")}</div>`;
}
function cover({ eyebrow, role, sub, docType, intro, audience, login, device, active, docCode }) {
  return `<section class="page cover">
  <div class="cover-top">
    <div class="cover-eyebrow">${eyebrow}</div>
    <img class="logo logo-lg" src="${logoLight}" alt="4DS" />
  </div>
  <div class="role-badge">${PROVIDER.product} · ${role}</div>
  <div class="cover-hero">
    <h1>BOLOLO SECURITY</h1>
    <p class="sub">${sub}</p>
    <p class="doc-type">${docType}</p>
  </div>
  <p class="cover-intro">${intro}</p>
  ${pills(active)}
  <div class="meta-grid">
    <div class="pair"><span class="label">Prepared for</span><span class="value">${BOLOLO.client}</span></div>
    <div class="pair"><span class="label">Prepared by</span><span class="value">${PROVIDER.legal}</span></div>
    <div class="pair"><span class="label">Audience</span><span class="value">${audience}</span></div>
    <div class="pair"><span class="label">Sign-in</span><span class="value">${login}</span></div>
    <div class="pair"><span class="label">Device</span><span class="value">${device}</span></div>
    <div class="pair"><span class="label">Issued</span><span class="value">${ISSUE.date} · v${ISSUE.version}</span></div>
  </div>
  <div class="doc-control">Doc ${docCode} · Controlled operational copy · Confidential</div>
  <div class="cover-foot">
    <div>${PROVIDER.owner}<br/>${PROVIDER.legal} · ${PROVIDER.reg}<br/>${PROVIDER.web}</div>
    <div>Confidential</div>
  </div>
</section>`;
}
function tocPage(items, note, foot) {
  return page(`${header("00", "Contents")}
<p class="lede">Use the numbered sections in order the first time. After that, jump to the screen you need.</p>
<ol class="toc">
${items.map((t, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><span>${t[0]}</span><span class="pg">${t[1]}</span></li>`).join("")}
</ol>
<p class="note">${note}</p>
${foot}`);
}
function pipe(steps, cls = "") {
  return `<div class="pipe ${cls}">${steps.map((s) => `<div class="pipe-step"><span>${s.n}</span><strong>${s.t}</strong></div>`).join("")}</div>`;
}
function tiles(items, cls = "") {
  return `<div class="tiles ${cls}">${items.map((it) => `<div class="tile"><div class="k">${it.k}</div><strong>${it.t}</strong><p>${it.p}</p></div>`).join("")}</div>`;
}
function stepsV(items) {
  return `<div class="steps-v">${items.map((t, i) => `<div class="step-v"><div class="n">${i + 1}</div><p>${t}</p></div>`).join("")}</div>`;
}
function supportBlock(quote) {
  return `<div class="support">
    <div><div class="k">App support</div><strong>${PROVIDER.short}</strong><p>${PROVIDER.web} · quote “${quote}”</p></div>
    <div><div class="k">Operations</div><strong>${BOLOLO.client}</strong><p>Radio and supervisor for SOP. ${PROVIDER.short} only for platform faults.</p></div>
    <div><div class="k">Document</div><strong>${ISSUE.date} · v${ISSUE.version}</strong><p>Controlled copy. Do not issue to another company or role.</p></div>
  </div>`;
}
function desk(title, railItems, main) {
  return `<div class="desk">
    <div class="desk-bar"><i></i><i></i><i></i> ${title}</div>
    <div class="desk-body">
      <div class="rail">${railItems.map((r) => `<div class="${r.on ? "on" : ""}">${r.t}</div>`).join("")}</div>
      <div class="desk-main">${main}</div>
    </div>
  </div>`;
}
function htmlDoc(title, pages) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title><style>${css}</style></head><body>${pages.join("\n")}</body></html>`;
}

function ownerPages() {
  const meta = BOLOLO.manuals.Owner;
  const f = (n) => footer(meta.short, n, meta.code);
  const rail = [
    { t: "Ops Board", on: true }, { t: "Command Hub" }, { t: "Live Map" }, { t: "Dispatch" },
    { t: "Incidents" }, { t: "CCTV" }, { t: "Customers" }, { t: "Teams" }, { t: "Settings" },
  ];
  return [
    cover({
      eyebrow: "Bololo Security · owner user manual",
      role: "Owner desk",
      sub: "Business administration & command oversight",
      docType: "User Manual — Owner",
      intro: "Your login is the master key for Bololo Security on 4DS Nexus. This guide shows the control panel visually: who to create, what to watch each morning, and when to stay out of a live panic.",
      audience: "Owner / Managing Director",
      login: "Control Panel · /login",
      device: "Desktop or laptop",
      active: "Owner",
      docCode: meta.code,
    }),
    tocPage([
      ["Who this login is for", "03"],
      ["Sign in & first-day timeline", "04"],
      ["Control panel map", "05"],
      ["Teams, roles & invitations", "06"],
      ["Customers, jobs & money", "07"],
      ["Daily owner loop", "08"],
      ["Faults & escalation", "09"],
    ], "Issue the other four manuals to dispatchers, technicians, clients and officers. Do not give this Owner manual to field staff.", f(2)),
    page(`${header("01", "Who this login is for")}
<p class="lede">The Owner account sees the whole company. Use it to set people up and to audit the shift — not to sit on every radio call.</p>
<div class="split-eq">
  <div class="do"><h3>You use Owner for</h3><ul>
    <li>Creating dispatchers, officers, technicians and clients</li>
    <li>Company settings, branches and passwords</li>
    <li>Customers, plans, store and install jobs</li>
    <li>A morning read of the Ops Board</li>
  </ul></div>
  <div class="dont"><h3>Hand these to others</h3><ul>
    <li>Live panic dispatch → Control Room manual</li>
    <li>Driving to a job → Officer manual</li>
    <li>Fitting cameras → Installation manual</li>
    <li>Household panic button → Client manual</li>
  </ul></div>
</div>
${tiles([
  { k: "Rule 01", t: "Least privilege", p: "Give each person the smallest role that still lets them work." },
  { k: "Rule 02", t: "One login each", p: "Never share the Owner password. Deactivate leavers the same day." },
  { k: "Rule 03", t: "Doors", p: "Control Panel /login · Officer /officer/login · Technician /tech/login · Client /portal/login · Supervisor /supervisor/login." },
], "three")}
${f(3)}`),
    page(`${header("02", "Sign in & first-day timeline")}
${pipe([
  { n: "01", t: "Change password" },
  { n: "02", t: "Company details" },
  { n: "03", t: "Branches / teams" },
  { n: "04", t: "Invite staff" },
  { n: "05", t: "Add customers" },
  { n: "06", t: "Staff the board" },
])}
${stepsV([
  "Open the Bololo / 4DS address → choose <strong>Control Panel</strong> (not Client, Officer or Technician).",
  "Enter organisation, Owner email and password. You land on the <strong>Ops Board</strong>.",
  "Settings: confirm company name, phones and address.",
  "Teams &amp; Users: create at least one Dispatcher before any client goes live.",
])}
<div class="callout"><div class="mark">!</div><div><strong>Do not go live empty-handed</strong><p>A client Panic with nobody on the Ops Board is a failed launch. Confirm a dispatcher is signed in first.</p></div></div>
${f(4)}`),
    page(`${header("03", "Control panel map")}
<p class="lede">This is the desktop you work in. The red item is the home screen after login.</p>
${desk("4DS Nexus — Bololo Security", rail, `
  <div class="kpi">
    <div><b>7</b><span>Open alerts</span></div>
    <div><b>4</b><span>On duty</span></div>
    <div><b>2</b><span>Install jobs</span></div>
  </div>
  <span class="chip">Ops Board</span>
  <p style="margin:6px 0 0;color:#333">Open panics sit at the top. Click the incident — do not manage it only on WhatsApp.</p>
`)}
${tiles([
  { k: "Live", t: "Map · CCTV · Dispatch", p: "Where the shift actually happens. Supervisors live here." },
  { k: "Business", t: "Customers · Store · Jobs", p: "Who pays, what was sold, what must be installed." },
  { k: "Admin", t: "Teams · Settings · Analytics", p: "Who can log in, rules, and the month’s picture." },
], "three")}
${f(5)}`),
    page(`${header("04", "Teams, roles & invitations")}
<p class="lede">Open <strong>Teams &amp; Users</strong>. Each row is a real person and a portal.</p>
${tiles([
  { k: "Owner", t: "This manual", p: "Full business + operations." },
  { k: "Dispatcher", t: "Control Room", p: "Map, CCTV, incidents, chat." },
  { k: "Officer", t: "Officer App", p: "Jobs, GPS, evidence, SOS." },
  { k: "Technician", t: "Install app", p: "Job board, cameras, stock." },
  { k: "Client", t: "Client Portal", p: "Panic, alarm, family, vehicles." },
  { k: "Supervisor", t: "Field oversight", p: "Roster, performance, map." },
])}
${stepsV([
  "Add user → name, email, role, branch → temporary password or invite link.",
  "Tell them which door to use: Control Panel, Officer, Technician or Client Portal.",
  "When they leave: set Inactive the same day.",
])}
${f(6)}`),
    page(`${header("05", "Customers, jobs & money")}
${tiles([
  { k: "Customers", t: "Subscriber files", p: "Plan, property, vehicles, invite status. Check here before blaming the app." },
  { k: "Install Jobs", t: "Work for technicians", p: "Address, kit, date, assigned tech. Status should move every visit." },
  { k: "Store", t: "Gear catalogue", p: "Products and orders linked to installs." },
  { k: "Analytics", t: "The month in numbers", p: "Incidents, officers, response picture for the owner meeting." },
])}
<div class="callout soft"><div class="mark">%</div><div><strong>Revenue share records</strong><p>Keep monthly client payments accurate. The signed 4DS agreement uses 10% of payments connected to the system — this screen is how you stay honest, not how you dispatch.</p></div></div>
<h2 class="block">Watch the live board without taking over</h2>
<p class="clause">If a panic is open and unassigned, phone the on-duty dispatcher. Do not resolve a live panic from Owner unless Control Room has confirmed false or complete.</p>
${f(7)}`),
    page(`${header("06", "Daily owner loop")}
${pipe([
  { n: "AM", t: "Ops Board" },
  { n: "AM", t: "Install diary" },
  { n: "Day", t: "New customers" },
  { n: "Day", t: "Leaver access" },
  { n: "PM", t: "Open criticals" },
  { n: "Month", t: "Revenue file" },
])}
${tiles([
  { k: "Morning", t: "3-minute scan", p: "Open panics, officers on duty, overnight leftovers." },
  { k: "Anytime", t: "People hygiene", p: "Deactivate anyone who left. No shared logins." },
  { k: "End of day", t: "No silent fires", p: "Every high-priority ticket has an owner and a next step." },
  { k: "Month-end", t: "Numbers", p: "Active clients and payments before 4DS share calculation." },
])}
${f(8)}`),
    page(`${header("07", "Faults & escalation")}
${tiles([
  { k: "Login", t: "Cannot sign in", p: "Organisation + email + caps lock. Reset from Teams if you still have an admin. Else 4DS." },
  { k: "Access", t: "Wrong screens", p: "Wrong role on the user record — fix in Teams & Users." },
  { k: "Client", t: "Panic dead", p: "Confirm CLIENT login + active plan + a dispatcher on the board." },
  { k: "Map", t: "Grey tiles", p: "Map pictures need internet. Pins still work on a local network." },
])}
<div class="callout warn"><div class="mark">SOS</div><div><strong>Platform down</strong><p>Fall back to radio / phone SOP. Tell 4DS. Do not invent a second unofficial client list in a notebook that nobody else can see.</p></div></div>
${supportBlock("Bololo Security — Owner desk")}
${f(9)}`),
  ];
}

function controlRoomPages() {
  const meta = BOLOLO.manuals["Control Room"];
  const f = (n) => footer(meta.short, n, meta.code);
  const rail = [
    { t: "Ops Board", on: true }, { t: "Command Hub" }, { t: "Live Map" }, { t: "Dispatch" },
    { t: "Incidents" }, { t: "CCTV" }, { t: "Comms" }, { t: "Officers" }, { t: "Fleet" },
  ];
  return [
    cover({
      eyebrow: "Bololo Security · control room user manual",
      role: "Dispatch console",
      sub: "Live operations, panic & CCTV",
      docType: "User Manual — Control Room",
      intro: "You sit between the client pin and the officer. This manual is the shift: how a panic looks, how to assign, what silent panic forbids, and how to close a ticket so the next operator is not blind.",
      audience: "Dispatcher / on-duty operator",
      login: "Control Panel · /login",
      device: "Desktop — two screens if possible",
      active: "Control Room",
      docCode: meta.code,
    }),
    tocPage([
      ["Your seat in the room", "03"],
      ["Shift start", "04"],
      ["The board & the map", "05"],
      ["Panic path", "06"],
      ["Dispatch, CCTV & chat", "07"],
      ["Handover", "08"],
      ["Shift discipline", "09"],
    ], "Each operator uses their own login. A shared dispatcher password destroys the audit trail.", f(2)),
    page(`${header("01", "Your seat in the room")}
<div class="split-eq">
  <div class="do"><h3>You must</h3><ul>
    <li>See new panic / fire / medical in seconds</li>
    <li>Assign the nearest available officer</li>
    <li>Talk to client and unit — and log it</li>
    <li>Keep silent panics quiet on the phone</li>
  </ul></div>
  <div class="dont"><h3>You must not</h3><ul>
    <li>Leave a critical unassigned</li>
    <li>Close “probably false” with no check</li>
    <li>Paste client addresses into group chats</li>
    <li>Work under someone else’s name</li>
  </ul></div>
</div>
<p class="lede" style="margin-top:1mm">The system is a tool. Radio discipline and Bololo SOP still win.</p>
${tiles([
  { k: "Desk", t: "Two screens if you can", p: "Ops Board + Live Map. CCTV on the second screen when a site is live." },
  { k: "Login", t: "Your name on the header", p: "Control Panel · /login. Never the previous operator’s session." },
  { k: "Radio", t: "SOP still wins", p: "The app logs. The radio moves units. Use both." },
], "three")}
${f(3)}`),
    page(`${header("02", "Shift start")}
${pipe([
  { n: "1", t: "Sign in" },
  { n: "2", t: "Ops Board" },
  { n: "3", t: "Map / GPS" },
  { n: "4", t: "Unread chat" },
  { n: "5", t: "Take handover" },
])}
${stepsV([
  "Control Panel → your dispatcher email. Confirm <strong>your</strong> name is showing.",
  "Count open incidents and officers on duty.",
  "Live Map: pins in the right zones, GPS fresh.",
  "Read handover: open jobs, waiting VIPs, cameras down.",
])}
<div class="callout warn"><div class="mark">!</div><div><strong>Never start blind</strong><p>Open panics left by the last operator are now yours until assigned or closed correctly.</p></div></div>
${f(4)}`),
    page(`${header("03", "The board & the map")}
${desk("Control Room — Bololo", rail, `
  <div class="kpi">
    <div><b style="color:#c9302c">1</b><span>Panic open</span></div>
    <div><b>3</b><span>En route</span></div>
    <div><b>5</b><span>Officers</span></div>
  </div>
  <span class="chip">PANIC</span> <span class="chip">Nomsa Client</span>
  <p style="margin:6px 0 0;color:#333">Umhlanga Rocks Dr · nearest unit O-24 · assign from Dispatch.</p>
`)}
${tiles([
  { k: "Red", t: "Panic / Fire / Medical / Intrusion", p: "Life-safety until proven otherwise." },
  { k: "Amber", t: "Alarm / theft / in progress", p: "Needs a unit, not a shrug." },
  { k: "Board", t: "Command Hub", p: "Priority picture of the whole shift." },
], "three")}
${f(5)}`),
    page(`${header("04", "Panic path")}
${pipe([
  { n: "1", t: "Alert" },
  { n: "2", t: "Open job" },
  { n: "3", t: "Map" },
  { n: "4", t: "Assign" },
  { n: "5", t: "Talk" },
  { n: "6", t: "Stay" },
  { n: "7", t: "Log" },
])}
${stepsV([
  "Incident hits Ops Board — open it immediately.",
  "Read type, silent vs audible, name, address.",
  "Live Map: client pin + nearest available officer.",
  "Dispatch → assign (or Emergency notify only if SOP says all-call).",
  "Call / chat the client only if it is safe — not on silent panic.",
  "Stay until En route, then On scene. Write every step on the timeline.",
])}
<div class="callout warn"><div class="mark">S</div><div><strong>Silent panic</strong><p>Do not phone the premises in a way that could expose the client. Dispatch, watch CCTV/map, follow Bololo SOP.</p></div></div>
${f(6)}`),
    page(`${header("05", "Dispatch, CCTV & chat")}
${tiles([
  { k: "Dispatch", t: "Assign / reassign", p: "If they do not Accept, give it to the next unit. Do not wait hoping." },
  { k: "CCTV", t: "See then send", p: "Acknowledge trigger, look, then dispatch or false per SOP. No casual siren tests on occupied sites." },
  { k: "Fleet", t: "Unit vs pin", p: "The officer you assigned should match the vehicle on the map." },
  { k: "Chat", t: "Logged words", p: "Client chat and internal chat are the record. Keep panic chat short." },
])}
<p class="clause"><strong class="num">5.1 Documents.</strong> Photos and PDFs go on the incident so night shift can see them.</p>
<h2 class="block">Close-out</h2>
${pipe([
  { n: "1", t: "On scene" },
  { n: "2", t: "Outcome" },
  { n: "3", t: "Timeline" },
  { n: "4", t: "Evidence" },
  { n: "5", t: "Tell client" },
  { n: "6", t: "Resolve" },
])}
${f(7)}`),
    page(`${header("06", "Handover")}
${tiles([
  { k: "Pass on", t: "Still open", p: "Panics, units on scene, CCTV sites dark, angry / VIP waiting." },
  { k: "Map", t: "Grey or empty", p: "Use incident list + radio. Do not freeze." },
  { k: "GPS", t: "Officer missing", p: "Call them. Do not invent a position." },
  { k: "Assign", t: "Nobody free", p: "Escalate to supervisor / owner immediately." },
])}
${stepsV([
  "Walk the incoming operator through every OPEN critical — name, unit, last timeline line.",
  "Show cameras that are dark and any VIP / angry client still waiting.",
  "Confirm they can see their own name on the header, then you sign out.",
])}
<p class="note">Platform faults → 4DS. SOP → Bololo supervisor. Quote “Bololo Security — Control Room”.</p>
${f(8)}`),
    page(`${header("07", "Shift discipline")}
<div class="split-eq">
  <div class="do"><h3>Good log</h3><ul>
    <li>Assigned O-24 14:02</li>
    <li>En route 14:04 · ETA 6 min</li>
    <li>On scene 14:11 · resident on site</li>
    <li>False alarm · wind on sensor · resolved</li>
  </ul></div>
  <div class="dont"><h3>Useless log</h3><ul>
    <li>“Told him on WhatsApp”</li>
    <li>Status still OPEN at 06:00</li>
    <li>No officer name</li>
    <li>Silent panic called on loudspeaker</li>
  </ul></div>
</div>
<div class="callout"><div class="mark">✓</div><div><strong>End of night</strong><p>No OPEN critical without a named next action. The morning owner scan depends on you.</p></div></div>
${supportBlock("Bololo Security — Control Room")}
${f(9)}`),
  ];
}

function installPages() {
  const meta = BOLOLO.manuals.Installation;
  const f = (n) => footer(meta.short, n, meta.code);
  return [
    cover({
      eyebrow: "Bololo Security · installation team user manual",
      role: "Technician app",
      sub: "CCTV, alarm & access-control jobs",
      docType: "User Manual — Installation Team",
      intro: "Your phone is the job card. Accept, drive, install, photograph, test, get sign-off. This guide is visual on purpose — so the workflow is obvious on site.",
      audience: "Technician / camera tech / install lead",
      login: "Technician · /tech/login",
      device: "Phone or tablet on site",
      active: "Installation",
      docCode: meta.code,
    }),
    tocPage([
      ["Your job vs the control room", "03"],
      ["Today’s jobs", "04"],
      ["The eight statuses", "05"],
      ["On the road & on site", "06"],
      ["Checklist, cameras, photos", "07"],
      ["Sign-off & stock", "08"],
    ], "If a client has a live panic while you are on site, phone Control Room. Do not ‘resolve’ it from the tech app.", f(2)),
    page(`${header("01", "Your job vs the control room")}
<div class="split-eq">
  <div class="do"><h3>You</h3><ul>
    <li>Fit cameras, NVR, alarm, access</li>
    <li>Name cameras for the operator</li>
    <li>Prove recording and remote view</li>
    <li>Get client sign-off</li>
  </ul></div>
  <div class="dont"><h3>Not you</h3><ul>
    <li>Dispatching armed response</li>
    <li>Sharing NVR passwords on WhatsApp</li>
    <li>Marking Complete to clear the board</li>
  </ul></div>
</div>
${tiles([
  { k: "Home", t: "Today’s jobs", p: "Start here every morning." },
  { k: "List", t: "Install Jobs", p: "Scheduled / active / done." },
  { k: "Map", t: "Job pins", p: "Sequence your stops." },
  { k: "Kit", t: "Cameras · stock", p: "Commission and request parts." },
])}
${f(3)}`),
    page(`${header("02", "Today’s jobs")}
${desk("Technician Team", [
  { t: "Today", on: true }, { t: "Jobs" }, { t: "Map" }, { t: "Cameras" }, { t: "Inventory" }, { t: "Chat" },
], `
  <span class="chip">CURRENT</span>
  <p style="margin:8px 0 4px;font-weight:700">CCTV — Berea residence</p>
  <p style="margin:0;color:#444">42 Musgrave Rd · Nomsa Client · 4× turret</p>
  <p style="margin:8px 0 0"><span class="chip">Accept job</span></p>
`)}
${stepsV([
  "Sign in on <strong>Technician Team</strong> — not Officer, not Client Portal.",
  "Open Today’s jobs → current card: address, customer, kit, time.",
  "Search the list if you have several stops.",
])}
${f(4)}`),
    page(`${header("03", "The eight statuses")}
<p class="lede">Move forward in order. Control Room and the owner can see this bar.</p>
${pipe([
  { n: "1", t: "Accept" },
  { n: "2", t: "En route" },
  { n: "3", t: "Arrived" },
  { n: "4", t: "Site check" },
  { n: "5", t: "Install" },
  { n: "6", t: "Testing" },
  { n: "7", t: "Approval" },
  { n: "8", t: "Complete" },
], "tight")}
${tiles([
  { k: "Truth", t: "En route means you left", p: "Office uses this like a tracker. Lying breaks dispatch trust." },
  { k: "Stuck", t: "No access?", p: "Photo the gate, note it, chat office. Never Complete." },
  { k: "Done", t: "Complete is the last step", p: "Only after testing, remote view, and client sign-off." },
], "three")}
${f(5)}`),
    page(`${header("04", "On the road & on site")}
${stepsV([
  "Job → Navigate (maps). Advance En route when you pull off, Arrived at the gate.",
  "Walk the site. Confirm power, mounting, and that the van kit matches the job card.",
  "Tick the checklist as you go — it is the proof pack.",
])}
<h2 class="block">Install checklist</h2>
${tiles([
  { k: "01–02", t: "Kit & access", p: "Equipment on the van. Site access confirmed." },
  { k: "03–04", t: "Mount & NVR", p: "Cameras up. Recorder connected." },
  { k: "05–06", t: "Network & cameras", p: "LAN/Wi‑Fi. Channels named for Control Room." },
  { k: "07–10", t: "Test, demo, sign", p: "Recording, remote view, client demo, sign-off." },
])}
${f(6)}`),
    page(`${header("05", "Cameras, photos, cloud")}
${tiles([
  { k: "Names", t: "Front gate, not Cam3", p: "Operators work at night. Labels must be human." },
  { k: "Photos", t: "Before, after, serials", p: "Blurry shots lose arguments later." },
  { k: "Cloud", t: "Bololo Tuya / 4DS account", p: "Never a personal installer login." },
  { k: "Dead kit", t: "Mark defective", p: "Do not leave silent duds on a wall." },
])}
<div class="callout"><div class="mark">REC</div><div><strong>Remote view is the finish line</strong><p>If Control Room cannot see the site, the job is not done — even if the client smiled.</p></div></div>
${f(7)}`),
    page(`${header("06", "Sign-off, stock, chat")}
${pipe([
  { n: "1", t: "Demo" },
  { n: "2", t: "Sign-off" },
  { n: "3", t: "Complete" },
  { n: "4", t: "Follow-up job" },
])}
<div class="split-eq">
  <div class="do"><h3>Do</h3><ul>
    <li>Request stock in Inventory</li>
    <li>Use team chat for delays</li>
    <li>Call Control Room for a live emergency</li>
  </ul></div>
  <div class="dont"><h3>Don’t</h3><ul>
    <li>Strip another job’s box quietly</li>
    <li>Screenshot customer Wi‑Fi into a group</li>
    <li>Install a second unofficial app</li>
  </ul></div>
</div>
<p class="note">Roster/parts: Bololo install lead. App faults: 4DS · quote “Bololo Security — Installation Team”.</p>
${supportBlock("Bololo Security — Installation Team")}
${f(8)}`),
  ];
}

function clientPages() {
  const meta = BOLOLO.manuals.Client;
  const f = (n) => footer(meta.short, n, meta.code);
  const phoneDash = `<div class="phone">
    <div class="phone-notch"></div>
    <div class="phone-kicker">Good morning · Nomsa</div>
    <div class="status"><span class="led"></span>PROTECTED</div>
    <div class="row"><span>Home ✓</span><span>GPS ✓</span><span>CCTV ✓</span><span>Alarm ✓</span></div>
    <div class="row" style="margin-top:8px;opacity:1"><span>Armed · Away</span><span>Umhlanga</span></div>
    <div class="panic">HOLD<br/>PANIC</div>
    <div class="phone-kicker" style="text-align:center;margin-top:6px">2 seconds · real emergency only</div>
  </div>`;
  return [
    cover({
      eyebrow: "Bololo Security · client portal user manual",
      role: "Protected subscriber",
      sub: "Panic, home, family & vehicles",
      docType: "User Manual — Client",
      intro: "This is your household link to Bololo’s control room. The big red control is for danger. Everything else is status, family, and the home alarm. Keep the login to yourself.",
      audience: "Account holder / household",
      login: "Client Portal · /portal/login",
      device: "Phone (best) or computer",
      active: "Client",
      docCode: meta.code,
    }),
    tocPage([
      ["What this app is", "03"],
      ["Sign in & home screen", "04"],
      ["Panic, medical & fire", "05"],
      ["Home, family, vehicles", "06"],
      ["Chat & medical profile", "07"],
      ["If the app fails", "08"],
    ], "Family members should have their own access where Bololo has set it up.", f(2)),
    page(`${header("01", "What this app is")}
<div class="split">
  <div>
    <div class="split-eq" style="margin:0">
      <div class="do"><h3>Use it to</h3><ul>
        <li>Hold Panic / Medical / Fire</li>
        <li>Arm or disarm a linked alarm</li>
        <li>See family GPS and chat</li>
        <li>Lock a linked vehicle</li>
      </ul></div>
      <div class="dont"><h3>Do not</h3><ul>
        <li>Test Panic for fun</li>
        <li>Share the password</li>
        <li>Wait on chat if you are in danger</li>
      </ul></div>
    </div>
    <p class="note">The app does not replace police, ambulance, fire, or a guard at the gate.</p>
  </div>
  ${phoneDash}
</div>
${f(3)}`),
    page(`${header("02", "Sign in & home screen")}
${stepsV([
  "Open the <strong>Client Portal</strong> link Bololo sent — not Officer, not Control Panel.",
  "Organisation (if asked), email, password.",
  "You should see your name and <strong>Protected / Attention / Alert</strong>.",
])}
${tiles([
  { k: "Green", t: "Protected", p: "Systems look healthy. Still keep Panic for real emergencies." },
  { k: "Amber", t: "Attention", p: "Something needs a look — not always a house fire." },
  { k: "Red", t: "Alert", p: "Critical. Open Review / wait for Control Room." },
], "three")}
<p class="clause">Tiles: Home security, Today counts, Live tracking, Family, Alerts, Safe zones. Bottom bar + chat button stay with you.</p>
${f(4)}`),
    page(`${header("03", "Panic, medical & fire")}
<div class="split">
  <div>
    <div class="callout warn"><div class="mark">2s</div><div><strong>Hold — a tap does nothing</strong><p>Keep holding the large Panic control for two seconds. Accidental send: use Undo if it appears, and call Bololo if a unit is already rolling.</p></div></div>
    ${stepsV([
      "Protect / Emergency hub, or Panic on home.",
      "Hold Panic, Silent, Medical or Fire as labelled.",
      "Keep the phone on. Answer Control Room unless it is unsafe.",
      "Share live location if the app asks and you have moved.",
    ])}
  </div>
  <div class="phone">
    <div class="phone-notch"></div>
    <div class="phone-kicker">Emergency hub</div>
    <div class="status alert"><span class="led red"></span>HOLD TO SEND</div>
    <div class="panic">PANIC</div>
    <div class="row"><span>Silent</span><span>Medical</span><span>Fire</span></div>
  </div>
</div>
<p class="clause"><strong class="num">Silent:</strong> when a loud call could put you at risk. Do not then shout on speaker in the same room.</p>
${f(5)}`),
    page(`${header("04", "Home, family, vehicles")}
${tiles([
  { k: "Home", t: "Away · Stay · Night · Disarm", p: "Some modes need a hold. Siren / home panic: only if you mean it — neighbours will hear." },
  { k: "CCTV", t: "Your cameras", p: "Live views where your plan includes them. Control Room sees events too." },
  { k: "Family", t: "Chat + GPS", p: "WhatsApp-style family chat, live location, in-app call where enabled." },
  { k: "Places", t: "Safe zones", p: "Home, school, work. Ask Bololo to add a zone." },
  { k: "Car", t: "Lock / Unlock", p: "Remote pad on the vehicle card if fitted." },
  { k: "Theft", t: "Phone tracking", p: "Start only for real follow / recovery. Stop when you are safe." },
])}
${f(6)}`),
    page(`${header("05", "Chat, incidents, medical")}
${tiles([
  { k: "Chat", t: "Control Room", p: "Gate codes, alarm faults, ‘I’m home’. Not for a knife in the kitchen — use Panic." },
  { k: "Alerts", t: "Incidents & updates", p: "Open from the red/amber strip on home." },
  { k: "Medical", t: "Your file", p: "Blood, allergies, meds, doctor. Used if Medical emergency is held." },
  { k: "Billing", t: "Plan & receipts", p: "Office / PayFast. Never during an active panic." },
  { k: "Family", t: "Own logins", p: "Do not share the account holder password. Ask Bololo to add a family login." },
  { k: "Documents", t: "Receipts & letters", p: "Billing documents from the portal. Keep them for your records." },
])}
${f(7)}`),
    page(`${header("06", "If the app fails")}
${tiles([
  { k: "Wrong door", t: "Not Officer / Control Panel", p: "Those logins will bounce you. Use Client Portal only." },
  { k: "Password", t: "Ask Bololo", p: "Control room / office reset. Do not invent a second email." },
  { k: "Panic dead", t: "Phone anyway", p: "Bololo emergency number, then 10111 / 112 if needed. Do not wait on a spinner." },
  { k: "Grey map", t: "Still hold Panic", p: "Map pictures need internet. Help does not." },
])}
<p class="note">Bololo Security is your response company. 4DS built the platform. Life-threatening: also call South African emergency services.</p>
${supportBlock("Bololo Security — Client Portal")}
${f(8)}`),
  ];
}

function officerPages() {
  const meta = BOLOLO.manuals.Officer;
  const f = (n) => footer(meta.short, n, meta.code);
  const phoneHome = `<div class="phone">
    <div class="phone-notch"></div>
    <div class="phone-kicker">Field home · Sipho</div>
    <div class="status alert"><span class="led red"></span>PANIC JOB</div>
    <div class="row"><span>Umhlanga Rocks Dr</span></div>
    <div class="row" style="opacity:1;margin-top:8px"><span class="chip">Accept</span><span class="chip">Navigate</span></div>
    <div class="panic" style="width:24mm;height:24mm;font-size:6.5pt;margin-top:10px">HOLD SOS</div>
  </div>`;
  return [
    cover({
      eyebrow: "Bololo Security · officer user manual",
      role: "Field officer app",
      sub: "Jobs, navigation, evidence & SOS",
      docType: "User Manual — Officer",
      intro: "GPS on. Status honest. SOS only when you need backup. This is the field phone: Accept, En route, On scene, photos to dispatch, then a real report — not a WhatsApp novel.",
      audience: "Armed response / field officer",
      login: "Officer App · /officer/login",
      device: "Phone with GPS and data",
      active: "Officer",
      docCode: meta.code,
    }),
    tocPage([
      ["On duty", "03"],
      ["Sign in & Field Home", "04"],
      ["Accept → On scene", "05"],
      ["Map, evidence, reports", "06"],
      ["Chat, calls, SOS", "07"],
      ["End of job & faults", "08"],
    ], "This app does not replace radio SOP. Keep GPS on the whole shift.", f(2)),
    page(`${header("01", "On duty")}
<div class="split">
  <div>
    <div class="split-eq" style="margin:0">
      <div class="do"><h3>You</h3><ul>
        <li>Update status as it happens</li>
        <li>Navigate, arrive, protect, report</li>
        <li>Send photos to dispatch</li>
        <li>Hold SOS if you are in danger</li>
      </ul></div>
      <div class="dont"><h3>Not you</h3><ul>
        <li>Accept a new panic while still on another job without telling the desk</li>
        <li>Scene photos on social media</li>
        <li>SOS as a joke</li>
      </ul></div>
    </div>
  </div>
  ${phoneHome}
</div>
${f(3)}`),
    page(`${header("02", "Sign in & Field Home")}
${stepsV([
  "Open <strong>Officer</strong> login — not Technician, not Client Portal.",
  "Allow location when asked. No GPS, no useful pin.",
  "Field Home: your name, current job, jobs / urgent / messages.",
  "Red emergency banner = that job is already yours. Open it.",
])}
<div class="callout"><div class="mark">GPS</div><div><strong>On duty means location on</strong><p>If you deny GPS, Control Room cannot see you and may send someone else across town.</p></div></div>
${f(4)}`),
    page(`${header("03", "Accept → On scene")}
${pipe([
  { n: "1", t: "Accept" },
  { n: "2", t: "En route" },
  { n: "3", t: "Navigate" },
  { n: "4", t: "On scene" },
  { n: "5", t: "Report" },
  { n: "6", t: "Complete" },
])}
${tiles([
  { k: "Accept", t: "The job is yours", p: "Read PANIC vs INTRUSION, name, address first." },
  { k: "En route", t: "You have left", p: "Tap when the wheels roll — the log is the record." },
  { k: "On scene", t: "You are there", p: "Not ‘almost’. Physical arrival." },
], "three")}
<p class="clause">Update even if you already said it on radio. Paperwork and the app should match.</p>
${f(5)}`),
    page(`${header("04", "Map, evidence, reports")}
${tiles([
  { k: "Map", t: "Your pin + jobs", p: "Use Open in Google Maps for turn-by-turn. Set it before you drive." },
  { k: "Evidence", t: "Photo / video", p: "Plates, damage, scene as SOP allows. GPS stamps the file." },
  { k: "Report", t: "Facts only", p: "Time on scene, what you found, who you spoke to, outcome." },
  { k: "Second problem", t: "New field incident", p: "Do not bury a new crime in chat on the old ticket." },
])}
${f(6)}`),
    page(`${header("05", "Chat, calls, SOS")}
${tiles([
  { k: "Chat", t: "Short updates", p: "“En route 3 min.” “On scene, resident home, false alarm.”" },
  { k: "Calls", t: "Desk / client / crew", p: "Silent panic: follow SOP before calling the house." },
  { k: "SOS", t: "Hold on Field Home", p: "Alerts Control Room and supervisor. Then cover + radio." },
])}
<div class="callout warn"><div class="mark">SOS</div><div><strong>Only when you need backup</strong><p>If you fire it by mistake, say so on radio immediately. Do not ghost.</p></div></div>
${f(7)}`),
    page(`${header("06", "End of job & faults")}
${pipe([
  { n: "1", t: "On scene done" },
  { n: "2", t: "Report in" },
  { n: "3", t: "Desk closes" },
  { n: "4", t: "Next job" },
])}
${tiles([
  { k: "Empty queue", t: "Ask the desk", p: "Confirm you are on the roster and GPS is on." },
  { k: "Map spin", t: "Still update status", p: "Use Google Maps from the address on the card." },
  { k: "Crash", t: "Reopen + radio", p: "Do not go dark." },
  { k: "Wrong street", t: "Stop and confirm", p: "Do not guess a suburb." },
])}
<p class="note">Command: Bololo Control Room. App faults: supervisor / 4DS · quote “Bololo Security — Officer App”.</p>
${supportBlock("Bololo Security — Officer App")}
${f(8)}`),
  ];
}

const manuals = [
  { file: "Bololo_Security_Owner_User_Manual", title: "Bololo Security | Owner User Manual | 4DS Solutions", pages: ownerPages() },
  { file: "Bololo_Security_Control_Room_User_Manual", title: "Bololo Security | Control Room User Manual | 4DS Solutions", pages: controlRoomPages() },
  { file: "Bololo_Security_Installation_Team_User_Manual", title: "Bololo Security | Installation Team User Manual | 4DS Solutions", pages: installPages() },
  { file: "Bololo_Security_Client_User_Manual", title: "Bololo Security | Client User Manual | 4DS Solutions", pages: clientPages() },
  { file: "Bololo_Security_Officer_User_Manual", title: "Bololo Security | Officer User Manual | 4DS Solutions", pages: officerPages() },
];

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const desktop = "C:\\Users\\Toxic\\Desktop";
const desktopPack = path.join(desktop, "Bololo Security User Manuals");
fs.mkdirSync(desktopPack, { recursive: true });

function savePdf(tmp, preferred) {
  const tries = [
    preferred,
    preferred.replace(/\.pdf$/i, "_fixed.pdf"),
    preferred.replace(/\.pdf$/i, `_${Date.now()}.pdf`),
  ];
  for (const t of tries) {
    try {
      fs.copyFileSync(tmp, t);
      return t;
    } catch {
      /* locked */
    }
  }
  throw new Error("Could not write PDF (files locked). Close the PDFs and retry.");
}

for (const man of manuals) {
  const htmlPath = path.join(__dirname, `${man.file}.html`);
  const pdfPath = path.join(__dirname, `${man.file}.pdf`);
  const tmpPdf = path.join(__dirname, `${man.file}.build.pdf`);
  fs.writeFileSync(htmlPath, htmlDoc(man.title, man.pages), "utf8");
  const result = spawnSync(chrome, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
    `--print-to-pdf=${tmpPdf}`, "--print-to-pdf-no-header", htmlPath,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error("PDF failed:", man.file, result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  const dest = savePdf(tmpPdf, pdfPath);
  const desk = savePdf(tmpPdf, path.join(desktop, `${man.file}.pdf`));
  const pack = savePdf(tmpPdf, path.join(desktopPack, `${man.file}.pdf`));
  fs.unlinkSync(tmpPdf);
  console.log("Wrote", path.basename(dest), path.basename(desk), path.basename(pack), "bytes", fs.statSync(dest).size);
}
