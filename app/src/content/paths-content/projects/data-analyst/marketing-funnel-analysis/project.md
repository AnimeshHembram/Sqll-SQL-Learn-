---
id: marketing-funnel-analysis
title: Marketing funnel analysis
order: 3
summary: Trace visitors of an online-learning company from first visit to purchase, find the biggest drop-off, judge a checkout A/B test and decide where the marketing budget should go.
company: Vidya Loop
industry: Online learning (ed-tech), India
dataset: vidya-loop
duration: 330
milestones:
  - traffic-and-tracking | Traffic and tracking | Size the traffic and check the event tracking before trusting a funnel.
  - funnel | Build the funnel | Measure every step from visit to purchase and find where visitors drop off.
  - channels | Channels and attribution | Compare campaigns, credit sales to the channels that start and close them, and see how long buyers take.
  - experiment | The checkout experiment | Judge the checkout A/B test, check whether the lift is real, and size what it is worth.
  - final-challenge | Final challenge | Build the acquisition scorecard that decides next quarter's marketing budget.
finalTask: mfa-12-acquisition-scorecard
---

## Scenario

It is the first week of April 2025. You are the data analyst at **Vidya Loop**, an online-learning company, and the growth team is planning next quarter. Two arguments keep coming back:

- The head of marketing wants to cut Instagram, because "it brings clicks, not customers", and move the money to email.
- The product team ran an **A/B test of a new checkout page** for the last six weeks and wants to know whether to ship it.

Your brief: *"Show us the whole funnel, from first visit to purchase. Where do we lose people, which channels really bring buyers, and is the new checkout worth shipping?"*

## The company

Vidya Loop sells self-paced courses for people moving into data jobs: *SQL for Analysts*, *Python Foundations*, *Power BI Dashboards* and a full *Data Analytics Bootcamp*. Visitors arrive from paid search, Instagram, a YouTube creator partnership, affiliate partners (colleges and deal sites), email, or directly.

The journey is the same for everyone: **view a course page → sign up → start the free trial → checkout → purchase**. Most visitors browse on their phones, and many come back several times before deciding.

## The problem

The team has dashboards, but each tells a different story:

- the ads platforms report clicks and the email tool reports sales, so every channel looks good in its own report,
- nobody knows which funnel step loses the most people,
- the checkout test looks positive, but the groups are small and nobody has checked it by device,
- the event tracking is known to be imperfect, so the team does not fully trust its own numbers.

The budget for next quarter, and the decision to ship the new checkout, depend on a single, trustworthy analysis.

## Objectives

By the end of the project you will have:

1. sized the traffic and audited the event tracking,
2. built the visitor funnel, compared it by device and tracked checkout conversion over time,
3. measured campaign performance, compared first-touch and last-touch attribution and measured time to purchase,
4. evaluated the checkout A/B test, tested whether its lift is real, and put a rupee value on it,
5. built an **acquisition scorecard** with a budget verdict for every channel, and written the findings for the growth team.

## The data

The Vidya Loop database has five tables covering twelve weeks, from Monday 6 January to Sunday 30 March 2025: 900 visitors, 1,265 sessions, 2,027 funnel events, 141 orders, 9 campaigns and 4 courses. It is synthetic data, generated with a fixed seed so every learner gets exactly the same rows. Amounts are whole Indian rupees.

| Table | One row per | Key columns |
| --- | --- | --- |
| `sessions` | visit | `session_id`, `visitor_id`, `session_date`, `campaign_id`, `device`, `variant` |
| `events` | funnel step reached in a session | `session_id`, `step` |
| `orders` | course purchase | `order_id`, `session_id`, `visitor_id`, `course_id`, `price`, `discount` |
| `campaigns` | marketing campaign | `campaign_id`, `name`, `channel`, `spend` |
| `courses` | course | `course_id`, `name`, `price` |

**How the tables relate.** `events.session_id` and `orders.session_id` point to `sessions`; `sessions.campaign_id` points to `campaigns`, and is NULL for organic or direct visits; `orders.course_id` points to `courses`. A visitor (`visitor_id`) can have several sessions; session ids increase with time.

**Definitions used throughout.**

- The funnel steps, in order, are `view_course`, `signup`, `start_trial`, `checkout` and `purchase`. A visitor **reached** a step if any of their sessions reached it or a later step.
- A session's **channel** is its campaign's `channel`, or `'organic'` when it has no campaign. The **first touch** is a visitor's first session; the **last touch** is the session in which they bought.
- **Revenue** is `price - discount`. **ROAS** (return on ad spend) is revenue divided by spend.
- The **checkout A/B test** started on Monday 17 February: from then on every session has `variant` `'A'` (current page) or `'B'` (new page); before that it is NULL.

**Known tracking issues:** some events were logged twice, and a few purchases lost their checkout event. Task 2 measures both.

One buyer's journey, event by event:

```sql
SELECT s.session_id, s.session_date, COALESCE(c.channel, 'organic') AS channel, s.device, e.step
FROM sessions AS s
LEFT JOIN campaigns AS c ON c.campaign_id = s.campaign_id
LEFT JOIN events AS e ON e.session_id = s.session_id
WHERE s.visitor_id = 185
ORDER BY s.session_id,
         CASE e.step WHEN 'view_course' THEN 1 WHEN 'signup' THEN 2 WHEN 'start_trial' THEN 3
                     WHEN 'checkout' THEN 4 WHEN 'purchase' THEN 5 END;
```

