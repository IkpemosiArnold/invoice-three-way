// Sample data. Every business here is made up: Hallowbrook Foods (the buyer, a Brisbane meal-kit kitchen)
// and its suppliers. The ABNs pass the ATO checksum and returned "No record found" on ABN Lookup (18 Nov 2026).
// Bank details are kept to the last four digits of the account.

export const buyer = "Hallowbrook Foods (sample)";

// The supplier file as exported from the accounts system. One supplier was keyed in three times.
export const suppliers = [
  { id: "S01", name: "Kellerby Fresh Pty Ltd", abn: "37 492 282 788", acct: "2291", added: "2023-03-02", by: "set-up form" },
  { id: "S02", name: "Tarrowbin Dairy Co", abn: "16 613 925 314", acct: "4408", added: "2023-03-02", by: "set-up form" },
  { id: "S03", name: "Wyndell Packaging Pty Ltd", abn: "46 034 145 176", acct: "9013", added: "2023-05-19", by: "set-up form" },
  { id: "S04", name: "Brannock Meats Pty Ltd", abn: "79 999 398 506", acct: "5512", added: "2023-08-07", by: "set-up form" },
  { id: "S05", name: "Coralvale Eggs", abn: "25 888 231 202", acct: "6120", added: "2024-01-15", by: "set-up form" },
  { id: "S06", name: "Fenwold Dry Goods Pty Ltd", abn: "93 144 030 506", acct: "3375", added: "2024-02-26", by: "set-up form" },
  { id: "S07", name: "KELLERBY FRESH", abn: "37492282788", acct: "2291", added: "2024-09-11", by: "keyed from a docket" },
  { id: "S11", name: "Kellerby Fresh Produce", abn: "37 492 282 788", acct: "2291", added: "2025-06-30", by: "keyed from an invoice" },
];

// Purchase orders. gst: "free" for basic food (GST-free in Australia), "10" for taxable goods.
export const pos = [
  { po: "4510", supplier: "S01", date: "14/11/2026", lines: [
    { ln: 1, item: "Roma tomatoes 10kg ctn", qty: 12, price: 18.50, gst: "free" },
    { ln: 2, item: "Cos lettuce ctn 12", qty: 6, price: 24.00, gst: "free" },
    { ln: 3, item: "Brown onions 20kg bag", qty: 4, price: 16.00, gst: "free" } ] },
  { po: "4511", supplier: "S02", date: "14/11/2026", lines: [
    { ln: 1, item: "Full cream milk 2L", qty: 40, price: 3.10, gst: "free" },
    { ln: 2, item: "Skim milk 2L", qty: 10, price: 2.90, gst: "free" } ] },
  { po: "4512", supplier: "S03", date: "10/11/2026", lines: [
    { ln: 1, item: "Clamshell 500ml ctn 250", qty: 8, price: 32.00, gst: "10" },
    { ln: 2, item: "Lid for 500ml clamshell ctn 250", qty: 8, price: 14.50, gst: "10" } ] },
  { po: "4513", supplier: "S04", date: "14/11/2026", lines: [
    { ln: 1, item: "Beef mince 5kg", qty: 10, price: 52.00, gst: "free" },
    { ln: 2, item: "Chicken thigh fillet 5kg", qty: 8, price: 48.50, gst: "free" } ] },
  { po: "4514", supplier: "S05", date: "15/11/2026", lines: [
    { ln: 1, item: "Eggs 700g tray 15 doz", qty: 2, price: 96.00, gst: "free" } ] },
  { po: "4515", supplier: "S06", date: "12/11/2026", lines: [
    { ln: 1, item: "Plain flour 12.5kg", qty: 6, price: 14.20, gst: "free" },
    { ln: 2, item: "Arborio rice 10kg", qty: 3, price: 31.00, gst: "free" } ] },
  { po: "4516", supplier: "S03", date: "12/11/2026", lines: [
    { ln: 1, item: "Kraft paper bags ctn 500", qty: 4, price: 41.00, gst: "10" } ] },
  { po: "4517", supplier: "S02", date: "16/11/2026", lines: [
    { ln: 1, item: "Full cream milk 2L", qty: 30, price: 3.10, gst: "free" } ] },
  { po: "4518", supplier: "S11", date: "16/11/2026", lines: [
    { ln: 1, item: "Baby spinach 1.5kg", qty: 10, price: 19.80, gst: "free" },
    { ln: 2, item: "Carrots 20kg bag", qty: 3, price: 22.00, gst: "free" } ] },
  { po: "4519", supplier: "S06", date: "16/11/2026", lines: [
    { ln: 1, item: "Rolled oats 10kg", qty: 4, price: 27.50, gst: "free" } ] },
  { po: "4520", supplier: "S04", date: "16/11/2026", lines: [
    { ln: 1, item: "Beef mince 5kg", qty: 6, price: 52.00, gst: "free" } ] },
];

