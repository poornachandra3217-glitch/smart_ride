# Smart Ride

An interactive submission demo of a Chennai pickup and drop subscription platform. The commuter can select a fixed route and term, simulate payment, download a receipt, renew or cancel a demo subscription, and open a support ticket. The driver view shows assignments and lets you record attendance for a same-day weekday subscription. The admin view shows operating metrics and the support queue.

## Run locally

Use Node.js 22 or later. The app has no external dependencies.

```sh
npm test
npm start
```

Open http://localhost:3000. The health endpoint is /health.

## Render deployment

Create a Node web service from this repository on the main branch. Set the build command to `npm ci`, the start command to `npm start`, and the health check path to `/health`. The application binds to Render's PORT environment variable.

## Demo boundaries

Each browser stores its own fictional activity locally. The role switcher exposes sample views and does not authenticate users. Checkout, route assignments and payouts use demo data. There is no shared database, live payment gateway, OTP, real driver onboarding, notifications, or maps integration. These are production implementation items described in the project report. Use only fictional data in the demo.

## Detailed project report

[Read the product requirements and technical design](PROJECT_REPORT.md).
