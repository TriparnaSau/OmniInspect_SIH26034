# OmniInspect — AI-Assisted Legal Metrology Compliance & Digital Inspection Platform

**Official Problem Statement: SIH26034 (Ministry of Consumer Affairs, Food & Public Distribution)**
**Hackathon Target: Smart India Hackathon 2026**
**Tagline: SCAN. VERIFY. EXPLAIN. ENFORCE.**

---

## 🛡️ Core Philosophy

> **AI extracts. Rules validate. Evidence explains. Humans decide.**

OmniInspect converts physical package labels into structured, versioned, explainable legal metrology compliance determinations. The platform supports Legal Metrology Officers, Supervisors, Auditors, and System Administrators in verifying Packaged Commodity declarations under the **Legal Metrology (Packaged Commodities) Rules, 2011** and subsequent **2022 & 2023 Amendments**.

---

## ✨ Key Features

1. **Deterministic Versioned Legal Metrology Rule Engine**:
   - Evaluates MRP, Unit Sale Price (USP), Net Quantity (SI Units), Date of Manufacture/Packaging/Import, Manufacturer/Packer Postal Address, Country of Origin, Consumer Care Details, and Calibration-aware Font Size checks.
   - Retains historical rule versions so past inspections remain immutable.

2. **Interactive Visual Evidence Engine**:
   - Bounding-box package canvas viewer with instant zoom/highlight for flagged legal findings.

3. **Image Quality Assessment Pipeline**:
   - Computes blur (Laplacian variance), resolution, brightness, glare percentage, and readability scores (`GOOD`, `FAIR`, `POOR`) prior to text extraction.

4. **Human-in-the-Loop & Immutable Audit Trail**:
   - Allows officers to inspect, verify, and override OCR values with timestamped audit trail records.

5. **Operational Risk Prioritization**:
   - Transparent, explainable risk scoring (`HIGH`, `MEDIUM`, `LOW`) based on manufacturer repeat violation history and finding severity.

6. **Official Inspection Certificate PDF Generator**:
   - Exports multi-page official compliance certificates with disclaimer headers and legal references using ReportLab.

7. **Hackathon 2-Minute Demo Mode**:
   - Preloaded demonstration products:
     - **DEMO PRODUCT A**: 🟢 `COMPLIANT` (Golden Leaf Tea)
     - **DEMO PRODUCT B**: 🔴 `POTENTIAL NON-COMPLIANCE` (Nutty Wafers - Missing USP, Non-standard unit `gms`, incomplete address)
     - **DEMO PRODUCT C**: 🟡 `MANUAL REVIEW REQUIRED` (Blurred Honey package image)

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (Pre-tested on Python 3.12)
- Pip

### 1. Clone & Setup
```bash
git clone https://github.com/your-org/labelguard.git
cd OmniInspect
```

### 2. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 3. Run Application Server
```bash
python run.py
```

Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 📂 Project Structure

```text
OmniInspect/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py            # App configurations
│   ├── database.py          # SQLite schema & Legal Rule seeding
│   ├── routes/
│   │   ├── __init__.py
│   │   └── api.py           # REST API endpoints
│   ├── services/
│   │   ├── image_quality.py # Image quality analysis engine
│   │   ├── ocr_service.py   # OCR bounding box region engine
│   │   ├── declaration_service.py # Declaration normalization
│   │   ├── rule_engine.py   # Deterministic Legal Rule Validator
│   │   ├── risk_service.py  # Operational Risk Prioritization
│   │   └── pdf_report_service.py # PDF export generator
│   ├── static/
│   │   ├── css/style.css    # Government-tech design system
│   │   └── js/app.js        # Single Page App router & canvas engine
│   └── templates/
│       └── index.html       # Primary SPA template
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── RULE_ENGINE.md
│   ├── DEMO_GUIDE.md
│   ├── TESTING.md
│   └── DEPLOYMENT.md
├── requirements.txt
├── .env.example
├── run.py                   # Server launcher
└── README.md
```

---

## 🏛️ Legal Disclaimer

This application is an inspection-assistance and decision-support tool created for Smart India Hackathon 2026 (SIH26034). Final legal determinations remain strictly with authorized enforcement officers.
