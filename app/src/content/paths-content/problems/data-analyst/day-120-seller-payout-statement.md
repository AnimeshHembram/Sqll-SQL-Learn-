---
id: da-day-120
title: Case study: a seller payout statement
order: 120
difficulty: advanced
topic: Case studies
summary: Build a period statement from sales and refunds with tiered commission and money rounded once.
module: data-analyst
duration: 20
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a multi-step financial statement
  - Combine keys from two sources with UNION
prerequisites:
  - Day 116
  - Day 117
---

## Task

Day 120. A marketplace pays its sellers monthly. Build the **March 2025** statement from the sales and refunds in the starter query:

- `gross_sales`: the seller's sales **made in March**,
- `refunds`: refunds **issued in March**, whatever month the sale was in,
- `net_sales`: gross sales minus refunds,
- `commission`: 0 when net sales are 0 or less; otherwise 10% of net sales below 500, or 8% of net sales when they are 500 or more,
- `payout`: net sales minus commission, but never below 0,
- `status`: `'hold'` when net sales are 0 or less, otherwise `'pay'`.

Include **every seller with a sale or a refund in March**; activity outside March is ignored. Money columns are rounded to 2 decimal places, once, at the end. Sort by `seller`.

## Starter query

```sql
WITH sales(order_id, seller, sold_on, amount) AS (
  VALUES
    (101, 'Kavya Prints', '2025-02-20', 200.00), (102, 'Kavya Prints', '2025-03-02', 180.00),
    (103, 'Kavya Prints', '2025-03-15', 220.00),
    (104, 'Northwind Books', '2025-03-05', 300.00), (105, 'Northwind Books', '2025-03-18', 350.00),
    (106, 'Northwind Books', '2025-03-28', 90.00),
    (107, 'Lotus Crafts', '2025-03-10', 60.00), (108, 'Lotus Crafts', '2025-02-25', 40.00),
    (109, 'Owl Supplies', '2025-04-01', 75.00),
    (110, 'Mela Arts', '2025-02-10', 80.00)
),
refunds(order_id, refunded_on, amount) AS (
  VALUES
    (101, '2025-03-03', 50.00), (103, '2025-03-20', 20.00), (107, '2025-03-12', 60.00),
    (108, '2025-03-01', 40.00), (105, '2025-04-02', 100.00), (110, '2025-03-08', 30.00)
)
SELECT seller, SUM(amount) AS gross_sales
FROM sales
GROUP BY seller;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Refunds do not name the seller: join them to `sales` on `order_id` to find it.
2. Make two CTEs, March sales per seller and March refunds per seller, and a third with every seller that appears in either (`UNION`). `LEFT JOIN` both totals to it with `COALESCE(..., 0)`.
3. Calculate `net_sales` in one step and the commission with `CASE WHEN net <= 0 THEN 0 WHEN net < 500 THEN net * 0.10 ELSE net * 0.08 END` in the next, then round only in the final `SELECT`.

## Solution

```sql
WITH sales(order_id, seller, sold_on, amount) AS (
  VALUES
    (101, 'Kavya Prints', '2025-02-20', 200.00), (102, 'Kavya Prints', '2025-03-02', 180.00),
    (103, 'Kavya Prints', '2025-03-15', 220.00),
    (104, 'Northwind Books', '2025-03-05', 300.00), (105, 'Northwind Books', '2025-03-18', 350.00),
    (106, 'Northwind Books', '2025-03-28', 90.00),
    (107, 'Lotus Crafts', '2025-03-10', 60.00), (108, 'Lotus Crafts', '2025-02-25', 40.00),
    (109, 'Owl Supplies', '2025-04-01', 75.00),
    (110, 'Mela Arts', '2025-02-10', 80.00)
),
refunds(order_id, refunded_on, amount) AS (
  VALUES
    (101, '2025-03-03', 50.00), (103, '2025-03-20', 20.00), (107, '2025-03-12', 60.00),
    (108, '2025-03-01', 40.00), (105, '2025-04-02', 100.00), (110, '2025-03-08', 30.00)
),
march_sales AS (
  SELECT seller, SUM(amount) AS gross
  FROM sales
  WHERE sold_on BETWEEN '2025-03-01' AND '2025-03-31'
  GROUP BY seller
),
march_refunds AS (
  SELECT s.seller, SUM(r.amount) AS refunded
  FROM refunds AS r
  JOIN sales AS s ON s.order_id = r.order_id
  WHERE r.refunded_on BETWEEN '2025-03-01' AND '2025-03-31'
  GROUP BY s.seller
),
sellers AS (
  SELECT seller FROM march_sales
  UNION
  SELECT seller FROM march_refunds
),
statement AS (
  SELECT x.seller,
    COALESCE(ms.gross, 0) AS gross_sales,
    COALESCE(mr.refunded, 0) AS refunds,
    COALESCE(ms.gross, 0) - COALESCE(mr.refunded, 0) AS net_sales
  FROM sellers AS x
  LEFT JOIN march_sales AS ms ON ms.seller = x.seller
  LEFT JOIN march_refunds AS mr ON mr.seller = x.seller
),
with_commission AS (
  SELECT *,
    CASE WHEN net_sales <= 0 THEN 0 WHEN net_sales < 500 THEN net_sales * 0.10 ELSE net_sales * 0.08 END AS commission
  FROM statement
)
SELECT seller,
  ROUND(gross_sales, 2) AS gross_sales,
  ROUND(refunds, 2) AS refunds,
  ROUND(net_sales, 2) AS net_sales,
  ROUND(commission, 2) AS commission,
  ROUND(MAX(net_sales - commission, 0), 2) AS payout,
  CASE WHEN net_sales <= 0 THEN 'hold' ELSE 'pay' END AS status
