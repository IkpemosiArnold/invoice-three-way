# Invoice Match

A wholesaler's accounts inbox fills up overnight: PDFs, a scan the supplier sent twice, a photo of a handwritten docket. Someone opens each one, finds the order, checks it against what the dock signed for, and keys it in. The costly mistakes are quiet ones: a price that went up on one line, two cartons that never arrived, GST on milk, a polite note asking you to pay a new bank account.

This page does that check before anything posts. Each invoice is matched line by line to its purchase order and to the goods received. Every figure it uses points at the document line or the file row it came from. Anything that does not match is held, with the reason and the next step. Where the reason is sitting in the supplier's own mail, it finds it. Someone signs off the import file by name.

It is plain code. There is no model in it. The sample is made up.

## The sample

One morning at Hallowbrook Foods, a made-up Brisbane meal-kit kitchen: 12 invoices from 6 suppliers, one supplier email, 11 purchase orders, the receiving sheet, and the supplier file.

Result: **6 of 12 can post. 5 held, 1 duplicate.**

- **TD-7731:** 10 skim milk invoiced, 8 received at the dock.
- **WP-3302:** clamshells at 35.50 each against 32.00 on the order, 28.00 over. The reason is in the inbox: the supplier emailed a rise to 35.50 on 28 Oct, and the order was raised on 10 Nov at the old price. Still held: the buyer approves the new price or asks for a credit.
- **BM-0917:** asks for payment to a new bank account. The same supplier's next invoice, BM-0925, still shows the old one. Held until someone calls the supplier on the number already on file.
- **Docket 118:** the order number is smudged. One open order fits every line (PO 4514); the page says so but does not assume it. When a person confirms it, the docket posts and the record says who confirmed it.
- **TD-7740:** GST charged on milk, which is GST-free.
- **20481 (scan):** the same invoice as KF-20481, emailed again. Stopped.

The supplier file also has one supplier under three records (same ABN, same account). Invoices under any of the three names are coded to the oldest record, and the page proposes the merge for a person to approve.

## The rules

1. **Supplier by ABN, not name.** The ABN must pass its check digits and be in the supplier file. Printed names vary; the ABN does not.
2. **Same invoice, same supplier, stop.** Invoice numbers are compared on their digits, so KF-20481 and 20481 are the same.
3. **Bank account must match the file.** A change is never accepted from the invoice itself.
4. **Every line matches a PO line.** Matching is on the words of the description (plurals, carton sizes and dozens lined up). A line with no clear match says not found; it is never guessed.
5. **No more than received, no more than ordered.** Quantity against the receiving sheet; price against the order. When the price is over, the supplier's mail is searched for a line naming the item and the new price, and that line is shown as the reason. It does not clear the hold.
6. **GST is 10% of the taxable lines only.** Basic food on these orders is GST-free; packaging is taxable.
7. **It adds up.** Line totals, subtotal, GST and total.
8. **A named approver.** The import file is only written with a name, and each row carries the file and line it came from.

## Run it

Open `index.html` through any static server (`python3 -m http.server`). Tests: `npm test` (31 tests, Node 20 or later, no dependencies).

## Files

- `check.js`: reading, matching and the rules. No network, no model.
- `samples.js`: the made-up morning, including the supplier email.
- `app.js`, `index.html`, `style.css`: the page.
- `check.test.js`: the tests.
- `shots/`: phone and desktop, light and dark.

## Limits

- The invoices are already text. Reading a PDF, a scan or a photo is a separate step (a model or OCR would do it); this page is the check after that.
- The import file is a generic CSV, not any one accounts system's format.
- Matching is on description words. A real version would also learn each supplier's own item codes and units.
- GST treatment comes from the order line. Real GST rules for food have edge cases; this sample keeps to plain milk, fresh produce, meat, eggs, flour, rice and oats (GST-free) and packaging (taxable).
- Duplicates are checked within the batch only. A real version checks the invoice history too; duplicates often arrive weeks apart.
- Tolerances are exact. Real teams usually allow a small price or quantity tolerance per supplier.
- Bank details are shown only as the last four digits.
- Not tested on a real phone.

Every business, ABN and person here is made up. The ABNs pass the ATO check-digit rule and returned no record on ABN Lookup on 18 November 2026.

Built on 18 November 2026 with AI coding agents, directed by Arnold Ikpemosi Adeyemi.
