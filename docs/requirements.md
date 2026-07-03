# Notes Manager --- Overview Product Requirements Document (PRD)

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/PRD.md](PRD.md) for narrative context.

## Requirement ID Convention

  Prefix     Description
  ---------- ----------------------------
  FR-xxx     Functional Requirement
  NFR-xxx    Non-Functional Requirement
  UI-xxx     User Interface Requirement
  SEC-xxx    Security Requirement
  DATA-xxx   Data Requirement
  API-xxx    API Requirement
  INT-xxx    Integration Requirement
  ACC-xxx    Acceptance Criteria
  FUT-xxx    Future Enhancement

# Functional Requirements

## Authentication

  ------------------------------------------------------------------------
  ID         Requirement                        Priority
  ---------- ---------------------------------- --------------------------
  FR-001     The system shall allow users to    High
             register using an email and        
             password.                          

  FR-002     The system shall allow users to    High
             authenticate using an email and        
             password.                

  FR-003     The system shall maintain          High
             authenticated sessions across      
             browser refreshes.                 
  ------------------------------------------------------------------------

## Notes

  ------------------------------------------------------------------------
  ID         Requirement                        Priority
  ---------- ---------------------------------- --------------------------
  FR-020     Users shall be able to create a    High
             new note.                          

  FR-021     Users shall be able to edit        High
             existing notes.                    

  FR-022     The system shall automatically     High
             save note changes after one second 
             of inactivity.                     

  FR-023     Users shall be able to duplicate   Medium
             notes.                             

  FR-024     Users shall be able to soft-delete High
             notes.                                  
  ------------------------------------------------------------------------

## Search

  ------------------------------------------------------------------------
  ID         Requirement                        Priority
  ---------- ---------------------------------- --------------------------
  FR-060     The system shall provide full-text High
             search across note titles and      
             content.                           

  FR-061     Users shall be able to filter      High
             notes by folder.                   

  FR-062     Users shall be able to filter      High
             notes by tags.                     

  FR-063     Users shall be able to filter      Medium
             notes by date range.               

  FR-064     Search results shall update        High
             dynamically while the user types.  
  ------------------------------------------------------------------------

# Non-Functional Requirements

  -----------------------------------------------------------------------
  ID               Requirement
  ---------------- ------------------------------------------------------
  NFR-001          Initial page load shall be less than 2 seconds.

  NFR-002          Search responses shall be returned within 300 ms.

  NFR-003          Lighthouse Performance score shall be at least 95.

  NFR-004          The application shall comply with WCAG 2.2 AA.

  NFR-005          The application shall support desktop, tablet, and
                   mobile devices.
  -----------------------------------------------------------------------

# Security Requirements

  ID        Requirement
  --------- ------------------------------------------------------------
  SEC-001   Passwords shall be stored using Argon2 or bcrypt.
  SEC-002   All user input shall be validated on client and server.
  SEC-003   The application shall protect against CSRF attacks.
  SEC-004   User-generated Markdown shall be sanitized to prevent XSS.

# Data Requirements

  -----------------------------------------------------------------------
  ID               Requirement
  ---------------- ------------------------------------------------------
  DATA-001         Every note shall belong to exactly one user.

  DATA-002         Notes may belong to one folder.

  DATA-003         Notes may have multiple tags.

  DATA-004         Deleted notes shall be retained for 30 days before
                   permanent removal.
  -----------------------------------------------------------------------

# UI Requirements

  ID       Requirement
  -------- ------------------------------------------------------
  UI-001   The application shall support light and dark themes.
  UI-002   The editor shall support keyboard shortcuts.
  UI-003   The sidebar shall be collapsible.
  UI-004   The layout shall adapt from 320px to 4K displays.

# Traceability

The companion **PRD** expands each requirement (for example,
FR-022, SEC-004, NFR-002) with implementation details, workflows, APIs,
data models, edge cases, and acceptance criteria.