FROM with_commission
ORDER BY seller;
```

## Expected result

| seller | gross_sales | refunds | net_sales | commission | payout | status |
| --- | --- | --- | --- | --- | --- | --- |
| Kavya Prints | 400 | 70 | 330 | 33 | 297 | pay |
| Lotus Crafts | 60 | 100 | -40 | 0 | 0 | hold |
| Mela Arts | 0 | 30 | -30 | 0 | 0 | hold |
| Northwind Books | 740 | 0 | 740 | 59.2 | 680.8 | pay |

## Explanation

This capstone combines most of what the last 120 days covered: period filters on two different dates, a join to recover a missing key (refunds name an order, not a seller), a `UNION` of keys so no seller is lost, `COALESCE` for absent totals, tiered rules with `CASE`, a floor with `MAX(x, 0)`, and rounding only at the end.

Kavya Prints made 400 in March but also had 70 refunded, including 50 for a February sale: refunds belong to the period in which they are paid. Northwind Books' April refund waits for the April statement. Mela Arts sold nothing in March but refunded 30, so the seller appears with a negative net and is put on hold, which is exactly the case a sales-only query would hide. Owl Supplies only sold in April and is not listed.

**Common mistakes:** filtering refunds by the date of the original sale; and starting from March sales only, which loses Mela Arts.

## Wrong answers

Feedback: missing-rows

```sql
WITH sales(order_id, seller, sold_on, amount) AS ( VALUES (101, 'Kavya Prints', '2025-02-20', 200.00), (102, 'Kavya Prints', '2025-03-02', 180.00), (103, 'Kavya Prints', '2025-03-15', 220.00), (104, 'Northwind Books', '2025-03-05', 300.00), (105, 'Northwind Books', '2025-03-18', 350.00), (106, 'Northwind Books', '2025-03-28', 90.00), (107, 'Lotus Crafts', '2025-03-10', 60.00), (108, 'Lotus Crafts', '2025-02-25', 40.00), (109, 'Owl Supplies', '2025-04-01', 75.00), (110, 'Mela Arts', '2025-02-10', 80.00) ), refunds(order_id, refunded_on, amount) AS ( VALUES (101, '2025-03-03', 50.00), (103, '2025-03-20', 20.00), (107, '2025-03-12', 60.00), (108, '2025-03-01', 40.00), (105, '2025-04-02', 100.00), (110, '2025-03-08', 30.00) ), march_sales AS (SELECT seller, SUM(amount) AS gross FROM sales WHERE sold_on BETWEEN '2025-03-01' AND '2025-03-31' GROUP BY seller), march_refunds AS (SELECT s.seller, SUM(r.amount) AS refunded FROM refunds AS r JOIN sales AS s ON s.order_id = r.order_id WHERE r.refunded_on BETWEEN '2025-03-01' AND '2025-03-31' GROUP BY s.seller), statement AS (SELECT ms.seller, ms.gross AS gross_sales, COALESCE(mr.refunded, 0) AS refunds, ms.gross - COALESCE(mr.refunded, 0) AS net_sales FROM march_sales AS ms LEFT JOIN march_refunds AS mr ON mr.seller = ms.seller), with_commission AS (SELECT *, CASE WHEN net_sales <= 0 THEN 0 WHEN net_sales < 500 THEN net_sales * 0.10 ELSE net_sales * 0.08 END AS commission FROM statement) SELECT seller, ROUND(gross_sales, 2) AS gross_sales, ROUND(refunds, 2) AS refunds, ROUND(net_sales, 2) AS net_sales, ROUND(commission, 2) AS commission, ROUND(MAX(net_sales - commission, 0), 2) AS payout, CASE WHEN net_sales <= 0 THEN 'hold' ELSE 'pay' END AS status FROM with_commission ORDER BY seller;
```

Feedback: incorrect-output

```sql
WITH sales(order_id, seller, sold_on, amount) AS ( VALUES (101, 'Kavya Prints', '2025-02-20', 200.00), (102, 'Kavya Prints', '2025-03-02', 180.00), (103, 'Kavya Prints', '2025-03-15', 220.00), (104, 'Northwind Books', '2025-03-05', 300.00), (105, 'Northwind Books', '2025-03-18', 350.00), (106, 'Northwind Books', '2025-03-28', 90.00), (107, 'Lotus Crafts', '2025-03-10', 60.00), (108, 'Lotus Crafts', '2025-02-25', 40.00), (109, 'Owl Supplies', '2025-04-01', 75.00), (110, 'Mela Arts', '2025-02-10', 80.00) ), refunds(order_id, refunded_on, amount) AS ( VALUES (101, '2025-03-03', 50.00), (103, '2025-03-20', 20.00), (107, '2025-03-12', 60.00), (108, '2025-03-01', 40.00), (105, '2025-04-02', 100.00), (110, '2025-03-08', 30.00) ), march_sales AS (SELECT seller, SUM(amount) AS gross FROM sales WHERE sold_on BETWEEN '2025-03-01' AND '2025-03-31' GROUP BY seller), march_refunds AS (SELECT s.seller, SUM(r.amount) AS refunded FROM refunds AS r JOIN sales AS s ON s.order_id = r.order_id WHERE s.sold_on BETWEEN '2025-03-01' AND '2025-03-31' GROUP BY s.seller), sellers AS (SELECT seller FROM march_sales UNION SELECT seller FROM march_refunds), statement AS (SELECT x.seller, COALESCE(ms.gross, 0) AS gross_sales, COALESCE(mr.refunded, 0) AS refunds, COALESCE(ms.gross, 0) - COALESCE(mr.refunded, 0) AS net_sales FROM sellers AS x LEFT JOIN march_sales AS ms ON ms.seller = x.seller LEFT JOIN march_refunds AS mr ON mr.seller = x.seller), with_commission AS (SELECT *, CASE WHEN net_sales <= 0 THEN 0 WHEN net_sales < 500 THEN net_sales * 0.10 ELSE net_sales * 0.08 END AS commission FROM statement) SELECT seller, ROUND(gross_sales, 2) AS gross_sales, ROUND(refunds, 2) AS refunds, ROUND(net_sales, 2) AS net_sales, ROUND(commission, 2) AS commission, ROUND(MAX(net_sales - commission, 0), 2) AS payout, CASE WHEN net_sales <= 0 THEN 'hold' ELSE 'pay' END AS status FROM with_commission ORDER BY seller;
```
