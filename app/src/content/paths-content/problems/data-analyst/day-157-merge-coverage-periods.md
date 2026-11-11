---
id: da-day-157
title: Merge overlapping coverage periods
order: 157
difficulty: advanced
topic: Temporal analysis
summary: Pack overlapping and adjacent date ranges into continuous periods with a running maximum.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Merge overlapping and adjacent ranges
  - Use a running maximum to define islands
prerequisites:
  - Day 103
  - Day 141
---

## Task

Customers can hold several insurance policies (in the starter query); `starts` and `ends` are both included. Underwriting needs each customer's **continuous coverage**: policies that overlap, sit inside each other, or follow on the very next day form one period.

Return `customer`, `covered_from`, `covered_to` and `days` (calendar days in the period, both ends included). Sort by `customer`, then `covered_from`.

## Starter query

```sql
WITH policies(customer, starts, ends) AS (
  VALUES
    ('c1', '2025-01-01', '2025-01-31'), ('c1', '2025-02-01', '2025-02-28'), ('c1', '2025-03-10', '2025-03-31'),
    ('c2', '2025-01-01', '2025-03-31'), ('c2', '2025-02-01', '2025-02-15'), ('c2', '2025-04-01', '2025-04-30'),
    ('c3', '2025-01-05', '2025-01-20'), ('c3', '2025-01-10', '2025-02-10'), ('c3', '2025-01-15', '2025-01-25')
)
SELECT customer, starts, ends
FROM policies
ORDER BY customer, starts;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Sort each customer's policies by `starts`. The latest end seen so far **before** the current row is `MAX(ends) OVER (PARTITION BY customer ORDER BY starts, ends ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)`.
3. A policy starts a new period when there is no earlier policy or it starts after `date(previous_max_end, '+1 day')`. A running `SUM` of those starts numbers the periods; group by customer and period with `MIN(starts)` and `MAX(ends)`.

## Solution

```sql
WITH policies(customer, starts, ends) AS (
  VALUES
    ('c1', '2025-01-01', '2025-01-31'), ('c1', '2025-02-01', '2025-02-28'), ('c1', '2025-03-10', '2025-03-31'),
    ('c2', '2025-01-01', '2025-03-31'), ('c2', '2025-02-01', '2025-02-15'), ('c2', '2025-04-01', '2025-04-30'),
    ('c3', '2025-01-05', '2025-01-20'), ('c3', '2025-01-10', '2025-02-10'), ('c3', '2025-01-15', '2025-01-25')
),
ordered AS (
  SELECT customer, starts, ends,
    MAX(ends) OVER (PARTITION BY customer ORDER BY starts, ends ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS previous_max_end
  FROM policies
),
flagged AS (
  SELECT customer, starts, ends,
    CASE WHEN previous_max_end IS NULL OR starts > date(previous_max_end, '+1 day') THEN 1 ELSE 0 END AS new_period
  FROM ordered
),
numbered AS (
  SELECT customer, starts, ends,
    SUM(new_period) OVER (PARTITION BY customer ORDER BY starts, ends) AS period
  FROM flagged
)
SELECT customer, MIN(starts) AS covered_from, MAX(ends) AS covered_to,
  CAST(julianday(MAX(ends)) - julianday(MIN(starts)) + 1 AS INTEGER) AS days
FROM numbered
GROUP BY customer, period
ORDER BY customer, covered_from;
```

## Expected result

| customer | covered_from | covered_to | days |
| --- | --- | --- | --- |
| c1 | 2025-01-01 | 2025-02-28 | 59 |
| c1 | 2025-03-10 | 2025-03-31 | 22 |
| c2 | 2025-01-01 | 2025-04-30 | 120 |
| c3 | 2025-01-05 | 2025-02-10 | 37 |

## Explanation

Interval packing is a "gaps and islands" problem on ranges. The key is comparing each policy with the **latest end of all earlier policies**, not just the previous row: c2's short February policy sits inside the long first policy, and the April policy follows the March end, not February's.

c1's January and February policies are adjacent (31 January, then 1 February), so they merge; the March policy starts after a gap and stays separate. c3's three overlapping policies collapse into 5 January to 10 February.

**Common mistake:** comparing with `LAG(ends)`, the previous row only. c2's April policy is then compared with 15 February, looks like a new period, and the customer appears to have had a gap that never existed.

## Wrong answers

Feedback: incorrect-output

```sql
WITH policies(customer, starts, ends) AS ( VALUES ('c1', '2025-01-01', '2025-01-31'), ('c1', '2025-02-01', '2025-02-28'), ('c1', '2025-03-10', '2025-03-31'), ('c2', '2025-01-01', '2025-03-31'), ('c2', '2025-02-01', '2025-02-15'), ('c2', '2025-04-01', '2025-04-30'), ('c3', '2025-01-05', '2025-01-20'), ('c3', '2025-01-10', '2025-02-10'), ('c3', '2025-01-15', '2025-01-25') ), ordered AS (SELECT customer, starts, ends, LAG(ends) OVER (PARTITION BY customer ORDER BY starts, ends) AS previous_max_end FROM policies), flagged AS (SELECT customer, starts, ends, CASE WHEN previous_max_end IS NULL OR starts > date(previous_max_end, '+1 day') THEN 1 ELSE 0 END AS new_period FROM ordered), numbered AS (SELECT customer, starts, ends, SUM(new_period) OVER (PARTITION BY customer ORDER BY starts, ends) AS period FROM flagged) SELECT customer, MIN(starts) AS covered_from, MAX(ends) AS covered_to, CAST(julianday(MAX(ends)) - julianday(MIN(starts)) + 1 AS INTEGER) AS days FROM numbered GROUP BY customer, period ORDER BY customer, covered_from;
```
