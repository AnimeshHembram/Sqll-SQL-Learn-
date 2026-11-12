---
id: customer-retention-study
title: Customer retention study
order: 2
summary: Build monthly cohorts for a meal-kit subscription company, find which customers stay and why, and recommend where to spend next year's acquisition budget.
company: Rasoi Crate
industry: Meal-kit subscriptions, India
dataset: rasoi-crate
duration: 340
milestones:
  - know-the-data | Understand the subscription data | Measure monthly revenue correctly and separate signups from paying customers.
  - cohorts | Build the cohorts | Group customers by their first paid month and measure how many are still paying later.
  - who-stays | Find who stays | Compare retention by channel, plan, first-box offer and first-month support experience.
  - revenue-and-churn | Revenue and churn | Weigh revenue against acquisition cost, and study cancellations and customers who come back.
  - final-challenge | Final challenge | Build the channel scorecard that sets next year's marketing budget.
finalTask: crs-13-channel-scorecard
---

## Scenario

It is July 2025. You are the analyst at **Rasoi Crate**, an Indian meal-kit start-up, and the founders are preparing for a funding round. Investors have one question before anything else: *do customers stay?*

Revenue has grown almost every month, but the founders are uneasy. The big Diwali campaign doubled sign-ups in November, yet the support team says many of those customers had already cancelled by January. Marketing wants a bigger influencer budget; finance wants to cut it.

Your job is a **customer retention study**: group customers into monthly cohorts, measure how many keep paying, find what the loyal customers have in common, and turn it into a budget recommendation the founders can defend in front of investors.

## The company

Rasoi Crate delivers recipe boxes with pre-measured ingredients for regional Indian dishes. Customers subscribe to a monthly plan and get boxes every week until they cancel. It launched in January 2024 in five cities: Bengaluru, Pune, Hyderabad, Mumbai and Chennai.

There are four plans, from *Solo Starter* (three meals a week for one person) to *Family Feast* (four meals a week for four people). New customers are found through five channels: **referrals** from existing customers, **Instagram** ads, **Google** search, **influencer** campaigns and **partner** offers with banks and offices. Many start with a discount: half off, or a free first box.

## The problem

Subscription businesses live or die by retention. A customer who leaves after one box rarely pays back what it cost to acquire them, while one who stays a year is worth many times that cost.

The founders do not yet know:

- what share of customers are still paying after one, three and six months,
- whether the November campaign brought real customers or one-box visitors,
- which channels, plans and offers bring customers who stay,
- why customers cancel, and whether operations problems play a part,
- which marketing channels actually pay for themselves.

## Objectives

By the end of the project you will have:

1. measured monthly revenue correctly and separated signups from paying customers,
2. built monthly cohorts, a retention curve and a cohort retention matrix,
3. compared retention by channel, plan, first-box offer and first-month support tickets,
4. weighed each channel's acquisition cost against the revenue its customers bring, and studied cancellations and win-backs,
5. built a one-row-per-channel **scorecard** with a budget recommendation, and written up the findings for investors.

## The data

The Rasoi Crate database has six tables: 383 signups, 1,638 billing attempts, 231 cancellations, 170 support tickets and 90 rows of marketing spend, covering January 2024 to the end of June 2025. It is synthetic data, generated with a fixed seed so every learner gets exactly the same rows. Amounts are whole Indian rupees.

| Table | One row per | Key columns |
| --- | --- | --- |
| `customers` | signup | `customer_id`, `signup_date`, `city`, `channel`, `plan_id`, `first_offer` |
| `plans` | subscription plan | `plan_id`, `name`, `meals_per_week`, `people`, `monthly_price` |
| `payments` | billing attempt | `payment_id`, `customer_id`, `billing_month`, `amount`, `status` |
| `cancellations` | cancellation | `customer_id`, `cancelled_on`, `reason` |
| `support_tickets` | support ticket | `ticket_id`, `customer_id`, `opened_on`, `category`, `hours_to_resolve` |
| `marketing_spend` | month and channel | `month`, `channel`, `spend` |

**How the tables relate.** `customer_id` links `customers` to `payments`, `cancellations` and `support_tickets`; `customers.plan_id` points to `plans`; `marketing_spend` joins to customers through `channel` (and to time through `month`).

**Definitions used throughout.**

- A **paying customer** has at least one payment with `status = 'paid'`. `billing_month` is text such as `'2024-11'`.
- A customer's **cohort** is the month of their **first paid payment**, not their signup date.
- A customer is **retained at month *k*** if they have a paid payment exactly *k* months after their first one. To count months, turn a month into a number: `year * 12 + month`.
- **Month 3 is observable** only for cohorts up to March 2025, because the data ends in June 2025.

**Things to watch**, as in any real billing system: a failed card payment is saved as a `'failed'` row and is often retried and paid in the same month; some signups never paid at all; a free first box is a paid payment with `amount = 0`; and some customers cancel and come back months later.

Sample rows from `payments` for one customer:

```sql
SELECT payment_id, customer_id, billing_month, amount, status
FROM payments
WHERE customer_id = 193
ORDER BY billing_month, payment_id;
```

