---
id: da-day-310
title: Searches that found nothing
order: 310
difficulty: intermediate
topic: E-commerce
summary: Normalise search terms and rank the most frequent searches that returned no results.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Normalise text before counting
  - Report a rate with its main drivers
prerequisites:
  - Day 211
  - Day 182
---

## Task

Site searches are logged with the number of results (starter query). Normalise each term (trim and lower-case) so that `'Kindle Case'` and `'kindle case'` count together. Report the overall **zero-result rate** and the terms behind it.

Return one row per normalised term that **ever** returned 0 results: `term`, `searches` and `share_of_zero_pct` (its share of all zero-result searches, rounded to 1 decimal place), sorted by `searches` from most, then `term`. Add a final row `term` = `'all searches'` with the total searches in `searches` and the zero-result rate (zero-result searches ÷ all searches × 100) in `share_of_zero_pct`.

## Starter query

```sql
WITH searches(search_id, term, results) AS (
  VALUES
    (1, 'Harry Potter', 12), (2, 'harry potter ', 12), (3, 'sql for analysts', 4), (4, 'kindle case', 0), (5, 'Kindle Case', 0),
    (6, 'bookmark', 9), (7, 'kindle case', 0), (8, 'tamil novels', 0), (9, 'Tamil novels', 0), (10, 'gift card', 2),
    (11, 'colouring book', 0), (12, 'bookmark', 9)
)
SELECT search_id, term, results
FROM searches
ORDER BY search_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Normalise in a CTE: `LOWER(TRIM(term))`. Zero-result terms: `GROUP BY` the normalised term with `WHERE results = 0`.
3. Add the summary with `UNION ALL` and a sort key, wrapping the union in a subquery so you can sort by expressions.

## Solution

```sql
WITH searches(search_id, term, results) AS (
  VALUES
    (1, 'Harry Potter', 12), (2, 'harry potter ', 12), (3, 'sql for analysts', 4), (4, 'kindle case', 0), (5, 'Kindle Case', 0),
    (6, 'bookmark', 9), (7, 'kindle case', 0), (8, 'tamil novels', 0), (9, 'Tamil novels', 0), (10, 'gift card', 2),
    (11, 'colouring book', 0), (12, 'bookmark', 9)
),
normalised AS (
  SELECT LOWER(TRIM(term)) AS term, results FROM searches
),
report AS (
  SELECT 0 AS sort_key, term, COUNT(*) AS searches,
    100.0 * COUNT(*) / (SELECT COUNT(*) FROM normalised WHERE results = 0) AS share
  FROM normalised
  WHERE results = 0
  GROUP BY term
  UNION ALL
  SELECT 1, 'all searches', COUNT(*), 100.0 * SUM(results = 0) / COUNT(*) FROM normalised
)
SELECT term, searches, ROUND(share, 1) AS share_of_zero_pct
FROM report
ORDER BY sort_key, searches DESC, term;
```

## Expected result

| term | searches | share_of_zero_pct |
| --- | --- | --- |
| kindle case | 3 | 50 |
| tamil novels | 2 | 33.3 |
| colouring book | 1 | 16.7 |
| all searches | 12 | 50 |

## Explanation

Half of all searches (6 of 12) found nothing, and three normalised terms explain all of them: people want Kindle cases, Tamil novels and colouring books, which the shop does not stock or does not tag. That is a product and merchandising finding, not just a search one.

Normalising matters: `'Kindle Case'` and `'kindle case'` are the same need, and counting them separately would split the biggest gap into smaller ones and lower it in the ranking. The same applies to `'harry potter '` with its trailing space, which found results either way.

**Common mistake:** counting raw terms. Kindle cases appear as two terms with 2 and 1 searches, and Tamil novels as two terms with 1 each, so the ranking no longer shows which gaps matter most.

## Wrong answers

Feedback: incorrect-output

```sql
WITH searches(search_id, term, results) AS ( VALUES (1, 'Harry Potter', 12), (2, 'harry potter ', 12), (3, 'sql for analysts', 4), (4, 'kindle case', 0), (5, 'Kindle Case', 0), (6, 'bookmark', 9), (7, 'kindle case', 0), (8, 'tamil novels', 0), (9, 'Tamil novels', 0), (10, 'gift card', 2), (11, 'colouring book', 0), (12, 'bookmark', 9) ), report AS (SELECT 0 AS sort_key, term, COUNT(*) AS searches, 100.0 * COUNT(*) / (SELECT COUNT(*) FROM searches WHERE results = 0) AS share FROM searches WHERE results = 0 GROUP BY term UNION ALL SELECT 1, 'all searches', COUNT(*), 100.0 * SUM(results = 0) / COUNT(*) FROM searches) SELECT term, searches, ROUND(share, 1) AS share_of_zero_pct FROM report ORDER BY sort_key, searches DESC, term;
```
