import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.rule_engine import LegalRuleEngine
from app.services.image_quality import detect_package_boundaries_and_scale

class TestPackageDimensionCalibration(unittest.TestCase):

    def setUp(self):
        self.rules = [
            {
                "rule_id": "LM-FONT-001",
                "rule_version": "2011.1",
                "title": "Numeral and Height Calibration Check",
                "severity": "MEDIUM",
                "validation_type": "CALIBRATION_READABILITY",
                "requirement": "Height of letters/numerals must meet physical size threshold"
            }
        ]
        self.declarations = [
            {
                "field_key": "net_quantity",
                "field_label": "Net Quantity",
                "extracted_value": "500 g",
                "corrected_value": None,
                "confidence": 0.95,
                "bounding_box": {"x": 100, "y": 100, "width": 200, "height": 24},
                "source_region": "Region A",
                "status": "DETECTED"
            }
        ]

    def test_a_no_package_dimensions(self):
        calib_info = {
            "package_height_mm": 0.0,
            "package_width_mm": 0.0,
            "pixels_per_mm": 0.0,
            "measurement_source": "NONE",
            "perspective_warning": False
        }
        res = LegalRuleEngine.evaluate_inspection(self.declarations, self.rules, calibration_info=calib_info)
        chk = res["checks"][0]
        self.assertEqual(chk["result"], "MANUAL_REVIEW")
        self.assertIn("Physical font size cannot be reliably determined", chk["observed_value"])

    def test_b_measured_package_dimensions(self):
        calib_info = {
            "package_height_mm": 150.0,
            "package_width_mm": 50.0,
            "pixels_per_mm": 8.0,
            "measurement_source": "INSPECTOR",
            "perspective_warning": False
        }
        # 24 px / 8 px/mm = 3.0 mm (Requirement for 500g is 4.0mm, so 3.0mm < 4.0mm => FAIL)
        res = LegalRuleEngine.evaluate_inspection(self.declarations, self.rules, calibration_info=calib_info)
        chk = res["checks"][0]
        self.assertEqual(chk["result"], "FAIL")
        self.assertIn("3.0 mm", chk["observed_value"])
        self.assertIn("failing Legal Metrology Schedule II requirement", chk["finding_explanation"])

    def test_c_approximate_dimensions(self):
        calib_info = {
            "package_height_mm": 150.0,
            "package_width_mm": 50.0,
            "pixels_per_mm": 8.0,
            "measurement_source": "APPROXIMATE",
            "perspective_warning": False
        }
        res = LegalRuleEngine.evaluate_inspection(self.declarations, self.rules, calibration_info=calib_info)
        chk = res["checks"][0]
        self.assertEqual(chk["result"], "MANUAL_REVIEW")
        self.assertIn("ESTIMATED MEASUREMENT", chk["observed_value"])
        self.assertIn("Approximate dimensions cannot serve as sole proof", chk["finding_explanation"])

    def test_d_perspective_warning_mismatch(self):
        calib_info = {
            "package_height_mm": 150.0,
            "package_width_mm": 10.0,
            "pixels_per_mm": 8.0,
            "measurement_source": "INSPECTOR",
            "perspective_warning": True
        }
        res = LegalRuleEngine.evaluate_inspection(self.declarations, self.rules, calibration_info=calib_info)
        chk = res["checks"][0]
        self.assertEqual(chk["result"], "MANUAL_REVIEW")
        self.assertIn("CALIBRATION WARNING", chk["observed_value"])

if __name__ == '__main__':
    unittest.main()