| payment_id | customer_id | billing_month | amount | status |
| --- | --- | --- | --- | --- |
| 629 | 193 | 2024-11 | 0 | paid |
| 749 | 193 | 2024-12 | 3999 | failed |
| 750 | 193 | 2024-12 | 3999 | paid |
| 866 | 193 | 2025-01 | 3999 | paid |
| 1552 | 193 | 2025-06 | 3999 | paid |

Customer 193 shows most of the traps at once: a free first box (amount 0), a failed card in December 2024 that was retried and paid the same month, then nothing from February to May 2025, and a return in June.

And the plans:

```sql
SELECT * FROM plans;
```

| plan_id | name | meals_per_week | people | monthly_price |
| --- | --- | --- | --- | --- |
| 1 | Solo Starter | 3 | 1 | 1499 |
| 2 | Couple Classic | 3 | 2 | 2699 |
| 3 | Couple Plus | 5 | 2 | 3999 |
| 4 | Family Feast | 4 | 4 | 4999 |

## Business questions

1. How many paying customers and how much revenue does each month bring? *(Task 1)*
2. How many signups never became paying customers, and from which channels? *(Task 2)*
3. How big is each monthly cohort, and how quickly do customers leave? *(Tasks 3 and 4)*
4. Which cohorts retain better or worse than the rest, and why does November 2024 stand out? *(Task 5)*
5. Which channels, plans and first-box offers bring customers who stay? *(Tasks 6 to 8)*
6. Does a bad first month, such as a late delivery, drive customers away? *(Task 9)*
7. Which channels pay back what they cost? *(Task 10)*
8. Why do customers cancel, and do any come back? *(Tasks 11 and 12)*
9. Where should next year's marketing budget go? *(Final challenge)*

## Present your findings

Investors read dozens of decks; yours should answer their question in the first line. When you have solved the final challenge, write a **one-page retention memo**:

1. **Headline** (one sentence): do customers stay, and which ones?
2. **The retention picture**: month-1, month-3 and month-6 retention from your curve, and the cohort that stands out.
3. **Three drivers** of retention, each with one number (a channel, a plan or offer, and an operations issue).
4. **Recommendations**: where the budget should move, and one operational fix.
5. **Caveats**: small cohorts, 18 months of history, synthetic data, and correlations that are not yet proven causes.

Put the scorecard in as the one table, and keep every number traceable to a query. Together with your queries, the memo is a portfolio piece that shows you can do cohort analysis end to end.

Once the project is complete, a model memo appears below for comparison.

## Model findings

**Headline:** Rasoi Crate's growth is real, but it rests on a minority of loyal customers: four in ten new customers leave after their first month, and the channels and offers that drive sign-ups fastest bring the customers who leave first.

**The retention picture**

- Of the customers who started in 2024, **59.9% paid a second month, 43.2% were still paying at month 3 and 42.3% at month 6**. Almost all the loss happens in the first two months; after month 3 the curve is flat.
- The **November 2024 Diwali cohort** was the largest ever (46 customers, almost half on a free first box) and the worst at month 3: 26.1%, against 42 to 61% for most 2024 cohorts.

**What drives retention**

- **Channel:** referred customers keep 73.9% at month 3; influencer customers 17.7%.
- **Offer:** free-first-box customers keep 16.1% at month 3, against 62.4% for customers who paid full price.
- **Plan:** Family Feast keeps 50.0%, Solo Starter 33.3%, and Solo is the most expensive per plate (₹125 against ₹78).
- **Operations:** customers with a late delivery in their first month keep only 26.1%, against 44.8% with no ticket; those tickets took 36 hours to resolve.

**Money**

- A referred customer costs ₹667 to acquire and has paid about ₹25,000 so far; an influencer customer costs ₹4,767 and has paid about ₹6,200, only 1.3 times its cost.
- "Too expensive" is the top cancellation reason (37.7%), mostly within two months; 13% of cancellations are failed cards that were never replaced.
- 25 lapsed customers came back after about four months away and have paid ₹2,21,432 since: win-backs are worth pursuing.

**Recommendations**

1. Move influencer budget to a stronger referral programme and Google search, the two "Scale up" channels.
2. Replace the free first box with a smaller first-box discount, and test the change on one city first.
3. Fix first-week delivery reliability before scaling further, and track late deliveries by city every week.
4. Launch a better-value solo plan, a failed-payment reminder flow, and a win-back offer two to three months after cancellation.

**Caveats:** cohorts of 10 to 27 customers make single months noisy; there are only 18 months of history, so long-term value is still a lower bound; the data is synthetic; and the links between offers, tickets and churn are strong correlations, not tested causes.

## What you accomplished

You completed an end-to-end retention study, the kind subscription companies, investors and product teams rely on:

- **Clean subscription metrics**: separated paid from failed billing attempts and signups from paying customers.
- **Cohort analysis**: assigned cohorts by first purchase, built a retention curve and a cohort matrix, and handled months that cannot be measured yet with `NULL`.
- **Segmentation**: compared retention by channel, plan, offer and first-month experience with flags, `EXISTS` and date arithmetic.
- **Unit economics and churn**: computed acquisition cost and revenue per customer, profiled cancellations by timing, and found returning customers with the gaps-and-islands pattern (`LAG` and `ROW_NUMBER`).
- **Executive reporting**: combined measures at different grains into a channel scorecard with a budget verdict.

Cohort retention is one of the most-asked data analyst interview topics. Keep your queries and your memo together as a portfolio project.
