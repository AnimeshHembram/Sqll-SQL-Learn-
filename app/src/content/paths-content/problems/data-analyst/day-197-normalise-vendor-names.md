---
id: da-day-197
title: Find duplicate vendors behind messy names
order: 197
difficulty: intermediate
topic: Data quality
summary: Normalise company names step by step and group the records that turn out to be the same vendor.
module: data-analyst
duration: 13
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a normalised match key
  - Group candidate duplicates for review
prerequisites:
  - Day 68
  - Day 52
---

## Task

The vendor list (in the starter query) has the same companies typed differently. Build a **match key** for each name by applying, in order: lower case; trim spaces; replace `' & '` with `' and '`; remove `'.'` and `','`; remove a trailing `' pvt ltd'`, then a trailing `' ltd'`, then a trailing `' inc'`; trim again.

Return only keys shared by **two or more** vendors: `match_key`, `vendors` (count) and `ids` (vendor ids in ascending order, joined with `','`). Sort by `match_key`.

## Starter query

```sql
WITH vendors(id, name) AS (
  VALUES
    (1, 'Acme Traders Pvt Ltd'), (2, 'ACME TRADERS'), (3, ' acme traders pvt. ltd. '), (4, 'Bolt & Co'),
    (5, 'Bolt and Co.'), (6, 'Crest Ltd'), (7, 'Crestline Ltd'), (8, 'Delta Inc.')
)
SELECT id, name, lower(trim(name)) AS first_step
FROM vendors;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Chain the steps in CTEs so each one is readable: `lower(trim(name))`, then `replace(..., ' & ', ' and ')`, then `replace(replace(..., '.', ''), ',', '')`.
3. Remove a suffix only at the end: `CASE WHEN k LIKE '% pvt ltd' THEN substr(k, 1, length(k) - 8) ELSE k END`, then the same for `' ltd'` (4 characters) and `' inc'`. Group by the final key with `HAVING COUNT(*) >= 2`.

## Solution

```sql
WITH vendors(id, name) AS (
  VALUES
    (1, 'Acme Traders Pvt Ltd'), (2, 'ACME TRADERS'), (3, ' acme traders pvt. ltd. '), (4, 'Bolt & Co'),
    (5, 'Bolt and Co.'), (6, 'Crest Ltd'), (7, 'Crestline Ltd'), (8, 'Delta Inc.')
),
step1 AS (
  SELECT id, replace(replace(replace(lower(trim(name)), ' & ', ' and '), '.', ''), ',', '') AS k FROM vendors
),
step2 AS (
  SELECT id, CASE WHEN k LIKE '% pvt ltd' THEN substr(k, 1, length(k) - 8) ELSE k END AS k FROM step1
),
step3 AS (
  SELECT id, CASE WHEN k LIKE '% ltd' THEN substr(k, 1, length(k) - 4) ELSE k END AS k FROM step2
),
step4 AS (
  SELECT id, trim(CASE WHEN k LIKE '% inc' THEN substr(k, 1, length(k) - 4) ELSE k END) AS k FROM step3
)
SELECT k AS match_key, COUNT(*) AS vendors, group_concat(id, ',' ORDER BY id) AS ids
FROM step4
GROUP BY k
HAVING COUNT(*) >= 2
ORDER BY match_key;
```

## Expected result

| match_key | vendors | ids |
| --- | --- | --- |
| acme traders | 3 | 1,2,3 |
| bolt and co | 2 | 4,5 |

## Explanation

Duplicate master data (vendors, customers, products) splits spend and history across records. Exact matching misses almost everything; a **match key** built from explicit normalisation steps catches the common variations while staying explainable, which matters when someone has to approve each merge.

The order of steps matters. Dots must go before the suffix check, or `'pvt. ltd.'` never matches `' pvt ltd'`. Suffixes are removed only at the **end** of the name, so a company called "Ltd Logistics" would keep its name. "Crest Ltd" and "Crestline Ltd" stay apart: normalising is not fuzzy matching, and that is a feature here.

**Common mistake:** `replace(k, ' ltd', '')` anywhere in the name, which can damage names that contain the letters elsewhere and does not handle the `pvt` part first.

## Wrong answers

Feedback: missing-rows

```sql
WITH vendors(id, name) AS ( VALUES (1, 'Acme Traders Pvt Ltd'), (2, 'ACME TRADERS'), (3, ' acme traders pvt. ltd. '), (4, 'Bolt & Co'), (5, 'Bolt and Co.'), (6, 'Crest Ltd'), (7, 'Crestline Ltd'), (8, 'Delta Inc.') ), step1 AS (SELECT id, lower(trim(name)) AS k FROM vendors) SELECT k AS match_key, COUNT(*) AS vendors, group_concat(id, ',' ORDER BY id) AS ids FROM step1 GROUP BY k HAVING COUNT(*) >= 2 ORDER BY match_key;
```
