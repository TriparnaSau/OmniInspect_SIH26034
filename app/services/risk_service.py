import json

class RiskService:
    """
    Transparent operational risk prioritization engine for enforcement officers.
    Not a black-box AI score; explainable rule-based operational prioritization.
    """

    @staticmethod
    def calculate_priority(inspection_history, manufacturer_name, brand_name, current_findings=None):
        """
        Calculates operational risk score (0-100) and priority level (HIGH, MEDIUM, LOW).
        """
        score = 25 # Base risk score
        reasons = []

        mfg_clean = manufacturer_name.lower().strip() if manufacturer_name else ""
        brand_clean = brand_name.lower().strip() if brand_name else ""

        # Match history for manufacturer / brand
        matching_past = [
            insp for insp in inspection_history 
            if (insp.get("manufacturer") and mfg_clean in insp.get("manufacturer", "").lower()) or
               (insp.get("brand") and brand_clean in insp.get("brand", "").lower())
        ]

        past_violations = [insp for insp in matching_past if insp.get("status") == "POTENTIAL_NON_COMPLIANCE"]
        past_count = len(past_violations)

        if past_count >= 3:
            score += 45
            reasons.append(f"Multiple previous violations ({past_count} past non-compliant inspections recorded for this manufacturer/brand).")
        elif past_count >= 1:
            score += 25
            reasons.append(f"Repeat violation history ({past_count} previous non-compliance finding on record).")

        if current_findings:
            critical_fails = sum(1 for f in current_findings if f.get("severity") == "CRITICAL" and f.get("result") == "FAIL")
            high_fails = sum(1 for f in current_findings if f.get("severity") == "HIGH" and f.get("result") == "FAIL")

            if critical_fails > 0:
                score += 30
                reasons.append(f"{critical_fails} CRITICAL severity violation detected in active inspection.")
            if high_fails > 0:
                score += 15 * high_fails
                reasons.append(f"{high_fails} HIGH severity legal requirement finding(s) present.")

        score = min(98, max(15, score))

        if score >= 70:
            level = "HIGH"
        elif score >= 45:
            level = "MEDIUM"
        else:
            level = "LOW"

        if not reasons:
            reasons.append("Standard routine inspection profile with no prior violation history.")

        return {
            "priority_level": level,
            "priority_score": score,
            "reasons": reasons
        }
