# PRD — Bye Binge (Project "Pause")

This document serves as the **single source of truth** for what the application does and what constraints govern its construction. Every requirement features a stable, unique identifier to ensure absolute traceability across code, testing, and implementation.

Refer to the Product Brief for the business narrative and behavioral context.

## ID conventions

| Prefix | Meaning | Example |
| :--- | :--- | :--- |
| `FR-*` | Functional Requirement | `FR-STOP-01` — persistent emergency stop intercept |
| `NFR-*` | Non-Functional Requirement | `NFR-OFFLINE-01` — offline PWA operation |
| `TC-*` | Technical Constraint | `TC-STACK-01` — frontend and data synchronization stack |
| `BC-*` | Business / UX Constraint | `BC-BRAND-01` — personified tone voice rules |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

---

## Functional requirements

### Onboarding & Setup

| ID | Description | Status |
| :--- | :--- | :--- |
| FR-ONB-01 | Guided first-visit onboarding flow introducing application features, the value of the reflection loop, and the 3 core Tone Modes. | proposed |
| FR-ONB-02 | User authentication setup via a secure account structure to persist reflection history and metrics safely across devices. | proposed |

### Dashboard & Metrics

| ID | Description | Status |
| :--- | :--- | :--- |
| FR-DASH-01 | Clean, grounding post-authentication landing interface featuring user metrics, prioritized alternative tasks, and motivational messaging. | proposed |
| FR-DASH-02 | Render metric counters displaying the user's **Current Binge-Free Streak** (consecutive days without an explicit binge) and **Total Lifetime Binge-Free Days**. | proposed |
| FR-DASH-03 | Render a panel prominently highlighting the user's Top 3 prioritized alternative tasks. | proposed |
| FR-DASH-04 | Display a rotating motivational success story. If no user stories exist, rotate through 3 universal, highly relatable recovery stories containing a call-to-action. | proposed |

### The Emergency Intercept ("STOP" Mechanism)

| ID | Description | Status |
| :--- | :--- | :--- |
| FR-STOP-01 | High-contrast, red interactive action element labeled **"STOP"** fixed statically to the bottom of the viewport across all app views. | proposed |
| FR-STOP-02 | Triggering the "STOP" element launches a full-screen modal container that freezes all background application activity to capture absolute user focus. | proposed |
| FR-STOP-03 | Safe exit handling: closing the modal midway requires an explicit user confirmation step to prevent accidental cancellation. | proposed |
| FR-STOP-04 | Local draft persistence: if the application is closed or aborted mid-wizard, any inputs are saved locally as a persistent draft. | proposed |

### Reflection Wizard (The STEPP Model)

| ID | Description | Status |
| :--- | :--- | :--- |
| FR-REFL-01 | The emergency modal initiates a structured, step-by-step wizard guided entirely through the copy requirements of the active Tone Mode. | proposed |
| FR-REFL-02 | **STEPP Framework - Phase 1 (Situation/Thought/Emotion):** Multiple-choice categorizations mapping the core emotional trigger (Sad, Anxious, Frustrated, Guilty). | proposed |
| FR-REFL-03 | **STEPP Framework - Phase 2 (Physical Sensations):** Checklist matrix to evaluate active bodily states and somatic urges to elevate raw self-awareness. | proposed |
| FR-REFL-04 | **STEPP Framework - Phase 3 (Performance/Precautions):** Discerning specific active coping strategies or negative avoidance behaviors. | proposed |
| FR-REFL-05 | **Grounding Summary:** Display an immediate, digestible post-reflection response summary styled according to the active Tone Mode, paired with a historical success story. | proposed |

### Progress & Success Logging

| ID | Description | Status |
| :--- | :--- | :--- |
| FR-LOG-01 | Independent progress actions enabling users to log an explicit binge-free day and document a narrative success story as fully decoupled actions. | proposed |
| FR-LOG-02 | Accountable daily tracking checkbox that increments the user's current streak and lifetime metrics. | proposed |
| FR-LOG-03 | Success story entry flow allowing multiple narrative success entries to be recorded per day whenever a milestone is achieved. | proposed |

### Persona Tone Settings

| ID | Description | Status |
| :--- | :--- | :--- |
| FR-TONE-01 | Absolute language toggle accessible via application settings that instantly transforms all UI text, wizard queries, feedback, and dashboards. | proposed |
| FR-TONE-02 | Support for **The Zen Sanctuary (Calm)**: Soft, non-judgmental wording relying on cognitive behavioral principles. | proposed |
| FR-TONE-03 | Support for **The Blueprint (Rational)**: Logical, data-driven, and analytical vocabulary treating urges as system variations. | proposed |
| FR-TONE-04 | Support for **The Indian Auntie (High-Impact)**: Fierce tough love, ultra-judgmental, dramatic, and protective scripting. | proposed |

---

## Non-functional requirements

| ID | Description | Status |
| :--- | :--- | :--- |
| NFR-PERF-01 | Zero-friction modal mounting: triggering the "STOP" intercept must execute instantly without loading screens or navigation blockades. | proposed |
| NFR-OFFLINE-01| Offline-Ready Resilience: complete offline capability for local caching of drafts, STEPP submissions, and progress logs. | proposed |
| NFR-A11Y-01 | Mobile-first, high-contrast visual design prioritizing accessibility for users under intense cognitive and emotional load. | proposed |

---

## Technical constraints

| ID | Description | Status |
| :--- | :--- | :--- |
| TC-STACK-01 | Frontend: Responsive, mobile-first web app utilizing React.js integrated with Progressive Web App (PWA) capabilities. | accepted |
| TC-STACK-02 | Local State: Application state and active tone configurations managed locally via Zustand. | accepted |
| TC-STACK-03 | Synchronization: Data hydration, background caching, and server syncing managed via TanStack Query. | accepted |
| TC-STACK-04 | Backend Services: Supabase infrastructure for secure user authentication and relational database services. | accepted |
| TC-STACK-05 | Database Mapping: PostgreSQL database layer managed through Prisma ORM to guarantee structural safety. | accepted |
| TC-TEXT-01 | Language variants across UI scripts, wizards, and progress flows must be entirely hardcoded in the codebase for MVP delivery. | proposed |

---

## Business / UX constraints

| ID | Description | Status |
| :--- | :--- | :--- |
| BC-BRAND-01 | Exclamation rules: strict prohibition of exclamation marks (`!`) when operating in **Calm** mode; fully unlocked for **Auntie** mode. | proposed |
| BC-PRIVACY-01 | Deeply personal reflection, journaling data, and progress history must be structurally isolated, securely encrypted, and authenticated. | accepted |

---

## Out of scope (MVP)

The following capabilities are explicitly deferred to future release cycles:
* Real-time integration with wearable biometrics to flag sudden heart rate spikes.
* Customization of the default STEPP framework checklist categories during onboarding.
* AI-driven dynamic text generation engines for custom external tone packs.
