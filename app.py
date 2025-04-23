from flask import Flask, request, jsonify
from pdf2image import convert_from_bytes
from PIL import Image
import pytesseract
import re
from datetime import datetime

app = Flask(__name__)

# Helper: Extract event lines with date & time
def extract_events(text):
    results = []
    lines = text.splitlines()

    for line in lines:
        match = re.match(r"(\d{2}\.\d{2}\.\d{4})\s+(\d{4})\s+(.*)", line)
        if match:
            date_str = match.group(1)
            time_str = match.group(2)
            event_text = match.group(3).strip()

            # Convert to ISO 8601 with timezone +03:00
            try:
                dt = datetime.strptime(date_str + " " + time_str, "%d.%m.%Y %H%M")
                iso_datetime = dt.isoformat() + "+03:00"
                results.append({"event": event_text, "datetime": iso_datetime})
            except ValueError:
                continue

    return results

@app.route('/api/parse-sof', methods=['POST'])
def parse_sof():
    if 'pdf' not in request.files:
        return jsonify({"error": "No PDF file uploaded"}), 400

    pdf_file = request.files['pdf'].read()
    images = convert_from_bytes(pdf_file)

    full_text = ""
    for img in images:
        text = pytesseract.image_to_string(img)
        full_text += text + "\n"

    extracted = extract_events(full_text)
    return jsonify(extracted)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)