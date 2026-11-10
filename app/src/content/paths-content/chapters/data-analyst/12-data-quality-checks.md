---
id: data-quality-checks
title: Data quality checks
module: data-analyst
order: 12
level: advanced
duration: 40
summary: Find duplicates, missing values, broken links between tables and impossible values before they reach a report.
objectives:
  - Write checks that return the problem rows, so that an empty result means the check passed
  - Find duplicate keys and duplicate records
  - Find missing values, rows that point to nothing, and values that are impossible or badly formatted
  - Combine several checks into a one-row summary for a quick health report
---

A report is only as good as its data. A customer imported twice doubles their spend; an order line that points to a deleted book disappears from a join; a date typed as `2026-13-01` breaks every monthly chart. Experienced analysts check the data **before** they analyse it, and they write those checks as queries so they can run them again every time new data arrives.

## Why analysts use this

Data problems are common: imports run twice, systems change formats, people type into free-text fields. Finding them early is cheap; finding them after a number has gone to leadership is expensive. Each kind of check answers one question:

| Check | Question |
| --- | --- |
| Duplicates | Does any key or record appear more than once? |
| Completeness | Are required values missing (`NULL` or blank)? |
| Referential integrity | Does every reference point to a row that exists? |
| Validity | Are values in a possible range and format? |
| Reconciliation | Do totals agree with another source? |

A useful convention: **write each check so it returns the problem rows**. An empty result then means the check passed, and any row it returns is something to fix or explain.

## Syntax

```sql syntax
-- Duplicate keys
SELECT key_column, COUNT(*) FROM t GROUP BY key_column HAVING COUNT(*) > 1;

-- Missing or blank text
SELECT * FROM t WHERE column IS NULL OR TRIM(column) = '';

-- References that point to nothing
SELECT child.* FROM child LEFT JOIN parent ON parent.id = child.parent_id WHERE parent.id IS NULL;

-- Impossible values
SELECT * FROM t WHERE quantity <= 0 OR price < 0;

-- Dates that are not real dates: date() returns NULL for them
SELECT * FROM t WHERE date(date_column) IS NULL;
```

- `TRIM(text)` removes spaces at both ends, so `TRIM(name) = ''` also catches names made only of spaces.
- `date(value)` returns the date in `YYYY-MM-DD` form, or `NULL` if SQLite cannot read the value as a valid date (month 13, or a format such as `05/07/2025`). Checking `date(value) <> value` as well catches values that are dates but not in the expected form, such as `2025-07-05 10:30`.
- A check can count problems instead of listing them: `SELECT COUNT(*) AS problems FROM ... WHERE ...`.

## Examples

The examples check a batch of new customers waiting to be loaded. The batch is written in each query with `WITH`, as it would arrive from another system.

### Look at the batch

```sql
WITH new_customers(id, name, city, joined) AS (
  VALUES
    (6, 'Ivan Petrov', 'Pune', '2025-07-02'),
    (7, 'Lena Moreau', NULL, '2025-07-05'),
    (8, 'Ivan Petrov', 'Pune', '2025-07-02'),
    (9, 'Kofi Mensah', 'Delhi', '2026-13-01'),
    (2, 'Rahul Mehta', 'Mumbai', '2024-03-02'),
    (10, '', 'Goa', '2025-07-09'),
    (11, 'Asha Rao', 'Kochi', '05/07/2025')
)
SELECT * FROM new_customers;
```

Expected output:

| id | name | city | joined |
| --- | --- | --- | --- |
| 6 | Ivan Petrov | Pune | 2025-07-02 |
| 7 | Lena Moreau | NULL | 2025-07-05 |
| 8 | Ivan Petrov | Pune | 2025-07-02 |
| 9 | Kofi Mensah | Delhi | 2026-13-01 |
| 2 | Rahul Mehta | Mumbai | 2024-03-02 |
| 10 |  | Goa | 2025-07-09 |
| 11 | Asha Rao | Kochi | 05/07/2025 |

Seven rows, and several of them have problems. The following checks find each one.

### Duplicate records

The same person can arrive twice with different ids. Group by the columns that describe the person:

```sql
WITH new_customers(id, name, city, joined) AS (
  VALUES
    (6, 'Ivan Petrov', 'Pune', '2025-07-02'),
    (7, 'Lena Moreau', NULL, '2025-07-05'),
    (8, 'Ivan Petrov', 'Pune', '2025-07-02'),
    (9, 'Kofi Mensah', 'Delhi', '2026-13-01'),
    (2, 'Rahul Mehta', 'Mumbai', '2024-03-02'),
    (10, '', 'Goa', '2025-07-09'),
    (11, 'Asha Rao', 'Kochi', '05/07/2025')
)
SELECT name, city, joined, COUNT(*) AS copies, GROUP_CONCAT(id) AS ids
FROM new_customers
GROUP BY name, city, joined
HAVING COUNT(*) > 1;
```

| name | city | joined | copies | ids |
| --- | --- | --- | --- | --- |
| Ivan Petrov | Pune | 2025-07-02 | 2 | 6,8 |

