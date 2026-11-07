---
id: null-handling
title: Missing values
module: data-analyst
order: 5
level: intermediate
duration: 30
summary: Find, count and replace missing values, and avoid the NULL traps that silently change an analysis.
objectives:
  - Find missing values with IS NULL and IS NOT NULL
  - Explain how NULL behaves in comparisons, counts and averages
  - Replace missing values with COALESCE
  - Show zero instead of nothing for rows without data after a LEFT JOIN
---

Real data has gaps. A customer skips the "city" field, an author's birth year is unknown, a customer has not ordered yet. SQL marks a missing value as `NULL`, meaning "unknown". `NULL` is not zero and not an empty string, and it behaves differently from every other value. Most wrong numbers in analysis come from forgetting that.

## Why analysts use this

Before trusting any result, an analyst checks for missing data: how many rows have no city? Does the average ignore unknown values? Did the report leave out customers with no orders, when it should show them with 0?

Handling `NULL` correctly means:

- **counting** what is missing, so you know how complete the data is,
- **deciding** what a missing value should mean in this report ("Unknown", 0, or leave it out),
- **avoiding** filters and joins that drop rows without anyone noticing.

## Syntax

```sql syntax
WHERE column IS NULL
WHERE column IS NOT NULL
COALESCE(column, value_if_null)
COUNT(*)          -- counts every row
COUNT(column)     -- counts rows where column is not NULL
```

- `= NULL` never matches anything, not even `NULL`. Always use `IS NULL`.
- `COALESCE(a, b, ...)` returns the first value that is not `NULL`.
- Aggregates such as `SUM`, `AVG`, `MIN`, `MAX` and `COUNT(column)` skip `NULL` values.

## Examples

### Find the missing values

Which customers have not given a city?

```sql
SELECT name, city
FROM customers
WHERE city IS NULL;
```

Expected output:

| name | city |
| --- | --- |
| Sofia Rossi | NULL |

### Measure how complete a column is

`COUNT(*)` counts rows; `COUNT(city)` counts only rows with a city. The difference is the number of missing values:

```sql
SELECT COUNT(*) AS customers,
  COUNT(city) AS with_city,
  COUNT(*) - COUNT(city) AS missing_city
FROM customers;
```

| customers | with_city | missing_city |
| --- | --- | --- |
| 5 | 4 | 1 |

### Replace a missing value for a report

`COALESCE` gives missing cities a readable label. Grouping then shows the unknown group explicitly instead of a blank:

```sql
SELECT COALESCE(city, 'Unknown') AS city, COUNT(*) AS customers
FROM customers
GROUP BY COALESCE(city, 'Unknown')
ORDER BY customers DESC, city;
```

| city | customers |
| --- | --- |
| Bangalore | 2 |
| Chennai | 1 |
| Mumbai | 1 |
| Unknown | 1 |

### Averages skip NULL

Ana Ruiz's birth year is unknown. `AVG(born)` averages the 5 known years and does not count her as 0:

```sql
SELECT COUNT(*) AS authors, COUNT(born) AS known_years, ROUND(AVG(born), 1) AS average_birth_year
FROM authors;
```

| authors | known_years | average_birth_year |
| --- | --- | --- |
| 6 | 5 | 1979.6 |

This is usually what you want, but say so in the report: "average of the 5 authors with a known birth year".

### Show 0 instead of nothing

After a `LEFT JOIN`, a customer with no orders has `NULL` in every order column, so their total is `NULL`, not 0. `COALESCE` turns it into 0:

```sql
SELECT c.name,
  COALESCE(ROUND(SUM(oi.quantity * oi.unit_price), 2), 0) AS total_ordered
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
LEFT JOIN order_items AS oi ON oi.order_id = o.id
GROUP BY c.name
ORDER BY total_ordered DESC, c.name;
```

| name | total_ordered |
| --- | --- |
| Aisha Khan | 62.22 |
| Daniel Kim | 45.75 |
| Rahul Mehta | 25.49 |
| Sofia Rossi | 12.99 |
| Meera Pillai | 0 |

Meera Pillai has no orders, so her total would be `NULL` without `COALESCE`. Here every order counts, including the cancelled one, so Sofia Rossi shows 12.99.

## How the query runs

For the "show 0" query:

1. `LEFT JOIN orders` keeps every customer; Meera Pillai gets one row with `NULL` order columns.
2. `LEFT JOIN order_items` keeps those rows too; her `quantity` and `unit_price` are `NULL`.
3. `GROUP BY c.name` makes one group per customer. For Meera, `SUM` of only `NULL` values is `NULL`.
4. `COALESCE(..., 0)` replaces that `NULL` with 0, so the report shows every customer with a number.

## Common mistakes

**Writing = NULL.** A comparison with `NULL` is never true, so this query finds nothing even though one city is missing:

```sql
SELECT COUNT(*) AS customers_found
FROM customers
WHERE city = NULL;
```

| customers_found |
| --- |
| 0 |

Use `WHERE city IS NULL`.

**Losing NULL rows with NOT IN or <>.** "Customers not in Mumbai" should include the customer whose city is unknown, but a comparison with `NULL` is not true, so she is dropped:

```sql
SELECT name, city
FROM customers
WHERE city <> 'Mumbai'
ORDER BY name;
```

| name | city |
| --- | --- |
| Aisha Khan | Bangalore |
| Daniel Kim | Bangalore |
| Meera Pillai | Chennai |

Sofia Rossi is missing. If unknown values belong in the result, say so: `WHERE city <> 'Mumbai' OR city IS NULL`.

**Treating NULL as 0 in averages, or 0 as NULL.** Replacing `NULL` with 0 before averaging (`AVG(COALESCE(born, 0))`) pulls the average down with values that never existed. Only replace `NULL` when the replacement is true for the business: a customer with no orders really did spend 0; an author with no recorded birth year was not born in year 0.

## Key takeaways

- `NULL` means unknown. It is not 0 and not an empty string.
- Use `IS NULL` and `IS NOT NULL`; `= NULL` never matches.
- `COUNT(*)` counts rows, `COUNT(column)` counts known values; the difference is what is missing.
- Aggregates skip `NULL`. `COALESCE(value, replacement)` fills gaps for display, or turns "no data" into 0 where 0 is the true answer.
- Conditions such as `<>` and `NOT IN` silently drop rows with `NULL`. Decide whether those rows belong in the result.
