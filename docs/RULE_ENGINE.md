# LEGAL RULE ENGINE — LABELGUARD (SIH26034)

## Rule Evaluation Logic

LABELGUARD's Legal Metrology Rule Engine evaluates extracted package declarations against versioned rules under the Legal Metrology (Packaged Commodities) Rules, 2011 and 2022/2023 Amendments.

### Seeded Rule Catalog

1. **LM-MRP-001** (MRP Declaration):
   - Validates presence of MRP and text "inclusive of all taxes".
2. **LM-USP-002** (Unit Sale Price):
   - Mandatory for commodities containing > 1 unit/kg/L under 2022 amendment.
3. **LM-QTY-001** (Net Quantity SI Units):
   - Rejects non-compliant units like `gms` or `ltrs`. Enforces `g`, `kg`, `ml`, `L`.
4. **LM-DATE-001** (Date Declaration):
   - Validates MM/YYYY or Month Year declaration format.
5. **LM-MFG-001** (Manufacturer Address):
   - Enforces full postal address including street, city, and 6-digit PIN code.
6. **LM-COO-001** (Country of Origin):
   - Mandatory for foreign imported packaged goods.
7. **LM-CCC-001** (Consumer Care Info):
   - Requires contact telephone and valid email address.
8. **LM-FONT-001** (Numeral & Height Calibration Check):
   - Calibration-aware check returning `PHYSICAL FONT SIZE: REQUIRES CALIBRATION`.
