---
id: da-day-221
title: Compare every price with the latest one
order: 221
difficulty: intermediate
topic: Window functions
summary: Get each product's current price on every row, and learn why LAST_VALUE needs a frame clause.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Set a window frame explicitly
  - Use LAST_VALUE correctly
prerequisites:
  - Day 64
  - Day 104
---

## Task

For each product's monthly price (starter query), show the product's **latest** price on every row and how far each month's price was from it.

Return `product`, `month`, `price`, `latest_price` and `diff_from_latest` (`price − latest_price`). Sort by `product`, then `month`.

## Starter query

```sql
WITH prices(product, month, price) AS (
  VALUES
    ('Kettle', '2025-01', 1200), ('Kettle', '2025-02', 1150), ('Kettle', '2025-03', 1250),
    ('Toaster', '2025-01', 2200), ('Toaster', '2025-02', 2100),
    ('Mixer', '2025-02', 3400), ('Mixer', '2025-03', 3300), ('Mixer', '2025-04', 3500)
)
SELECT product, month, price
FROM prices
ORDER BY product, month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `LAST_VALUE(price) OVER (PARTITION BY product ORDER BY month)` looks right, but with `ORDER BY` the default frame ends at the current row, so it returns the current price.
3. Widen the frame to the whole partition: `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. (`FIRST_VALUE` with `ORDER BY month DESC` works too.)

## Solution

```sql
WITH prices(product, month, price) AS (
  VALUES
    ('Kettle', '2025-01', 1200), ('Kettle', '2025-02', 1150), ('Kettle', '2025-03', 1250),
    ('Toaster', '2025-01', 2200), ('Toaster', '2025-02', 2100),
    ('Mixer', '2025-02', 3400), ('Mixer', '2025-03', 3300), ('Mixer', '2025-04', 3500)
),
with_latest AS (
  SELECT product, month, price,
    LAST_VALUE(price) OVER (PARTITION BY product ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS latest_price
  FROM prices
)
SELECT product, month, price, latest_price, price - latest_price AS diff_from_latest
FROM with_latest
ORDER BY product, month;
```

## Expected result

| product | month | price | latest_price | diff_from_latest |
| --- | --- | --- | --- | --- |
| Kettle | 2025-01 | 1200 | 1250 | -50 |
| Kettle | 2025-02 | 1150 | 1250 | -100 |
| Kettle | 2025-03 | 1250 | 1250 | 0 |
| Mixer | 2025-02 | 3400 | 3500 | -100 |
| Mixer | 2025-03 | 3300 | 3500 | -200 |
| Mixer | 2025-04 | 3500 | 3500 | 0 |
| Toaster | 2025-01 | 2200 | 2100 | 100 |
| Toaster | 2025-02 | 2100 | 2100 | 0 |

## Explanation

With `ORDER BY` in a window and no frame clause, the frame runs from the start of the partition to the **current row**. `FIRST_VALUE` works with that, but `LAST_VALUE` then simply returns the current row's value, so a "latest price" column silently repeats each month's own price.

Widening the frame to `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` lets every row see the whole product. The Kettle's latest price is 1,250, so its January price was 50 below and February's 100 below; the Toaster's latest price fell, so January sits 100 above it. Ordering by month descending and taking `FIRST_VALUE` is an equivalent way to get the same answer.

**Common mistake:** relying on the default frame with `LAST_VALUE`. Every `diff_from_latest` comes out 0, which looks like perfectly stable prices.

## Other accepted answers

```sql
WITH prices(product, month, price) AS (
  VALUES
    ('Kettle', '2025-01', 1200), ('Kettle', '2025-02', 1150), ('Kettle', '2025-03', 1250),
    ('Toaster', '2025-01', 2200), ('Toaster', '2025-02', 2100),
    ('Mixer', '2025-02', 3400), ('Mixer', '2025-03', 3300), ('Mixer', '2025-04', 3500)
)
SELECT product, month, price,
  FIRST_VALUE(price) OVER (PARTITION BY product ORDER BY month DESC) AS latest_price,
  price - FIRST_VALUE(price) OVER (PARTITION BY product ORDER BY month DESC) AS diff_from_latest
FROM prices
ORDER BY product, month;
```

## Wrong answers

Feedback: incorrect-output

```sql
WITH prices(product, month, price) AS ( VALUES ('Kettle', '2025-01', 1200), ('Kettle', '2025-02', 1150), ('Kettle', '2025-03', 1250), ('Toaster', '2025-01', 2200), ('Toaster', '2025-02', 2100), ('Mixer', '2025-02', 3400), ('Mixer', '2025-03', 3300), ('Mixer', '2025-04', 3500) ) SELECT product, month, price, LAST_VALUE(price) OVER (PARTITION BY product ORDER BY month) AS latest_price, price - LAST_VALUE(price) OVER (PARTITION BY product ORDER BY month) AS diff_from_latest FROM prices ORDER BY product, month;
```
