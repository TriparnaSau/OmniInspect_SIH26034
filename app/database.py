import sqlite3
import os
import json
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'labelguard.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(app=None):
    conn = get_db()
    cursor = conn.cursor()

    # Users & Roles
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT
    );
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role_id TEXT NOT NULL,
        badge_number TEXT,
        department TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (role_id) REFERENCES roles (id)
    );
    ''')

    # Legal Rules & Rule Versions
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rules (
        rule_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        legal_reference TEXT NOT NULL,
        rule_version TEXT NOT NULL,
        effective_date TEXT NOT NULL,
        applicability TEXT NOT NULL,
        requirement TEXT NOT NULL,
        validation_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        explanation TEXT NOT NULL,
        source_document TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL
    );
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rule_versions (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        version TEXT NOT NULL,
        legal_reference TEXT NOT NULL,
        changes_summary TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (rule_id) REFERENCES rules (rule_id)
    );
    ''')

    # Inspections & Products
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        brand TEXT NOT NULL,
        category TEXT NOT NULL,
        manufacturer TEXT,
        packer TEXT,
        importer TEXT,
        location TEXT NOT NULL,
        officer_id TEXT NOT NULL,
        officer_name TEXT NOT NULL,
        status TEXT NOT NULL, -- COMPLIANT, POTENTIAL_NON_COMPLIANCE, MANUAL_REVIEW
        score INTEGER DEFAULT 0,
        remarks TEXT,
        package_height_mm REAL DEFAULT 0.0,
        package_width_mm REAL DEFAULT 0.0,
        package_depth_mm REAL DEFAULT 0.0,
        measurement_source TEXT DEFAULT 'NONE', -- INSPECTOR, APPROXIMATE, NONE
        calibration_method TEXT DEFAULT 'NONE', -- DIMENSIONS, ADVANCED_REFERENCE, NONE
        pixels_per_mm REAL DEFAULT 0.0,
        calibration_confidence REAL DEFAULT 0.0,
        perspective_warning INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (officer_id) REFERENCES users (id)
    );
    ''')

    # Safe migration for existing SQLite databases
    calibration_cols = [
        ("package_height_mm", "REAL DEFAULT 0.0"),
        ("package_width_mm", "REAL DEFAULT 0.0"),
        ("package_depth_mm", "REAL DEFAULT 0.0"),
        ("package_unit", "TEXT DEFAULT 'mm'"),
        ("measurement_source", "TEXT DEFAULT 'NONE'"),
        ("calibration_method", "TEXT DEFAULT 'NONE'"),
        ("pixels_per_mm", "REAL DEFAULT 0.0"),
        ("calibration_confidence", "REAL DEFAULT 0.0"),
        ("perspective_warning", "INTEGER DEFAULT 0")
    ]
    for col_name, col_type in calibration_cols:
        try:
            cursor.execute(f"ALTER TABLE inspections ADD COLUMN {col_name} {col_type}")
        except Exception:
            pass

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS product_images (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        image_type TEXT NOT NULL, -- front, back, side, detail
        file_path TEXT NOT NULL,
        blur_score REAL,
        resolution TEXT,
        brightness REAL,
        glare_score REAL,
        quality_assessment TEXT NOT NULL, -- GOOD, FAIR, POOR
        quality_score REAL NOT NULL,
        quality_notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id)
    );
    ''')

    # OCR & Extracted Declarations
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ocr_results (
        id TEXT PRIMARY KEY,
        image_id TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        confidence REAL NOT NULL,
        bounding_box TEXT NOT NULL, -- JSON string {x, y, width, height}
        created_at TEXT NOT NULL,
        FOREIGN KEY (image_id) REFERENCES product_images (id)
    );
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS declarations (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        field_key TEXT NOT NULL, -- mrp, unit_sale_price, net_quantity, mfg_date, manufacturer, consumer_care, generic_name, country_of_origin
        field_label TEXT NOT NULL,
        extracted_value TEXT NOT NULL,
        corrected_value TEXT,
        confidence REAL NOT NULL,
        bounding_box TEXT, -- JSON string
        image_id TEXT,
        source_region TEXT,
        status TEXT NOT NULL, -- DETECTED, NOT_DETECTED, MANUALLY_CORRECTED
        FOREIGN KEY (inspection_id) REFERENCES inspections (id)
    );
    ''')

    # Compliance Checks & Evidence
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS compliance_checks (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        rule_version TEXT NOT NULL,
        check_name TEXT NOT NULL,
        result TEXT NOT NULL, -- PASS, FAIL, MANUAL_REVIEW
        confidence REAL NOT NULL,
        observed_value TEXT NOT NULL,
        expected_condition TEXT NOT NULL,
        severity TEXT NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
        finding_explanation TEXT NOT NULL,
        evidence_image_id TEXT,
        evidence_bbox TEXT, -- JSON string
        evidence_region TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id),
        FOREIGN KEY (rule_id) REFERENCES rules (rule_id)
    );
    ''')

    # Risk Assessment
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS risk_assessments (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        manufacturer_name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        priority_level TEXT NOT NULL, -- HIGH, MEDIUM, LOW
        priority_score INTEGER NOT NULL,
        factors_json TEXT NOT NULL, -- JSON array of reasons
        created_at TEXT NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id)
    );
    ''')

    # Audit Logs
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        user_name TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        reason TEXT
    );
    ''')

    conn.commit()

    # Seed Default Data
    seed_default_data(conn)
    conn.close()

