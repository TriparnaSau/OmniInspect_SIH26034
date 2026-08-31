# TESTING & VALIDATION — LABELGUARD (SIH26034)

## Test Suite Overview

LABELGUARD includes automated API and rule engine test scripts to verify deterministic legal rule validation.

### Automated Test Script (`tests/test_compliance.py`)
Run the test script:
```bash
python tests/test_compliance.py
```

### Coverage
- Image Quality Assessment scoring
- OCR extraction mapping
- Legal Metrology Rule validation (LM-MRP-001, LM-USP-002, LM-QTY-001, LM-DATE-001, LM-MFG-001, LM-COO-001, LM-CCC-001, LM-GEN-001, LM-FONT-001)
- Human-in-the-Loop audit logging
- PDF Report generation
