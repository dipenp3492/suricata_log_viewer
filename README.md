# Suricata EVE Log Viewer

A single-page, client-side viewer for [Suricata] EVE JSON logs. Load a `.jsonl` file (or let it auto-load a bundled sample) and browse, filter, and search parsed events in a dashboard UI — no backend required.

## Features

- **Drag-free file upload** — load any local EVE JSONL file via the "Load EVE File" button.
- **Auto-load sample data** — [data/eve-sample.jsonl](data/eve-sample.jsonl) loads automatically on page open.
- **JSONL parsing with error tracking** — each line is parsed independently; malformed lines are reported separately as "Skipped Records" instead of failing the whole file.
- **Filtering & search** — filter by `event_type` (alert, dns, http, flow, fileinfo, ssh, anomaly, tls, stats, ...) and free-text search across the raw JSON of each record.
- **Sorting** — sort visible events by timestamp, newest or oldest first.
- **Per-type summaries** — alerts, DNS, HTTP, flow, and file events get tailored one-line summaries; alerts additionally show a severity badge (HIGH/MEDIUM/LOW).
- **Event cards** — each event shows its type, icon, timestamp, summary, source/destination endpoints, protocol, and contextual meta chips (line number, flow ID, interface, action, app protocol), plus a collapsible raw JSON view.
- **Live counters** — total events, visible events (post-filter), security alerts, and parse errors.

## Design

The dashboard UI is styled with a custom, hand-written stylesheet ([css/style.css](css/style.css)) inspired by the [AdminLTE](https://adminlte.io/) admin dashboard theme — a dark sidebar with a circular brand icon, colored "small-box" stat widgets, and flat Bootstrap-style cards/buttons with tight corner radii. No AdminLTE or Bootstrap files are included; only the look is used as a visual reference.

## Getting Started

This is a static site with no build step or server-side dependency (beyond serving the files over HTTP, since the sample data is loaded via `fetch`/AJAX).

1. Serve the project directory with any local web server, e.g. via XAMPP:
   ```
   http://localhost/suricata-log-viewer/
   ```
2. Open `index.html` in a browser.
3. The bundled sample file loads automatically, or click **Load EVE File** to load your own `.jsonl`/`.json`/`.txt` EVE log.

> Opening `index.html` directly via `file://` will work for manual file uploads, but the auto-load of the sample file may be blocked by the browser's CORS/file-access restrictions — use a local server instead.

## Project Structure

```
index.html          Page markup, layout, and event/error card templates
css/style.css        Styling for the dashboard, cards, and badges
js/log-viewer.js      All application logic (parsing, filtering, rendering)
data/eve-sample.jsonl Sample EVE JSON log used for auto-load on page open
```

## How It Works

- `log-viewer.js` reads the uploaded/loaded text, splits it into lines, and `JSON.parse`s each one. Valid records and parse errors are tracked separately in a `state` object.
- The event type `<select>` is populated dynamically from the distinct `event_type` values found in the loaded records.
- Filtering, searching, and sorting are all recomputed client-side on every input change and re-render the event list.
- Each event card is built by cloning a hidden `<template>`-style element in `index.html` and filling in fields based on the event's `event_type`.

## Supported Event Types

Alerts, DNS, HTTP, flow, file info, SSH, TLS, anomaly, and stats events have dedicated summaries and icons. Any other `event_type` falls back to a generic "network security event" summary.

## Browser Support

Built with jQuery 3.7 (loaded via CDN) and vanilla ES5-style JavaScript; works in any modern browser.

> **Note:** We already have an error logging mechanism in RecurPost. We have developed a dedicated screen to review and analyze these errors, which will help us identify recurring issues, investigate them efficiently, and create tickets for future resolution and tracking.