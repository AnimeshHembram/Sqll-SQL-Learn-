---
id: da-day-255
title: Purchase price variance against contract prices
order: 255
difficulty: advanced
topic: Supply chain
summary: Compare invoiced prices with contract prices per supplier and item, and catch purchases with no contract.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Join on a composite key
  - Weight an average price by quantity
prerequisites:
  - Day 94
  - Day 145
---

## Task

Procurement agreed contract prices with suppliers (starter query). For each supplier and item invoiced, compute:

- `qty` and `avg_paid` (quantity-weighted average price paid, rounded to 2 decimal places),
- `contract_price` (`NULL` when there is no contract) and `ppv`: purchase price variance, `SUM((unit_price − contract_price) × qty)`, rounded to 2 decimal places (positive means overpaying),
- `status`: `'no contract'`, `'over'` (ppv above 0), `'under'` (below 0) or `'on contract'`.

Return `supplier`, `item`, `qty`, `avg_paid`, `contract_price`, `ppv` and `status`, sorted by `ppv` from highest (no-contract rows last), then `supplier`, then `item`.

## Starter query

```sql
WITH contracts(supplier, item, contract_price) AS (
  VALUES ('Apex', 'Steel', 52.0), ('Apex', 'Bolts', 1.20), ('Brio', 'Steel', 50.0), ('Brio', 'Paint', 310.0)
),
invoices(invoice, supplier, item, qty, unit_price) AS (
  VALUES
    (1, 'Apex', 'Steel', 100, 52.0), (2, 'Apex', 'Steel', 50, 55.0), (3, 'Apex', 'Bolts', 2000, 1.15),
    (4, 'Brio', 'Steel', 200, 50.5), (5, 'Brio', 'Paint', 10, 330.0), (6, 'Brio', 'Paint', 5, 300.0),
    (7, 'Brio', 'Glue', 40, 12.0)
)
SELECT i.invoice, i.supplier, i.item, i.qty, i.unit_price, c.contract_price
FROM invoices AS i
LEFT JOIN contracts AS c ON c.supplier = i.supplier AND c.item = i.item
ORDER BY i.invoice;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join invoices to contracts on **both** supplier and item with a `LEFT JOIN`, so purchases without a contract stay with a `NULL` contract price.
3. Group by supplier and item: `SUM(unit_price * qty) / SUM(qty)` is the weighted average and `SUM((unit_price - contract_price) * qty)` the variance (`NULL` without a contract). Sort with `ORDER BY ppv IS NULL, ppv DESC, ...`.

## Solution

```sql
WITH contracts(supplier, item, contract_price) AS (
  VALUES ('Apex', 'Steel', 52.0), ('Apex', 'Bolts', 1.20), ('Brio', 'Steel', 50.0), ('Brio', 'Paint', 310.0)
),
invoices(invoice, supplier, item, qty, unit_price) AS (
  VALUES
    (1, 'Apex', 'Steel', 100, 52.0), (2, 'Apex', 'Steel', 50, 55.0), (3, 'Apex', 'Bolts', 2000, 1.15),
    (4, 'Brio', 'Steel', 200, 50.5), (5, 'Brio', 'Paint', 10, 330.0), (6, 'Brio', 'Paint', 5, 300.0),
    (7, 'Brio', 'Glue', 40, 12.0)
),
priced AS (
  SELECT i.supplier, i.item, SUM(i.qty) AS qty, SUM(i.unit_price * i.qty) / SUM(i.qty) AS avg_paid,
    MAX(c.contract_price) AS contract_price, SUM((i.unit_price - c.contract_price) * i.qty) AS ppv
  FROM invoices AS i
  LEFT JOIN contracts AS c ON c.supplier = i.supplier AND c.item = i.item
  GROUP BY i.supplier, i.item
)
SELECT supplier, item, qty, ROUND(avg_paid, 2) AS avg_paid, contract_price, ROUND(ppv, 2) AS ppv,
  CASE WHEN contract_price IS NULL THEN 'no contract' WHEN ppv > 0.005 THEN 'over' WHEN ppv < -0.005 THEN 'under' ELSE 'on contract' END AS status
