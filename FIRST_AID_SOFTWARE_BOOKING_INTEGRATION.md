# First Aid Software Booking Integration

This site is now prepared to send public bookings to the `First Aid Software - Pay for results` app through a stable public API boundary.

## What The Website Expects

Set the live booking API base in:

- `/Users/jevangoldsmith/coral-sea-training/js/site-config.js`

Use:

```js
publicApiBaseUrl: 'https://your-first-aid-app-domain.com/api/public-bookings',
```

If `publicApiBaseUrl` is set, the website will call:

- `POST /createCheckoutSession`
- `POST /createBookingRequest`
- `POST /verifyCheckoutSession`

## Payload The Website Sends

The booking funnel now sends:

- `idempotencyKey`
- `courseName`
- `courseCode`
- `pricePerPerson`
- `partySize`
- `addOns`
- `participants`
- `customerEmail`
- `customerName`
- `customerPhone`
- `sessionId`
- `sessionLabel`
- `location`
- `employer`
- `successUrl`
- `cancelUrl`

## First Aid Software App Work Required

The following must exist and be deployed in the app:

### 1. Prisma schema

Apply the schema change in:

- `/Users/jevangoldsmith/First Aid Software - Pay for results/prisma/schema.prisma`

This adds:

- `PublicBooking`
- relation from `Booking` to `PublicBooking`

Run:

```bash
cd "/Users/jevangoldsmith/First Aid Software - Pay for results"
npx prisma migrate dev --name add-public-bookings
npx prisma generate
```

### 2. Environment variables

Set:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- optional: `PUBLIC_BOOKING_ALLOWED_ORIGINS`

Recommended:

```env
NEXT_PUBLIC_APP_URL=https://your-first-aid-app-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_BOOKING_ALLOWED_ORIGINS=https://jgold43.github.io,https://coralseatraining.com.au
```

### 3. Public booking API routes

These routes must be deployed:

- `/api/public-bookings/createCheckoutSession`
- `/api/public-bookings/createBookingRequest`
- `/api/public-bookings/verifyCheckoutSession`
- `/api/public-bookings/stripeWebhook`

Source files:

- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/app/api/public-bookings/createCheckoutSession/route.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/app/api/public-bookings/createBookingRequest/route.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/app/api/public-bookings/verifyCheckoutSession/route.ts`
- `/Users/jevangoldsmith/First Aid Software - Pay for results/src/app/api/public-bookings/stripeWebhook/route.ts`

### 4. Stripe webhook

Create a Stripe webhook endpoint pointing to:

```text
https://your-first-aid-app-domain.com/api/public-bookings/stripeWebhook
```

Enable at least:

- `checkout.session.completed`

## What The App Now Does

When the website submits a booking:

1. Validates the request
2. Creates or reuses a `PublicBooking` using the idempotency key
3. Creates a native `Booking`
4. Creates `Learner` rows from participant data
5. Creates `Enrollment` rows if `sessionId` matches a native session
6. Creates a Stripe Checkout session
7. Marks payment as paid on webhook or verification
8. Creates a native `Payment`

## Final Website Step

Once the app is live, update:

- `/Users/jevangoldsmith/coral-sea-training/js/site-config.js`

with the real:

```js
publicApiBaseUrl: 'https://your-first-aid-app-domain.com/api/public-bookings',
```

Then deploy the website.
