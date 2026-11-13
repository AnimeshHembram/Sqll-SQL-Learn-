---
id: da-day-258
title: Values outside the allowed lists
order: 258
difficulty: intermediate
topic: Data quality
summary: Check codes against reference lists, and suggest a fix when a value only differs in case or spaces.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Validate values against a reference list
  - Separate fixable from invalid values
prerequisites:
  - Day 72
  - Day 142
---

## Task

Order statuses and country codes must come from the reference lists in the starter query. List every order with at least one problem:

- `field` (`'status'` or `'country'`) and `value` (the bad value as stored, `NULL` shown as `NULL`),
- `issue`: `'missing'` when the value is `NULL`; `'fixable'` when trimming and changing case makes it a valid value; otherwise `'invalid'`,
- `suggestion`: the valid value for fixable rows, else `NULL`.

Return `id`, `field`, `value`, `issue` and `suggestion`, sorted by `id`, then `field`. An order with two problems has two rows.

## Starter query

```sql
WITH allowed_statuses(status) AS (
  VALUES ('pending'), ('paid'), ('shipped'), ('delivered'), ('cancelled')
),
orders(id, status, country) AS (
  VALUES
    (1, 'paid', 'IN'), (2, 'Paid', 'IN'), (3, 'shiped', 'IN'), (4, 'delivered', 'in'), (5, NULL, 'IN'),
    (6, 'cancelled', 'US'), (7, 'refunded', 'IN'), (8, 'DELIVERED', 'IN'), (9, 'pending', NULL)
),
allowed_countries(country) AS (
  VALUES ('IN'), ('US'), ('GB')
)
SELECT id, status, country
FROM orders
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Check each field separately and combine with `UNION ALL`. For status: `LEFT JOIN allowed_statuses AS a ON a.status = o.status` finds exact matches; a second `LEFT JOIN ... AS f ON f.status = LOWER(TRIM(o.status))` finds fixable ones. Keep rows with no exact match.
3. Countries are upper-case codes, so the fixable match is `UPPER(TRIM(o.country))`. The issue is `CASE WHEN value IS NULL THEN 'missing' WHEN fixed IS NOT NULL THEN 'fixable' ELSE 'invalid' END`.

## Solution

```sql
WITH allowed_statuses(status) AS (
  VALUES ('pending'), ('paid'), ('shipped'), ('delivered'), ('cancelled')
),
orders(id, status, country) AS (
  VALUES
    (1, 'paid', 'IN'), (2, 'Paid', 'IN'), (3, 'shiped', 'IN'), (4, 'delivered', 'in'), (5, NULL, 'IN'),
    (6, 'cancelled', 'US'), (7, 'refunded', 'IN'), (8, 'DELIVERED', 'IN'), (9, 'pending', NULL)
),
allowed_countries(country) AS (
  VALUES ('IN'), ('US'), ('GB')
),
status_issues AS (
  SELECT o.id, 'status' AS field, o.status AS value, f.status AS suggestion
  FROM orders AS o
  LEFT JOIN allowed_statuses AS a ON a.status = o.status
  LEFT JOIN allowed_statuses AS f ON f.status = LOWER(TRIM(o.status))
  WHERE a.status IS NULL
),
country_issues AS (
  SELECT o.id, 'country', o.country, f.country
  FROM orders AS o
  LEFT JOIN allowed_countries AS a ON a.country = o.country
  LEFT JOIN allowed_countries AS f ON f.country = UPPER(TRIM(o.country))
  WHERE a.country IS NULL
),
issues AS (
  SELECT * FROM status_issues
  UNION ALL
  SELECT * FROM country_issues
)
SELECT id, field, value,
  CASE WHEN value IS NULL THEN 'missing' WHEN suggestion IS NOT NULL THEN 'fixable' ELSE 'invalid' END AS issue,
  suggestion
FROM issues
ORDER BY id, field;
```

## Expected result

| id | field | value | issue | suggestion |
| --- | --- | --- | --- | --- |
| 2 | status | Paid | fixable | paid |
| 3 | status | shiped | invalid | NULL |
| 4 | country | in | fixable | IN |
| 5 | status | NULL | missing | NULL |
| 7 | status | refunded | invalid | NULL |
| 8 | status | DELIVERED | fixable | delivered |
| 9 | country | NULL | missing | NULL |

## Explanation

Checking against a reference list is an anti-join: values with no exact match in the list are problems. A second join on the cleaned value (`LOWER(TRIM(...))` for statuses, `UPPER(TRIM(...))` for country codes) separates the problems that can be fixed automatically, such as `Paid`, `DELIVERED` and `in`, from real errors such as `shiped` and `refunded`, which a person must decide about.

`NULL`s need their own label because they fail differently: a missing status has nothing to fix, and `NOT IN` with a `NULL` returns `NULL` rather than true, so it silently skips those rows. The `LEFT JOIN ... WHERE a.status IS NULL` pattern does catch them, which is why orders 5 and 9 appear as `'missing'`.

**Common mistake:** `WHERE status NOT IN (SELECT status FROM allowed_statuses)`. Rows with a `NULL` status or country are never returned, so the missing values drop out of the report.

## Wrong answers

Feedback: missing-rows

```sql
WITH allowed_statuses(status) AS ( VALUES ('pending'), ('paid'), ('shipped'), ('delivered'), ('cancelled') ), orders(id, status, country) AS ( VALUES (1, 'paid', 'IN'), (2, 'Paid', 'IN'), (3, 'shiped', 'IN'), (4, 'delivered', 'in'), (5, NULL, 'IN'), (6, 'cancelled', 'US'), (7, 'refunded', 'IN'), (8, 'DELIVERED', 'IN'), (9, 'pending', NULL) ), allowed_countries(country) AS ( VALUES ('IN'), ('US'), ('GB') ) SELECT o.id, 'status' AS field, o.status AS value, CASE WHEN o.status IS NULL THEN 'missing' WHEN f.status IS NOT NULL THEN 'fixable' ELSE 'invalid' END AS issue, f.status AS suggestion FROM orders AS o LEFT JOIN allowed_statuses AS f ON f.status = LOWER(TRIM(o.status)) WHERE o.status NOT IN (SELECT status FROM allowed_statuses) UNION ALL SELECT o.id, 'country', o.country, CASE WHEN o.country IS NULL THEN 'missing' WHEN f.country IS NOT NULL THEN 'fixable' ELSE 'invalid' END, f.country FROM orders AS o LEFT JOIN allowed_countries AS f ON f.country = UPPER(TRIM(o.country)) WHERE o.country NOT IN (SELECT country FROM allowed_countries) ORDER BY 1, 2;
```
