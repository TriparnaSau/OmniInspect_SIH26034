import re

class ChangeDetectionService:
    """
    Differentiator Service: Package Change Detection Engine.
    Compares current inspection against historical inspections for the same/similar product.
    Generates field-level diffs and image references.
    Does NOT declare changes automatically illegal — labels them 'CHANGE DETECTED'.
    """

    @staticmethod
    def compare_with_previous(current_inspection, current_declarations, current_images, all_past_inspections, db_conn):
        """
        Finds previous inspection of same/similar product and performs field-by-field comparison.
        """
        cur_id = current_inspection.get('id')
        cur_prod = (current_inspection.get('product_name') or '').strip().lower()
        cur_brand = (current_inspection.get('brand') or '').strip().lower()
        cur_mfg = (current_inspection.get('manufacturer') or '').strip().lower()

        # Find best matching previous inspection
        candidate = None
        for past in all_past_inspections:
            if past.get('id') == cur_id:
                continue

            past_prod = (past.get('product_name') or '').strip().lower()
            past_brand = (past.get('brand') or '').strip().lower()
            past_mfg = (past.get('manufacturer') or '').strip().lower()

            # Match criteria: exact or strong overlap in product name, brand, or manufacturer
            if (cur_prod and cur_prod in past_prod) or (past_prod and past_prod in cur_prod) or \
               (cur_brand and cur_brand == past_brand and cur_brand != '') or \
               (cur_mfg and cur_mfg in past_mfg and len(cur_mfg) > 5):
                candidate = past
                break

        if not candidate:
            return {
                "has_previous": False,
                "message": "No previous inspection record found for this product, brand, or manufacturer.",
                "field_comparisons": [],
                "changes_detected_count": 0
            }

        prev_id = candidate['id']

        # Fetch previous declarations & image
        cursor = db_conn.cursor()
        cursor.execute("SELECT * FROM declarations WHERE inspection_id = ?", (prev_id,))
        prev_decs = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT file_path FROM product_images WHERE inspection_id = ? ORDER BY created_at DESC LIMIT 1", (prev_id,))
        prev_img_row = cursor.fetchone()
        prev_img_url = prev_img_row['file_path'] if prev_img_row else None

        cur_img_url = current_images[0].get('file_path') if current_images and len(current_images) > 0 else None

        # Build maps
        cur_map = {d['field_key']: (d.get('corrected_value') or d.get('extracted_value', 'NOT DETECTED')) for d in current_declarations}
        prev_map = {d['field_key']: (d.get('corrected_value') or d.get('extracted_value', 'NOT DETECTED')) for d in prev_decs}

        field_labels = {
            "mrp": "Maximum Retail Price (MRP)",
            "net_quantity": "Net Quantity",
            "unit_sale_price": "Unit Sale Price (USP)",
            "mfg_date": "Date of Manufacture / Packaging",
            "manufacturer": "Manufacturer Details",
            "generic_name": "Common / Generic Name",
            "country_of_origin": "Country of Origin",
            "consumer_care": "Consumer Care Details"
        }

        comparisons = []
        change_count = 0

        for key, label in field_labels.items():
            cur_val = cur_map.get(key, 'NOT DETECTED')
            prev_val = prev_map.get(key, 'NOT DETECTED')

            # Clean normalization for comparison
            cur_clean = re.sub(r'\s+', ' ', cur_val).strip()
            prev_clean = re.sub(r'\s+', ' ', prev_val).strip()

            if cur_clean.lower() != prev_clean.lower() and cur_clean != 'NOT DETECTED' and prev_clean != 'NOT DETECTED':
                status = "CHANGE_DETECTED"
                change_count += 1
            else:
                status = "UNCHANGED"

            comparisons.append({
                "field_key": key,
                "field_label": label,
                "previous_value": prev_val,
                "current_value": cur_val,
                "status": status
            })

        return {
            "has_previous": True,
            "previous_inspection_id": prev_id,
            "previous_date": candidate.get('created_at'),
            "previous_product_name": candidate.get('product_name'),
            "previous_brand": candidate.get('brand'),
            "previous_image_url": prev_img_url,
            "current_image_url": cur_img_url,
            "changes_detected_count": change_count,
            "field_comparisons": comparisons,
            "disclaimer": "Visual & Declaration Change Analysis — Final legal interpretation remains with inspector."
        }