// Goods received at the dock, from the receiving sheet.
export const receipts = [
  { grn: "R-8801", po: "4510", ln: 1, qty: 12, date: "16/11/2026", by: "Mick" },
  { grn: "R-8801", po: "4510", ln: 2, qty: 6, date: "16/11/2026", by: "Mick" },
  { grn: "R-8801", po: "4510", ln: 3, qty: 4, date: "16/11/2026", by: "Mick" },
  { grn: "R-8802", po: "4511", ln: 1, qty: 40, date: "16/11/2026", by: "Leah" },
  { grn: "R-8802", po: "4511", ln: 2, qty: 8, date: "16/11/2026", by: "Leah" },
  { grn: "R-8803", po: "4512", ln: 1, qty: 8, date: "13/11/2026", by: "Mick" },
  { grn: "R-8803", po: "4512", ln: 2, qty: 8, date: "13/11/2026", by: "Mick" },
  { grn: "R-8804", po: "4513", ln: 1, qty: 10, date: "16/11/2026", by: "Leah" },
  { grn: "R-8804", po: "4513", ln: 2, qty: 8, date: "16/11/2026", by: "Leah" },
  { grn: "R-8805", po: "4514", ln: 1, qty: 2, date: "17/11/2026", by: "Mick" },
  { grn: "R-8806", po: "4515", ln: 1, qty: 6, date: "14/11/2026", by: "Leah" },
  { grn: "R-8806", po: "4515", ln: 2, qty: 3, date: "14/11/2026", by: "Leah" },
  { grn: "R-8807", po: "4516", ln: 1, qty: 4, date: "14/11/2026", by: "Mick" },
  { grn: "R-8808", po: "4517", ln: 1, qty: 30, date: "17/11/2026", by: "Leah" },
  { grn: "R-8809", po: "4518", ln: 1, qty: 10, date: "17/11/2026", by: "Mick" },
  { grn: "R-8809", po: "4518", ln: 2, qty: 3, date: "17/11/2026", by: "Mick" },
  { grn: "R-8810", po: "4519", ln: 1, qty: 4, date: "17/11/2026", by: "Leah" },
  { grn: "R-8811", po: "4520", ln: 1, qty: 6, date: "17/11/2026", by: "Leah" },
];

