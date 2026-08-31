# HACKATHON DEMO GUIDE — LABELGUARD (SIH26034)

## 2-Minute Judge Walkthrough Script

### Scene 1: Dashboard Overview (0:00 - 0:15)
1. Open `http://127.0.0.1:5000`.
2. Point to the top bar showing **Role Selector** (Officer, Supervisor, Auditor, Admin) and the **2-Minute Demo Banner**.
3. Highlight the 4 metric cards: Total Inspections, Compliant Packages, Potential Non-Compliance, and Manual Review.

### Scene 2: Load Demo Product B - Non-Compliant (0:15 - 0:45)
1. Click **"🔴 Demo Product B (Violating Wafer)"** in the top banner.
2. Observe the automatic transition to Inspection detail screen.
3. System executes quality analysis, OCR, declaration mapping, and Legal Metrology Rule engine execution.

### Scene 3: Explain Findings & Evidence Visualizer (0:45 - 1:15)
1. Point to overall status badge: **🔴 POTENTIAL NON-COMPLIANCE**.
2. Scroll to Legal Metrology Compliance Findings table:
   - **LM-USP-002**: Unit Sale Price missing (Failed check).
   - **LM-QTY-001**: Non-standard unit `400 gms` detected (Failed check).
   - **LM-MFG-001**: Incomplete address missing PIN code (Failed check).
3. Click **"View Evidence"** next to any failed check. Canvas auto-scrolls and highlights the exact bounding box.

### Scene 4: Officer Human-in-the-Loop Override (1:15 - 1:35)
1. In the Extracted Declarations panel, click **Edit** next to MRP.
2. Change `MRP 150` to `MRP ₹150.00 (incl. of all taxes)`.
3. Enter audit reason and submit. Point out that an immutable event was added to the **Audit Trail**.

### Scene 5: Generate Official PDF Report & Analytics (1:35 - 2:00)
1. Click **"Generate PDF Report"**.
2. The official PDF Certificate downloads with disclaimer header and legal rule references.
3. Return to **Dashboard** and show that the repeat manufacturer violation index updated.

**Key Tagline to Conclude**:
> *"LABELGUARD doesn't guess legal compliance with a chatbot. AI extracts. Rules validate. Evidence explains. Humans decide."*
