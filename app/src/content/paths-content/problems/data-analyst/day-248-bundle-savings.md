---
id: da-day-248
title: Are the bundles really a saving?
order: 248
difficulty: intermediate
topic: Pricing
summary: Price each bundle's contents separately and flag bundles that cost more than their parts.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Price a set from its parts
  - Keep empty parents with LEFT JOIN
prerequisites:
  - Day 126
  - Day 93
---

## Task

The shop sells bundles (starter query). For each bundle, compute `parts_price` (what its items would cost bought separately: price × quantity, summed), the `saving` (`parts_price − bundle_price`) and `saving_pct` (saving ÷ parts price × 100, rounded to 1 decimal place). A bundle with no items is listed with `parts_price` 0, `saving` and `saving_pct` `NULL` and `check` `'empty'`; otherwise `check` is `'ok'` when the saving is positive and `'overpriced'` when it is not.

Return `bundle`, `bundle_price`, `parts_price`, `saving`, `saving_pct` and `check`, sorted by `saving_pct` from highest (empty bundles last), then `bundle`.

## Starter query

```sql
WITH products(sku, price) AS (
  VALUES ('pen', 50), ('notebook', 120), ('folder', 80), ('stapler', 250), ('ink', 90)
),
bundles(bundle, bundle_price) AS (
  VALUES ('Starter kit', 220), ('Office kit', 420), ('Writer kit', 150), ('Empty kit', 99)
),
bundle_items(bundle, sku, qty) AS (
  VALUES
    ('Starter kit', 'pen', 2), ('Starter kit', 'notebook', 1),
    ('Office kit', 'stapler', 1), ('Office kit', 'folder', 2), ('Office kit', 'pen', 1),
    ('Writer kit', 'pen', 1), ('Writer kit', 'ink', 1)
)
SELECT b.bundle, b.bundle_price, i.sku, i.qty
FROM bundles AS b
LEFT JOIN bundle_items AS i ON i.bundle = b.bundle
ORDER BY b.bundle;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Start from `bundles` and `LEFT JOIN` its items and their products, so the empty bundle stays. `SUM(p.price * i.qty)` is the parts price (`NULL` for the empty one, so wrap it in `COALESCE`).
3. Decide `check` with `CASE WHEN parts IS NULL THEN 'empty' WHEN parts > bundle_price THEN 'ok' ELSE 'overpriced' END`, and sort with `ORDER BY saving_pct IS NULL, saving_pct DESC, bundle`.

## Solution

```sql
WITH products(sku, price) AS (
  VALUES ('pen', 50), ('notebook', 120), ('folder', 80), ('stapler', 250), ('ink', 90)
),
bundles(bundle, bundle_price) AS (
  VALUES ('Starter kit', 220), ('Office kit', 420), ('Writer kit', 150), ('Empty kit', 99)
),
bundle_items(bundle, sku, qty) AS (
  VALUES
    ('Starter kit', 'pen', 2), ('Starter kit', 'notebook', 1),
    ('Office kit', 'stapler', 1), ('Office kit', 'folder', 2), ('Office kit', 'pen', 1),
    ('Writer kit', 'pen', 1), ('Writer kit', 'ink', 1)
),
priced AS (
  SELECT b.bundle, b.bundle_price, SUM(p.price * i.qty) AS parts
  FROM bundles AS b
  LEFT JOIN bundle_items AS i ON i.bundle = b.bundle
  LEFT JOIN products AS p ON p.sku = i.sku
  GROUP BY b.bundle, b.bundle_price
)
SELECT bundle, bundle_price, COALESCE(parts, 0) AS parts_price, parts - bundle_price AS saving,
  ROUND(100.0 * (parts - bundle_price) / parts, 1) AS saving_pct,
  CASE WHEN parts IS NULL THEN 'empty' WHEN parts > bundle_price THEN 'ok' ELSE 'overpriced' END AS "check"
FROM priced
ORDER BY saving_pct IS NULL, saving_pct DESC, bundle;
```

## Expected result

| bundle | bundle_price | parts_price | saving | saving_pct | check |
| --- | --- | --- | --- | --- | --- |
| Office kit | 420 | 460 | 40 | 8.7 | ok |
| Starter kit | 220 | 220 | 0 | 0 | overpriced |
| Writer kit | 150 | 140 | -10 | -7.1 | overpriced |
| Empty kit | 99 | 0 | NULL | NULL | empty |

## Explanation

Bundles should cost less than their parts, but nothing guarantees it once prices change. Pricing each bundle from its items (`price × qty`, summed) shows that only the Office kit is still a saving (8.7%). The Starter kit costs exactly what its parts do, and the Writer kit now costs 10 more than buying a pen and ink separately, probably because the bundle price was set before an item price came down.

The empty bundle matters too: it has no items, so an inner join would make it vanish, yet it is on sale at 99. Starting from `bundles` with `LEFT JOIN`s keeps it, and its `NULL` parts price marks it as `'empty'` instead of producing a misleading saving.

**Common mistake:** joining bundles to their items with inner joins. The empty bundle disappears from the check, which is exactly the error the check is there to catch.

## Wrong answers

Feedback: missing-rows

```sql
WITH products(sku, price) AS ( VALUES ('pen', 50), ('notebook', 120), ('folder', 80), ('stapler', 250), ('ink', 90) ), bundles(bundle, bundle_price) AS ( VALUES ('Starter kit', 220), ('Office kit', 420), ('Writer kit', 150), ('Empty kit', 99) ), bundle_items(bundle, sku, qty) AS ( VALUES ('Starter kit', 'pen', 2), ('Starter kit', 'notebook', 1), ('Office kit', 'stapler', 1), ('Office kit', 'folder', 2), ('Office kit', 'pen', 1), ('Writer kit', 'pen', 1), ('Writer kit', 'ink', 1) ), priced AS (SELECT b.bundle, b.bundle_price, SUM(p.price * i.qty) AS parts FROM bundles AS b JOIN bundle_items AS i ON i.bundle = b.bundle JOIN products AS p ON p.sku = i.sku GROUP BY b.bundle, b.bundle_price) SELECT bundle, bundle_price, COALESCE(parts, 0) AS parts_price, parts - bundle_price AS saving, ROUND(100.0 * (parts - bundle_price) / parts, 1) AS saving_pct, CASE WHEN parts IS NULL THEN 'empty' WHEN parts > bundle_price THEN 'ok' ELSE 'overpriced' END AS "check" FROM priced ORDER BY saving_pct IS NULL, saving_pct DESC, bundle;
```
