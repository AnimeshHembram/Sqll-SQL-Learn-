---
id: da-day-315
title: Merchants over the chargeback threshold
order: 315
difficulty: intermediate
topic: Risk analytics
summary: Compute chargeback rates, compare them with a 1% threshold, and hold back judgement on tiny merchants.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare a rate with a threshold
  - Guard decisions against small samples
prerequisites:
  - Day 290
  - Day 114
---

## Task

Card schemes watch merchants whose **chargeback rate** (chargebacks ÷ transactions) goes above **1%**. Using last month's figures (starter query), return for each merchant `merchant`, `transactions`, `chargebacks`, `chargeback_pct` (rounded to 2 decimal places) and `status`:

- `'too few transactions'` when there were fewer than 100 transactions (the rate is too unstable to judge),
- `'over threshold'` above 1%, `'watch'` from 0.75% to 1%, otherwise `'ok'`.

Sort by `chargeback_pct` from highest.

## Starter query

```sql
WITH merchant_month(merchant, transactions, chargebacks) AS (
  VALUES ('Bookstall', 4200, 12), ('GadgetHub', 1800, 27), ('TicketNow', 950, 9), ('FoodBox', 6100, 30), ('NewMerchant', 40, 2)
)
SELECT merchant, transactions, chargebacks
FROM merchant_month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Rate: `100.0 * chargebacks / transactions`.
3. Test the volume rule first in the `CASE`, so a tiny merchant is never labelled over threshold.

## Solution

```sql
WITH merchant_month(merchant, transactions, chargebacks) AS (
  VALUES ('Bookstall', 4200, 12), ('GadgetHub', 1800, 27), ('TicketNow', 950, 9), ('FoodBox', 6100, 30), ('NewMerchant', 40, 2)
)
SELECT merchant, transactions, chargebacks, ROUND(100.0 * chargebacks / transactions, 2) AS chargeback_pct,
  CASE WHEN transactions < 100 THEN 'too few transactions'
       WHEN 100.0 * chargebacks / transactions > 1 THEN 'over threshold'
       WHEN 100.0 * chargebacks / transactions >= 0.75 THEN 'watch'
       ELSE 'ok' END AS status
FROM merchant_month
ORDER BY chargeback_pct DESC;
```

## Expected result

| merchant | transactions | chargebacks | chargeback_pct | status |
| --- | --- | --- | --- | --- |
| NewMerchant | 40 | 2 | 5 | too few transactions |
| GadgetHub | 1800 | 27 | 1.5 | over threshold |
| TicketNow | 950 | 9 | 0.95 | watch |
| FoodBox | 6100 | 30 | 0.49 | ok |
| Bookstall | 4200 | 12 | 0.29 | ok |

## Explanation

Card schemes put merchants on monitoring programmes when chargebacks pass about 1% of transactions. GadgetHub's 27 chargebacks on 1,800 sales is 1.5%, over the threshold; TicketNow is close at 0.95% and should be watched.

NewMerchant has the highest rate (5%), but only 40 transactions: two chargebacks swing its rate by 2.5 percentage points each. Testing the volume rule first in the `CASE` keeps such small samples out of the decision until there is enough data, the same reasoning as the margin of error on Day 290.

**Common mistake:** testing the rate before the volume. NewMerchant is labelled over threshold on the strength of two disputes, and the volume rule never applies.

## Wrong answers

Feedback: incorrect-output

```sql
WITH merchant_month(merchant, transactions, chargebacks) AS ( VALUES ('Bookstall', 4200, 12), ('GadgetHub', 1800, 27), ('TicketNow', 950, 9), ('FoodBox', 6100, 30), ('NewMerchant', 40, 2) ) SELECT merchant, transactions, chargebacks, ROUND(100.0 * chargebacks / transactions, 2) AS chargeback_pct, CASE WHEN 100.0 * chargebacks / transactions > 1 THEN 'over threshold' WHEN 100.0 * chargebacks / transactions >= 0.75 THEN 'watch' WHEN transactions < 100 THEN 'too few transactions' ELSE 'ok' END AS status FROM merchant_month ORDER BY chargeback_pct DESC;
```
