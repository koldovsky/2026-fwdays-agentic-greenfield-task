# Use TypeScript with Next.js for the frontend

## Context and Problem Statement

The platform ships a static SPA delivered to the browser and served from the single backend container. We must pick the frontend language/framework. Which option should we use?

## Considered Options

* TypeScript + Next.js
* React Native

## Decision Outcome

Chosen option: "TypeScript with Next.js", because TypeScript's strong typing enhances code quality and maintainability and Next.js offers server-side rendering and static site generation that improve performance and SEO. In contrast, React Native is primarily focused on mobile app development, which does not match our web SPA target.

### Consequences

* Good, because SSR/SSG options are available if SEO and first-paint performance become priorities.
* Good, because shared TypeScript contract types can be exported for the backend client once a contract step is introduced.
* Bad, because shipping the production SPA requires a static-export configuration from Next.js, which constrains some runtime features.
