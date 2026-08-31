# DATABASE SCHEMA — LABELGUARD (SIH26034)

LABELGUARD uses an SQLite database (`labelguard.db`) with standard relational tables.

```sql
-- Core Domain Tables
roles (id, name, description)
users (id, username, password_hash, full_name, role_id, badge_number, department, active, created_at)
rules (rule_id, title, category, legal_reference, rule_version, effective_date, applicability, requirement, validation_type, severity, explanation, source_document, active, updated_at)
rule_versions (id, rule_id, version, legal_reference, changes_summary, created_at, created_by)
inspections (id, product_name, brand, category, manufacturer, packer, importer, location, officer_id, officer_name, status, score, remarks, created_at, updated_at)
product_images (id, inspection_id, image_type, file_path, blur_score, resolution, brightness, glare_score, quality_assessment, quality_score, quality_notes, created_at)
ocr_results (id, image_id, raw_text, confidence, bounding_box, created_at)
declarations (id, inspection_id, field_key, field_label, extracted_value, corrected_value, confidence, bounding_box, image_id, source_region, status)
compliance_checks (id, inspection_id, rule_id, rule_version, check_name, result, confidence, observed_value, expected_condition, severity, finding_explanation, evidence_bbox, evidence_region, created_at)
risk_assessments (id, inspection_id, manufacturer_name, brand_name, priority_level, priority_score, factors_json, created_at)
audit_logs (id, timestamp, user_name, role, action, entity_type, entity_id, old_value, new_value, reason)
```
