# ARCHITECTURE — LABELGUARD Platform (SIH26034)

## Architecture Overview

LABELGUARD follows a decoupled, modular multi-tier architecture designed around the principle: **AI extracts. Rules validate. Evidence explains. Humans decide.**

```text
+-----------------------------------------------------------------------+
|                         Enforcement Web UI                            |
| (HTML5 Canvas Bounding Box Visualizer / SPA Router / Role Selector)   |
+-----------------------------------------------------------------------+
                                   | REST API (JSON)
+-----------------------------------------------------------------------+
|                             Flask Backend                             |
|  - API Controller Blueprint                                           |
|  - Auth & RBAC Security Layer                                         |
+-----------------------------------------------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                         |                         |
         v                         v                         v
+------------------+     +------------------+     +------------------+
| Quality Service  |     |   OCR Service    |     |  Rule Engine     |
| Blur / Contrast  |     | Region Detection |     | 2011/2023 Rules  |
+------------------+     +------------------+     +------------------+
         |                         |                         |
         +-------------------------+-------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                        SQLite / PostgreSQL Storage                    |
| Inspections | Declarations | Compliance Checks | Risk | Audit Logs   |
+-----------------------------------------------------------------------+
```

## System Layers

1. **Presentation Layer**: SPA built with HTML5 Canvas, Tailwind CSS design system, and custom JavaScript routing for responsive desktop and tablet deployment.
2. **REST API Layer**: Flask Blueprint routing providing authenticated API endpoints.
3. **Domain Engine Layer**:
   - `ImageQualityService`: Sharpness variance, glare percentage, luminance, and resolution analyzer.
   - `OCRService`: Region detection abstraction with bounding box output.
   - `LegalRuleEngine`: Version-aware deterministic validator.
   - `EvidenceService`: Interactive region highlighter.
   - `RiskService`: Transparent operational priority matrix.
   - `PDFReportService`: Multi-page certificate compiler using ReportLab.
4. **Storage Layer**: SQLite schema with relational integrity and seed data for Legal Metrology Rules.
