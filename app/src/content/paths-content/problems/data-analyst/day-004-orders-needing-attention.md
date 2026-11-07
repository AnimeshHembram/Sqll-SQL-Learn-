---
id: da-day-004
title: Orders that need attention
order: 4
difficulty: beginner
topic: Selecting and filtering
summary: Find every order that has not been delivered yet, whatever the reason.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Filter with a not-equal condition
prerequisites:
  - Day 2
---

## Task

Operations reviews every order that is **not delivered**. Return `id` and `status` for those orders. Row order does not matter.

## Starter query

```sql
SELECT id, status
FROM orders;
```

## Hints

1. The condition is the opposite of `status = 'delivered'`.
2. `<>` means "not equal to".
3. `WHERE status <> 'delivered'`

## Solution

```sql
SELECT id, status
FROM orders
WHERE status <> 'delivered';
```

## Expected result

| id | status |
| --- | --- |
| 3 | shipped |
| 4 | cancelled |
| 6 | shipped |

## Explanation

Three orders are not delivered: two shipped and one cancelled. A "not equal" filter catches every other status, including any new status added later.

## Other accepted answers

```sql
SELECT id, status FROM orders WHERE status IN ('shipped', 'cancelled');
```
