# Notes Manager - Engineering Specification

This document expands the [docs/requirements.md](requirements.md).

# Architecture

-   Next.js App Router
-   React Server Components by default
-   Server Actions for mutations where suitable
-   Route Handlers for REST endpoints
-   Prisma + PostgreSQL
-   Auth.js authentication

# Information Architecture

Dashboard ├── All Notes ├── Favorites ├── Pinned ├── Archive ├── Trash
├── Folders └── Tags

# User Flows

## New User

Landing -\> Register -\> Verify -\> Dashboard -\> Create first note.

## Existing User

Login -\> Dashboard -\> Search/Edit -\> Autosave.

# Feature Specifications

## Authentication

Email/password, verification, reset password, session
persistence.

## Dashboard

Recent notes, pinned notes, quick create, sidebar navigation, search.

## Notes

Fields: - title - content (markdown) - folderId - tags\[\] - color -
isFavorite - isPinned - deletedAt - createdAt - updatedAt

Behavior: - Autosave after 1 second idle - Optimistic UI - Version
timestamp - Soft delete

## Markdown Editor

Headings, tables, checklists, code blocks, syntax highlighting,
drag-drop images, slash commands.

## Search

PostgreSQL full-text search, filters by tags/folder/date/status.

# Database

User - id - name - email - passwordHash - avatar

Folder - id - parentId - userId - name

Tag - id - userId - name - color

Note - id - userId - folderId - title - content - isPinned -
isFavorite - isArchived - deletedAt - timestamps

NoteTag - noteId - tagId

# API

POST /api/auth/login POST /api/auth/register

GET /api/notes POST /api/notes GET /api/notes/:id PATCH /api/notes/:id
DELETE /api/notes/:id

CRUD endpoints for folders and tags.

# Security

HTTPS, CSRF, XSS protection, validation with Zod, rate limiting,
password hashing.

# Performance

Route-level code splitting, lazy loading editor, image optimization,
caching, pagination.

# Testing

Unit, integration, Playwright E2E, Lighthouse.

# Folder Structure

app/ components/ features/ lib/ prisma/ hooks/ types/ styles/

# Roadmap

Phase 1: MVP Phase 2: Sharing Phase 3: Offline sync Phase 4: AI search &
summaries Phase 5: Collaboration

# Acceptance Criteria

Every CRUD action has loading/error states, autosave is reliable,
responsive design works on mobile/tablet/desktop, accessibility passes
WCAG AA.
