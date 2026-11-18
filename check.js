// Plain code, no model. Reads supplier invoices as text, matches every line to its purchase order line and
// to what was received, checks the supplier, the bank account and the GST, and says why anything is held.
// Every value it uses points at the document line or the file row it came from. Nothing missing is guessed.

const MONEY_TOL = 0.005;

export const money = (n) => (Math.round(n * 100) / 100).toFixed(2);
const eq = (a, b) => Math.abs(a - b) < MONEY_TOL;

// ---------- ABN ----------
export const abnDigits = (s) => String(s || "").replace(/\D/g, "");
export function abnValid(s) {
  const d = abnDigits(s);
  if (d.length !== 11) return false;
  const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const n = d.split("").map(Number);
  n[0] -= 1;
  return n.reduce((t, x, i) => t + x * w[i], 0) % 89 === 0;
}
export const formatAbn = (s) => { const d = abnDigits(s); return d.length === 11 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : s; };

// ---------- invoice numbers ----------
// "KF-20481", "Invoice No 20481" and "0020481" are the same number for duplicate checks.
export const normInvNo = (s) => String(s || "").replace(/\D/g, "").replace(/^0+/, "");

// ---------- words, for matching an invoice line to a PO line ----------
const STOP = new Set(["for", "the", "of", "and", "x"]);
export function tokens(desc) {
  const out = [];
  for (let t of String(desc).toLowerCase().replace(/[^a-z0-9.]+/g, " ").split(" ")) {
    t = t.replace(/^\.+|\.+$/g, "");
    if (!t || STOP.has(t)) continue;
    let m;
    if ((m = t.match(/^([a-z]+)(\d+)$/))) { out.push(m[1], m[2]); continue; }   // ctn250 -> ctn 250
    if ((m = t.match(/^(\d+)(doz)$/))) { out.push(m[1], m[2]); continue; }       // 15doz -> 15 doz
    if (/^[a-z]+oes$/.test(t)) t = t.slice(0, -2);                               // tomatoes -> tomato
    else if (/^[a-z]{3,}s$/.test(t) && !t.endsWith("ss")) t = t.slice(0, -1);   // onions -> onion
    out.push(t);
  }
  return out;
}
export function similarity(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const t of A) if (B.has(t)) common++;
  return common / (A.size + B.size - common);
}
export const MATCH_MIN = 0.6;

