import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "./samples.js";
import { abnValid, abnDigits, normInvNo, tokens, similarity, parseInvoice, supplierGroups, checkInvoice, runAll, toCsv } from "./check.js";

const run = runAll(S);
const byId = (id) => run.results.find((r) => r.id === id);
const check = (id, key) => byId(id).checks.find((c) => c.key === key || c.key.startsWith(key));

test("sample: 6 of 12 can post, 5 held, 1 duplicate", () => {
  assert.equal(run.total, 12);
  assert.equal(run.post, 6);
  assert.equal(run.held, 5);
  assert.equal(run.duplicate, 1);
  assert.equal(run.postTotal.toFixed(2), "1474.60");
});

test("ABN check digits: the ATO's own ABN passes, a one-digit change fails", () => {
  assert.equal(abnValid("51 824 753 556"), true);
  assert.equal(abnValid("51 824 753 557"), false);
  assert.equal(abnValid("1234"), false);
});

test("every sample ABN passes the check digits", () => {
  for (const s of S.suppliers) assert.equal(abnValid(s.abn), true, s.id);
});

test("invoice numbers compare on their digits", () => {
  assert.equal(normInvNo("KF-20481"), "20481");
  assert.equal(normInvNo("0020481"), "20481");
});

test("words: plurals, packed carton sizes and dozens line up", () => {
  assert.deepEqual(tokens("TOMATO ROMA 10KG CTN").sort(), tokens("Roma tomatoes 10kg ctn").sort());
  assert.deepEqual(tokens("KRAFT PAPER BAG CTN500").sort(), tokens("Kraft paper bags ctn 500").sort());
  assert.ok(tokens("2 trays 15doz").includes("doz"));
});

test("a lid line goes to the lid, not the clamshell", () => {
  const lid = "LID 500ML CLAMSHELL CTN250";
  assert.ok(similarity(lid, "Lid for 500ml clamshell ctn 250") > similarity(lid, "Clamshell 500ml ctn 250"));
});

test("reading an invoice: every field remembers its line", () => {
  const p = parseInvoice(S.invoices[0].text);
  assert.equal(p.invNo.value, "KF-20481");
  assert.equal(p.abn.value, "37492282788");
  assert.equal(p.po.value, "4510");
  assert.equal(p.items.length, 3);
  assert.equal(p.items[0].ln, 6);
  assert.equal(p.total.value, 430);
  assert.equal(p.acct.value, "2291");
  for (const f of [p.invNo, p.abn, p.po, p.total, p.acct, ...p.items]) assert.ok(f.text.includes(f.mark ?? f.marks.desc), f.text);
});

test("reading a handwritten docket: the smudged order number is kept as written, not filled in", () => {
  const p = parseInvoice(S.invoices[5].text);
  assert.equal(p.po.value, null);
  assert.equal(p.po.raw, "[smudged]");
  assert.equal(p.items.length, 1);
  assert.equal(p.items[0].qty, 2);
  assert.equal(p.items[0].price, 96);
  assert.equal(p.gst, null);
});

test("supplier file: one supplier is on file three times, same ABN and account", () => {
  const g = supplierGroups(S.suppliers);
  assert.equal(g.length, 1);
  assert.equal(g[0].keep.id, "S01");
  assert.deepEqual(g[0].others.map((s) => s.id), ["S07", "S11"]);
  assert.equal(g[0].sameAccount, true);
});

test("inv01 posts: every line matched, received and priced as ordered", () => {
  const r = byId("inv01");
  assert.equal(r.status, "post");
  assert.equal(r.lines.length, 3);
  assert.ok(r.lines.every((l) => l.poLine && l.received === l.it.qty));
});

test("inv02 held: invoiced 10 skim milk, received 8", () => {
  const r = byId("inv02");
  assert.equal(r.status, "held");
  const c = check("inv02", "qty");
  assert.match(c.say, /Skim milk 2L: invoiced 10, received 8/);
  assert.match(c.ask, /credit for 2/);
});

test("inv03 held: clamshells at 35.50 against 32.00 on the PO, 28.00 over", () => {
  const c = check("inv03", "price");
  assert.equal(byId("inv03").status, "held");
  assert.match(c.say, /35\.50 each; the PO says 32\.00\. 28\.00 over/);
  assert.equal(byId("inv03").checks.filter((x) => x.verdict === "fail").length, 1, "the lid line is fine");
});

test("inv04 is the same invoice again: stopped as a duplicate, not posted", () => {
  const r = byId("inv04");
  assert.equal(r.status, "duplicate");
  assert.match(r.reason, /KF-20481/);
  assert.ok(!r.checks.some((c) => c.key === "po"), "a duplicate is not checked further");
});