def seed_default_data(conn):
    cursor = conn.cursor()

    # Seed Roles
    roles = [
        ('role-officer', 'Enforcement Officer', 'Conducts package inspections, verifies declarations, generates reports'),
        ('role-supervisor', 'Supervisor', 'Reviews inspection cases, views high-risk priorities, monitors officer activity'),
        ('role-auditor', 'Auditor', 'Read-only access to historical inspections, compliance reports, and audit trails'),
        ('role-admin', 'Administrator', 'Manages users, roles, Legal Metrology rules, and system configurations')
    ]
    for r in roles:
        cursor.execute("INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)", r)

    # Seed Users
    now = datetime.now(timezone.utc).isoformat()
    users = [
        ('usr-001', 'officer_sharma', 'pbkdf2:sha256:dummyhash1', 'Insp. Rajesh Sharma', 'role-officer', 'LM-OFF-7821', 'Delhi Metrology West', 1, now),
        ('usr-002', 'supervisor_verma', 'pbkdf2:sha256:dummyhash2', 'Supv. Ananya Verma', 'role-supervisor', 'LM-SUP-1042', 'HQ Metrology Directorate', 1, now),
        ('usr-003', 'auditor_gupta', 'pbkdf2:sha256:dummyhash3', 'Aud. Vikram Gupta', 'role-auditor', 'LM-AUD-5590', 'Central Compliance Cell', 1, now),
        ('usr-004', 'admin_system', 'pbkdf2:sha256:dummyhash4', 'Admin Administrator', 'role-admin', 'LM-ADM-0001', 'IT Operations Dept', 1, now)
    ]
    for u in users:
        cursor.execute("""
            INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role_id, badge_number, department, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, u)

    # Seed Rules (Official Legal Metrology 2011 Rules + 2022/2023 Amendments)
    rules = [
        ('LM-MRP-001', 'Maximum Retail Price (MRP) Declaration', 'PRICE', 'Rule 6(1)(e) LM(PC) Rules 2011', '2023.1', '2023-01-01',
         'All Packaged Commodities', 'MRP must be stated as "MRP ₹..." or "MRP Rs. ..." inclusive of all taxes.',
         'PRESENCE_AND_FORMAT', 'HIGH', 'MRP declaration must explicitly include all applicable taxes.',
         'Department of Consumer Affairs Notification G.S.R. 779(E)', 1, now),

        ('LM-USP-002', 'Unit Sale Price Declaration', 'PRICE', 'Rule 6(1)(11) Amendment 2022', '2022.2', '2022-12-01',
         'Packaged commodities containing more than 1kg/1L/1N', 'Unit sale price per g/kg/ml/L/piece must be clearly declared.',
         'PRESENCE_AND_FORMAT', 'HIGH', 'Mandatory requirement under 2022 amendment for consumer price transparency.',
         'Department of Consumer Affairs Notification G.S.R. 832(E)', 1, now),

        ('LM-QTY-001', 'Net Quantity Standard Units', 'QUANTITY', 'Rule 6(1)(c) & Schedule II', '2011.1', '2011-04-01',
         'All Packaged Commodities', 'Net quantity must be declared using standard SI units (g, kg, ml, L, m, N).',
         'FORMAT_AND_UNIT', 'HIGH', 'Non-standard abbreviations like "gms" or "ltrs" are non-compliant.',
         'Legal Metrology (Packaged Commodities) Rules 2011', 1, now),

        ('LM-DATE-001', 'Month & Year of Manufacture/Packaging/Import', 'DATE', 'Rule 6(1)(d)', '2023.1', '2023-01-01',
         'All Packaged Commodities', 'Month and year of manufacture/packaging/import must be declared (MM/YYYY or Mon YYYY).',
         'PRESENCE_AND_FORMAT', 'HIGH', 'Helps consumers assess freshness and expiry compliance.',
         'Department of Consumer Affairs Guidance Notice 2023', 1, now),

        ('LM-MFG-001', 'Manufacturer / Packer / Importer Identity & Address', 'ORIGIN', 'Rule 6(1)(a)', '2011.1', '2011-04-01',
         'All Packaged Commodities', 'Complete name and postal address of manufacturer, packer, or importer must be listed.',
         'COMPLETENESS', 'CRITICAL', 'Address must include street, city, pin code for legal accountability.',
         'Legal Metrology (Packaged Commodities) Rules 2011', 1, now),

        ('LM-COO-001', 'Country of Origin Declaration', 'ORIGIN', 'Rule 6(1)(n) Amendment 2020', '2020.1', '2020-01-01',
         'Imported Packaged Commodities', 'Country of Origin must be explicitly declared on imported packages (e.g. "Made in India" or "Country of Origin: Vietnam").',
         'PRESENCE', 'HIGH', 'Mandatory for foreign imported commodities.',
         'Department of Consumer Affairs Amendment Notification 2020', 1, now),

        ('LM-CCC-001', 'Consumer Care Information', 'CONSUMER_CARE', 'Rule 6(2)', '2011.1', '2011-04-01',
         'All Packaged Commodities', 'Must state contact person/office name, address, telephone number, and e-mail for complaints.',
         'COMPLETENESS', 'HIGH', 'At least phone number and email address must be legible.',
         'Legal Metrology (Packaged Commodities) Rules 2011', 1, now),

        ('LM-GEN-001', 'Common or Generic Product Name', 'IDENTITY', 'Rule 6(1)(b)', '2011.1', '2011-04-01',
         'All Packaged Commodities', 'Common or generic name of commodity must be prominently declared.',
         'PRESENCE', 'MEDIUM', 'Product identity must not be misleading.',
         'Legal Metrology (Packaged Commodities) Rules 2011', 1, now),

        ('LM-FONT-001', 'Numeral and Height Calibration Check', 'READABILITY', 'Rule 7 & Schedule II', '2011.1', '2011-04-01',
         'All Packaged Commodities', 'Height of letters/numerals must meet physical size threshold (e.g., 2mm-6mm based on net quantity area). Requires physical calibration reference.',
         'CALIBRATION_READABILITY', 'MEDIUM', 'Requires physical reference scale or explicit visual verification.',
         'Legal Metrology (Packaged Commodities) Rules 2011', 1, now)
    ]

    for r in rules:
        cursor.execute("""
            INSERT OR IGNORE INTO rules (rule_id, title, category, legal_reference, rule_version, effective_date,
            applicability, requirement, validation_type, severity, explanation, source_document, active, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, r)

    conn.commit()