| session_id | session_date | channel | device | step |
| --- | --- | --- | --- | --- |
| 1113 | 2025-03-20 | social | desktop | view_course |
| 1113 | 2025-03-20 | social | desktop | signup |
| 1113 | 2025-03-20 | social | desktop | signup |
| 1154 | 2025-03-23 | email | desktop | NULL |
| 1166 | 2025-03-24 | email | desktop | view_course |
| 1166 | 2025-03-24 | email | desktop | start_trial |
| 1166 | 2025-03-24 | email | desktop | checkout |
| 1166 | 2025-03-24 | email | desktop | purchase |

This visitor found Vidya Loop through Instagram, signed up (the signup was logged twice, one of the tracking duplicates), came back from an email without doing anything, started the trial and bought after a second email the next day.

And the courses:

```sql
SELECT * FROM courses;
```

| course_id | name | price |
| --- | --- | --- |
| 1 | SQL for Analysts | 2999 |
| 2 | Python Foundations | 3499 |
| 3 | Power BI Dashboards | 2499 |
| 4 | Data Analytics Bootcamp | 9999 |

## Business questions

1. How much traffic arrives each week, and on which devices? *(Task 1)*
2. Can the tracking data be trusted, and how should it be counted? *(Task 2)*
3. Where in the funnel do visitors drop off, and is it the same on mobile and desktop? *(Tasks 3 and 4)*
4. How has checkout conversion moved over the quarter? *(Task 5)*
5. Which campaigns pay for themselves, and which channels start and close sales? *(Tasks 6 and 7)*
6. How long do buyers take to decide? *(Task 8)*
7. Did the new checkout page work, for whom, and what is it worth? *(Tasks 9 to 11)*
8. Where should next quarter's marketing budget go? *(Final challenge)*

## Present your findings

The growth team meets on Monday, and they will read one page. When you have solved the final challenge, write a **funnel memo**:

1. **Headline** (one sentence): where Vidya Loop loses buyers, and what to do first.
2. **The funnel**: overall conversion and the two biggest drop-offs, with the device difference.
3. **The experiment**: the result, whether it is real (the z-score in plain words) and what it is worth.
4. **Channels**: why last-touch reports mislead, and which channels to grow or cut.
5. **Recommendations and caveats**: three actions, plus what the data cannot tell you (twelve weeks of history, small groups, synthetic data).

Put the acquisition scorecard in as the one table and keep every number traceable to a query. Together with your queries, the memo is a portfolio piece that shows funnel analysis, attribution and experiment analysis end to end.

Once the project is complete, a model memo appears below for comparison.

## Model findings

**Headline:** Vidya Loop loses its most valuable visitors at the very last step: mobile buyers abandon the old checkout page. The new page fixes it and should ship now, and the marketing budget should be judged on the customers each channel brings, not on last clicks.

**The funnel**

- Of 900 visitors, 71.6% viewed a course, 39.9% signed up and **15.7% bought**. The biggest drop-offs are view course → signup (55.7% continue) and **checkout → purchase (62.1%)**.
- The last step is a mobile problem: **53.8% of mobile visitors who reach checkout buy, against 76.2% on desktop**, while the earlier steps look alike on both devices.

**The checkout experiment**

- The new page converts **64.2% of checkout sessions against 45.1%**, worth ₹2,858 per checkout against ₹1,943.
- The gain is on mobile: **34.8% → 62.5% (z = 2.79**, very unlikely to be chance). On desktop, 64.0% against 68.0% (z = 0.3) is no clear change.
- Before the test, the old mobile page cost about **26 courses, roughly ₹1.15 lakh in six weeks**, around a fifth of the quarter's revenue.

**Channels**

- Last-touch reports flatter email (36 orders) and make Instagram look worthless (5 orders). On first touch, **social starts 24 purchases**, search 60 and email none: email closes sales that other channels started.
- On first-touch revenue, affiliates return 4.86 times their spend, search 3.46 and social 2.63; YouTube is weakest at 2.03.
- 42% of orders come on the day of the first visit; the rest take days or weeks and several visits.

**Recommendations**

1. Ship checkout variant B to all mobile visitors now, and keep watching desktop conversion.
2. Judge acquisition channels on first-touch revenue: grow affiliates, keep search and Instagram, and renegotiate or cut the YouTube creator deal.
3. Fix the tracking script that logs events twice and loses checkout events, so the funnel can be trusted without workarounds.

**Caveats:** twelve weeks of data and small test groups (25 to 56 checkout sessions per device and variant); the revenue estimate assumes pre-test visitors would have behaved like test visitors; neither attribution model is the full truth; and the data is synthetic.

## What you accomplished

You completed a full marketing-funnel analysis, the kind growth and product teams run every quarter:

- **Event data and data quality**: grouped sessions into weeks, audited duplicate and missing events, and built counting rules that survive them.
- **Funnels**: ranked steps with `CASE`, counted visitors at their furthest step against a `VALUES` list, compared devices with step-specific denominators, and smoothed a trend with a moving-average window.
- **Marketing analytics**: computed ROAS and cost per order with `NULLIF`, compared first-touch and last-touch attribution with `ROW_NUMBER`, and measured time to purchase with `julianday`.
- **Experiment analysis**: compared variants on the affected population, tested the lift with a two-proportion z-score, and sized the business impact in rupees.
- **Executive reporting**: combined measures at several grains into an acquisition scorecard with a budget verdict.

Funnels, attribution and A/B tests come up in almost every product and marketing analyst interview. Keep your queries and your memo together as a portfolio project.