`GROUP_CONCAT(id)` lists the ids of each group in one text value, so the duplicate rows can be found again. Ivan Petrov arrived twice.

### Keys that already exist

Loading a row whose id is already taken would either fail or overwrite a real customer. Compare the batch with the table:

```sql
WITH new_customers(id, name, city, joined) AS (
  VALUES
    (6, 'Ivan Petrov', 'Pune', '2025-07-02'),
    (7, 'Lena Moreau', NULL, '2025-07-05'),
    (8, 'Ivan Petrov', 'Pune', '2025-07-02'),
    (9, 'Kofi Mensah', 'Delhi', '2026-13-01'),
    (2, 'Rahul Mehta', 'Mumbai', '2024-03-02'),
    (10, '', 'Goa', '2025-07-09'),
    (11, 'Asha Rao', 'Kochi', '05/07/2025')
)
SELECT n.id, n.name AS new_name, c.name AS existing_name
FROM new_customers AS n
JOIN customers AS c ON c.id = n.id;
```

| id | new_name | existing_name |
| --- | --- | --- |
| 2 | Rahul Mehta | Rahul Mehta |

Here the existing row is the same person, so the batch is resending old data; in other cases the id clash hides two different people.

### Blank names and invalid dates

```sql
WITH new_customers(id, name, city, joined) AS (
  VALUES
    (6, 'Ivan Petrov', 'Pune', '2025-07-02'),
    (7, 'Lena Moreau', NULL, '2025-07-05'),
    (8, 'Ivan Petrov', 'Pune', '2025-07-02'),
    (9, 'Kofi Mensah', 'Delhi', '2026-13-01'),
    (2, 'Rahul Mehta', 'Mumbai', '2024-03-02'),
    (10, '', 'Goa', '2025-07-09'),
    (11, 'Asha Rao', 'Kochi', '05/07/2025')
)
SELECT id, name, joined,
  CASE WHEN name IS NULL OR TRIM(name) = '' THEN 'blank name' ELSE 'invalid date' END AS problem
FROM new_customers
WHERE name IS NULL OR TRIM(name) = ''
   OR date(joined) IS NULL OR date(joined) <> joined
ORDER BY id;
```

| id | name | joined | problem |
| --- | --- | --- | --- |
| 9 | Kofi Mensah | 2026-13-01 | invalid date |
| 10 |  | 2025-07-09 | blank name |
| 11 | Asha Rao | 05/07/2025 | invalid date |

Row 9 has month 13, which `date()` rejects. Row 11 uses another format, `05/07/2025`, which `date()` cannot read either; it is also ambiguous (5 July or 7 May?), so it must be fixed at the source, not guessed. Row 10's name is empty. Because the check uses `TRIM(name) = ''`, it would also catch a name made only of spaces.

### References that point to nothing

The same idea applies to existing tables. Every order line should point to an existing order and an existing book. In the bookstore, both checks pass:

```sql
SELECT
  (SELECT COUNT(*) FROM order_items AS oi LEFT JOIN orders AS o ON o.id = oi.order_id WHERE o.id IS NULL) AS lines_without_order,
  (SELECT COUNT(*) FROM order_items AS oi LEFT JOIN books AS b ON b.id = oi.book_id WHERE b.id IS NULL) AS lines_without_book,
  (SELECT COUNT(*) FROM orders AS o WHERE NOT EXISTS (SELECT 1 FROM order_items AS oi WHERE oi.order_id = o.id)) AS orders_without_lines;
```

| lines_without_order | lines_without_book | orders_without_lines |
| --- | --- | --- |
| 0 | 0 | 0 |

Zeros are the result you want. Keeping such a query and running it after every data load turns a one-off investigation into a routine.

## How the query runs

For the blank-name and invalid-date check:

1. `new_customers` provides the seven rows.
2. `WHERE` keeps a row if its name is missing or blank, or if `date(joined)` is `NULL` (not a real date) or differs from `joined` (a real date written in another format).
3. `CASE` labels the reason, checking the name first.
4. `ORDER BY id` sorts the problem rows.

## Common mistakes

**Checking for blanks with `= NULL`.** Comparisons with `NULL` are never true, so this finds nothing even when names are missing:

```sql
SELECT COUNT(*) AS found FROM customers WHERE city = NULL;
```

| found |
| --- |
| 0 |

Use `IS NULL`.

**Treating spaces as a value.** `'  '` is not `NULL` and not `''`, but it is still a missing name. Use `TRIM`.

**Removing problem rows silently.** Filtering bad rows out of a report makes the report look clean while hiding a problem someone should fix. Report what was excluded and why.

**Checking only once.** A check run once proves the data was fine on that day. Save the checks and run them every time the data changes.

## Key takeaways

- Write checks that return the problem rows; an empty result means the check passed.
- Duplicates: `GROUP BY` the key or the describing columns with `HAVING COUNT(*) > 1`.
- Completeness: `IS NULL` and `TRIM(column) = ''`.
- Integrity: a `LEFT JOIN` with `IS NULL` finds references to nothing.
- Validity: range conditions for numbers, and `date(value)` to test dates.
- Summarise several checks in one row of counts for a quick health report.
