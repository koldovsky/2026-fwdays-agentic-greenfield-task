# Product Brief — Bye Binge (Project "Pause")

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.
> Tone throughout the product is dynamic, switching vocabulary and delivery style 
> based on the user's selected Personified Tone Mode. No exclamation marks are 
> used in Calm mode, but they are fully unlocked for Auntie mode (BC-BRAND-01).

## What this is

Bye Binge (internally known as "Pause") is a cross-platform, responsive web application designed as an immediate emergency intervention tool for individuals experiencing emotional eating episodes[cite: 1]. The app provides a high-contrast, physical "Stop" mechanism to instantly disrupt impulsive eating behaviors, redirecting users toward a structured psychological reflection framework, secure personal journaling, and proactive progress tracking[cite: 1].

## Who it is for

The primary user is an **individual managing emotional eating, binge behaviors, or impulsive urges**. Unlike fully anonymous apps, this ecosystem relies on a secure, authenticated account structure so users can safely persist their deeply personal reflection history, maintain ongoing progress metrics, and track recovery metrics across devices[cite: 1].

## The pain it addresses

An emotional eating episode or binge urge often sets in with a rapid, overwhelming momentum. In the heat of the moment, breaking the cognitive loop between the emotional trigger (sadness, anxiety, frustration) and the physical action of binging is incredibly difficult[cite: 1]. Most health apps focus on calorie counting or post-episode guilt; they lack an immediate, low-friction circuit breaker.

This product acts as that circuit breaker. It reduces the user's immediate cognitive load down to a single, giant button, immediately replacing the urge to binge with an intuitive, step-by-step psychological grounding sequence[cite: 1].

## Tone Modes (The Voice Matrix)

To maximize psychological disruption and meet users where they are emotionally, the application features an absolute language toggle. The entire application interface—including the STEPP framework queries, success feedback, and dashboard summaries—morphs into one of three distinct personified styles:

| Mode Name | Description & Behavioral Style | Example Interaction ("STOP" Screen) |
| :--- | :--- | :--- |
| **The Zen Sanctuary** (Calm) | Strictly non-judgmental, soft, and warm. Avoids clinical coldness or toxic positivity, relying gently on cognitive behavioral principles to ground you back to center. | *"Take a breath. You are safe here. Let's look together at what your mind is experiencing right now."* |
| **The Blueprint** (Rational) | Logical, matter-of-fact, data-driven, and perfectly balanced. It frames the urge as an interesting biochemical feedback loop or a routine system error to solve. | *"Urge detected. Initializing data logging. Let's isolate the variables and categorize the core trigger to proceed."* |
| **The Indian Auntie** (High-Impact) | Fierce tough love, ultra-judgmental, dramatic, yet deeply protective. Uses zero filter to shock you out of your cognitive loop by guilt-tripping you into making better choices. | *"Haiyaa! What are you doing looking in that fridge again? Put down the chips! Tell your Auntie what is actually bothering you right now!"* |

## End-to-end usage

1. **Onboarding & Setup.** On their first visit, the user goes through a guided onboarding flow[cite: 1]. Rather than forcing early customization, this flow focuses strictly on introducing the core features of the application, explaining the value of the reflection loop, and introducing the 3 Tone Modes so they can choose their initial behavioral guide[cite: 1].
2. **Land on Dashboard.** Once authenticated, the user lands on a clean, grounding dashboard featuring their metrics panel: their current ongoing streak (days without an explicit binge) alongside their cumulative historical count[cite: 1]. The interface also prominently features their Top 3 prioritized alternative tasks and a randomized motivational success story[cite: 1].
3. **Hit the Brake.** When an intense urge strikes, the user opens the app and hits the persistent, high-contrast red button labeled **"STOP"** fixed to the bottom of the viewport[cite: 1]. This action instantly launches a full-screen modal, freezing all other app activity to command absolute focus[cite: 1].
4. **Reflect (The STEPP Model).** The modal initiates a structured wizard that walks the user through a mindful psychological check-in, phrased entirely in the selected Tone Mode[cite: 1]:
   * **Situation/Thought/Emotion:** Categorizing the trigger based on the STEPP framework (Sad, Anxious, Frustrated, Guilty)[cite: 1].
   * **Physical Sensations:** Checking off active bodily states and somatic urges to increase raw self-awareness[cite: 1].
   * **Performance/Precautions:** Identifying specific coping strategies or negative avoidance behaviors currently manifesting[cite: 1].
