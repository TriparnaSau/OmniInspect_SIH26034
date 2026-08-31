import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.image_quality import analyze_image_quality
from app.services.ocr_service import OCRService
from app.services.declaration_service import DeclarationService
from app.services.rule_engine import LegalRuleEngine

class TestLabelGuardUpgradedCompliance(unittest.TestCase):

    def test_demo_product_a_compliant(self):
        ocr = OCRService.process_image("img-1", "", product_preset="demo_product_a")
        declarations = DeclarationService.map_ocr_to_declarations(ocr)
        
        rules = [
            {"rule_id": "LM-MRP-001", "rule_version": "2023.1", "title": "MRP", "severity": "HIGH", "validation_type": "PRESENCE_AND_FORMAT", "requirement": "MRP required"},
            {"rule_id": "LM-QTY-001", "rule_version": "2011.1", "title": "Net Qty", "severity": "HIGH", "validation_type": "FORMAT_AND_UNIT", "requirement": "SI Units required"}
        ]
        
        res = LegalRuleEngine.evaluate_inspection(declarations, rules)
        self.assertEqual(res["status"], "COMPLIANT")
        self.assertGreaterEqual(res["score"], 90)

    def test_demo_product_b_non_compliant(self):
        ocr = OCRService.process_image("img-2", "", product_preset="demo_product_b")
        declarations = DeclarationService.map_ocr_to_declarations(ocr)
        
        rules = [
            {"rule_id": "LM-QTY-001", "rule_version": "2011.1", "title": "Net Qty", "severity": "HIGH", "validation_type": "FORMAT_AND_UNIT", "requirement": "SI Units required"}
        ]
        
        res = LegalRuleEngine.evaluate_inspection(declarations, rules)
        self.assertEqual(res["status"], "POTENTIAL_NON_COMPLIANCE")

    def test_applicability_not_applicable_state(self):
        # Single unit item (50 g) with no country of origin or unit sale price
        declarations = [
            {"field_key": "net_quantity", "field_label": "Net Quantity", "extracted_value": "Net Qty: 50 g", "corrected_value": None, "confidence": 0.95, "bounding_box": None, "source_region": "Region A", "status": "DETECTED"},
            {"field_key": "mrp", "field_label": "MRP", "extracted_value": "MRP ₹25.00 (incl. of all taxes)", "corrected_value": None, "confidence": 0.98, "bounding_box": None, "source_region": "Region B", "status": "DETECTED"},
            {"field_key": "manufacturer", "field_label": "Manufacturer", "extracted_value": "Himalayan Foods, Palampur 176061", "corrected_value": None, "confidence": 0.92, "bounding_box": None, "source_region": "Region C", "status": "DETECTED"},
            {"field_key": "unit_sale_price", "field_label": "USP", "extracted_value": "NOT DETECTED", "corrected_value": None, "confidence": 0.0, "bounding_box": None, "source_region": "Missing", "status": "NOT_DETECTED"},
            {"field_key": "country_of_origin", "field_label": "Country of Origin", "extracted_value": "NOT DETECTED", "corrected_value": None, "confidence": 0.0, "bounding_box": None, "source_region": "Missing", "status": "NOT_DETECTED"}
        ]

        rules = [
            {"rule_id": "LM-USP-002", "rule_version": "2022.2", "title": "Unit Sale Price", "severity": "HIGH", "validation_type": "PRESENCE_AND_FORMAT", "requirement": "USP required for >1 unit"},
            {"rule_id": "LM-COO-001", "rule_version": "2020.1", "title": "Country of Origin", "severity": "HIGH", "validation_type": "PRESENCE", "requirement": "COO required for imports"}
        ]

        res = LegalRuleEngine.evaluate_inspection(declarations, rules)
        # Both USP and COO should be NOT_APPLICABLE for a single domestic small item!
        na_checks = [c for c in res["checks"] if c["result"] == "NOT_APPLICABLE"]
        self.assertEqual(len(na_checks), 2)

    def test_font_calibration_honest_check(self):
        declarations = [
            {"field_key": "net_quantity", "field_label": "Net Quantity", "extracted_value": "500 g", "corrected_value": None, "confidence": 0.95, "bounding_box": None, "source_region": "Region A", "status": "DETECTED"}
        ]
        rules = [
            {"rule_id": "LM-FONT-001", "rule_version": "2011.1", "title": "Font Height Check", "severity": "MEDIUM", "validation_type": "CALIBRATION_READABILITY", "requirement": "Physical font size"}
        ]

        res = LegalRuleEngine.evaluate_inspection(declarations, rules)
        font_check = res["checks"][0]
        self.assertEqual(font_check["result"], "MANUAL_REVIEW")
        self.assertIn("Physical font size cannot be reliably determined", font_check["observed_value"])

if __name__ == '__main__':
    unittest.main()