// ---------- reading one invoice ----------
export function parseInvoice(text) {
  const lines = String(text).split(/\r?\n/);
  const at = (i) => ({ ln: i + 1, text: lines[i] });
  const out = { lines, supplierName: null, abn: null, invNo: null, date: null, po: null, items: [], subtotal: null, gst: null, total: null, acct: null, bankNote: null };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    let m;
    if (!line) return;
    if (!out.supplierName && i > 0 && !/^(tax invoice|delivery docket|invoice)/i.test(line)) {
      const name = line.replace(/\s*ABN[\s\d]+$/i, "").trim();
      if (name && !/^\d/.test(name)) out.supplierName = { value: name, ...at(i), mark: name };
    }
    if (!out.abn && (m = line.match(/ABN\s*([\d ]{11,14})/i))) out.abn = { value: abnDigits(m[1]), ...at(i), mark: m[1].trim() };
    if (!out.invNo && (m = line.match(/(?:Invoice(?:\s+No)?|DOCKET\s+No)\s+([A-Z0-9][A-Z0-9-]*)/i))) out.invNo = { value: m[1], ...at(i), mark: m[1] };
    if (!out.date && (m = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/))) out.date = { value: m[1], ...at(i), mark: m[1] };
    if (!out.po && (m = line.match(/^(?:Your order|Order(?: no)?)\s+(.*)$/i))) {
      const rawPo = m[1].trim();
      const num = rawPo.match(/^(?:PO\s*)?(\d{4})$/i);
      out.po = { value: num ? num[1] : null, raw: rawPo, ...at(i), mark: rawPo };
    }
    if ((m = line.match(/^(.+?)\s{3,}(\d+(?:\.\d+)?)\s{3,}(\d+\.\d{2})\s{3,}(\d+\.\d{2})$/))) {
      out.items.push({ desc: m[1].trim(), qty: +m[2], price: +m[3], amount: +m[4], ...at(i), marks: { desc: m[1].trim(), qty: m[2], price: m[3], amount: m[4] } });
      return;
    }
    if ((m = line.match(/^(\d+(?:\.\d+)?)\s+(.+?)\s*@\s*\$?(\d+\.\d{2})\s*=\s*\$?(\d+\.\d{2})$/))) {
      out.items.push({ desc: m[2].trim(), qty: +m[1], price: +m[3], amount: +m[4], ...at(i), marks: { desc: m[2].trim(), qty: m[1], price: m[3], amount: m[4] } });
      return;
    }
    if ((m = line.match(/^Subtotal\s+\$?(\d+\.\d{2})$/i))) out.subtotal = { value: +m[1], ...at(i), mark: m[1] };
    else if ((m = line.match(/^GST\s+\$?(\d+\.\d{2})$/i))) out.gst = { value: +m[1], ...at(i), mark: m[1] };
    else if ((m = line.match(/^Total\s+\$?(\d+\.\d{2})$/i))) out.total = { value: +m[1], ...at(i), mark: m[1] };
    if ((m = line.match(/Acct\s+x+(\d{4})/i))) out.acct = { value: m[1], ...at(i), mark: "xxxx" + m[1] };
    if (/new bank details|changed? (our )?bank/i.test(line)) out.bankNote = { ...at(i), mark: line };
  });
  return out;
}

// ---------- the supplier file ----------
export function supplierGroups(suppliers) {
  const by = new Map();
  for (const s of suppliers) {
    const k = abnDigits(s.abn);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(s);
  }
  const groups = [];
  for (const [abn, recs] of by) {
    if (recs.length < 2) continue;
    const sorted = [...recs].sort((a, b) => a.added.localeCompare(b.added));
    const accts = new Set(sorted.map((r) => r.acct));
    groups.push({ abn, keep: sorted[0], others: sorted.slice(1), records: sorted, sameAccount: accts.size === 1 });
  }
  return groups;
}

const supplierRow = (s, i) => ({ doc: "Supplier file", ln: i + 1, text: `${s.id}  ${s.name}  ABN ${s.abn}  acct ending ${s.acct}  added ${s.added} (${s.by})` });
const poRow = (po, l) => ({ doc: `PO ${po.po}`, ln: l.ln, text: `Line ${l.ln}: ${l.item}  qty ${l.qty}  at ${money(l.price)}  GST ${l.gst === "free" ? "free" : "10%"}` });
const grnRow = (r) => ({ doc: `Receipt ${r.grn}`, ln: 0, text: `PO ${r.po} line ${r.ln}: received ${r.qty} on ${r.date} by ${r.by}` });
const invEv = (inv, f, marks, tone) => ({ doc: inv.file, ln: f.ln, text: f.text, marks: [].concat(marks).filter(Boolean), tone });

function matchLines(items, po) {
  const used = new Set();
  return items.map((it) => {
    const scored = po.lines.filter((l) => !used.has(l.ln)).map((l) => ({ l, s: similarity(it.desc, l.item) })).sort((a, b) => b.s - a.s);
    const best = scored[0];
    if (!best || best.s < MATCH_MIN || (scored[1] && scored[1].s === best.s)) return { it, poLine: null, score: best ? best.s : 0 };
    used.add(best.l.ln);
    return { it, poLine: best.l, score: best.s };
  });
}

