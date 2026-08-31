class DeclarationService:
    """
    Normalizes OCR results into structured Legal Metrology declaration fields.
    Fields missing in OCR are explicitly labeled 'NOT DETECTED'.
    """

    STANDARD_FIELDS = [
        {"key": "generic_name", "label": "Common / Generic Name"},
        {"key": "mrp", "label": "Maximum Retail Price (MRP)"},
        {"key": "unit_sale_price", "label": "Unit Sale Price (USP)"},
        {"key": "net_quantity", "label": "Net Quantity"},
        {"key": "mfg_date", "label": "Date of Manufacture / Packaging / Import"},
        {"key": "manufacturer", "label": "Manufacturer / Packer / Importer Name & Address"},
        {"key": "country_of_origin", "label": "Country of Origin"},
        {"key": "consumer_care", "label": "Consumer Care Details"}
    ]

    @staticmethod
    def map_ocr_to_declarations(ocr_regions):
        """
        Maps list of OCR bounding box items into structured declaration objects.
        """
        declarations = []
        ocr_by_key = {item.get("field_key"): item for item in ocr_regions if item.get("field_key")}

        for field in DeclarationService.STANDARD_FIELDS:
            key = field["key"]
            label = field["label"]

            if key in ocr_by_key:
                ocr_item = ocr_by_key[key]
                declarations.append({
                    "field_key": key,
                    "field_label": label,
                    "extracted_value": ocr_item["text"],
                    "corrected_value": None,
                    "confidence": ocr_item["confidence"],
                    "bounding_box": ocr_item["boundingBox"],
                    "source_region": f"Region ({ocr_item['boundingBox']['x']},{ocr_item['boundingBox']['y']})",
                    "status": "DETECTED"
                })
            else:
                declarations.append({
                    "field_key": key,
                    "field_label": label,
                    "extracted_value": "NOT DETECTED",
                    "corrected_value": None,
                    "confidence": 0.0,
                    "bounding_box": None,
                    "source_region": "Unidentified / Missing Region",
                    "status": "NOT_DETECTED"
                })

        return declarations
