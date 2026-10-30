---
id: bestselling-books
title: Bestselling books
order: 14
difficulty: advanced
topic: Multi-table joins
summary: Join books, order items and orders to count the copies sold of every book.
duration: 12
dataset: bookstore
tables:
  - books
  - order_items
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Join three tables in one query
  - Filter on a column from a joined table
  - Sort by two columns to break ties
prerequisites:
  - INNER JOIN (see the challenge "Where do the authors come from?")
  - GROUP BY and SUM (see the challenge "Count the books in each genre")
---

## Task

Find out which books sell best. For every book that has been sold, return:

- `title`
- `copies_sold`: the total `quantity` of the book across all orders that were **not cancelled**

Sort by `copies_sold` from highest to lowest, and books with the same number of copies by `title` from A to Z. Row order matters.

The quantity of each book in an order is in `order_items`. Whether an order was cancelled is in `orders.status`.

## Starter query

```sql
SELECT book_id, quantity
FROM order_items;
```

## Hints

1. You need three tables: `order_items` for quantities, `books` for titles and `orders` for the status.
2. Join `books` on `books.id = order_items.book_id` and `orders` on `orders.id = order_items.order_id`, then filter with `WHERE orders.status <> 'cancelled'`.
3. Group by book, add up the quantities with `SUM(quantity) AS copies_sold`, and finish with `ORDER BY copies_sold DESC, title`.

## Solution

```sql
SELECT b.title, SUM(i.quantity) AS copies_sold
FROM order_items AS i
JOIN books AS b ON b.id = i.book_id
JOIN orders AS o ON o.id = i.order_id
WHERE o.status <> 'cancelled'
GROUP BY b.id, b.title
ORDER BY copies_sold DESC, b.title;
```

## Expected result

| title | copies_sold |
| --- | --- |
| Counting Stars | 3 |
| Rivers of Glass | 3 |
| A Quiet Ledger | 1 |
| Paper Lanterns | 1 |
| The Last Signal | 1 |
| The Silent Orchard | 1 |

## Explanation

Each `order_items` row is joined to its book and its order. The `WHERE` clause removes items from the cancelled order before grouping, so they are not counted. *The Silent Orchard* appears in two orders, but one was cancelled, so it has sold one copy.

The second sort column, `title`, decides the order of books with equal sales. Without it, the order of tied rows is not guaranteed.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT b.title, SUM(i.quantity) AS copies_sold FROM order_items AS i JOIN books AS b ON b.id = i.book_id GROUP BY b.id ORDER BY copies_sold DESC, b.title;
```

Feedback: wrong-order

```sql
SELECT b.title, SUM(i.quantity) AS copies_sold FROM order_items AS i JOIN books AS b ON b.id = i.book_id JOIN orders AS o ON o.id = i.order_id WHERE o.status <> 'cancelled' GROUP BY b.id ORDER BY copies_sold DESC, b.title DESC;
```
