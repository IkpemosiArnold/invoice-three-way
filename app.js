import * as S from "./samples.js";
import { runAll, toCsv, money } from "./check.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const aud = (n) => "AUD " + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const glyph = { pass: "i-check", fail: "i-cross", none: "i-none" };
const icon = (v) => `<svg aria-hidden="true"><use href="#${glyph[v]}"/></svg>`;
const STATUS = { post: { word: "Can post", v: "pass" }, held: { word: "Held", v: "fail" }, duplicate: { word: "Duplicate", v: "fail" } };
const VWORD = { pass: "Pass", fail: "Fails", none: "Not found" };

const state = { confirmed: {}, merged: null, approved: null, name: "", open: new Set(), showPassed: new Set(), srcTab: "inv", srcDoc: S.invoices[0].id, asking: null };
let run;

// ---------- evidence ----------
function quote(text, marks, tone) {
  let html = esc(text);
  const seen = new Set();
  for (const m of [...marks].sort((a, b) => b.length - a.length)) {
    if (!m || seen.has(m)) continue;
    seen.add(m);
    const e = esc(m);
    const i = html.indexOf(e);
    if (i < 0 || /<mark[^>]*>[^<]*$/.test(html.slice(0, i))) continue;
    html = html.slice(0, i) + `<mark class="t-${tone}">${e}</mark>` + html.slice(i + e.length);
  }
  return html;
}
function srcLabel(e) {
  if (e.doc === "Supplier file") return `Supplier file, row ${e.ln}`;
  if (e.doc.startsWith("PO ")) return `${e.doc}, line ${e.ln}`;
  if (!e.ln) return e.doc;
  return `${e.doc}, line ${e.ln}`;
}
// Prose (an email sentence) is set in the serif; document rows (invoice lines, PO lines, file rows) in mono.
const evList = (ev) => ev.length ? `<ul class="ev">${ev.map((e) => `<li><span class="ev-src">${esc(srcLabel(e))}</span><span class="ev-q${e.prose ? "" : " row-q"}">${quote(e.text, e.marks || [], e.tone || "pass")}</span></li>`).join("")}</ul>` : "";

// ---------- name gate: every approval records who made it ----------
function askName(where, then) {
  if (state.name) return then(state.name);
  state.asking = { where, then };
  render();
  const f = document.getElementById("ask-" + where);
  if (f) f.focus();
}
const askForm = (where) => state.asking && state.asking.where === where ? `
  <form class="ask-form" data-ask="${where}">
    <label class="field-label" for="ask-${where}">Your name</label>
    <input class="field" id="ask-${where}" type="text" autocomplete="name" maxlength="40" placeholder="Who is approving">
    <div class="actions"><button class="btn primary" type="submit">Continue</button></div>
  </form>` : "";

// ---------- render ----------
function render() {
  run = runAll(S, state.confirmed);
  if (state.approved && state.approved.count !== run.post) state.approved = null;
  $("#sum-main").textContent = `${run.post} of ${run.total} can post`;
  $("#sum-side").textContent = `${run.held} held, ${run.duplicate} duplicate`;
  const g = run.groups[0];
  $("#sum-note").textContent = `${aud(run.postTotal)} ready. ${g && !state.merged ? `1 supplier is on file ${g.records.length} times.` : "Supplier file is clean."}`;
  renderMerge();
  renderGroups();
  renderApprove();
  renderSources();
  requestAnimationFrame(() => document.querySelectorAll(".detail:not(.drawn)").forEach((d) => d.classList.add("drawn")));
}

function renderMerge() {
  const g = run.groups[0];
  const el = $("#merge");
  if (!g) { el.innerHTML = ""; return; }
  const idx = (s) => S.suppliers.indexOf(s) + 1;
  const users = run.results.filter((r) => r.onFile.length > 1 && r.parsed.supplierName).map((r) => `${r.invNo} prints "${r.parsed.supplierName.value}"`);
  el.innerHTML = `
    <h2 id="merge-h">${state.merged ? "Supplier merged" : `1 supplier, on file ${g.records.length} times`}</h2>
    <p class="small muted">Same ABN${g.sameAccount ? " and the same bank account" : ""} on all ${g.records.length}. Invoices under any of these names are coded to ${g.keep.id}, the oldest record. ${esc(users.join("; "))}.</p>
    <ul class="merge-recs">${g.records.map((s) => `<li><span class="id">${s.id}</span>${esc(s.name)}<span class="src">ABN ${esc(s.abn)}, account ending ${s.acct}, added ${s.added} (${esc(s.by)}). Supplier file, row ${idx(s)}</span></li>`).join("")}</ul>
    ${state.merged ? `<p class="done-line"><svg class="v-pass" width="16" height="16" aria-hidden="true"><use href="#i-check"/></svg> ${g.others.map((s) => s.id).join(" and ")} now point at ${g.keep.id}. Approved by ${esc(state.merged)}.</p>`
      : `<div class="actions"><button class="btn" type="button" data-merge>Merge ${g.others.map((s) => s.id).join(" and ")} into ${g.keep.id}</button></div>${askForm("merge")}`}`;
}