// ---------- one invoice ----------
export function checkInvoice(inv, data, seen = [], opts = {}) {
  const p = parseInvoice(inv.text);
  const checks = [];
  const lines = [];
  let po = null;
  const add = (c) => { checks.push({ blocking: true, ev: [], ...c }); return checks[checks.length - 1]; };
  const sIndex = (s) => data.suppliers.indexOf(s);

  // 1. Supplier, by ABN
  let supplier = null, onFile = [];
  if (!p.abn) add({ key: "supplier", label: "Supplier", verdict: "none", say: "No ABN on the document.", ask: "Ask the supplier for a tax invoice that shows their ABN." });
  else if (!abnValid(p.abn.value)) add({ key: "supplier", label: "Supplier", verdict: "fail", say: `ABN ${p.abn.mark} fails the ABN check digits.`, ask: "Ask the supplier to confirm their ABN.", ev: [invEv(inv, p.abn, p.abn.mark, "fail")] });
  else {
    onFile = data.suppliers.filter((s) => abnDigits(s.abn) === p.abn.value);
    if (!onFile.length) add({ key: "supplier", label: "Supplier", verdict: "none", say: `ABN ${formatAbn(p.abn.value)} is not in the supplier file.`, ask: "Set the supplier up before posting.", ev: [invEv(inv, p.abn, p.abn.mark, "fail")] });
    else {
      supplier = [...onFile].sort((a, b) => a.added.localeCompare(b.added))[0];
      const extra = onFile.length > 1 ? ` On file ${onFile.length} times (${onFile.map((s) => s.id).join(", ")}); coded to ${supplier.id}.` : "";
      add({ key: "supplier", label: "Supplier", verdict: "pass", blocking: false, say: `ABN matches ${supplier.id} ${supplier.name}.${extra}`,
        ev: [invEv(inv, p.abn, p.abn.mark, "pass"), ...onFile.map((s) => ({ ...supplierRow(s, sIndex(s)), marks: [s.abn], tone: "pass" }))] });
    }
  }

  // 2. Duplicate: same ABN and the same invoice number as one already in the batch
  const num = p.invNo ? normInvNo(p.invNo.value) : null;
  const twin = p.abn && num ? seen.find((s) => s.abn === p.abn.value && s.num === num) : null;
  if (twin) {
    const sameTotal = p.total && twin.total != null && eq(p.total.value, twin.total);
    add({ key: "duplicate", label: "Duplicate", verdict: "fail", say: `Same supplier and invoice number as ${twin.invNo} (${twin.file})${sameTotal ? ", same total" : ""}. Not posted twice.`, ask: "Nothing to post. File it with the first copy.",
      ev: [invEv(inv, p.invNo, p.invNo.mark, "fail"), ...(p.total ? [invEv(inv, p.total, p.total.mark, "fail")] : []), { doc: twin.file, ln: twin.invNoLn, text: twin.invNoText, marks: [twin.invNo], tone: "fail" }] });
  }

  if (twin) return finish();

  // 3. Bank account against the supplier file
  if (supplier) {
    if (!p.acct) add({ key: "bank", label: "Bank account", verdict: "none", blocking: false, say: `No bank details on the document. Pay to the account on file (ending ${supplier.acct}).`, ev: [{ ...supplierRow(supplier, sIndex(supplier)), marks: [`acct ending ${supplier.acct}`], tone: "pass" }] });
    else if (p.acct.value === supplier.acct) add({ key: "bank", label: "Bank account", verdict: "pass", blocking: false, say: `Account ending ${p.acct.value} matches the file.`, ev: [invEv(inv, p.acct, p.acct.mark, "pass"), { ...supplierRow(supplier, sIndex(supplier)), marks: [`acct ending ${supplier.acct}`], tone: "pass" }] });
    else add({ key: "bank", label: "Bank account", verdict: "fail", say: `Invoice asks for payment to an account ending ${p.acct.value}; the file says ${supplier.acct}.`,
      ask: "Call the supplier on the number already on file, not one from this invoice, before anything changes.",
      ev: [...(p.bankNote ? [invEv(inv, p.bankNote, p.bankNote.mark, "fail")] : []), invEv(inv, p.acct, p.acct.mark, "fail"), { ...supplierRow(supplier, sIndex(supplier)), marks: [`acct ending ${supplier.acct}`], tone: "fail" }] });
  }

  // 4. Purchase order
  const sameSupplier = (x) => supplier && abnDigits((data.suppliers.find((s) => s.id === x.supplier) || {}).abn) === abnDigits(supplier.abn);
  if (opts.poOverride && (!p.po || !p.po.value)) {
    po = data.pos.find((x) => x.po === opts.poOverride) || null;
    add({ key: "po", label: "Purchase order", verdict: po && sameSupplier(po) ? "pass" : "fail", blocking: !(po && sameSupplier(po)),
      say: po && sameSupplier(po) ? `PO ${po.po}, confirmed by ${opts.confirmedBy} (the document's order number ${p.po ? `reads "${p.po.raw}"` : "is missing"}).` : `PO ${opts.poOverride} does not belong to this supplier.`,
      ev: p.po ? [invEv(inv, p.po, p.po.mark, "none")] : [] });
  } else if (!p.po || !p.po.value) {
    const cands = data.pos.filter((x) => sameSupplier(x) && matchLines(p.items, x).every((m) => m.poLine));
    const said = p.po ? `Order number reads "${p.po.raw}".` : "No order number on the document.";
    const c = add({ key: "po", label: "Purchase order", verdict: "none", say: cands.length === 1 ? `${said} One open order from this supplier fits every line: PO ${cands[0].po}. Not assumed.` : `${said} ${cands.length ? cands.length + " orders could fit" : "No order fits"}; not assumed.`,
      ask: cands.length === 1 ? `Confirm PO ${cands[0].po} with the receiver, then post against it.` : "Ask the supplier for the order number.",
      ev: p.po ? [invEv(inv, p.po, p.po.mark, "fail")] : [] });
    if (cands.length === 1) { c.suggest = cands[0].po; c.ev.push(...cands[0].lines.map((l) => ({ ...poRow(cands[0], l), marks: [], tone: "none" }))); }
  } else {
    po = data.pos.find((x) => x.po === p.po.value) || null;
    if (!po) add({ key: "po", label: "Purchase order", verdict: "none", say: `PO ${p.po.value} is not in the order file.`, ask: "Ask the buyer which order this belongs to.", ev: [invEv(inv, p.po, p.po.mark, "fail")] });
    else if (!sameSupplier(po)) add({ key: "po", label: "Purchase order", verdict: "fail", say: `PO ${po.po} was raised for another supplier.`, ask: "Ask the supplier for the right order number.", ev: [invEv(inv, p.po, p.po.mark, "fail")] });
    else add({ key: "po", label: "Purchase order", verdict: "pass", blocking: false, say: `PO ${po.po}, raised ${po.date}.`, ev: [invEv(inv, p.po, p.po.mark, "pass")] });
  }

  // 5. Lines: matched to the PO, received, priced, added up
  const poOk = po && sameSupplier(po);
  if (poOk) {
    for (const { it, poLine, score } of matchLines(p.items, po)) {
      const row = { it, poLine, score, received: 0, grns: [], issues: [] };
      lines.push(row);
      if (!poLine) {
        add({ key: `line${it.ln}`, label: `Line: ${it.desc}`, verdict: "none", say: `No line on PO ${po.po} matches "${it.desc}". Not guessed.`, ask: "Ask the buyer whether this was ordered.", ev: [invEv(inv, it, it.marks.desc, "fail")] });
        continue;
      }
      row.grns = data.receipts.filter((r) => r.po === po.po && r.ln === poLine.ln);
      row.received = row.grns.reduce((t, r) => t + r.qty, 0);
      const ev = [invEv(inv, it, [it.marks.desc], "pass"), { ...poRow(po, poLine), marks: [poLine.item], tone: "pass" }];
      const evR = row.grns.map((r) => ({ ...grnRow(r), marks: [`received ${r.qty}`], tone: "pass" }));
      if (it.qty > row.received) {
        row.issues.push("qty");
        const short = it.qty - row.received;
        add({ key: `qty${it.ln}`, label: `Quantity: ${poLine.item}`, verdict: "fail", say: `${poLine.item}: invoiced ${it.qty}, received ${row.received}. ${short} not received.`, ask: `Ask the supplier for a credit for ${short}, or find a later receipt for PO ${po.po} line ${poLine.ln}.`,
          ev: [invEv(inv, it, [it.marks.qty], "fail"), ...(row.grns.length ? row.grns.map((r) => ({ ...grnRow(r), marks: [`received ${r.qty}`], tone: "fail" })) : [{ doc: "Receipts", ln: 0, text: `Nothing received against PO ${po.po} line ${poLine.ln}.`, marks: [], tone: "fail" }])] });
      }
      if (it.price > poLine.price + MONEY_TOL) {
        row.issues.push("price");
        const over = (it.price - poLine.price) * it.qty;
        add({ key: `price${it.ln}`, label: `Price: ${poLine.item}`, verdict: "fail", say: `${poLine.item} at ${money(it.price)} each; the PO says ${money(poLine.price)}. ${money(over)} over on ${it.qty}.`, ask: `Post at the PO price and ask for a credit of ${money(over)}, or have the buyer approve the new price.`,
          ev: [invEv(inv, it, [it.marks.price], "fail"), { ...poRow(po, poLine), marks: [`at ${money(poLine.price)}`], tone: "fail" }] });
      }
      if (!eq(it.qty * it.price, it.amount)) {
        row.issues.push("amount");
        add({ key: `amt${it.ln}`, label: `Line total: ${poLine.item}`, verdict: "fail", say: `${it.qty} at ${money(it.price)} is ${money(it.qty * it.price)}, not ${money(it.amount)}.`, ask: "Ask the supplier for a corrected invoice.", ev: [invEv(inv, it, [it.marks.amount], "fail")] });
      }
      if (!row.issues.length) add({ key: `line${it.ln}`, label: `Line: ${poLine.item}`, verdict: "pass", blocking: false, say: `Matches PO ${po.po} line ${poLine.ln}; ${it.qty} invoiced, ${row.received} received, ${money(it.price)} as ordered.`, ev: [...ev.map((e) => e.doc === inv.file ? { ...e, marks: [it.marks.desc, it.marks.qty, it.marks.price] } : e), ...evR] });
    }

    // 6. GST: 10% of the taxable lines only. Basic food on these POs is GST-free.
    const taxable = lines.filter((l) => l.poLine && l.poLine.gst === "10").reduce((t, l) => t + l.it.amount, 0);
    const expected = Math.round(taxable * 10) / 100;
    const charged = p.gst ? p.gst.value : 0;
    if (lines.some((l) => !l.poLine)) { /* cannot work out GST until every line is matched */ }
    else if (eq(expected, charged)) add({ key: "gst", label: "GST", verdict: "pass", blocking: false,
      say: taxable === 0 ? (p.gst ? "None charged; every line is GST-free on the PO." : "No GST line; every line is GST-free on the PO.") : `${money(charged)}, which is 10% of the taxable lines (${money(taxable)}).`,
      ev: p.gst ? [invEv(inv, p.gst, p.gst.mark, "pass")] : [] });
    else {
      const freeCharged = lines.filter((l) => l.poLine.gst === "free");
      add({ key: "gst", label: "GST", verdict: "fail", say: `${money(charged)} charged; expected ${money(expected)}.${taxable === 0 ? ` Every line is GST-free on the PO (${freeCharged.map((l) => l.poLine.item).join(", ")}).` : ""}`, ask: "Ask the supplier for an adjusted invoice before claiming the GST.",
        ev: [...(p.gst ? [invEv(inv, p.gst, p.gst.mark, "fail")] : []), ...lines.map((l) => ({ ...poRow(po, l.poLine), marks: [l.poLine.gst === "free" ? "GST free" : "GST 10%"], tone: "fail" }))] });
    }

    // 7. The invoice adds up
    const sum = p.items.reduce((t, it) => t + it.amount, 0);
    const sub = p.subtotal ? p.subtotal.value : sum;
    const problems = [];
    if (p.subtotal && !eq(sum, p.subtotal.value)) problems.push(`lines add to ${money(sum)}, subtotal says ${money(p.subtotal.value)}`);
    if (p.total && !eq(sub + (p.gst ? p.gst.value : 0), p.total.value)) problems.push(`subtotal plus GST is ${money(sub + (p.gst ? p.gst.value : 0))}, total says ${money(p.total.value)}`);
    if (!p.total) add({ key: "total", label: "Total", verdict: "none", say: "No total on the document.", ask: "Ask the supplier for a complete invoice." });
    else if (problems.length) add({ key: "total", label: "Total", verdict: "fail", say: problems.join("; ") + ".", ask: "Ask the supplier for a corrected invoice.", ev: [invEv(inv, p.total, p.total.mark, "fail")] });
    else add({ key: "total", label: "Total", verdict: "pass", blocking: false, say: `${money(p.total.value)} adds up.`, ev: [invEv(inv, p.total, p.total.mark, "pass")] });
  }

  return finish();

  function finish() {
  const status = twin ? "duplicate" : checks.some((c) => c.blocking && c.verdict !== "pass") ? "held" : "post";
  const open = checks.filter((c) => c.blocking && c.verdict !== "pass");
  return { id: inv.id, file: inv.file, how: inv.how, parsed: p, supplier, onFile, po, lines, checks, open, status,
    invNo: p.invNo ? p.invNo.value : null, total: p.total ? p.total.value : null, reason: twin ? open.find((c) => c.key === "duplicate").say : open.length ? open[0].say : "Every check passed.", confirmedPo: opts.poOverride || null };
  }
}