5. **Resilient Intercepts & Safe Exits.** If a user needs to exit the modal mid-process, they can close it via a confirmation step. If they accidentally close the browser tab or abort midway through, any text or options they have already entered are automatically saved as a persistent local draft so they don't lose their progress.
6. **Grounding Summary.** Upon completing the reflection wizard, the application displays a user-friendly, digestible summary of their current responses formatted through their active mode's lens, paired with a reassuring historical success story to act as an immediate emotional anchor.
7. **Log Progress.** On stable days, the user uses the dashboard to log their progress[cite: 1]. Logging a binge-free day and writing down a narrative success story are entirely decoupled[cite: 1]. The checkbox tracks daily accountability, while success story cards can be added multiple times a day whenever the user feels a moment of triumph[cite: 1].

## Key workflows in prose

* **Intercept an active urge.** The core reactive loop: a user feels an overwhelming impulse to eat, opens the app, presses the fixed "STOP" button, completes the STEPP reflection wizard to break the mental loop, reads their grounding summary, and saves the entry to defuse the immediate crisis[cite: 1].
* **Switching up the reality check.** The adaptive loop: a user finds themselves becoming numb to the "Zen Sanctuary" tone. They jump into settings, toggle to "Indian Auntie", and instantly receive the sharp behavioral disruption they need to halt a looming episode.
* **Review and draw motivation.** The proactive loop: a user opens the dashboard during a vulnerable moment[cite: 1]. If they haven't written any success stories yet, the system rotates through 3 universal, highly relatable recovery stories containing motivational calls-to-action encouraging them to write their own[cite: 1].
* **Log daily accountability.** The evening habit loop: a user opens the dashboard, ticks the completion box to log an explicit day without a binge to progress both their current streak and their lifetime total metrics[cite: 1].

## MVP vs Future boundary

**In the MVP:**
* Responsive, mobile-first React.js frontend integrated with Progressive Web App (PWA) capabilities for robust offline support and local storage caching[cite: 1].
* **State & Sync Stack:** Application state managed locally via Zustand (including `activeToneMode` state storage), with server synchronization, caching, and state hydration handled via TanStack Query.
* **Backend Architecture:** Supabase authentication and relational PostgreSQL storage, managed through Prisma ORM for data safety[cite: 1].
* The 3 language mode variants hardcoded across all UI notification scripts, wizards, and tracking flows.
* The reactive "STOP" flow featuring the fixed anchor button, mid-wizard draft saving, a confirmation exit flow, the STEPP reflection wizard, and a post-reflection summary view[cite: 1].
* The proactive "Progress" flow allowing multiple success story entries per day and standalone daily check-ins[cite: 1].
* Baseline metric counters displaying both **Current Binge-Free Streak** and **Total Lifetime Binge-Free Days**[cite: 1].

**Future (deferred):**
* Integration with wearable biometric alerts to predict urge onset via heart rate spikes.
* Customization of the STEPP framework checklist categories during onboarding[cite: 1].
* AI-generated dynamic text generation for custom tone packs (e.g., "Gordon Ramsay Mode").

## Operating principles

* **Offline-Ready Resilience.** Emotional eating urges don't wait for cell service[cite: 1]. The app must be fully functional offline, allowing local caching of drafts, STEPP wizard submissions, and progress tracking, with background syncing handling database hydration once a network connection returns[cite: 1].
* **Zero Friction to Intercept.** The "STOP" button must remain fixed, universally accessible, and mechanically simple to trigger on any screen size[cite: 1]. When an urge is happening, there must be no loading screens or navigation hurdles standing in the user's way[cite: 1].