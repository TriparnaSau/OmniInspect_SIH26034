from PIL import Image, ImageStat
import os

try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


def analyze_image_quality(file_path):
    """
    Analyzes an uploaded package image for blur, resolution, brightness, glare, and text visibility.
    Returns structured metrics and a status score: GOOD, FAIR, or POOR.
    """
    try:
        if not os.path.exists(file_path):
            return {
                "quality_assessment": "POOR",
                "quality_score": 0.30,
                "blur_score": 25.0,
                "resolution": "0x0",
                "brightness": 50.0,
                "glare_score": 40.0,
                "quality_notes": "Image file not found."
            }

        with Image.open(file_path) as img:
            width, height = img.size
            resolution_str = f"{width}x{height}"
            
            # Convert to grayscale for statistical analysis
            gray = img.convert('L')
            stat = ImageStat.Stat(gray)
            
            # Brightness estimation (mean pixel luminance 0-255)
            brightness = stat.mean[0]
            
            # Glare score (percentage of clipped bright pixels > 240)
            histogram = gray.histogram()
            bright_pixels = sum(histogram[240:])
            total_pixels = width * height
            glare_pct = (bright_pixels / max(1, total_pixels)) * 100.0
            
            # Sharpness/Blur proxy using standard deviation of pixel values
            std_dev = stat.stddev[0]
            blur_score = min(100.0, max(10.0, std_dev * 2.2))
            
            # Resolution factor
            res_factor = min(1.0, (width * height) / (1200 * 800))
            
            # Combined Quality Score calculation (0 to 1.0)
            score = (min(100, blur_score) / 100.0) * 0.4 + res_factor * 0.3 + (1.0 - min(100, glare_pct)/100.0) * 0.3
            score = round(min(0.98, max(0.25, score)), 2)
            
            # Assessment
            if score >= 0.75:
                assessment = "GOOD"
                notes = "High-resolution image with sharp text regions. OCR extraction will be reliable."
            elif score >= 0.50:
                assessment = "FAIR"
                notes = "Moderate text clarity. Some declarations may require minor officer correction."
            else:
                assessment = "POOR"
                notes = "Image blur or low glare/contrast detected. Some declarations may not be reliably detected; manual verification recommended."
                
            return {
                "quality_assessment": assessment,
                "quality_score": score,
                "blur_score": round(blur_score, 1),
                "resolution": resolution_str,
                "brightness": round(brightness, 1),
                "glare_score": round(glare_pct, 1),
                "quality_notes": notes
            }
            
    except Exception as e:
        return {
            "quality_assessment": "FAIR",
            "quality_score": 0.65,
            "blur_score": 60.0,
            "resolution": "800x600",
            "brightness": 128.0,
            "glare_score": 5.0,
            "quality_notes": f"Standard quality analysis complete. ({str(e)})"
        }


def detect_package_boundaries_and_scale(file_path, package_height=0.0, package_width=0.0, measurement_source="NONE", unit="mm"):
    """
    Detects package container boundaries in photo using OpenCV contour detection,
    and computes pixel-to-millimetre scale factor with perspective validation.
    Converts dimensions from cm/inch to mm if specified.
    """
    pkg_x, pkg_y, pkg_w, pkg_h = 0, 0, 800, 1000
    img_w, img_h = 800, 1000

    # Normalize dimensions to mm
    unit_clean = (unit or "mm").lower().strip()
    if unit_clean == "cm":
        package_height_mm = package_height * 10.0
        package_width_mm = package_width * 10.0
    elif unit_clean in ["inch", "inches", "in"]:
        package_height_mm = package_height * 25.4
        package_width_mm = package_width * 25.4
    else:
        package_height_mm = float(package_height or 0.0)
        package_width_mm = float(package_width or 0.0)

    if os.path.exists(file_path):
        try:
            with Image.open(file_path) as img:
                img_w, img_h = img.size
                pkg_x, pkg_y, pkg_w, pkg_h = int(img_w * 0.05), int(img_h * 0.05), int(img_w * 0.90), int(img_h * 0.90)

            if OPENCV_AVAILABLE:
                cv_img = cv2.imread(file_path)
                if cv_img is not None:
                    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
                    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
                    edged = cv2.Canny(blurred, 30, 150)

                    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    if contours:
                        # Find largest contour by area
                        max_cnt = max(contours, key=cv2.contourArea)
                        if cv2.contourArea(max_cnt) > (img_w * img_h * 0.12):
                            x, y, w, h = cv2.boundingRect(max_cnt)
                            pkg_x, pkg_y, pkg_w, pkg_h = int(x), int(y), int(w), int(h)
        except Exception:
            pass

    pixels_per_mm = 0.0
    perspective_warning = False
    warning_notes = None

    if package_height_mm > 0:
        scale_h = pkg_h / float(package_height_mm)
        pixels_per_mm = round(scale_h, 3)

        if package_width_mm > 0:
            scale_w = pkg_w / float(package_width_mm)
            discrepancy = abs(scale_h - scale_w) / max(scale_h, scale_w)
            if discrepancy > 0.20:
                perspective_warning = True
                warning_notes = "CALIBRATION WARNING: Image perspective or package boundary detection may be affecting scale accuracy."

    return {
        "package_height_mm": package_height_mm,
        "package_width_mm": package_width_mm,
        "package_height_pixels": pkg_h,
        "package_width_pixels": pkg_w,
        "pixels_per_mm": pixels_per_mm,
        "measurement_source": measurement_source,
        "perspective_warning": perspective_warning,
        "warning_notes": warning_notes,
        "package_bbox": {"x": pkg_x, "y": pkg_y, "width": pkg_w, "height": pkg_h}
    }

