---
id: da-day-173
title: Page through results without OFFSET
order: 173
difficulty: advanced
topic: Query performance
summary: Fetch the next page with a keyset (seek) condition that handles ties on the sort column.
module: data-analyst
duration: 13
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Paginate with a keyset condition
  - Break ties with a unique column
prerequisites:
  - Day 101
  - Day 8
---

## Task

A product list (in the starter query) is shown 3 at a time, sorted by `price` from highest to lowest and then by `id`. The app remembers the last row it showed: page 2 ended with the product with **price 15.00 and id 6**. Fetch **page 3** with a keyset condition (rows that come after that cursor in the sort order) instead of `OFFSET`.

Return `id`, `name` and `price`, in the list's order.

## Starter query

```sql
WITH catalogue(id, name, price) AS (
  VALUES
    (1, 'Atlas', 30.00), (2, 'Beacon', 25.00), (3, 'Comet', 25.00), (4, 'Delta', 20.00), (5, 'Ember', 18.00),
    (6, 'Fable', 15.00), (7, 'Garnet', 15.00), (8, 'Harbor', 9.50), (9, 'Indigo', 12.00), (10, 'Juniper', 15.00),
    (11, 'Kestrel', 15.00)
)
SELECT id, name, price
FROM catalogue
ORDER BY price DESC, id
LIMIT 6;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. "After the cursor" in this order means a lower price, **or** the same price with a higher id.
3. `WHERE price < 15.00 OR (price = 15.00 AND id > 6) ORDER BY price DESC, id LIMIT 3`.

## Solution

```sql
WITH catalogue(id, name, price) AS (
  VALUES
    (1, 'Atlas', 30.00), (2, 'Beacon', 25.00), (3, 'Comet', 25.00), (4, 'Delta', 20.00), (5, 'Ember', 18.00),
    (6, 'Fable', 15.00), (7, 'Garnet', 15.00), (8, 'Harbor', 9.50), (9, 'Indigo', 12.00), (10, 'Juniper', 15.00),
    (11, 'Kestrel', 15.00)
)
SELECT id, name, price
FROM catalogue
WHERE price < 15.00 OR (price = 15.00 AND id > 6)
ORDER BY price DESC, id
LIMIT 3;
```

## Expected result

| id | name | price |
| --- | --- | --- |
| 7 | Garnet | 15 |
| 10 | Juniper | 15 |
| 11 | Kestrel | 15 |

## Explanation

`OFFSET 6` returns the right rows here, but on a large table the database must read and discard every earlier row on every page, and if rows are added while someone pages, items repeat or go missing. **Keyset pagination** remembers where the last page ended and seeks straight to the next row, which an index on `(price, id)` makes instant whatever the page number.

The cursor must include a unique tie-breaker. Four products cost 15.00, and page 2 ended part-way through them. `price < 15.00` alone would skip Garnet, Juniper and Kestrel entirely and jump to Indigo at 12.00.

**Common mistake:** a cursor on the price only, which skips or repeats rows whenever a page ends inside a group of equal prices.

## Wrong answers

Feedback: incorrect-output

```sql
WITH catalogue(id, name, price) AS ( VALUES (1, 'Atlas', 30.00), (2, 'Beacon', 25.00), (3, 'Comet', 25.00), (4, 'Delta', 20.00), (5, 'Ember', 18.00), (6, 'Fable', 15.00), (7, 'Garnet', 15.00), (8, 'Harbor', 9.50), (9, 'Indigo', 12.00), (10, 'Juniper', 15.00), (11, 'Kestrel', 15.00) ) SELECT id, name, price FROM catalogue WHERE price < 15.00 ORDER BY price DESC, id LIMIT 3;
```

Feedback: incorrect-output

```sql
WITH catalogue(id, name, price) AS ( VALUES (1, 'Atlas', 30.00), (2, 'Beacon', 25.00), (3, 'Comet', 25.00), (4, 'Delta', 20.00), (5, 'Ember', 18.00), (6, 'Fable', 15.00), (7, 'Garnet', 15.00), (8, 'Harbor', 9.50), (9, 'Indigo', 12.00), (10, 'Juniper', 15.00), (11, 'Kestrel', 15.00) ) SELECT id, name, price FROM catalogue WHERE price < 15.00 OR (price = 15.00 AND id >= 6) ORDER BY price DESC, id LIMIT 3;
```