test("inv05 held: the invoice asks for a new bank account", () => {
  const c = check("inv05", "bank");
  assert.equal(c.verdict, "fail");
  assert.match(c.say, /ending 7730; the file says 5512/);
  assert.match(c.ask, /number already on file/);
  assert.ok(c.ev.some((e) => /new bank details/i.test(e.text)));
});

test("inv06 held: unreadable order number, one candidate offered, never assumed", () => {
  const r = byId("inv06");
  assert.equal(r.status, "held");
  const c = check("inv06", "po");
  assert.equal(c.verdict, "none");
  assert.equal(c.suggest, "4514");
  assert.match(c.say, /Not assumed/);
  assert.equal(r.po, null);
});

test("inv06 posts once a person confirms PO 4514, and the record says who", () => {
  const after = runAll(S, { inv06: { po: "4514", by: "Mick" } });
  const r = after.results.find((x) => x.id === "inv06");
  assert.equal(r.status, "post");
  assert.match(r.checks.find((c) => c.key === "po").say, /confirmed by Mick/);
  assert.equal(after.post, 7);
});

test("confirming an order from another supplier does not post", () => {
  const after = runAll(S, { inv06: { po: "4513", by: "Mick" } });
  assert.equal(after.results.find((x) => x.id === "inv06").status, "held");
});

test("inv09 held: GST charged on milk, which is GST-free on the PO", () => {
  const c = check("inv09", "gst");
  assert.equal(c.verdict, "fail");
  assert.match(c.say, /9\.30 charged; expected 0\.00/);
});

test("inv08: 10% GST on taxable packaging passes", () => {
  assert.equal(check("inv08", "gst").verdict, "pass");
  assert.equal(byId("inv08").status, "post");
});

test("inv10 posts against the merged supplier: printed name differs, ABN is the same", () => {
  const r = byId("inv10");
  assert.equal(r.status, "post");
  assert.equal(r.supplier.id, "S01");
  assert.match(check("inv10", "supplier").say, /On file 3 times/);
});

test("every held invoice says what to do next", () => {
  for (const r of run.results.filter((x) => x.status !== "post")) {
    assert.ok(r.open.length, r.id);
    for (const c of r.open) assert.ok(c.ask && c.ask.length > 10, `${r.id} ${c.key}`);
  }
});

test("every piece of evidence quotes a real line of its document", () => {
  for (const r of run.results) {
    const inv = S.invoices.find((i) => i.id === r.id);
    const docLines = inv.text.split("\n");
    for (const c of r.checks) for (const e of c.ev) {
      if (e.doc === inv.file) {
        assert.equal(docLines[e.ln - 1], e.text, `${r.id} ${c.key}`);
        for (const m of e.marks) assert.ok(e.text.includes(m), `${r.id} ${c.key} mark "${m}"`);
      }
    }
  }
});

test("a line with no matching PO line is not found, never guessed", () => {
  const inv = { id: "x", file: "x.pdf", how: "PDF", text: S.invoices[0].text.replace("ONION BROWN 20KG BAG", "GARLIC PEELED 1KG") };
  const r = checkInvoice(inv, S);
  assert.equal(r.status, "held");
  const c = r.checks.find((x) => x.label.includes("GARLIC"));
  assert.equal(c.verdict, "none");
  assert.match(c.say, /Not guessed/);
});

test("a wrong line total is caught", () => {
  const inv = { id: "x", file: "x.pdf", how: "PDF", text: S.invoices[6].text.replace("85.20", "87.20").replace("178.20", "180.20").replace("Total 178.20", "Total 180.20") };
  const r = checkInvoice(inv, S);
  assert.equal(r.status, "held");
  assert.ok(r.checks.some((c) => c.key.startsWith("amt") && c.verdict === "fail"));
});

test("an ABN that fails the check digits is held", () => {
  const inv = { id: "x", file: "x.pdf", how: "PDF", text: S.invoices[7].text.replace("46 034 145 176", "46 034 145 177") };
  const r = checkInvoice(inv, S);
  assert.equal(r.status, "held");
  assert.match(r.checks[0].say, /fails the ABN check digits/);
});

test("the export needs a named approver and carries only invoices that can post", () => {
  assert.throws(() => toCsv(run.results, "  ", "2026-11-18"));
  const csv = toCsv(run.results, "Dana", "2026-11-18 09:40");
  const rows = csv.trim().split("\n");
  assert.equal(rows.length, 1 + 3 + 2 + 1 + 2 + 1 + 1);
  assert.ok(!csv.includes("TD-7731") && !csv.includes("BM-0917") && !csv.includes("scan_0042"));
  assert.ok(rows.slice(1).every((r) => r.includes("Dana") && / line \d+$/.test(r)));
  assert.equal(abnDigits(rows[1].split(",")[2]), "37492282788");
});
