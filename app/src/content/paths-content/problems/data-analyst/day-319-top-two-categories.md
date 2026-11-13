---
id: da-day-319
title: The most and second most common category per team
order: 319
difficulty: intermediate
topic: SQL patterns
summary: Find each team's most frequent ticket category and the runner-up, with a clear rule for ties.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Rank grouped counts
  - Pivot ranks into columns
prerequisites:
  - Day 98
  - Day 242
---

## Task

For each support team (starter query), find the **most common** ticket category and the **second most common**, with their counts. Break ties alphabetically by category. A team with only one category has `NULL` for the second.

Return `team`, `top_category`, `top_tickets`, `second_category` and `second_tickets`, sorted by `team`.

## Starter query

```sql
WITH tickets(ticket_id, team, category) AS (
  VALUES
    (1, 'Billing', 'refund'), (2, 'Billing', 'refund'), (3, 'Billing', 'invoice'), (4, 'Billing', 'refund'), (5, 'Billing', 'invoice'),
    (6, 'Billing', 'upgrade'), (7, 'Tech', 'login'), (8, 'Tech', 'crash'), (9, 'Tech', 'login'), (10, 'Tech', 'crash'),
    (11, 'Tech', 'slow'), (12, 'Sales', 'pricing')
)
SELECT team, category, COUNT(*) AS tickets
FROM tickets
GROUP BY team, category
ORDER BY team, tickets DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Count per team and category, then rank: `ROW_NUMBER() OVER (PARTITION BY team ORDER BY COUNT(*) DESC, category)`.
3. Pivot ranks 1 and 2 into columns with `MAX(CASE WHEN rnk = 1 THEN category END)` and so on, grouped by team.

## Solution

```sql
WITH tickets(ticket_id, team, category) AS (
  VALUES
    (1, 'Billing', 'refund'), (2, 'Billing', 'refund'), (3, 'Billing', 'invoice'), (4, 'Billing', 'refund'), (5, 'Billing', 'invoice'),
    (6, 'Billing', 'upgrade'), (7, 'Tech', 'login'), (8, 'Tech', 'crash'), (9, 'Tech', 'login'), (10, 'Tech', 'crash'),
    (11, 'Tech', 'slow'), (12, 'Sales', 'pricing')
),
ranked AS (
  SELECT team, category, COUNT(*) AS tickets,
    ROW_NUMBER() OVER (PARTITION BY team ORDER BY COUNT(*) DESC, category) AS rnk
  FROM tickets
  GROUP BY team, category
)
SELECT team,
  MAX(CASE WHEN rnk = 1 THEN category END) AS top_category, MAX(CASE WHEN rnk = 1 THEN tickets END) AS top_tickets,
  MAX(CASE WHEN rnk = 2 THEN category END) AS second_category, MAX(CASE WHEN rnk = 2 THEN tickets END) AS second_tickets
FROM ranked
GROUP BY team
ORDER BY team;
```

## Expected result

| team | top_category | top_tickets | second_category | second_tickets |
| --- | --- | --- | --- | --- |
| Billing | refund | 3 | invoice | 2 |
| Sales | pricing | 1 | NULL | NULL |
| Tech | crash | 2 | login | 2 |

## Explanation

Ranking grouped counts with `ROW_NUMBER()` and pivoting ranks 1 and 2 into columns turns "top two per group" into one row per team. The tie-break on category name decides Tech's tie: crash and login both have 2 tickets, so crash (alphabetically first) is the top category and login second.

Sales has only one category, so its second-place columns are `NULL`. A dashboard of team workloads can show this as "Billing: refunds (3), then invoices (2)" without any further processing.

**Common mistake:** using `RANK()`. Tied categories share rank 1, so Tech has two rank-1 rows and no rank 2: `MAX` picks the alphabetically last of them (login) as the top category, and the second category comes out `NULL`.

## Wrong answers

Feedback: incorrect-output

```sql
WITH tickets(ticket_id, team, category) AS ( VALUES (1, 'Billing', 'refund'), (2, 'Billing', 'refund'), (3, 'Billing', 'invoice'), (4, 'Billing', 'refund'), (5, 'Billing', 'invoice'), (6, 'Billing', 'upgrade'), (7, 'Tech', 'login'), (8, 'Tech', 'crash'), (9, 'Tech', 'login'), (10, 'Tech', 'crash'), (11, 'Tech', 'slow'), (12, 'Sales', 'pricing') ), ranked AS (SELECT team, category, COUNT(*) AS tickets, RANK() OVER (PARTITION BY team ORDER BY COUNT(*) DESC) AS rnk FROM tickets GROUP BY team, category) SELECT team, MAX(CASE WHEN rnk = 1 THEN category END) AS top_category, MAX(CASE WHEN rnk = 1 THEN tickets END) AS top_tickets, MAX(CASE WHEN rnk = 2 THEN category END) AS second_category, MAX(CASE WHEN rnk = 2 THEN tickets END) AS second_tickets FROM ranked GROUP BY team ORDER BY team;
```
