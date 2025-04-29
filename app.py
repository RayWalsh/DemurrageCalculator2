from flask import Flask, request, render_template, jsonify, send_file
from datetime import datetime
import re
import pandas as pd
from io import BytesIO
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient





app = Flask(__name__)

# === Azure Configuration ===
AZURE_ENDPOINT = "https://sofparser.cognitiveservices.azure.com/"
AZURE_KEY = "5Dr8xxzZcVxvgocaypa1kNY06HYpRNmC4KlY0cmpZfvD6P75uFUpJQQJ99BDACmepeSXJ3w3AAALACOGUZXS"
MODEL_ID = "SOFEvents2"
AZURE_CLIENT = DocumentIntelligenceClient(endpoint=AZURE_ENDPOINT, credential=AzureKeyCredential(AZURE_KEY))

# === Field Mapping ===
field_mapping = {
    "Field_EOSP": "EOSP",
    "Field_NORT": "NOR Tendered",
    "Field_POB": "Pilot On Board",
    "Field_HeaveAnchor": "Heave Anchor",
    "Field_AllFast": "All fast",
    "Field_COSP": "COSP"
}

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# === ROUTES for Web Pages ===

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/case-management')
def case_management():
    return render_template('case-management.html')

@app.route('/calculator')
def calculator():
    return render_template('calculator.html')

@app.route('/new-case')
def new_case():
    return render_template('new-case.html')

@app.route('/sof-parser')
def sof_parser():
    return render_template('sofparser.html')

@app.route('/about')
def about():
    return render_template('about.html')

# === API Routes ===


@app.route('/api/parse-sof', methods=['POST'])
def parse_sof():
    if 'pdf' not in request.files:
        return jsonify({"error": "No PDF uploaded"}), 400

    pdf_file = request.files['pdf']
    file_bytes = pdf_file.read()
    print("PDF file size:", len(file_bytes), "bytes")

    try:
        poller = AZURE_CLIENT.begin_analyze_document(
            MODEL_ID,
            file_bytes,
            content_type="application/pdf"
        )
        result = poller.result()
    except Exception as e:
        print("Error from Azure:", e)
        return jsonify({"error": "Azure model call failed", "details": str(e)}), 500

    events = []
    skipped = []
    raw_debug_lines = []
    missing_fields = []

    for idx, document in enumerate(result.documents):
        print(f"--- Document {idx + 1} ---")
        for name, field in document.fields.items():
            if name not in field_mapping:
                continue

            if field.content is None:
                print(f"Missing field: {name}")
                missing_fields.append(name)
                continue

            raw_debug_lines.append(f"{name}: {field.content} (confidence: {round(field.confidence, 2)})")

            try:
                lines = field.content.splitlines()
                lines = [line.strip() for line in lines if line.strip()]
                date_str, time_str = None, None

                for line in lines:
                    clean_line = line
                    for weekday in WEEKDAYS:
                        clean_line = clean_line.replace(weekday, "").strip()
                    if re.match(r"\d{2}\.\d{2}\.\d{4}", clean_line):
                        date_str = clean_line
                    elif re.match(r"^\d{2}:\d{2}$", clean_line) or re.match(r"^\d{4}$", clean_line):
                        if re.match(r"^\d{4}$", clean_line):
                            time_str = f"{clean_line[:2]}:{clean_line[2:]}"
                        else:
                            time_str = clean_line

                if date_str and time_str:
                    dt = datetime.strptime(f"{date_str} {time_str}", "%d.%m.%Y %H:%M")
                    events.append({
                        "event": field_mapping[name],
                        "datetime": dt.isoformat() + "+03:00",
                        "confidence": round(field.confidence, 2)
                    })
                else:
                    print(f"Could not extract cleaned date/time from: {field.content}")
                    skipped.append({"field": name, "content": field.content})
            except Exception as e:
                print(f"Date parsing failed for {name}: {e}")
                skipped.append({"field": name, "content": field.content})

    debug_log = "--- RAW LINES FROM AZURE ---\n"
    debug_log += "\n".join(raw_debug_lines)

    debug_log += "\n\n--- EVENTS ---\n"
    if events:
        for idx, event in enumerate(events):
            debug_log += f"{idx + 1}. {event['event']} — {event['datetime']} (confidence: {event['confidence']})\n"
    else:
        debug_log += "No events found.\n"

    if missing_fields:
        debug_log += "\n--- MISSING FIELDS ---\n"
        for idx, field in enumerate(missing_fields):
            debug_log += f"{idx + 1}. {field} (no data found)\n"

    debug_log += "\nDone."

    return jsonify({
       "events": events,
       "skipped": skipped,
       "missing_fields": missing_fields,  # <== Correct now!
       "debug_log": debug_log,
        "raw_text": "",
        "raw_lines": []
    })


@app.route('/api/download-excel', methods=['POST'])
def download_excel():
    data = request.get_json()
    events = data.get('events', [])

    if not events:
        return jsonify({"error": "No events to export"}), 400

    df = pd.DataFrame(events)

    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Events')

    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="extracted_events.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)