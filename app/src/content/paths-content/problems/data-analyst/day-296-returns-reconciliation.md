---
id: da-day-296
title: Case study: returns and refunds reconciliation
order: 296
difficulty: advanced
topic: Case studies
summary: Match every return to its refunds, and find missing, partial and duplicate refunds.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Reconcile one-to-many records
  - Classify reconciliation outcomes
prerequisites:
  - Day 145
  - Day 255
---

## Task

Finance reconciles returns with refunds (starter query). For **every return**, compare the approved `return_amount` with what was refunded (a return can have several refunds):

- `refunded`: total refunded (0 if none) and `refunds`: number of refunds,
- `status`: `'not refunded'`, `'partial'` (less than the return amount), `'over-refunded'` (more), or `'matched'`,
- `days_to_refund`: days from the request to the **first** refund (`NULL` if none).

Return `return_id`, `order_id`, `reason`, `return_amount`, `refunded`, `refunds`, `status` and `days_to_refund`, sorted by `return_id`.

## Starter query

```sql
WITH orders(order_id, ordered_on, amount) AS (
  VALUES (1, '2025-03-01', 2400), (2, '2025-03-02', 1800), (3, '2025-03-03', 3200), (4, '2025-03-05', 900), (5, '2025-03-08', 1500), (6, '2025-03-09', 2100)
),
returns(return_id, order_id, requested_on, return_amount, reason) AS (
  VALUES (1, 1, '2025-03-06', 1200, 'damaged'), (2, 3, '2025-03-10', 3200, 'wrong item'), (3, 4, '2025-03-07', 900, 'changed mind'),
         (4, 6, '2025-03-12', 700, 'damaged'), (5, 5, '2025-03-15', 1500, 'changed mind')
),
refunds(refund_id, return_id, refunded_on, refund_amount) AS (
  VALUES (1, 1, '2025-03-08', 1200), (2, 2, '2025-03-11', 3000), (3, 3, '2025-03-09', 900), (4, 3, '2025-03-10', 900)
)
SELECT r.return_id, r.return_amount, f.refund_id, f.refund_amount
FROM returns AS r
LEFT JOIN refunds AS f ON f.return_id = r.return_id
ORDER BY r.return_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. From `returns`, `LEFT JOIN refunds` and group by return: `COALESCE(SUM(f.refund_amount), 0)`, `COUNT(f.refund_id)` and `MIN(f.refunded_on)`.
3. Compare the refunded total with the return amount in a `CASE`, testing `refunds = 0` first.

## Solution

```sql
WITH orders(order_id, ordered_on, amount) AS (
  VALUES (1, '2025-03-01', 2400), (2, '2025-03-02', 1800), (3, '2025-03-03', 3200), (4, '2025-03-05', 900), (5, '2025-03-08', 1500), (6, '2025-03-09', 2100)
),
returns(return_id, order_id, requested_on, return_amount, reason) AS (
  VALUES (1, 1, '2025-03-06', 1200, 'damaged'), (2, 3, '2025-03-10', 3200, 'wrong item'), (3, 4, '2025-03-07', 900, 'changed mind'),
         (4, 6, '2025-03-12', 700, 'damaged'), (5, 5, '2025-03-15', 1500, 'changed mind')
),
refunds(refund_id, return_id, refunded_on, refund_amount) AS (
  VALUES (1, 1, '2025-03-08', 1200), (2, 2, '2025-03-11', 3000), (3, 3, '2025-03-09', 900), (4, 3, '2025-03-10', 900)
),
matched AS (
  SELECT r.return_id, r.order_id, r.reason, r.return_amount, r.requested_on,
    COALESCE(SUM(f.refund_amount), 0) AS refunded, COUNT(f.refund_id) AS refunds, MIN(f.refunded_on) AS first_refund
  FROM returns AS r
  LEFT JOIN refunds AS f ON f.return_id = r.return_id
  GROUP BY r.return_id, r.order_id, r.reason, r.return_amount, r.requested_on
)
SELECT return_id, order_id, reason, return_amount, refunded, refunds,
  CASE WHEN refunds = 0 THEN 'not refunded' WHEN refunded < return_amount THEN 'partial'
       WHEN refunded > return_amount THEN 'over-refunded' ELSE 'matched' END AS status,
  CAST(julianday(first_refund) - julianday(requested_on) AS INTEGER) AS days_to_refund
FROM matched
ORDER BY return_id;
```

## Expected result

| return_id | order_id | reason | return_amount | refunded | refunds | status | days_to_refund |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | damaged | 1200 | 1200 | 1 | matched | 2 |
| 2 | 3 | wrong item | 3200 | 3000 | 1 | partial | 1 |
| 3 | 4 | changed mind | 900 | 1800 | 2 | over-refunded | 2 |
| 4 | 6 | damaged | 700 | 0 | 0 | not refunded | NULL |
| 5 | 5 | changed mind | 1500 | 0 | 0 | not refunded | NULL |

## Explanation

Reconciliation checks every return against its refunds, and a return can have zero, one or several refunds. Starting from `returns` with a `LEFT JOIN` makes unrefunded returns visible: two returns (4 and 5) have not been refunded at all, which means customers are waiting for money.

The other statuses come from comparing totals. Return 2 was refunded 3,000 against an approved 3,200 (partial), and return 3 was refunded twice for 900, a duplicate payment of 900 that finance needs to recover. `MIN(refunded_on)` gives the first refund date for the speed measure, which is unaffected by the duplicate.

**Common mistake:** joining returns to refunds with an inner join. The two unrefunded returns disappear, so the report only shows problems with refunds that happened, not the ones that did not.

## Wrong answers

Feedback: missing-rows

```sql
WITH orders(order_id, ordered_on, amount) AS ( VALUES (1, '2025-03-01', 2400), (2, '2025-03-02', 1800), (3, '2025-03-03', 3200), (4, '2025-03-05', 900), (5, '2025-03-08', 1500), (6, '2025-03-09', 2100) ), returns(return_id, order_id, requested_on, return_amount, reason) AS ( VALUES (1, 1, '2025-03-06', 1200, 'damaged'), (2, 3, '2025-03-10', 3200, 'wrong item'), (3, 4, '2025-03-07', 900, 'changed mind'), (4, 6, '2025-03-12', 700, 'damaged'), (5, 5, '2025-03-15', 1500, 'changed mind') ), refunds(refund_id, return_id, refunded_on, refund_amount) AS ( VALUES (1, 1, '2025-03-08', 1200), (2, 2, '2025-03-11', 3000), (3, 3, '2025-03-09', 900), (4, 3, '2025-03-10', 900) ), matched AS (SELECT r.return_id, r.order_id, r.reason, r.return_amount, r.requested_on, SUM(f.refund_amount) AS refunded, COUNT(f.refund_id) AS refunds, MIN(f.refunded_on) AS first_refund FROM returns AS r JOIN refunds AS f ON f.return_id = r.return_id GROUP BY r.return_id, r.order_id, r.reason, r.return_amount, r.requested_on) SELECT return_id, order_id, reason, return_amount, refunded, refunds, CASE WHEN refunds = 0 THEN 'not refunded' WHEN refunded < return_amount THEN 'partial' WHEN refunded > return_amount THEN 'over-refunded' ELSE 'matched' END AS status, CAST(julianday(first_refund) - julianday(requested_on) AS INTEGER) AS days_to_refund FROM matched ORDER BY return_id;
```
