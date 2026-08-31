# API SPECIFICATION — LABELGUARD (SIH26034)

## Overview
All REST API endpoints accept and return `application/json` responses unless fetching binary static assets or generated PDF reports.

---

## Endpoint Reference

### Authentication
- `POST /api/auth/login`
  - Body: `{ "username": "officer_sharma" }`
  - Response: User session details and role information.

### Inspections
- `GET /api/inspections`
  - Query Parameters: `status`, `category`, `search`
  - Response: `{ "inspections": [...], "count": 12 }`
- `POST /api/inspections`
  - Body: `{ "product_name": "Tea", "brand": "Golden", "category": "Packaged Foods", "location": "West" }`
  - Response: `{ "message": "Inspection created", "inspection_id": "LM-2026-104921" }`
- `GET /api/inspections/:id`
  - Response: Inspection record, uploaded image details, declarations, compliance checks, and risk score.

### Image & OCR Pipeline
- `POST /api/inspections/:id/images`
  - Form Data: `file` (image binary), `image_type` (front/back/side)
  - Response: Image Quality Analysis metrics (`GOOD`, `FAIR`, `POOR`).
- `POST /api/inspections/:id/ocr`
  - Body: `{ "preset": "demo_product_a" }` (optional)
  - Response: OCR detected regions and mapped structured declarations.

### Human-in-the-Loop Override
- `POST /api/inspections/:id/correct`
  - Body: `{ "field_key": "mrp", "corrected_value": "MRP ₹275.00", "reason": "Officer correction" }`
  - Response: Confirmation and logged audit event.

### Compliance & Reports
- `POST /api/inspections/:id/compliance-check`
  - Executes versioned deterministic Legal Rule Engine.
  - Response: Passed/Failed/Review check breakdown.
- `POST /api/inspections/:id/report`
  - Response: `{ "download_url": "/static/uploads/Inspection_Report_LM-2026-104921.pdf" }`

### Analytics & Rules
- `GET /api/analytics` — High-level metrics, violation charts, and repeat manufacturers.
- `GET /api/rules` — List Legal Metrology rule versions.
- `GET /api/audit-logs` — Immutable audit trail.
- `GET /api/risk-priorities` — Priority queue.
- `POST /api/demo/preload` — Seed preloaded Hackathon demo products.