function rowHtml(r) {
  const st = STATUS[r.status];
  const open = state.open.has(r.id);
  const name = r.parsed.supplierName ? r.parsed.supplierName.value : r.file;
  const reason = r.status === "post" ? (r.confirmedPo ? `PO ${r.confirmedPo} confirmed by ${state.confirmed[r.id].by}.` : `${r.lines.length} line${r.lines.length > 1 ? "s" : ""} matched to PO ${r.po.po}.`) : r.reason;
  return `<li class="row-item">
    <button class="row" type="button" aria-expanded="${open}" aria-controls="d-${r.id}" data-row="${r.id}">
      <span class="row-top"><span class="verdict v-${st.v}">${icon(st.v)}${st.word}</span><span class="row-name">${/^DELIVERY DOCKET/i.test(r.parsed.lines[0]) ? "Docket " : ""}${esc(r.invNo || r.file)}, ${esc(name)}</span></span>
      <span class="row-amt">${r.total != null ? money(r.total) : "no total"}</span>
      <span class="row-reason">${esc(reason)}</span>
    </button>
    ${open ? detailHtml(r) : ""}
  </li>`;
}

function detailHtml(r) {
  const openChecks = r.checks.filter((c) => c.verdict !== "pass" || (c.blocking && c.verdict !== "pass"));
  const passed = r.checks.filter((c) => c.verdict === "pass");
  const showP = state.showPassed.has(r.id);
  const chk = (c) => `<li class="chk">
      <div class="chk-h"><span class="verdict v-${c.verdict}">${icon(c.verdict)}${VWORD[c.verdict]}</span><span class="chk-label">${esc(c.label)}</span></div>
      <p class="chk-say">${esc(c.say)}</p>
      ${c.ask && c.blocking ? `<p class="chk-ask"><b>Next:</b> ${esc(c.ask)}</p>` : ""}
      ${evList(c.ev)}
      ${c.suggest && r.status === "held" ? `<div class="actions"><button class="btn primary" type="button" data-confirm="${r.id}" data-po="${c.suggest}">Confirm PO ${c.suggest}</button></div>${askForm("confirm-" + r.id)}` : ""}
    </li>`;
  return `<div class="detail anim" id="d-${r.id}">
    <p class="meta">${esc(r.file)}, ${esc(r.how)}${r.supplier ? `. Coded to ${r.supplier.id}` : ""}</p>
    <ul class="checks">${openChecks.map(chk).join("")}</ul>
    ${passed.length ? `<button class="link-btn passed-toggle" type="button" data-passed="${r.id}" aria-expanded="${showP}">${showP ? "Hide" : "Show"} ${passed.length} check${passed.length > 1 ? "s" : ""} that passed</button>
      ${showP ? `<ul class="checks">${passed.map(chk).join("")}</ul>` : ""}` : ""}
  </div>`;
}

function renderGroups() {
  const order = [["held", "Held"], ["duplicate", "Stopped as a duplicate"], ["post", "Can post"]];
  $("#groups").innerHTML = order.map(([s, h]) => {
    const rs = run.results.filter((r) => r.status === s);
    return rs.length ? `<h3 class="group-h">${h} (${rs.length})</h3><ul class="rows" role="list" style="list-style:none;margin:0;padding:0">${rs.map(rowHtml).join("")}</ul>` : "";
  }).join("");
}

function renderApprove() {
  const btn = $("#approve-btn");
  btn.textContent = `Approve ${run.post} for posting`;
  const dry = $("#dry");
  if (!state.approved) { dry.hidden = true; dry.innerHTML = ""; return; }
  const ok = run.results.filter((r) => r.status === "post");
  const lineCount = ok.reduce((t, r) => t + r.lines.length, 0);
  dry.hidden = false;
  dry.innerHTML = `
    <p class="dry-h">Dry run: ${ok.length} invoices, ${lineCount} lines, ${aud(run.postTotal)}. Approved by ${esc(state.approved.by)}.</p>
    <ul class="dry-list">${ok.map((r) => `<li><span>${esc(r.invNo)}, ${esc(r.supplier.id)} ${esc(r.supplier.name)}</span><span>${money(r.total)}</span>
      <span class="src">${esc(r.file)} ${r.lines.length > 1 ? "lines" : "line"} ${r.lines.map((l) => l.it.ln).join(", ")} to PO ${r.po.po} ${r.lines.length > 1 ? "lines" : "line"} ${r.lines.map((l) => l.poLine.ln).join(", ")}</span></li>`).join("")}</ul>
    <div class="actions"><button class="btn primary" type="button" id="dl">Download the import file</button></div>
    <p class="small muted">Nothing has been posted. This is the file an accounts import would take, one row per line, each with its source. Held invoices stay out until someone clears them.</p>`;
}

