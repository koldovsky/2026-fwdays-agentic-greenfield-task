# Requirements Document

**Corporate Procurement and Manufacturing Inventory System**

*Prepared for spec-driven delivery — scope candidate for approval*

## 1. Functional requirements

### Authentication and authorization

| ID | Phase | Area | Description |
|---|---|---|---|
| FR-1 | MVP | Authentication | The login page accepts a username and password and authenticates them server-side against active users. |
| FR-2 | MVP | Authentication | Successful login issues an HTTP-only session cookie and redirects to `/dashboard`. |
| FR-3 | MVP | Authentication | Invalid credentials display a specific inline login error without exposing credential details. |
| FR-4 | MVP | Authentication | Unauthenticated access to protected pages redirects to `/login`. |
| FR-5 | MVP | Authentication | Logout invalidates the session cookie and redirects to `/login`. |
| FR-6 | MVP | Authorization | Admin users can manage users, suppliers, and inventory master settings; Staff users cannot access those mutations. |
| FR-7 | MVP | Authorization | Admin and Staff users can create procurement orders, receive goods, execute manufacturing runs, and view the ledger. |

### Dashboard and inventory visibility

| ID | Phase | Area | Description |
|---|---|---|---|
| FR-8 | MVP | Dashboard | The dashboard shows raw-material inventory value as the sum of quantity multiplied by unit price. |
| FR-9 | MVP | Dashboard | The dashboard shows finished-goods inventory value as the sum of quantity multiplied by unit price. |
| FR-10 | MVP | Dashboard | The dashboard shows the value of purchase orders that are not Received or Closed. |
| FR-11 | MVP | Dashboard | The dashboard lists every item at or below its reorder level with an accessible severity label. |
| FR-12 | MVP | Dashboard | Healthy, low, and critical states are determined from stock and reorder thresholds and are not communicated by color alone. |
| FR-13 | MVP | Navigation | Authenticated users can navigate among Dashboard, Procurement, Manufacturing, and Ledger and can log out. |

### Supplier and inventory master data

| ID | Phase | Area | Description |
|---|---|---|---|
| FR-14 | MVP | Suppliers | An Admin can list and create supplier profiles containing company, contact, lead-time, and rating data. |
| FR-15 | MVP | Suppliers | A Staff user attempting a supplier mutation receives an authorization error and no data changes. |
| FR-16 | MVP | Inventory | Authenticated users can list raw materials and finished goods with SKU, quantity, unit, value, threshold, and status. |
| FR-17 | MVP | Inventory | An Admin can update reorder levels and raw-material stock status using validated values. |

### Procurement and receiving

| ID | Phase | Area | Description |
|---|---|---|---|
| FR-18 | MVP | Procurement | An authorized user can create a purchase order for an existing supplier and material with a positive quantity and unit price. |
| FR-19 | MVP | Procurement | A created purchase order receives a unique human-readable PO number, calculated total, creation timestamp, and Ordered status. |
| FR-20 | MVP | Procurement | The procurement page lists active and received orders with supplier, status, value, and remaining quantities. |
| FR-21 | MVP | Receiving | An authorized user can record a positive receipt quantity that does not exceed the order's remaining quantity. |
| FR-22 | MVP | Receiving | A partial receipt changes the order to Partially Received and leaves the unreceived balance open. |
| FR-23 | MVP | Receiving | Receipt of all remaining units changes the order to Received and records its received timestamp. |
| FR-24 | MVP | Receiving | Each receipt atomically increments raw-material stock, places the received material in `quality_inspection`, and appends a Purchase Order Receipt movement. |
| FR-25 | Future | Procurement | The system supports requisition approval before formal PO issuance. |
| FR-26 | Future | Procurement | The system performs invoice-to-order-to-receipt matching with configurable tolerance. |
| FR-27 | Future | Procurement | The system records payment reconciliation and closes paid orders. |
| FR-28 | Future | Procurement | The system transmits purchase orders to suppliers through an external delivery channel. |

### Manufacturing and BOM

| ID | Phase | Area | Description |
|---|---|---|---|
| FR-29 | MVP | Manufacturing | The manufacturing page lists finished goods and their active BOM versions and components. |
| FR-30 | MVP | Manufacturing | For a positive target quantity, the UI previews each required material quantity as target output multiplied by the BOM factor. |
| FR-31 | MVP | Manufacturing | A run is rejected with material-specific reasons when stock is insufficient or a required material is not `unrestricted`. |
| FR-32 | MVP | Manufacturing | A valid run atomically decrements every required raw material and increments the selected finished good. |
| FR-33 | MVP | Manufacturing | A successful run appends Production Consumption movements for inputs and a Work Order Completion movement for output. |
| FR-34 | MVP | Manufacturing | A failed run leaves raw materials, finished goods, and movement history unchanged. |

### Audit ledger and persistence

