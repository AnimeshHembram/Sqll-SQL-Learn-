---
id: da-day-125
title: Orders since the last complaint
order: 125
difficulty: advanced
topic: Window functions
summary: Restart a counter at each event: a running count of events becomes a group key.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Restart a count at each event with a running SUM
  - Filter rows after computing window groups
prerequisites:
  - Day 103
  - Day 110
---

## Task

Customer care logs orders and complaints in one timeline (in the starter query). For every **order**, return `customer`, `happened_on`, `orders_since_complaint` (1 for the first order after the customer's latest complaint, or their first order ever, then 2, 3, ...) and `after_complaint` (`'yes'` if the customer complained at some point before this order, otherwise `'no'`). Sort by `customer`, then `happened_on`.

## Starter query

```sql
WITH events(customer, happened_on, kind) AS (
  VALUES
    ('c1', '2025-03-01', 'order'), ('c1', '2025-03-03', 'order'), ('c1', '2025-03-04', 'complaint'),
    ('c1', '2025-03-06', 'order'), ('c1', '2025-03-09', 'order'), ('c1', '2025-03-10', 'complaint'),
    ('c1', '2025-03-12', 'order'),
    ('c2', '2025-03-02', 'order'), ('c2', '2025-03-05', 'order'),
    ('c3', '2025-03-01', 'complaint'), ('c3', '2025-03-07', 'order')
)
SELECT customer, happened_on, kind
FROM events
ORDER BY customer, happened_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Number the complaints seen so far: `SUM(CASE WHEN kind = 'complaint' THEN 1 ELSE 0 END) OVER (PARTITION BY customer ORDER BY happened_on)`. Every order after the same number of complaints belongs to one stretch.
3. In an outer query, keep only orders and count within each stretch: `ROW_NUMBER() OVER (PARTITION BY customer, stretch ORDER BY happened_on)`. A stretch number above 0 means a complaint came before.

## Solution

```sql
WITH events(customer, happened_on, kind) AS (
  VALUES
    ('c1', '2025-03-01', 'order'), ('c1', '2025-03-03', 'order'), ('c1', '2025-03-04', 'complaint'),
    ('c1', '2025-03-06', 'order'), ('c1', '2025-03-09', 'order'), ('c1', '2025-03-10', 'complaint'),
    ('c1', '2025-03-12', 'order'),
    ('c2', '2025-03-02', 'order'), ('c2', '2025-03-05', 'order'),
    ('c3', '2025-03-01', 'complaint'), ('c3', '2025-03-07', 'order')
),
stretches AS (
  SELECT customer, happened_on, kind,
    SUM(CASE WHEN kind = 'complaint' THEN 1 ELSE 0 END)
      OVER (PARTITION BY customer ORDER BY happened_on) AS complaints_so_far
  FROM events
)
SELECT customer, happened_on,
  ROW_NUMBER() OVER (PARTITION BY customer, complaints_so_far ORDER BY happened_on) AS orders_since_complaint,
  CASE WHEN complaints_so_far > 0 THEN 'yes' ELSE 'no' END AS after_complaint
FROM stretches
WHERE kind = 'order'
ORDER BY customer, happened_on;
```

## Expected result

| customer | happened_on | orders_since_complaint | after_complaint |
| --- | --- | --- | --- |
| c1 | 2025-03-01 | 1 | no |
| c1 | 2025-03-03 | 2 | no |
| c1 | 2025-03-06 | 1 | yes |
| c1 | 2025-03-09 | 2 | yes |
| c1 | 2025-03-12 | 1 | yes |
| c2 | 2025-03-02 | 1 | no |
| c2 | 2025-03-05 | 2 | no |
| c3 | 2025-03-07 | 1 | yes |

## Explanation

A running count of the "reset" events turns a timeline into stretches: every row between two complaints shares the same count. Numbering rows within each stretch then restarts the counter at every complaint. This is the general pattern for "since the last X" questions, such as orders since the last discount or days since the last incident.

The filter `WHERE kind = 'order'` is applied **after** the stretches are computed (window functions in the outer query run after its `WHERE`), so complaints still define the stretches but are not counted as orders.

**Common mistake:** numbering all events, including complaints, so c1's first order after a complaint shows 2 instead of 1.

## Wrong answers

Feedback: incorrect-output

```sql
WITH events(customer, happened_on, kind) AS ( VALUES ('c1', '2025-03-01', 'order'), ('c1', '2025-03-03', 'order'), ('c1', '2025-03-04', 'complaint'), ('c1', '2025-03-06', 'order'), ('c1', '2025-03-09', 'order'), ('c1', '2025-03-10', 'complaint'), ('c1', '2025-03-12', 'order'), ('c2', '2025-03-02', 'order'), ('c2', '2025-03-05', 'order'), ('c3', '2025-03-01', 'complaint'), ('c3', '2025-03-07', 'order') ), stretches AS (SELECT customer, happened_on, kind, SUM(CASE WHEN kind = 'complaint' THEN 1 ELSE 0 END) OVER (PARTITION BY customer ORDER BY happened_on) AS complaints_so_far, ROW_NUMBER() OVER (PARTITION BY customer ORDER BY happened_on) AS n FROM events), numbered AS (SELECT customer, happened_on, kind, complaints_so_far, n - MIN(n) OVER (PARTITION BY customer, complaints_so_far) + 1 AS orders_since_complaint FROM stretches) SELECT customer, happened_on, orders_since_complaint, CASE WHEN complaints_so_far > 0 THEN 'yes' ELSE 'no' END AS after_complaint FROM numbered WHERE kind = 'order' ORDER BY customer, happened_on;
```
