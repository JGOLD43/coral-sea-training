# Metrics Pipeline Setup

This site now supports a first-party demand metrics pipeline that sends website events and booking attribution directly into `First Aid Software - Pay for results`.

## What Is Implemented

### Website

Implemented in:

- `/Users/jevangoldsmith/coral-sea-training/js/site-config.js`
- `/Users/jevangoldsmith/coral-sea-training/js/site-integrations.js`
- `/Users/jevangoldsmith/coral-sea-training/courses.html`

The website now:

- creates a persistent anonymous visitor ID
- creates a browser analytics session ID
- stores first-touch attribution:
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_term`
  - `utm_content`
  - `gclid`
  - `fbclid`
  - landing page
  - referrer
- sends page and event data to the metrics ingest endpoint
- attaches attribution to booking payloads
- keeps GA4 event tracking active
- optionally sends events to PostHog if configured

### First Aid Software

Implemented in:

- `/Users/jevangoldsmith/First Aid Software - Pay for results/prisma/schema.prisma`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/modules/metrics/schemas.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/modules/metrics/commands/record-marketing-events.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/modules/metrics/commands/upsert-ad-platform-metrics.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/modules/metrics/queries/get-demand-metrics.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/app/api/metrics/ingest/route.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/app/api/metrics/ad-platform/route.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/app/api/metrics/demand-summary/route.ts`

The app now supports:

- `MarketingEvent` storage
- `AttributionSession` storage
- `AdPlatformDailyMetric` storage
- attribution fields on `PublicBooking`
- summary demand metrics query

## Website Config Required

Set these values in:

- `/Users/jevangoldsmith/coral-sea-training/js/site-config.js`

```js
window.CST_PUBLIC_CONFIG = Object.assign(
  {
    analytics: {
      measurementId: "G-XXXXXXXXXX",
      posthogKey: "phc_xxxxx",
      posthogHost: "https://us.i.posthog.com"
    },
    checkoutEndpoint: "",
    metricsEndpoint: "https://your-first-aid-app-domain.com/api/metrics/ingest",
    publicApiBaseUrl: "https://your-first-aid-app-domain.com/api/public-bookings"
  },
  window.CST_PUBLIC_CONFIG || {}
);
```

Notes:

- `measurementId` is required for GA4
- `posthogKey` and `posthogHost` are optional
- `metricsEndpoint` should point to the app metrics ingest route
- `publicApiBaseUrl` should point to the app booking API base

## First Aid Software Setup Required

### 1. Apply Prisma changes

Run:

```bash
cd "/Users/jevangoldsmith/First Aid Software - Pay for results"
npx prisma migrate dev --name add-demand-metrics
npx prisma generate
```

### 2. Deploy the app with environment variables

Required:

```env
DATABASE_URL=...
NEXT_PUBLIC_APP_URL=https://your-first-aid-app-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_BOOKING_ALLOWED_ORIGINS=https://jgold43.github.io,https://coralseatraining.com.au
METRICS_ALLOWED_ORIGINS=https://jgold43.github.io,https://coralseatraining.com.au
```

### 3. Public routes that must be live

Booking:

- `/api/public-bookings/createCheckoutSession`
- `/api/public-bookings/createBookingRequest`
- `/api/public-bookings/verifyCheckoutSession`
- `/api/public-bookings/stripeWebhook`

Metrics:

- `/api/metrics/ingest`
- `/api/metrics/ad-platform`
- `/api/metrics/demand-summary`

## Third-Party Tools Needed

### GA4

Use for:

- traffic
- source / medium
- campaign attribution
- top-level conversion tracking

### Google Ads

Use for:

- impressions
- clicks
- spend
- CTR
- CPC

Push or sync daily metrics into:

- `POST /api/metrics/ad-platform`

Payload shape:

```json
{
  "metrics": [
    {
      "platform": "google_ads",
      "metricDate": "2026-03-10",
      "accountRef": "123-456-7890",
      "campaignId": "987654321",
      "campaignName": "Townsville Search",
      "adGroupId": "123123123",
      "adGroupName": "First Aid",
      "impressions": 62400,
      "clicks": 2433,
      "spend": 6594.12,
      "conversions": 139
    }
  ]
}
```

### Meta Ads

Optional if used.

Use the same `/api/metrics/ad-platform` route with:

- `platform: "meta_ads"`

### PostHog

Optional but recommended for:

- funnel reports
- heatmaps
- session replay
- experiment analysis

## Dashboard Metrics Available In The App

From:

- `GET /api/metrics/demand-summary`

Current summary includes:

- visitors
- impressions
- clicks
- CTR
- spend
- CPC
- leads
- cost per lead
- visitor to lead rate
- confirmed bookings
- conversion rate
- revenue
- ROAS

## Recommended Implementation Order

1. Deploy `First Aid Software` metrics and booking routes
2. Run Prisma migration
3. Set env vars
4. Add live website config values
5. Add GA4 measurement ID
6. Add PostHog key if using PostHog
7. Start pushing Google Ads daily metrics into `/api/metrics/ad-platform`
8. Build dashboard UI in `First Aid Software` against `/api/metrics/demand-summary`
