# Bye Binge (Project "Pause") — Mode-Adaptive Design System

This document establishes the official design system for **Bye Binge** (Project "Pause"). It adapts the warm, high-hospitality, clear structure of the Airbnb design framework into a dynamic, multi-mode interface tailored for emotional eating crisis intervention. 

The application dynamically shifts its primary interactive surfaces, text accents, and focus states across three personified **Tone Modes**, while maintaining a unified neutral foundation for maximum accessibility, structural stability, and seamless offline caching.

---

## 1. Mode-Based Color Palette & Roles

To trigger a strong psychological loop disruption, toggling a mode completely transforms the application's visual atmosphere. The neutral structural elements remain constant to minimize cognitive load, while the behavioral accents shift.

### 1.1 Neutral Scale & Base Surfaces (Shared Across All Modes)
These colors form the stable background environment of the application, ensuring consistency across all screens.
* **Text Primary (`#222222`)**: Main body text, section headers, and core step labels.
* **Text Secondary (`#6A6A6A`)**: Supporting captions, metadata, and input field placeholders.
* **Text Tertiary (`#C1C1C1`)**: Disabled text labels and inactive states.
* **Pure Black (`#000000`)** & **Pure White (`#FFFFFF`)**: Absolute high-contrast markers and page backgrounds.
* **Surface Light (`#F7F7F7`)**: Section backgrounds, passive dashboard card surfaces.
* **Border Light (`#EBEBEB`)**: Delicate dividers and card perimeter edges.
* **Border Medium (`#DDDDDD`)**: Standard form container outlines and active boundaries.

### 1.2 Mode Specifics

#### Mode A: The Zen Sanctuary (Calm Mode)
*Grounded in warm, soft, non-judgmental behavioral principles. Relies on the core Airbnb-inspired energetic primary palette to evoke feelings of safety, warmth, and hospitality.*
* **Primary Accent (`#FF385C`)**: Main calls-to-action, active selection indicators, and soft highlights.
* **Accent Hover/Active (`#BD1E59`)**: Hover and pressed states for primary elements.
* **Supporting Tone (`#D70466`)**: Secondary visual emphasis, specific completion metrics.
* **Focus Ring (`rgba(255, 56, 92, 0.1)`)**: Soft outer aura for accessible focus styling.

#### Mode B: The Blueprint (Rational Mode)
*Frames the urge as an interesting biochemical feedback loop or a system anomaly. Uses clean, data-driven, analytical cool tones to shift the user from emotional reactivity to logical observation.*
* **Primary Accent (`#1A73E8`)**: Analytical Logic Blue for primary buttons, active telemetry checkboxes, and system progress.
* **Accent Hover/Active (`#1355B0`)**: Deep feedback state for interactives.
* **Supporting Tone (`#00838F`)**: Data Cyan for graph borders, metric charts, and variable filters.
* **Focus Ring (`rgba(26, 115, 232, 0.1)`)**: Structured focus indicator.

#### Mode C: The Indian Auntie (High-Impact Mode)
*Delivers fierce tough love, sharp behavioral disruption, and dramatic protective guidance. Uses commanding, authoritative, deep regal shades to instantly break cognitive momentum.*
* **Primary Accent (`#6C0D63`)**: Matriarchal Plum/Royal Violet for central prompts, validation states, and major callouts.
* **Accent Hover/Active (`#460479`)**: Heavy Purple Dark for hover configurations.
* **Supporting Tone (`#92174D`)**: Burgundy for secondary warning containers and emotional highlights.
* **Focus Ring (`rgba(108, 13, 99, 0.1)`)**: Sharp contrast outline.

---

## 2. Core Components & State Definitions

### 2.1 The Emergency Persistent "STOP" Button
The ultimate circuit breaker. Because emotional urges require an instantaneous, zero-friction path, **this button bypasses all theme mapping and retains a unified, maximum-alert color scheme across all three modes.**
* **Default Background (`#C13515`)**: Error Red for severe priority awareness.
* **Hover/Active Background (`#E00B41`)**: Error Crimson for tactile feedback.
* **Text Color (`#FFFFFF`)**: Pure White bold text.
* **Dimensions**: Height `48px`, Padding `12px 24px`, Border Radius `50px` (Full Pill).
* **Positioning**: Fixed to the bottom viewport boundary with a safe touch layout.

### 2.2 Dashboard Metric Cards (Streak & Counters)
* **Surface background**: `#FFFFFF`, Border `1px solid #EBEBEB`, Border Radius `12px`.
* **Elevation**: Level 1 Shadow (`0px 1px 3px rgba(0, 0, 0, 0.08)`), transition to Level 2 Shadow (`0px 4px 12px rgba(0, 0, 0, 0.12)`) on interaction/hover.
* **Dynamic Data Metric Text**: The numerical streak value text changes dynamically to the active mode’s Primary Accent color (e.g., Violet for Auntie, Blue for Blueprint, Red for Zen) to draw targeted focus.

### 2.3 STEPP Framework Wizard Inputs
Form fields adjust dynamically depending on the active state string variables:
* **Text Inputs**: White background, `8px` border radius, `14px` Medium weight text.
* **Active Selection/Focus**: Boundary line turns into the `active-mode-primary` color with a `3px` focus ring glow.
* **Checkboxes**: Sized at a comfortable `16px` width/height for fast mobile touch target tracking.

---

## 3. Typography & Punctuation Logic

### 3.1 Type Hierarchy Table
The typography is bound strictly to the following framework scales, utilizing light system fonts for zero latency when working offline.

| Role | Size | Weight | Line Height | Application Context |
| :--- | :--- | :--- | :--- | :--- |
| **Display / H1** | 28px | 700 | 40.04px | "STOP" Full-Screen Modal Headings |
| **Heading 2** | 20px | 600 | 28px | Dashboard Segment Titles & STEPP Section Cards |
| **Body Large** | 16px | 400 | 24px | Script Copy & Personified Dynamic Guidance |
| **Body Regular** | 14px | 400 | 20.02px | Core User Logs, Analytics Text, Narratives |
| **Labels / Buttons** | 14px | 600 | 18px | Active CTAs, Form Choices, Table Headers |
| **Caption / Small** | 12px | 400 | 16px | Input Guidance Hints & Timestamp Metadata |

### 3.2 Tone Punctuation Matrix
* **The Zen Sanctuary (Calm)**: **Strictly 0% exclamation marks allowed.** All text properties are softly punctuated to eliminate anxiety and pressure.
* **The Blueprint (Rational)**: Regular technical formatting. Standard punctuation used to display factual feedback loops.
* **The Indian Auntie (High-Impact)**: **Exclamation marks fully unlocked (`!`).** Large text modules combined with high-impact emotional phrasing to deliver immediate tough-love grounding.

---

## 4. Layout & Responsive Breakpoints
* **Base Spacing Increment**: `4px` system (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
* **Touch Targets**: Minimum interactive dimension is strictly capped at `44px` height/width across all platforms.
* **Mobile Framework (320px–767px)**: Fluid single column grids, `16px` page margin.
* **Desktop Container (1024px–1280px)**: Centered container layout bound to `1280px` maximum layout boundary, `48px` outer spacing.