FROM priced
ORDER BY ppv IS NULL, ppv DESC, supplier, item;
```

## Expected result

| supplier | item | qty | avg_paid | contract_price | ppv | status |
| --- | --- | --- | --- | --- | --- | --- |
| Apex | Steel | 150 | 53 | 52 | 150 | over |
| Brio | Paint | 15 | 320 | 310 | 150 | over |
| Brio | Steel | 200 | 50.5 | 50 | 100 | over |
| Apex | Bolts | 2000 | 1.15 | 1.2 | -100 | under |
| Brio | Glue | 40 | 12 | NULL | NULL | no contract |

## Explanation

Purchase price variance (PPV) measures what procurement paid above or below the agreed price, weighted by quantity: Apex's second steel invoice was 3 above contract on 50 units, 150 extra. Averaging the two invoice prices would say 53.50 a unit, but the weighted average is 53.00, because the first invoice was twice as large.

The contract join needs **both** keys. Joining on the item alone would match Brio's steel to Apex's contract too and double its rows. Brio's glue has no contract at all; the `LEFT JOIN` keeps it with a `NULL` contract and `'no contract'`, which is often the more important finding: buying outside agreed terms. Bolts below contract are a favourable variance, shown as negative.

**Common mistake:** joining on the item alone. Each steel invoice matches both suppliers' contracts, the rows multiply, and the variances are compared with the wrong price.

## Wrong answers

Feedback: incorrect-output

```sql
WITH contracts(supplier, item, contract_price) AS ( VALUES ('Apex', 'Steel', 52.0), ('Apex', 'Bolts', 1.20), ('Brio', 'Steel', 50.0), ('Brio', 'Paint', 310.0) ), invoices(invoice, supplier, item, qty, unit_price) AS ( VALUES (1, 'Apex', 'Steel', 100, 52.0), (2, 'Apex', 'Steel', 50, 55.0), (3, 'Apex', 'Bolts', 2000, 1.15), (4, 'Brio', 'Steel', 200, 50.5), (5, 'Brio', 'Paint', 10, 330.0), (6, 'Brio', 'Paint', 5, 300.0), (7, 'Brio', 'Glue', 40, 12.0) ), priced AS (SELECT i.supplier, i.item, SUM(i.qty) AS qty, AVG(i.unit_price) AS avg_paid, MAX(c.contract_price) AS contract_price, SUM((i.unit_price - c.contract_price) * i.qty) AS ppv FROM invoices AS i LEFT JOIN contracts AS c ON c.item = i.item AND c.supplier = i.supplier GROUP BY i.supplier, i.item) SELECT supplier, item, qty, ROUND(avg_paid, 2) AS avg_paid, contract_price, ROUND(ppv, 2) AS ppv, CASE WHEN contract_price IS NULL THEN 'no contract' WHEN ppv > 0.005 THEN 'over' WHEN ppv < -0.005 THEN 'under' ELSE 'on contract' END AS status FROM priced ORDER BY ppv IS NULL, ppv DESC, supplier, item;
```

Feedback: incorrect-output

```sql
WITH contracts(supplier, item, contract_price) AS ( VALUES ('Apex', 'Steel', 52.0), ('Apex', 'Bolts', 1.20), ('Brio', 'Steel', 50.0), ('Brio', 'Paint', 310.0) ), invoices(invoice, supplier, item, qty, unit_price) AS ( VALUES (1, 'Apex', 'Steel', 100, 52.0), (2, 'Apex', 'Steel', 50, 55.0), (3, 'Apex', 'Bolts', 2000, 1.15), (4, 'Brio', 'Steel', 200, 50.5), (5, 'Brio', 'Paint', 10, 330.0), (6, 'Brio', 'Paint', 5, 300.0), (7, 'Brio', 'Glue', 40, 12.0) ), priced AS (SELECT i.supplier, i.item, i.qty, i.unit_price AS avg_paid, c.contract_price, (i.unit_price - c.contract_price) * i.qty AS ppv FROM invoices AS i LEFT JOIN contracts AS c ON c.item = i.item) SELECT supplier, item, qty, ROUND(avg_paid, 2) AS avg_paid, contract_price, ROUND(ppv, 2) AS ppv, CASE WHEN contract_price IS NULL THEN 'no contract' WHEN ppv > 0.005 THEN 'over' WHEN ppv < -0.005 THEN 'under' ELSE 'on contract' END AS status FROM priced ORDER BY ppv IS NULL, ppv DESC, supplier, item;
```
