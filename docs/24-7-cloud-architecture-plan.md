# 24/7 Cloud Architecture & Mobile Push Notification Plan

> **Project:** Prime Seat (AMC Tysons Corner 16 Dedicated Monitor)  
> **Target:** 24/7 Always-On Cloud Ingress, Zero-Host Local Battery Drain, Instant iPhone & Apple Watch Alerts  
> **Status:** Architecture Blueprint Saved for Staged Implementation  

---

## 1. Executive Summary

The objective is to liberate Prime Seat from running on a local development laptop. The system will run completely autonomously in the cloud 24 hours a day, 7 days a week:
1. **Cloud Web App:** Next.js 15 PWA hosted on Vercel with automated global HTTPS and iOS Safari Home Screen optimization.
2. **Cloud Polling Engine:** Background serverless cron / worker that monitors AMC Tysons showtime and seat availability diffs continuously.
3. **Instant Mobile Alerts:** High-priority push notifications routed through `ntfy.sh` (or APNs Web Push), buzzing the user's **iPhone lock screen** and tapping their **Apple Watch** with haptic feedback and a direct AMC checkout button.

---

## 2. Cloud Architecture Pipeline

```
                                      ┌─────────────────────────────────────┐
                                      │   AMC Theatres Official API         │
                                      │   api.amctheatres.com (Vendor Key)  │
                                      └──────────────────┬──────────────────┘
                                                         │
                                                         ▼
                                      ┌─────────────────────────────────────┐
                                      │  Vercel / Cloud Background Worker   │
                                      │  • Runs every 1–2 minutes           │
                                      │  • Computes seat vacancy diff:      │
                                      │    Dt = M(t-1) ⊙ (1 - Mt)           │
                                      └──────────────────┬──────────────────┘
                                                         │ (When Seat Vacates)
                                                         ▼
                                      ┌─────────────────────────────────────┐
                                      │   ntfy.sh Mobile Push Relay         │
                                      │   Priority: URGENT (Bypasses DND)   │
                                      └──────────────────┬──────────────────┘
                                                         │
                             ┌───────────────────────────┴───────────────────────────┐
                             ▼                                                       ▼
              ┌─────────────────────────────┐                         ┌─────────────────────────────┐
              │       iPhone (iOS)          │                         │       Apple Watch           │
              │ • Banner + Sound            │                         │ • Wrist Taptic Tap          │
              │ • Action: [🎟 Claim on AMC]  │                         │ • Instant Claim Prompt      │
              └─────────────────────────────┘                         └─────────────────────────────┘
```

---

## 3. Technology Stack & Hosting Plan

### Frontend & API Gateway: Vercel (Hobby Tier — 100% Free)
- **Deployment:** Git-connected automatic deployments on push to `main`.
- **URL:** Custom HTTPS domain (e.g. `prime-seat-tysons.vercel.app`).
- **Features:**
  - Fast responsive mobile UI optimized for iOS Safari standalone mode (`display: standalone`).
  - Edge caching (`revalidate = 300`) for showtime catalog data.
  - Native App Router endpoints `/api/showtimes` and `/api/alerts/test`.

### Monitoring Engine: 24/7 Cloud Ingress Options
- **Option A (Vercel Cron):** Scheduled invocations hitting `/api/cron/poll-tysons` every 1 minute.
- **Option B (Free Render / Railway Worker):** Persistent Python/Node background worker executing the NumPy state diff engine ($D_t = M_{t-1} \odot (1 - M_t)$).

### Notification Dispatcher: `ntfy.sh`
- **Topic:** Private secret topic (e.g. `prime-seat-tysons-user-secret`).
- **Payload:**
  ```json
  {
    "topic": "prime-seat-tysons-secret",
    "title": "⚡ PRIME SEAT OPEN: Dune: Part Two",
    "message": "Row E, Seat 14 just dropped in Auditorium 11 (Dolby Cinema)! Click to claim immediately.",
    "priority": 5,
    "tags": ["cinema", "zap"],
    "click": "https://www.amctheatres.com/checkout/..."
  }
  ```
- **Device Support:** Native iOS notification with Apple Watch mirrored haptics.

---

## 4. Implementation Stages

| Stage | Focus | Status |
| :--- | :--- | :--- |
| **Stage 1** | Local Testing with AMC Developer Vendor Key & Test Push Notifications | **Active (Current Step)** |
| **Stage 2** | Git repository push and Vercel cloud deployment | Queued |
| **Stage 3** | Cloud cron worker configuration for 24/7 automated monitoring | Queued |
| **Stage 4** | End-to-end verification on iPhone Safari Home Screen & Apple Watch | Queued |