// ---------- the whole morning ----------
// confirmed: { [invoiceId]: { po, by } } for order numbers a person has confirmed.
export function runAll(data, confirmed = {}) {
  const seen = [];
  const results = [];
  for (const inv of data.invoices) {
    const c = confirmed[inv.id];
    const r = checkInvoice(inv, data, seen, c ? { poOverride: c.po, confirmedBy: c.by } : {});
    results.push(r);
    const p = r.parsed;
    if (p.abn && p.invNo && r.status !== "duplicate") seen.push({ abn: p.abn.value, num: normInvNo(p.invNo.value), invNo: p.invNo.value, file: inv.file, total: r.total, invNoLn: p.invNo.ln, invNoText: p.invNo.text });
  }
  const count = (s) => results.filter((r) => r.status === s).length;
  const postTotal = results.filter((r) => r.status === "post").reduce((t, r) => t + r.total, 0);
  return { results, post: count("post"), held: count("held"), duplicate: count("duplicate"), total: results.length, postTotal, groups: supplierGroups(data.suppliers) };
}

// ---------- export: a generic AP import file, only for approved invoices ----------
const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(results, approver, when) {
  if (!approver || !String(approver).trim()) throw new Error("A named approver is required.");
  const head = ["supplier_id", "supplier_name", "abn", "invoice_no", "invoice_date", "po", "po_line", "description", "qty", "unit_price", "amount", "gst_code", "approved_by", "approved_at", "source"];
  const rows = [head];
  for (const r of results.filter((x) => x.status === "post")) {
    for (const l of r.lines) {
      rows.push([r.supplier.id, r.supplier.name, formatAbn(r.supplier.abn), r.invNo, r.parsed.date ? r.parsed.date.value : "", r.po.po, l.poLine.ln, l.poLine.item, l.it.qty, money(l.it.price), money(l.it.amount), l.poLine.gst === "free" ? "FRE" : "GST", String(approver).trim(), when, `${r.file} line ${l.it.ln}`]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}
