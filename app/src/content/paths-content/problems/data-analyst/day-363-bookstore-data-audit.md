---
id: da-day-363
title: Case study: a data quality audit of the bookstore
order: 363
difficulty: advanced
topic: Case studies
summary: Run eight checks across the bookstore tables and report each check's result in one table.
module: data-analyst
duration: 16
dataset: bookstore
tables:
  - books
  - authors
  - customers
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Combine many checks into one report
  - Use NOT EXISTS for missing records
prerequisites:
  - Day 198
  - Day 86
---

## Task

Before the annual report, audit the bookstore data. Run these checks and return one row per check with `check_name`, `failing_rows` and `status` (`'pass'` when 0 rows fail, otherwise `'fail'`), in this order:

1. `books_without_author_record`: books whose author is not in `authors`,
2. `authors_without_books`: authors with no book,
3. `customers_missing_city`: customers with no city,
4. `customers_joined_after_today`: customers whose `joined` date is after 2025-03-31,
5. `orders_without_items`: orders with no order lines,
6. `order_lines_unknown_book`: order lines whose book does not exist,
7. `price_differs_from_list`: order lines whose `unit_price` differs from the book's list price,
8. `authors_missing_birth_year`: authors with no `born` value.

## Starter query

```sql
SELECT 'books' AS table_name, COUNT(*) AS rows FROM books
UNION ALL SELECT 'authors', COUNT(*) FROM authors
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items;
```

## Hints

1. Write each check as a one-row `SELECT` with a check number, a name and a count, using `NOT EXISTS` (or `LEFT JOIN ... IS NULL`) for the missing-record checks, and stack them with `UNION ALL`.
2. Wrap the union in a subquery to sort by the check number and add the status with `CASE WHEN failing_rows = 0`.
3. For the price check, join order lines to books and compare `oi.unit_price <> b.price`.

## Solution

```sql
SELECT check_name, failing_rows, CASE WHEN failing_rows = 0 THEN 'pass' ELSE 'fail' END AS status
FROM (
  SELECT 1 AS check_no, 'books_without_author_record' AS check_name,
    (SELECT COUNT(*) FROM books AS b WHERE NOT EXISTS (SELECT 1 FROM authors AS a WHERE a.name = b.author)) AS failing_rows
  UNION ALL SELECT 2, 'authors_without_books',
    (SELECT COUNT(*) FROM authors AS a WHERE NOT EXISTS (SELECT 1 FROM books AS b WHERE b.author = a.name))
  UNION ALL SELECT 3, 'customers_missing_city', (SELECT COUNT(*) FROM customers WHERE city IS NULL)
  UNION ALL SELECT 4, 'customers_joined_after_today', (SELECT COUNT(*) FROM customers WHERE joined > '2025-03-31')
  UNION ALL SELECT 5, 'orders_without_items',
    (SELECT COUNT(*) FROM orders AS o WHERE NOT EXISTS (SELECT 1 FROM order_items AS oi WHERE oi.order_id = o.id))
  UNION ALL SELECT 6, 'order_lines_unknown_book',
    (SELECT COUNT(*) FROM order_items AS oi WHERE NOT EXISTS (SELECT 1 FROM books AS b WHERE b.id = oi.book_id))
  UNION ALL SELECT 7, 'price_differs_from_list',
    (SELECT COUNT(*) FROM order_items AS oi JOIN books AS b ON b.id = oi.book_id WHERE oi.unit_price <> b.price)
  UNION ALL SELECT 8, 'authors_missing_birth_year', (SELECT COUNT(*) FROM authors WHERE born IS NULL)
)
ORDER BY check_no;
```

## Expected result

| check_name | failing_rows | status |
| --- | --- | --- |
| books_without_author_record | 0 | pass |
| authors_without_books | 1 | fail |
| customers_missing_city | 1 | fail |
| customers_joined_after_today | 1 | fail |
| orders_without_items | 0 | pass |
| order_lines_unknown_book | 0 | pass |
| price_differs_from_list | 0 | pass |
| authors_missing_birth_year | 1 | fail |

## Explanation

A data quality audit is a list of checks, each reduced to a count of failing rows. Stacking one-row `SELECT`s with `UNION ALL` produces a report that is easy to run every day: four checks fail, and each failure is something the course has met before. Leo Brandt has no books, Sofia has no city, Meera's join date is in the future, and Ana Ruiz has no birth year.

`NOT EXISTS` is the safe way to find missing records: `NOT IN` returns nothing at all when the subquery contains a `NULL`, a trap that can make a check pass silently. Every order has items, every order line points to a real book, and every price matches the list price.

**Common mistake:** counting with `COUNT(column)` on the column being checked for `NULL`. `COUNT(city)` skips `NULL`s, so a check for missing cities always reports 0 and passes.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT check_name, failing_rows, CASE WHEN failing_rows = 0 THEN 'pass' ELSE 'fail' END AS status FROM ( SELECT 1 AS check_no, 'books_without_author_record' AS check_name, (SELECT COUNT(*) FROM books WHERE author NOT IN (SELECT name FROM authors)) AS failing_rows UNION ALL SELECT 2, 'authors_without_books', (SELECT COUNT(*) FROM authors WHERE name NOT IN (SELECT author FROM books)) UNION ALL SELECT 3, 'customers_missing_city', (SELECT COUNT(city) FROM customers WHERE city IS NULL) UNION ALL SELECT 4, 'customers_joined_after_today', (SELECT COUNT(*) FROM customers WHERE joined > '2025-03-31') UNION ALL SELECT 5, 'orders_without_items', (SELECT COUNT(*) FROM orders AS o WHERE NOT EXISTS (SELECT 1 FROM order_items AS oi WHERE oi.order_id = o.id)) UNION ALL SELECT 6, 'order_lines_unknown_book', (SELECT COUNT(*) FROM order_items AS oi WHERE NOT EXISTS (SELECT 1 FROM books AS b WHERE b.id = oi.book_id)) UNION ALL SELECT 7, 'price_differs_from_list', (SELECT COUNT(*) FROM order_items AS oi JOIN books AS b ON b.id = oi.book_id WHERE oi.unit_price <> b.price) UNION ALL SELECT 8, 'authors_missing_birth_year', (SELECT COUNT(born) FROM authors WHERE born IS NULL)) ORDER BY check_no;
```
