# Smart Ride Product Requirements and Technical Design

Smart Ride gives office employees, students and other regular commuters
a fixed pickup point, drop point and schedule under a monthly, quarterly
or yearly subscription. The same driver and vehicle serve the route
throughout the term under normal operations. The service addresses
unreliable cab availability, changing drivers, variable prices and the
time spent booking a ride every day.

# 1 Product scope

The first release covers account setup, subscriptions, fixed route and
schedule allocation, driver and vehicle assignment, online payment,
invoices, alerts and administrative support. The primary goals are
consistent service and predictable commuting costs. Driver engagement,
commuter trust and recurring revenue are secondary goals.

On-demand booking, inter-city service and real-time fare negotiation are
outside scope. Mobile apps, live GPS tracking, corporate subscriptions,
AI route optimization and SOS features belong to the future roadmap.

# 2 Functional requirements

## Commuter

- U01. Register and sign in with a verified email address or mobile
  number. Manage contact details and preferred pickup and drop points.
  Treat changes to an active service as requests subject to route and
  seat availability.

- U02. Browse serviceable schedules and monthly, quarterly and yearly
  plans. Review the total price, service dates, pickup and drop times
  and cancellation terms before paying.

- U03. View the subscription status, assigned driver and vehicle,
  upcoming service and any approved substitutions. Download invoices and
  view payment history. Request renewal or cancellation and receive
  reminders and service alerts.

## Driver

- D01. Submit onboarding details, vehicle information and verification
  documents. Access route work only after admin approval.

- D02. View assigned routes, shifts, stops and passenger manifests for
  assigned runs. Record attendance per passenger and run with a
  timestamp and reason for corrections.

- D03. View earnings and payout summaries by period, including pending
  and paid amounts. Admin records or imports payout results for the
  initial release.

## Administrator

- A01. Manage commuter and driver accounts, verify drivers and vehicles,
  configure cities, stops, schedules, capacities, plans and effective
  prices.

- A02. Assign drivers and vehicles, manage substitutes, reconcile
  payments, handle complaints and feedback, and view operating metrics
  by city and date range.

# 3 Subscription and service rules

## Eligibility and checkout

A commuter selects a city, an ordered pickup and drop pair on a
supported route, and a schedule. Confirm coverage and available seats
for every eligible run in the requested term before offering checkout.
Record the city time zone, currency, term dates, calendar exceptions,
schedule, and quoted amount on the order. Later plan edits apply to new
quotes.

Create a time-limited seat hold and a payment order with an idempotency
key. Finalize the subscription only after the server verifies the
payment signature and reconciles the provider order, amount, currency
and captured status. In one database transaction, convert the hold to a
reservation, create the subscription and invoice record, and enqueue
confirmation. Failed or expired payments release holds. A late capture
enters a reconciliation queue for refund or rebooking with the
commuter’s agreement.

## Service and exceptions

An effective-dated route assignment ties a verified driver and eligible
vehicle to both legs of a recurring schedule. Validate vehicle capacity
and reject overlapping bookings for either resource. An admin can
authorize a substitute for a breakdown, absence or safety issue. Store
the reason and time window and notify affected riders before the run
where possible. When no eligible substitute exists, mark the run
disrupted and notify support and riders.

Generate dated runs from the service calendar, with separate outbound
and return legs. A commuter can see only their own service. A driver
sees only assigned manifests and the minimum contact information needed
for those runs. Attendance values are boarded, absent or excused, with
audit history for changes.

## Renewal and cancellation

Initial release assumes manual renewal. Renewal creates a new term after
a fresh capacity check and payment, preserving the route and assignment
where available. Use a local service date range with an inclusive start
and exclusive end. Derive term boundaries by adding 1, 3 or 12 calendar
months and clamp dates to the target month’s final day. Store the actual
dates on the order.

A paid term moves from scheduled to active on its start date, then to
expired at its end. A normal cancellation request stops renewal and
leaves service available through the paid end date. Support can approve
an early termination with an effective date. Release future seats and
record refund status separately from the subscription.

## Decisions before launch

Confirm the pilot city and coverage, service days and holidays, price
and taxes, refund and disruption policies, driver verification criteria,
payout formula, and records retention. Validate local transport
obligations with the operator before onboarding drivers. Pilot
assumptions include regular commuter demand and availability of
long-term driver contracts during peak hours.

# 4 Architecture and data model

Proposed stack. React with TypeScript and Tailwind for the responsive
web interface, Node.js with Express for the REST API, and PostgreSQL for
transactional records. Use a background worker for reminders, retries,
invoice generation and reconciliation. Start with one configured city
and partition operational queries by city from day one.

The web client calls the API over HTTPS. The API owns role and record
authorization, state changes and pricing. PostgreSQL stores business
data and a durable outbox. The worker processes queued jobs with retry
limits and stable deduplication keys. Store driver documents and
invoices in private object storage and authorize time-limited download
URLs through the API.

Proposed integrations are Razorpay hosted checkout, SMS and email
providers, and Google Maps for address entry and coordinates. Keep route
eligibility and scheduling in the platform so map lookup failures can be
handled with configured stops. Use payment sandbox credentials until
production readiness is approved.

## Core records and constraints