// The AP inbox for one morning, as text read from each PDF, scan or photo.
export const invoices = [
  { id: "inv01", file: "KF-20481.pdf", how: "PDF", text:
`TAX INVOICE
Kellerby Fresh Pty Ltd
ABN 37 492 282 788
Invoice KF-20481   Date 16/11/2026
Your order PO 4510
TOMATO ROMA 10KG CTN   12   18.50   222.00
LETTUCE COS CTN 12   6   24.00   144.00
ONION BROWN 20KG BAG   4   16.00   64.00
Subtotal 430.00
GST 0.00
Total 430.00
EFT BSB 064-xxx Acct xxxx2291` },
  { id: "inv02", file: "TD-7731.pdf", how: "PDF", text:
`TAX INVOICE
Tarrowbin Dairy Co
ABN 16 613 925 314
Invoice TD-7731   Date 16/11/2026
Your order PO 4511
FULL CREAM MILK 2L   40   3.10   124.00
SKIM MILK 2L   10   2.90   29.00
Subtotal 153.00
GST 0.00
Total 153.00
EFT BSB 084-xxx Acct xxxx4408` },
  { id: "inv03", file: "WP-3302.pdf", how: "PDF", text:
`TAX INVOICE
Wyndell Packaging Pty Ltd
ABN 46 034 145 176
Invoice WP-3302   Date 13/11/2026
Your order PO 4512
CLAMSHELL 500ML CTN250   8   35.50   284.00
LID 500ML CLAMSHELL CTN250   8   14.50   116.00
Subtotal 400.00
GST 40.00
Total 440.00
EFT BSB 034-xxx Acct xxxx9013` },
  { id: "inv04", file: "scan_0042.jpg", how: "Scan, emailed again by the supplier", text:
`TAX INVOICE
KELLERBY FRESH
ABN 37492282788
Invoice No 20481   Date 16/11/26
Order 4510
Tomatoes roma 10kg   12   18.50   222.00
Cos lettuce   6   24.00   144.00
Onions brown 20kg   4   16.00   64.00
TOTAL 430.00
EFT BSB 064-xxx Acct xxxx2291` },
  { id: "inv05", file: "BM-0917.pdf", how: "PDF", text:
`TAX INVOICE
Brannock Meats Pty Ltd
ABN 79 999 398 506
Invoice BM-0917   Date 16/11/2026
Your order PO 4513
BEEF MINCE 5KG   10   52.00   520.00
CHICKEN THIGH FILLET 5KG   8   48.50   388.00
Subtotal 908.00
GST 0.00
Total 908.00
Please note our new bank details
EFT BSB 182-xxx Acct xxxx7730` },
  { id: "inv06", file: "IMG_3317.jpg", how: "Photo of a handwritten docket", text:
`DELIVERY DOCKET No 118
Coralvale Eggs ABN 25 888 231 202
To Hallowbrook   17/11/26
Order no [smudged]
2 trays 15doz 700g @ 96.00 = 192.00
Total 192.00` },
  { id: "inv07", file: "FD-5560.pdf", how: "PDF", text:
`TAX INVOICE
Fenwold Dry Goods Pty Ltd
ABN 93 144 030 506
Invoice FD-5560   Date 14/11/2026
Your order PO 4515
PLAIN FLOUR 12.5KG   6   14.20   85.20
ARBORIO RICE 10KG   3   31.00   93.00
Subtotal 178.20
GST 0.00
Total 178.20
EFT BSB 112-xxx Acct xxxx3375` },
  { id: "inv08", file: "WP-3310.pdf", how: "PDF", text:
`TAX INVOICE
Wyndell Packaging Pty Ltd
ABN 46 034 145 176
Invoice WP-3310   Date 14/11/2026
Your order PO 4516
KRAFT PAPER BAG CTN500   4   41.00   164.00
Subtotal 164.00
GST 16.40
Total 180.40
EFT BSB 034-xxx Acct xxxx9013` },
  { id: "inv09", file: "TD-7740.pdf", how: "PDF", text:
`TAX INVOICE
Tarrowbin Dairy Co
ABN 16 613 925 314
Invoice TD-7740   Date 17/11/2026
Your order PO 4517
FULL CREAM MILK 2L   30   3.10   93.00
Subtotal 93.00
GST 9.30
Total 102.30
EFT BSB 084-xxx Acct xxxx4408` },
  { id: "inv10", file: "KF-20502.pdf", how: "PDF", text:
`TAX INVOICE
Kellerby Fresh Produce
ABN 37 492 282 788
Invoice KF-20502   Date 17/11/2026
Your order PO 4518
SPINACH BABY 1.5KG   10   19.80   198.00
CARROTS 20KG BAG   3   22.00   66.00
Subtotal 264.00
GST 0.00
Total 264.00
EFT BSB 064-xxx Acct xxxx2291` },
  { id: "inv11", file: "FD-5571.pdf", how: "PDF", text:
`TAX INVOICE
Fenwold Dry Goods Pty Ltd
ABN 93 144 030 506
Invoice FD-5571   Date 17/11/2026
Your order PO 4519
ROLLED OATS 10KG   4   27.50   110.00
Subtotal 110.00
GST 0.00
Total 110.00
EFT BSB 112-xxx Acct xxxx3375` },
  { id: "inv12", file: "BM-0925.pdf", how: "PDF", text:
`TAX INVOICE
Brannock Meats Pty Ltd
ABN 79 999 398 506
Invoice BM-0925   Date 17/11/2026
Your order PO 4520
BEEF MINCE 5KG   6   52.00   312.00
Subtotal 312.00
GST 0.00
Total 312.00
EFT BSB 182-xxx Acct xxxx5512` },
];