| ID | Phase | Area | Description |
|---|---|---|---|
| FR-35 | MVP | Ledger | Authenticated users can view stock movements newest-first with timestamp, item, signed quantity, direction, reason, associated document, and user. |
| FR-36 | MVP | Ledger | Movement records cannot be edited or deleted through the application. |
| FR-37 | MVP | Persistence | All write operations use a FIFO in-process lock and atomic temporary-file replacement. |
| FR-38 | MVP | Persistence | Cross-file writes behave transactionally: validation occurs before persistence and failure does not leave partially updated datasets. |
| FR-39 | MVP | Persistence | References to users, suppliers, materials, products, BOMs, and orders are validated before a related record is written. |

### Analytics roadmap

| ID | Phase | Area | Description |
|---|---|---|---|
| FR-40 | Future | Analytics | The system calculates EOQ from annual demand, administrative order cost, and annual holding cost. |
| FR-41 | Future | Data platform | The JSON repository can be replaced by a relational repository without changing UI-level workflow contracts. |

## 2. Non-functional requirements

| ID | Phase | Category | Description |
|---|---|---|---|
| NFR-1 | MVP | Security | Passwords and session values never appear in client-rendered data, logs, URLs, or error messages. |
| NFR-2 | MVP | Security | Session cookies are HTTP-only, SameSite=Lax, path-scoped to `/`, and Secure in production. |
| NFR-3 | MVP | Security | Every server mutation revalidates authentication, role authorization, and input data. |
| NFR-4 | MVP | Security | The seeded `test` / `test` credential is for local evaluation only and is documented as unsafe for production. |
| NFR-5 | MVP | Reliability | Concurrent writes in one Node.js process are serialized and JSON replacement is atomic. |
| NFR-6 | MVP | Reliability | User input failures produce actionable UI errors rather than generic HTTP 500 responses. |
| NFR-7 | MVP | Performance | With the supplied seed data, protected pages complete server rendering within 1 second on a typical development machine, excluding first compilation. |
| NFR-8 | MVP | Accessibility | Core workflows meet WCAG 2.2 AA expectations, including keyboard operation, visible focus, labels, contrast, and non-color status cues. |
| NFR-9 | MVP | Compatibility | The application supports the latest stable desktop Chrome, Firefox, Safari, and Edge at delivery time. |
| NFR-10 | MVP | Responsive UI | Core pages remain usable from 360px viewport width through desktop widths without horizontal page scrolling. |
| NFR-11 | MVP | Testability | Domain calculations and mutations have automated unit tests; authentication and primary workflows have browser-level tests. |
| NFR-12 | MVP | Maintainability | UI code consumes a typed repository/service interface and does not read JSON files directly. |
| NFR-13 | Future | Availability | A production deployment defines uptime, backup, recovery, and multi-process concurrency targets before replacing JSON storage. |

## 3. Technical constraints

| ID | Phase | Description |
|---|---|---|
| TC-1 | MVP | Use Next.js App Router, React, TypeScript, and server-side route handlers or server actions. |
| TC-2 | MVP | Persist prototype data in the seven specified JSON files: users, suppliers, raw materials, finished goods, BOMs, purchase orders, and stock movements. |
| TC-3 | MVP | Run as a single Node.js server process because the required in-memory lock cannot coordinate multiple instances. |
| TC-4 | MVP | Seed the supplied datasets and the active Admin account `test` / `test`. |
| TC-5 | MVP | Keep all data access behind a unified typed repository boundary. |
| TC-6 | MVP | Use temporary-file writes followed by atomic rename for durable updates. |
| TC-7 | MVP | Use local application authentication; external identity providers are out of MVP scope. |
| TC-8 | Future | PostgreSQL or another RDBMS replaces JSON before horizontal scaling or production use. |

## 4. Business constraints

| ID | Phase | Description |
|---|---|---|
| BC-1 | MVP | Deliver a locally runnable prototype using the supplied manufacturing data and workflows. |
| BC-2 | MVP | Preserve a complete stock-movement audit history for every inventory mutation. |
| BC-3 | MVP | Staff may execute operations but may not alter protected supplier, user, or inventory master data. |
| BC-4 | Future | Production rollout requires secure credential provisioning, persistent shared storage, backup, and operational monitoring. |

## 5. Proposed defaults requiring scope approval

- Treat requisition approval, invoice matching, payment closure, supplier transmission, and EOQ as Future; the MVP implements PO creation through physical receipt.
- Use signed, tamper-evident session tokens rather than storing raw role/user fields in an unsigned cookie.
- Set local session lifetime to 8 hours with no inactivity timer in the MVP.
- Treat `quantity <= 0` as Critical, `0 < quantity <= reorderLevel` as Low, and greater quantities as Healthy.
- On receipt, set the material's entire stock status to `quality_inspection`, matching the supplied flat-file schema, which has no per-lot status.
- Keep the supplied direct-match demo password behavior for local evaluation, isolated behind an auth service; document that production requires password hashing.
- Україномовний інтерфейс; суми у гривнях позначаються суфіксом `грн`, а часові позначки UTC відображаються за українською локаллю.
- Do not add user-management screens to MVP; enforce the supplied Admin/Staff accounts and reserve account administration for Future. Admin authorization is still enforced for supplier and inventory-master changes.