| **Record**                | **Key fields and relationships**                                                                                                       |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Account and profile       | Role, verified contact, city, pickup and drop preferences. Driver profile references private verification documents and review status. |
| City and route            | City time zone, ordered stops, service calendar and schedule template. Dated runs carry leg, status and seat capacity.                 |
| Vehicle and assignment    | Registration, seat count, eligibility status, route, driver, schedule and effective interval. Enforce resource overlap checks.         |
| Plan and subscription     | Plan version, duration, quoted price in minor units, currency, rider, route, term dates and lifecycle status.                          |
| Seat hold and reservation | Order or subscription, covered run and expiry for holds. Lock capacity records in a consistent order while updating inventory.         |
| Order and payment         | Provider order and payment IDs, verified amount and status, unique event IDs, refund references and reconciliation state.              |
| Invoice and payout        | Invoice number, amount breakdown and immutable billing snapshot. Payout summaries reference driver, period and settlement state.       |
| Attendance and complaint  | Unique run and rider attendance entry. Complaint carries rider, service reference, assignee, status and resolution timestamp.          |

Add indexes for city and run date, rider and term, and pending outbox
jobs. Enforce uniqueness for provider events and invoices per successful
order. Audit changes to assignments, approvals, refunds and privileged
access.

# 5 REST API and operating targets

Use the /api/v1 prefix, JSON payloads and opaque identifiers. Validate
inputs server-side, paginate list responses, and return structured
errors with a request ID. Use 401 for missing authentication, 403 for
forbidden actions and 409 for inventory or assignment conflicts.

| **Endpoint group**                                                                                | **Access and purpose**                                                                                              |
|---------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| POST /auth/otp/request, /auth/otp/verify                                                          | Public entry points with rate limits and expiring, single-use codes.                                                |
| GET /plans, GET /routes                                                                           | Commuter. Find current plans and eligible schedules by city and stops.                                              |
| POST /checkouts, GET /checkouts/{id}                                                              | Commuter. Hold seats, start hosted payment and view own checkout status.                                            |
| POST /webhooks/payments                                                                           | Gateway. Verify raw payload signature, deduplicate events and reconcile payment state.                              |
| GET /subscriptions, POST /subscriptions/{id}/renewals, POST /subscriptions/{id}/cancellation      | Commuter. View own terms, request a renewal quote or record cancellation. Serve owned invoice downloads separately. |
| GET /driver/runs, PUT /driver/runs/{id}/attendance/{riderId}, GET /driver/payouts                 | Driver. Read assigned runs, record authorized attendance and view own payouts.                                      |
| /admin/users, /admin/drivers, /admin/plans, /admin/assignments, /admin/complaints, /admin/metrics | Admin. Manage operations and dashboard reporting, with audited privileged writes.                                   |

## Nonfunctional requirements

- Performance. Target the 95th percentile under 3 seconds for core user
  actions under an agreed pilot load. Measure app response separately
  from hosted payment completion and report provider latency.

- Availability. Target 99.5% monthly availability for essential API and
  web journeys. Probe from outside the hosting environment and track
  failed checks and outage duration.

- Security. Use secure session cookies, CSRF protection for
  cookie-authenticated writes, rate limits and admin MFA. Apply
  ownership checks to every protected record. Encrypt traffic and stored
  sensitive data, keep secrets outside source control and use hosted
  checkout so the application never handles raw card data.

- Usability and scale. Verify keyboard navigation, touch targets, clear
  error states and legible layouts on mobile. Run capacity and load
  tests with multiple city datasets. Keep web and API processes
  stateless and use database-backed jobs.

# 6 Metrics testing and release

| **Metric**                | **Definition**                                                                                                                              |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Active subscriptions      | Count of active paid terms at the reporting cutoff, excluding terms ended before that cutoff.                                               |
| Monthly recurring revenue | Sum active recurring plan amounts normalized to one month, using divisors of 1, 3 and 12. Exclude one-off fees and report taxes separately. |
| Rider retention           | Riders active at the start of a month who are still active at month end divided by riders active at the start.                              |
| Driver utilization        | Completed assigned driver hours divided by approved available driver hours, using the same city and period.                                 |
| Complaint resolution time | Mean elapsed time from opening to resolution for tickets resolved during the period. Report unresolved backlog separately.                  |

## Acceptance tests

- T01. Complete signup and mobile checkout for each term length. Verify
  month-end start dates, quoted price, plan snapshot, invoice and
  confirmed schedule.

- T02. Attempt two checkouts for the final seat. Verify only one hold
  succeeds. Replay a signed capture event and verify one reservation,
  subscription and invoice. Reject invalid signatures and mismatched
  amounts.

- T03. Simulate failure, timeout, late capture and refund. Verify
  correct seat release, auditable reconciliation and visible payment
  status.

- T04. Try assigning an unverified driver, an overlapping vehicle and a
  vehicle with insufficient capacity. Reject each. Test a valid
  substitute and confirm the rider alert and audit entry.

- T05. Record attendance and correct it. Verify role and ownership
  checks by attempting access to an unrelated manifest, rider invoice
  and admin endpoint.

- T06. Renew or cancel a subscription and verify effective dates, seat
  availability and dashboard metrics. Exercise a notification provider
  outage and verify queued delivery retries.

## Deployment and submission checklist

Provision separate staging and production environments with managed
PostgreSQL, a web/API runtime, worker and private storage. AWS is a
candidate host. Configure TLS, secret management, migrations, backups
and restore checks, logs, external health probes and alerts. Run smoke
tests after deployment and document rollback to the last healthy release
with a schema compatibility check.

Submission package includes the functional commuter and driver web
application, admin dashboard, this requirements and technical design
document, and a deployment-ready build with setup instructions,
environment variable names, migrations and seeded demo data. Attach test
results and the deployment URL when implementation is complete.

Project references supplied with the brief. Unified Mentor
(unifiedmentor.com) and Quick Ride (quickride.in).