function renderSources() {
  const tabs = [["inv", "Invoices"], ["mail", "Emails"], ["po", "Orders"], ["grn", "Receipts"], ["sup", "Supplier file"]];
  $("#src-tabs").innerHTML = tabs.map(([k, t]) => `<button class="tab" type="button" role="tab" aria-selected="${state.srcTab === k}" data-tab="${k}">${t}</button>`).join("");
  const numbered = (lines) => `<pre class="doc">${lines.map((l, i) => `<span class="n">${i + 1}</span>${esc(l)}`).join("\n")}</pre>`;
  let body = "";
  if (state.srcTab === "inv") {
    const inv = S.invoices.find((i) => i.id === state.srcDoc);
    body = `<div class="doc-pick">${S.invoices.map((i) => `<button class="tab" type="button" aria-pressed="${i.id === inv.id}" ${i.id === inv.id ? 'aria-selected="true"' : ""} data-doc="${i.id}">${esc(i.file)}</button>`).join("")}</div>
      <p class="small muted">${esc(inv.how)}, as read from the file.</p>${numbered(inv.text.split("\n"))}`;
  } else if (state.srcTab === "mail") {
    body = S.emails.map((m) => `<p class="small muted">${esc(m.file)}, received ${esc(m.date)}</p>${numbered(m.text.split("\n"))}`).join("");
  } else if (state.srcTab === "po") {
    body = S.pos.map((p) => `<p class="small muted">PO ${p.po}, raised ${p.date} to ${p.supplier}</p>${numbered(p.lines.map((l) => `${l.item}  qty ${l.qty}  at ${money(l.price)}  GST ${l.gst === "free" ? "free" : "10%"}`))}`).join("");
  } else if (state.srcTab === "grn") {
    body = numbered(S.receipts.map((r) => `${r.grn}  PO ${r.po} line ${r.ln}  received ${r.qty}  ${r.date}  ${r.by}`));
  } else {
    body = numbered(S.suppliers.map((s) => `${s.id}  ${s.name}  ABN ${s.abn}  acct ending ${s.acct}  added ${s.added}`));
  }
  $("#src-body").innerHTML = body;
}

// ---------- events ----------
document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.row) {
    const id = t.dataset.row;
    state.open.has(id) ? state.open.delete(id) : state.open.add(id);
    render();
  } else if (t.dataset.passed) {
    const id = t.dataset.passed;
    state.showPassed.has(id) ? state.showPassed.delete(id) : state.showPassed.add(id);
    render();
  } else if (t.dataset.confirm) {
    const id = t.dataset.confirm, po = t.dataset.po;
    askName("confirm-" + id, (by) => { state.confirmed[id] = { po, by }; state.asking = null; state.open.add(id); render(); });
  } else if (t.hasAttribute("data-merge")) {
    askName("merge", (by) => { state.merged = by; state.asking = null; render(); });
  } else if (t.id === "approve-btn") {
    const name = $("#approver").value.trim() || state.name;
    if (!name) { $("#approver-msg").hidden = false; $("#approver").focus(); return; }
    state.name = name; $("#approver").value = name; $("#approver-msg").hidden = true;
    state.approved = { by: name, at: new Date().toISOString().slice(0, 16).replace("T", " "), count: run.post };
    render();
    $("#dry").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  } else if (t.id === "dl") {
    const csv = toCsv(run.results, state.approved.by, state.approved.at);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "ap-import-dry-run.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } else if (t.dataset.tab) {
    state.srcTab = t.dataset.tab; renderSources();
  } else if (t.dataset.doc) {
    state.srcDoc = t.dataset.doc; renderSources();
  } else if (t.id === "why-btn") {
    const w = $("#why"); w.hidden = !w.hidden; t.setAttribute("aria-expanded", String(!w.hidden));
  } else if (t.id === "reset") {
    Object.assign(state, { confirmed: {}, merged: null, approved: null, name: "", asking: null });
    state.open.clear(); state.showPassed.clear();
    $("#approver").value = "";
    render();
    window.scrollTo(0, 0);
  }
});
document.addEventListener("submit", (e) => {
  const f = e.target.closest("form[data-ask]");
  if (!f) return;
  e.preventDefault();
  const v = f.querySelector("input").value.trim();
  if (!v) { f.querySelector("input").focus(); return; }
  state.name = v; $("#approver").value = v;
  const then = state.asking && state.asking.then;
  state.asking = null;
  if (then) then(v);
});
$("#approver").addEventListener("input", (e) => { state.name = e.target.value.trim(); if (state.name) $("#approver-msg").hidden = true; });

render();
