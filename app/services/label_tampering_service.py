import os
import json

try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


class LabelTamperingDetector:
    """
    Experimental Computer Vision Analysis Service for Suspicious Label Manipulation.
    Examines image regions around MRP & mandatory declaration bounding boxes for edge magnitude variance,
    local noise inconsistency, and potential overlay artifacts.
    NEVER claims tampering definitely occurred — labels findings 'Possible visual anomaly'.
    """

    @staticmethod
    def analyze_label(file_path, declarations=None):
        """
        Analyzes package image for visual anomalies around declaration regions.
        """
        if not OPENCV_AVAILABLE or not file_path or not os.path.exists(file_path):
            return {
                "status": "EXPERIMENTAL_UNAVAILABLE",
                "finding_text": "Experimental analysis unavailable for this image.",
                "anomaly_score": 0.0,
                "confidence": 0.0,
                "evidence_bbox": None,
                "explanation": "OpenCV vision library or image source file unavailable for advanced texture analysis."
            }

        try:
            img = cv2.imread(file_path)
            if img is None:
                return {
                    "status": "INSUFFICIENT_IMAGE_EVIDENCE",
                    "finding_text": "INSUFFICIENT IMAGE EVIDENCE",
                    "anomaly_score": 0.0,
                    "confidence": 0.0,
                    "evidence_bbox": None,
                    "explanation": "Image evidence quality or format insufficient for visual anomaly inspection."
                }

            h, w = img.shape[:2]

            # Find target declaration bounding box (MRP or net quantity or primary region)
            target_bbox = None
            if declarations:
                for d in declarations:
                    if d.get("field_key") in ["mrp", "net_quantity"] and d.get("bounding_box"):
                        target_bbox = d.get("bounding_box")
                        break

            if not target_bbox:
                # Default to central price/label region if bbox not supplied
                target_bbox = {"x": int(w * 0.15), "y": int(h * 0.30), "width": int(w * 0.70), "height": int(h * 0.20)}

            bx = max(0, int(target_bbox.get("x", 0)))
            by = max(0, int(target_bbox.get("y", 0)))
            bw = min(w - bx, int(target_bbox.get("width", 100)))
            bh = min(h - by, int(target_bbox.get("height", 50)))

            if bw <= 10 or bh <= 10:
                return {
                    "status": "INSUFFICIENT_IMAGE_EVIDENCE",
                    "finding_text": "INSUFFICIENT IMAGE EVIDENCE",
                    "anomaly_score": 0.0,
                    "confidence": 0.0,
                    "evidence_bbox": target_bbox,
                    "explanation": "Extracted declaration bounding box region too small for texture analysis."
                }

            # Crop region of interest (ROI) and surrounding margin
            roi = img[by:by+bh, bx:bx+bw]

            # Convert to Grayscale
            gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

            # Compute Laplacian variance (sharpness/edge transition consistency)
            lap_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()

            # Compute Standard Deviation of luminance (contrast/texture inconsistency)
            mean_lum, stddev_lum = cv2.meanStdDev(gray_roi)
            std_val = float(stddev_lum[0][0])

            # Anomaly scoring logic based on statistical luminance variance & edge abruptness
            anomaly_score = 0.15
            reasons = []

            if std_val > 65.0 and lap_var > 1200.0:
                anomaly_score += 0.45
                reasons.append("Abnormal local edge contrast & texture sharpness discrepancy detected in price declaration region.")
            elif std_val < 15.0:
                anomaly_score += 0.30
                reasons.append("Unusually flat background texture suggesting potential digital removal or re-stamping.")

            if lap_var > 2000.0:
                anomaly_score += 0.25
                reasons.append("High-frequency boundary discontinuity around declaration characters.")

            anomaly_score = round(min(0.92, max(0.10, anomaly_score)), 2)

            if anomaly_score >= 0.65:
                return {
                    "status": "POSSIBLE_LABEL_MANIPULATION",
                    "finding_text": "POSSIBLE LABEL MANIPULATION",
                    "anomaly_score": anomaly_score,
                    "confidence": round(anomaly_score * 0.90, 2),
                    "evidence_bbox": target_bbox,
                    "explanation": f"Possible visual anomaly detected — physical/manual verification recommended. ({'; '.join(reasons)})"
                }
            else:
                return {
                    "status": "NO_STRONG_VISUAL_ANOMALY",
                    "finding_text": "NO STRONG VISUAL ANOMALY DETECTED",
                    "anomaly_score": anomaly_score,
                    "confidence": round(1.0 - anomaly_score, 2),
                    "evidence_bbox": target_bbox,
                    "explanation": "Standard visual edge and texture uniformity detected around declared package regions."
                }

        except Exception as err:
            return {
                "status": "EXPERIMENTAL_UNAVAILABLE",
                "finding_text": "Experimental analysis unavailable for this image.",
                "anomaly_score": 0.0,
                "confidence": 0.0,
                "evidence_bbox": None,
                "explanation": f"Experimental vision processing encountered error: {str(err)}"
            }
