# How to Update Course Schedules

All course dates, times, and seat availability are managed in one file:

**`data/sessions.json`**

## Adding a New Session

Open `data/sessions.json` and find the course you want to add a date to. Inside `locations > [location] > sessions`, add a new session object:

```json
{
  "id": "tsv-011-2026-05-10",
  "dateISO": "2026-05-10",
  "label": "Sun 10 May",
  "start": "08:30",
  "end": "16:30",
  "seatsLeft": 10
}
```

**Field reference:**
- `id` — Unique identifier. Format: `[location]-[course]-[date]` (e.g., `tsv-011-2026-05-10`)
- `dateISO` — Date in `YYYY-MM-DD` format. Sessions before today are automatically hidden
- `label` — Short display label (e.g., "Sun 10 May"). This is what users see
- `start` / `end` — Session times in 24hr format
- `seatsLeft` — Current available seats. Update this as bookings come in

## Removing a Session

Delete the session object from the `sessions` array. Past dates are automatically hidden, so you only need to remove cancelled sessions.

## Updating Prices

Prices appear in two places — update both:

1. **`data/sessions.json`** — the `price` field on each course object
2. **`js/course-data.js`** — the `price` and `priceLabel` fields

## Controlling Seat Count Display

In `data/sessions.json`, the `meta` section controls global settings:

```json
"meta": {
  "showSeatCounts": true,
  "confirmationSLAHours": 2
}
```

- Set `showSeatCounts` to `false` to hide seat numbers and show "Limited seats" instead
- Set `confirmationSLAHours` to match your actual response time

## Adding a New Location

1. In `data/sessions.json`, add a new key under `locations` for each course:

```json
"newlocation": {
  "label": "New Location Name",
  "address": "123 Street, Town QLD 4000",
  "sessions": []
}
```

2. Also update `js/course-data.js` to add the new location's date array
3. Update location dropdowns in `courses.html` and `book.html`
