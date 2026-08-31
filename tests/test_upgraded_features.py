import os
import sys
import unittest
import sqlite3
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.change_detection_service import ChangeDetectionService
from app.services.label_tampering_service import LabelTamperingDetector
from app.services.rule_engine import LegalRuleEngine
from app.services.risk_service import RiskService

class TestUpgradedLabelGuardFeatures(unittest.TestCase):

    def test_change_detection_service(self):
        # Create an in-memory SQLite database for testing
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
        CREATE TABLE declarations (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            field_key TEXT NOT NULL,
            field_label TEXT NOT NULL,
            extracted_value TEXT NOT NULL,
            corrected_value TEXT,
            status TEXT NOT NULL
        )
        ''')
        cursor.execute('''
        CREATE TABLE product_images (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        ''')

        # Insert previous inspection declarations
        cursor.execute("INSERT INTO declarations VALUES ('d1', 'LM-PREV-01', 'mrp', 'MRP', 'MRP ₹150.00', NULL, 'DETECTED')")
        cursor.execute("INSERT INTO declarations VALUES ('d2', 'LM-PREV-01', 'net_quantity', 'Net Qty', 'Net Qty: 100 g', NULL, 'DETECTED')")
        cursor.execute("INSERT INTO product_images VALUES ('img1', 'LM-PREV-01', '/static/uploads/prev.jpg', '2026-01-01T00:00:00')")
        conn.commit()

        past_inspections = [{
            "id": "LM-PREV-01",
            "product_name": "Dentassure Toothpaste",
            "brand": "Dentassure",
            "manufacturer": "Vestige Marketing",
            "created_at": "2026-01-01T00:00:00"
        }]

        current_inspection = {
            "id": "LM-CURR-02",
            "product_name": "Dentassure Toothpaste",
            "brand": "Dentassure",
            "manufacturer": "Vestige Marketing"
        }

        current_declarations = [
            {"field_key": "mrp", "field_label": "MRP", "extracted_value": "MRP ₹175.00", "corrected_value": None},
            {"field_key": "net_quantity", "field_label": "Net Qty", "extracted_value": "Net Qty: 100 g", "corrected_value": None}
        ]

        res = ChangeDetectionService.compare_with_previous(current_inspection, current_declarations, [], past_inspections, conn)
        conn.close()

        self.assertTrue(res["has_previous"])
        self.assertEqual(res["previous_inspection_id"], "LM-PREV-01")
        self.assertEqual(res["changes_detected_count"], 1)

        mrp_comp = next(c for c in res["field_comparisons"] if c["field_key"] == "mrp")
        self.assertEqual(mrp_comp["status"], "CHANGE_DETECTED")
        self.assertEqual(mrp_comp["previous_value"], "MRP ₹150.00")
        self.assertEqual(mrp_comp["current_value"], "MRP ₹175.00")

    def test_label_tampering_fallback(self):
        # Non-existent file should gracefully return EXPERIMENTAL_UNAVAILABLE without crashing
        res = LabelTamperingDetector.analyze_label("non_existent_file.jpg")
        self.assertEqual(res["status"], "EXPERIMENTAL_UNAVAILABLE")
        self.assertIn("Experimental analysis unavailable", res["finding_text"])

    def test_uncalibrated_font_size_fallback_reason(self):
        declarations = [
            {"field_key": "net_quantity", "field_label": "Net Quantity", "extracted_value": "500 g", "status": "DETECTED", "confidence": 0.95}
        ]
        rules = [
            {
                "rule_id": "LM-FONT-001",
                "rule_version": "2011.1",
                "legal_reference": "Rule 7 & Schedule II",
                "title": "Numeral and Height Calibration Check",
                "severity": "MEDIUM",
                "validation_type": "CALIBRATION_READABILITY",
                "requirement": "Height of letters/numerals must meet physical size threshold"
            }
        ]

        res = LegalRuleEngine.evaluate_inspection(declarations, rules)
        check = res["checks"][0]
        self.assertEqual(check["result"], "MANUAL_REVIEW")
        self.assertIn("Physical scale could not be established reliably from the available evidence.", check["finding_explanation"])

    def test_risk_prioritization_explainable_factors(self):
        past_inspections = [
            {"status": "POTENTIAL_NON_COMPLIANCE", "manufacturer": "Apex Foods", "brand": "Apex"},
            {"status": "POTENTIAL_NON_COMPLIANCE", "manufacturer": "Apex Foods", "brand": "Apex"},
            {"status": "POTENTIAL_NON_COMPLIANCE", "manufacturer": "Apex Foods", "brand": "Apex"}
        ]
        res = RiskService.calculate_priority(past_inspections, "Apex Foods", "Apex")
        self.assertEqual(res["priority_level"], "HIGH")
        self.assertGreaterEqual(res["priority_score"], 70)
        self.assertIn("Multiple previous violations", res["reasons"][0])

if __name__ == '__main__':
    unittest.main()
