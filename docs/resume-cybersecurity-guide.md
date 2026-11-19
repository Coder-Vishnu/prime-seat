# Prime Seat: Cybersecurity & Software Engineering Career Guide

> **Author:** Vishnu Venkatesan (B.S. Computer Science, M.S. Cybersecurity Engineering)  
> **Target:** Technical Resume Bullet Points, Systems Security Framing & Legal Due Diligence  
> **Project:** Prime Seat (Real-Time State Differential & Telemetry Pipeline)

---

## 1. Terms of Service & Legal Framework

### 1.1 Computer Fraud and Abuse Act (CFAA) Compliance
* **Precedent:** In *hiQ Labs v. LinkedIn (9th Cir. 2022)*, the United States Court of Appeals affirmed that scraping or automated querying of **publicly available data** that is not protected by an authentication wall, password, or account barrier does not constitute unauthorized access under the CFAA.
* **Public Availability:** AMC showtime schedules and seating layout availability matrices are published publicly to anyone opening a browser without requiring an account login, member credentials, or payment.

### 1.2 Non-Commercial Observability vs. Scalping
* **The Critical Legal Boundary:** Automated purchasing bots, bulk inventory hoarding, and credit card auto-checkout violate federal/state anti-bot laws (e.g., the BOTS Act of 2016) and trigger merchant fraud investigations.
* **Prime Seat's Architectural Boundary:** Prime Seat does **not** automate purchasing, does not hold seats, and does not interact with financial payment gateways. It operates strictly as a **read-only client observability and notification service** that directs a human user to AMC's official checkout page.

---

## 2. Public Repository Due Diligence

Add the following explicit disclaimer to your public `README.md`:

```markdown
### Academic & Educational Disclaimer
> **Notice:** This repository is an academic systems engineering and security case study demonstrating vectorized 2D state differential algorithms, defensive fail-closed ingestion boundaries, and event-driven mobile push architectures. It is strictly non-commercial and intended for personal educational research. All trademarks and brand names belong to their respective owners.
```

---

## 3. Professional Terminology Guide

When presenting this project to recruiters, hiring managers, and cybersecurity interviewers:

| ❌ What NOT to Say | ✅ Professional Engineering & Security Terminology |
| :--- | :--- |
| "Scraper" / "Bot" | **"Resilient Ingress Engine"** or **"Telemetry Collector"** |
| "Bypassing Cloudflare" | **"WAF Behavior Analysis & Stealth Fingerprint Mitigation"** |
| "Sniping Seats" | **"Real-Time State Differential & Churn Detection Pipeline"** |
| "AMC Scraper App" | **"High-Throughput Vectorized Seat State Transition Monitor"** |

---

## 4. Tailored Resume Entries

### Track A: Cybersecurity Engineering (Primary Focus)

```text
Prime Seat — Real-Time State Differential & Telemetry Pipeline
Python, FastAPI, PyTorch, NumPy, Pydantic v2, Next.js 15, Playwright
• Architected a fail-closed ingestion boundary using Pydantic v2 and defensive typing, mitigating adversarial payload fuzzing, unmapped enum injections, and state replay attacks.
• Analyzed modern Web Application Firewall (WAF) mitigations (Cloudflare Turnstile, browser fingerprinting, TLS canvas signatures), engineering stealth headless sessions for resilient telemetry ingestion.
• Implemented a high-throughput 2D NumPy diff engine (Dt = Mt-1 ⊙ (1 - Mt)) executing SIMD bitmask comparisons in < 2ms to detect state transitions across large coordinate grids.
• Built an imbalanced PyTorch churn classifier using weighted binary cross-entropy loss (45:1 ratio) to score real-time inventory drop probabilities under heavy class scarcity.
• Designed a secure, zero-trust mobile push dispatch pipeline routing urgent prioritized alerts to Apple Watch and iOS via ephemeral webhook channels.
```

### Track B: Full-Stack Systems & Distributed Backend

```text
Prime Seat — Distributed Real-Time Seat Reclamation & Alert Platform
TypeScript, Next.js 15, React 19, Python, NumPy, Playwright, Vercel, GitHub Actions
• Developed a full-stack Next.js 15 PWA featuring a reactive SVG seating canvas with sub-50ms localized DOM re-rendering across 350-seat premium auditoriums.
• Constructed an autonomous 24/7 cloud polling architecture utilizing GitHub Actions schedulers and Vercel edge functions, achieving continuous uptime with zero local host battery drain.
• Built a Playwright-based network response interceptor sniffing internal REST payloads to extract real-time venue telemetry without brittle HTML DOM parsing.
• Modeled exact architectural seating coordinates for PLF venues (Dolby Cinema, IMAX with Laser, RealD 3D) with persistent browser alert storage and direct vendor checkout deep-linking.
```

---

## 5. Technical Interview Deep-Dive Talking Points

When an interviewer asks you about this project:

1. **Defensive Ingestion (`Module 01`):**  
   *Explain why you didn't trust raw network data: incoming payloads can contain corrupted geometries, unexpected status strings, or out-of-bounds coordinates. You used Pydantic v2 with `extra="forbid"` and strict regex validators so that malformed payloads fail closed before touching NumPy memory.*
2. **Computational Performance (`Module 02`):**  
   *Explain why you used NumPy bitmasks instead of looping through JSON objects: Python `for` loops on 350-seat arrays take 15–30ms; converting to contiguous C-order binary matrices and computing $D_t = M_{t-1} \odot (1 - M_t)$ drops latency to $< 0.02\text{ms}$ (a 750× speedup).*
3. **Machine Learning Class Imbalance (`Module 04`):**  
   *Explain that prime seat cancellations are rare events ($< 2\%$ of seats churn). A standard cross-entropy model would simply predict 0% churn and get 98% accuracy while being completely useless. You implemented a custom `pos_weight = 45.0` in PyTorch's BCE loss to force the model to learn true churn signals.*
4. **Security & WAF Fingerprinting (`Module 06`):**  
   *Discuss what you learned about browser fingerprinting: modern WAFs inspect `navigator.webdriver`, WebGL vendor strings, canvas hashes, and TCP/TLS handshakes. Discuss how understanding bot mitigation makes you a stronger defensive engineer.*
