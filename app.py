from flask import Flask, request, render_template, jsonify, send_file
from datetime import datetime
import re
import pandas as pd
import pyodbc
from io import BytesIO
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from flask import Flask, request, render_template, redirect, url_for, session
from passlib.hash import pbkdf2_sha256




app = Flask(__name__)
app.secret_key = 'super-secret-key'  # Replace with a real secret in production

# Azure SQL Connection string
conn_str = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=tcp:deepbluedb.database.windows.net,1433;"
    "Database=DeepBlueDB;"
    "Uid=Deepblueadmin;"
    "Pwd=Atlantic!Beaufort6633;"
    "Encrypt=yes;"
    "TrustServerCertificate=no;"
    "Connection Timeout=30;"
)

# === Azure Configuration ===
AZURE_ENDPOINT = "https://sofparser.cognitiveservices.azure.com/"
AZURE_KEY = "5Dr8xxzZcVxvgocaypa1kNY06HYpRNmC4KlY0cmpZfvD6P75uFUpJQQJ99BDACmepeSXJ3w3AAALACOGUZXS"
MODEL_ID = "SOFPArser3"
AZURE_CLIENT = DocumentIntelligenceClient(endpoint=AZURE_ENDPOINT, credential=AzureKeyCredential(AZURE_KEY))

# === Field Mapping ===
field_mapping = {
    "Field_EOSP": "EOSP",
    "Field_NORT": "NOR Tendered",
    "Field_POB": "Pilot On Board",
    "Field_AllFast": "All Fast",
    "Field_COSP": "COSP",
    "Field_HoseConnected": "Hose Connected",
    "Field_HoseDisconnected": "Hose Disconnected",
    "Field_CommencedLoading": "Commenced Loading",
    "Field_CompletedLoading": "Completed Loading",
    "Field_CommencedDischarge": "Commenced Discharge",
    "Field_CompletedDisch": "Completed Discharge",
    "Field_CompletedDrifting": "Completed Drifting",
    "Field_DocumentsOnboard": "Documents On Board",
    "Field_DocumentsCompleted": "Documents Completed",
    "Field_GangwayDown": "Gangway Down",
    "Field_Anchored": "Anchored",
    "Field_AnchorAweigh": "Anchor Aweigh"
}

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# === ROUTES for Web Pages ===

@app.route('/')
def home():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('home.html')

@app.route('/case-management')
def case_management():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('case-management.html')

@app.route('/calculator')
def calculator():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('calculator.html')

@app.route('/new-case')
def new_case():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('new-case.html')

@app.route('/sof-parser')
def sof_parser():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('sofparser.html')

@app.route('/about')
def about():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('about.html')

@app.route('/settings/case-management')
def case_management_settings():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('settings_case_management.html')

# === API Routes ===

@app.route('/api/case-columns', methods=['GET'])
def get_case_columns():
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Fetch column metadata from INFORMATION_SCHEMA
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Cases'
            ORDER BY ORDINAL_POSITION
        """)

        columns = [{"name": row[0], "type": row[1]} for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        return jsonify(columns), 200
    except Exception as e:
        print("Error fetching columns:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/add-column", methods=["POST"])
def add_column():
    try:
        data = request.get_json()
        name = data.get("name")
        friendly_type = data.get("friendlyType")

        # Validate column name
        if not name or not name.strip().isalnum() or not name[0].isalpha():
            return jsonify({"success": False, "error": "Invalid column name"}), 400

        # Map friendly type to SQL type
        sql_type_map = {
            "Text": "NVARCHAR(255)",
            "Paragraph": "NVARCHAR(MAX)",
            "Number": "INT",
            "Decimal Number": "DECIMAL(18,2)",
            "Date/Time": "DATETIME",
            "Yes/No": "BIT"
        }

        sql_type = sql_type_map.get(friendly_type)
        if not sql_type:
            return jsonify({"success": False, "error": f"Unsupported field type: {friendly_type}"}), 400

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Check if the column already exists
        cursor.execute("""
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Cases' AND COLUMN_NAME = ?
        """, (name,))
        if cursor.fetchone():
            return jsonify({"success": False, "error": f"Column '{name}' already exists"}), 400

        # Add the new column
        alter_sql = f"ALTER TABLE Cases ADD [{name}] {sql_type};"
        cursor.execute(alter_sql)
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"success": True}), 200

    except Exception as e:
        print("Error in /api/add-column:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/delete-column/<string:column_name>', methods=['DELETE'])
def delete_column(column_name):
    try:
        if column_name in ("CaseID", "DeepBlueRef"):
            return jsonify({"success": False, "error": "Cannot delete protected column."}), 403

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Check column exists
        cursor.execute("""
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Cases' AND COLUMN_NAME = ?
        """, (column_name,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Column does not exist"}), 404

        # Execute ALTER TABLE DROP COLUMN
        cursor.execute(f"ALTER TABLE Cases DROP COLUMN [{column_name}]")
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"success": True}), 200

    except Exception as e:
        print("Error deleting column:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

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

# === API SAVING ROUTES ===

@app.route("/api/update-case/<string:ref>", methods=["POST"])
def update_case_by_ref(ref):
    try:
        data = request.get_json()
        print(f"Updating Case with DeepBlueRef {ref} using data:", data)

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Only include keys that match known columns
        allowed_fields = {
            "DeepBlueRef", "ClientName", "VesselName", "VoyageNumber", "VoyageEndDate", "CPDate",
            "CPType", "CPForm", "OwnersName", "BrokersName", "CharterersName", "ContractType",
            "ClaimType", "ClaimFiledAmount", "ClaimStatus", "Layday", "Cancelling", "LoadRate",
            "DischRate", "DemurrageRate", "LoadingRate", "DischargingRate", "Reversible",
            "LumpsumHours", "CalculationType", "TotalAllowedLaytime", "TotalTimeUsed",
            "TotalTimeOnDemurrage", "TotalDemurrageCost", "CalculatorNotes"
        }

        fields_to_update = [key for key in data.keys() if key in allowed_fields]

        if not fields_to_update:
            return jsonify({"error": "No valid fields provided"}), 400

        set_clause = ", ".join([f"{field} = ?" for field in fields_to_update])
        values = [data[field] for field in fields_to_update]

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Try to update first
        sql = f"UPDATE Cases SET {set_clause} WHERE DeepBlueRef = ?"
        cursor.execute(sql, values + [ref])
        conn.commit()

        if cursor.rowcount == 0:
            # No matching case, so insert new
            print(f"No existing case found for {ref}. Inserting new case.")
            insert_columns = ", ".join(fields_to_update)
            insert_placeholders = ", ".join(["?"] * len(fields_to_update))
            insert_sql = f"INSERT INTO Cases ({insert_columns}) VALUES ({insert_placeholders})"
            cursor.execute(insert_sql, values)
            conn.commit()
            action = "inserted"
        else:
            print(f"Updated existing case for {ref}.")
            action = "updated"

        cursor.close()
        conn.close()

        return jsonify({"message": f"Case with DeepBlueRef {ref} {action} successfully!", "action": action}), 200

    except Exception as e:
        print("Update error:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/save-ports/<string:ref>", methods=["POST"])
def save_ports(ref):
    try:
        ports = request.get_json()
        if not isinstance(ports, list):
            return jsonify({"error": "Expected a list of ports"}), 400

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Get CaseID
        cursor.execute("SELECT CaseID FROM Cases WHERE DeepBlueRef = ?", ref)
        result = cursor.fetchone()
        if not result:
            return jsonify({"error": f"No case found with DeepBlueRef {ref}"}), 404

        case_id = result[0]

        print(f"Found CaseID {case_id} for DeepBlueRef {ref}. Replacing ports...")

        # First, delete events/deductions linked to old ports for this case
        cursor.execute("SELECT PortID FROM Ports WHERE CaseID = ?", case_id)
        old_port_ids = [row[0] for row in cursor.fetchall()]
        for pid in old_port_ids:
            cursor.execute("DELETE FROM Events WHERE PortID = ?", pid)
            cursor.execute("DELETE FROM Deductions WHERE PortID = ?", pid)

        # Then delete the ports
        cursor.execute("DELETE FROM Ports WHERE CaseID = ?", case_id)

        # Now insert fresh ports
        returned_ports = []
        for port in ports:
            cursor.execute("""
                INSERT INTO Ports (
                    CaseID, PortName, CargoQty, PortType, AllowedLaytime, TimeUsed,
                    TimeOnDemurrage, PortDemurrageCost, Notes, CreatedAt
                )
                OUTPUT INSERTED.PortID
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
            """, (
                case_id,
                port.get("name", ""),
                port.get("cargoQty", 0),
                port.get("portType", ""),
                port.get("allowedLaytime", 0),
                port.get("timeUsed", 0),
                port.get("timeOnDemurrage", 0),
                port.get("portDemurrageCost", 0),
                port.get("notes", "")
            ))
            new_port_id = cursor.fetchone()[0]
            returned_ports.append({"PortID": new_port_id})

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify(returned_ports), 200

    except Exception as e:
        print("Error in save_ports:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/save-events/<int:port_id>", methods=["POST"])
def save_events(port_id):
    try:
        events = request.get_json()
        if not isinstance(events, list):
            return jsonify({"error": "Expected a list of events"}), 400

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM Events WHERE PortID = ?", port_id)

        for idx, event in enumerate(events):
            print("Saving event:", event)
            raw_time = event.get("datetime")
            parsed_time = None

            if raw_time:
                try:
                    parsed_time = datetime.fromisoformat(raw_time)
                except Exception as e:
                    print("Failed to parse datetime:", raw_time, e)

            cursor.execute("""
                INSERT INTO Events (PortID, EventName, EventTime, EventType, Remarks, DisplayOrder)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                port_id,
                event.get("event", ""),
                parsed_time,
                event.get("type", ""),
                event.get("remarks", ""),
                idx
            ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": f"{len(events)} events saved for port {port_id}."}), 200

    except Exception as e:
        print("Error saving events:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/save-deductions/<int:port_id>", methods=["POST"])
def save_deductions(port_id):
    try:
        deductions = request.get_json()
        if not isinstance(deductions, list):
            return jsonify({"error": "Expected a list of deductions"}), 400

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Delete existing deductions
        cursor.execute("DELETE FROM Deductions WHERE PortID = ?", port_id)

        for idx, deduction in enumerate(deductions):
            print("Saving deduction:", deduction)

            start_raw = deduction.get("start")
            end_raw = deduction.get("end")
            start_parsed, end_parsed = None, None

            try:
                if start_raw:
                    start_parsed = datetime.fromisoformat(start_raw)
                if end_raw:
                    end_parsed = datetime.fromisoformat(end_raw)
            except Exception as e:
                print("Failed to parse deduction datetimes:", start_raw, end_raw, e)

            cursor.execute("""
                INSERT INTO Deductions (PortID, Reason, StartTime, EndTime, DisplayOrder)
                VALUES (?, ?, ?, ?, ?)
            """, (
                port_id,
                deduction.get("reason", ""),
                start_parsed,
                end_parsed,
                idx
            ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": f"{len(deductions)} deductions saved for port {port_id}."}), 200

    except Exception as e:
        print("Error saving deductions:", str(e))
        return jsonify({"error": str(e)}), 500

# === API LOADING ROUTES ===

@app.route("/api/get-ports/<string:ref>", methods=["GET"])
def get_ports(ref):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT p.*
            FROM Ports p
            INNER JOIN Cases c ON p.CaseID = c.CaseID
            WHERE c.DeepBlueRef = ?
            ORDER BY p.CreatedAt ASC
        """, ref)

        columns = [col[0] for col in cursor.description]
        ports = [dict(zip(columns, row)) for row in cursor.fetchall()]

        print(f"Fetched {len(ports)} ports for {ref}")

        cursor.close()
        conn.close()

        return jsonify(ports), 200
    except Exception as e:
        print("Error fetching ports:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/get-events/<int:port_id>", methods=["GET"])
def get_events(port_id):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT EventName, EventTime, EventType, Remarks, DisplayOrder
            FROM Events
            WHERE PortID = ?
            ORDER BY DisplayOrder ASC
        """, port_id)

        columns = [col[0] for col in cursor.description]
        events = [dict(zip(columns, row)) for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        return jsonify(events), 200
    except Exception as e:
        print("Error fetching events:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/get-deductions/<int:port_id>", methods=["GET"])
def get_deductions(port_id):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Deductions WHERE PortID = ? ORDER BY DisplayOrder ASC", port_id)

        columns = [col[0] for col in cursor.description]
        deductions = [dict(zip(columns, row)) for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        return jsonify(deductions), 200
    except Exception as e:
        print("Error fetching deductions:", str(e))
        return jsonify({"error": str(e)}), 500

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


# === New Case API Route ===
@app.route("/submit-new-case", methods=["POST"])
def submit_new_case():
    try:
        data = request.get_json()
        print("=== DATA RECEIVED ===")
        print(data)  # <-- Print incoming data
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO Cases (
                DeepBlueRef, ClientName, VesselName, VoyageNumber, VoyageEndDate, CPDate, CPType,
                OwnersName, BrokersName, CharterersName, ContractType, ClaimType, ClaimFiledAmount,
                ClaimStatus
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['DeepBlueRef'],
            data['ClientName'],
            data['VesselName'],
            data.get('VoyageNumber', ''),
            data.get('VoyageEndDate', None),
            data['CPDate'],
            data.get('CPType', ''),
            data.get('OwnersName', ''),  # <-- Watch this one carefully
            data['BrokersName'],
            data['CharterersName'],
            data['ContractType'],
            data['ClaimType'],
            data.get('ClaimFiledAmount', 0),
            data['ClaimStatus']
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "New case inserted successfully!"}), 200
    except Exception as e:
        print("=== ERROR OCCURRED ===")
        print(str(e))  # <-- Print the real error
        return jsonify({"error": str(e)}), 500

# === New API Route to Fetch Cases ===
@app.route('/api/get-case/<string:case_ref>', methods=['GET'])
def get_case(case_ref):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM Cases WHERE DeepBlueRef = ?", (case_ref,))
        row = cursor.fetchone()

        if row is None:
            cursor.close()
            conn.close()
            return jsonify({"error": "Case not found"}), 404

        columns = [column[0] for column in cursor.description]
        case_data = dict(zip(columns, row))

        cursor.close()
        conn.close()
        return jsonify(case_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/cases", methods=["GET"])
def get_cases():
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                CaseID,
                DeepBlueRef,
                ClientName,
                VesselName,
                VoyageNumber,
                VoyageEndDate,
                CPDate,
                CPType,
                CPForm,
                OwnersName,
                BrokersName,
                CharterersName,
                Layday,
                Cancelling,
                LoadRate,
                DischRate,
                DemurrageRate,
                InitialClaim,
                NoticeReceived,
                ClaimReceived,
                NoticeDays,
                ClaimDays,
                ContractType,
                ClaimType,
                ClaimFiledAmount,
                ClaimStatus,
                Reversible,
                LumpsumHours,
                CalculationType,
                TotalAllowedLaytime,
                TotalTimeUsed,
                TotalTimeOnDemurrage,
                TotalDemurrageCost,
                CalculatorNotes,
                CreatedAt,
                LoadingRate,
                DischargingRate
            FROM Cases
            ORDER BY CPDate DESC
        """)

        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()
        cases = [dict(zip(columns, row)) for row in rows]

        cursor.close()
        conn.close()

        return jsonify(cases), 200
    except Exception as e:
        print("ERROR in /api/cases:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/update-case-by-id/<int:case_id>", methods=["POST"])
def update_case_by_id(case_id):
    try:
        data = request.get_json()
        print(f"Updating CaseID {case_id} using data:", data)

        if not data:
            return jsonify({"error": "No data provided"}), 400

        allowed_fields = {
            "DeepBlueRef", "ClientName", "VesselName", "VoyageNumber", "VoyageEndDate", "CPDate",
            "CPType", "CPForm", "OwnersName", "BrokersName", "CharterersName", "ContractType",
            "ClaimType", "ClaimFiledAmount", "ClaimStatus", "Layday", "Cancelling", "LoadRate",
            "DischRate", "DemurrageRate", "InitialClaim", "NoticeReceived", "ClaimReceived",
            "NoticeDays", "ClaimDays", "Reversible", "LumpsumHours", "CalculationType",
            "TotalAllowedLaytime", "TotalTimeUsed", "TotalTimeOnDemurrage", "TotalDemurrageCost",
            "CalculatorNotes", "LoadingRate", "DischargingRate"
        }

        fields_to_update = [key for key in data if key in allowed_fields]
        if not fields_to_update:
            return jsonify({"error": "No valid fields provided"}), 400

        set_clause = ", ".join(f"{field} = ?" for field in fields_to_update)
        values = [data[field] for field in fields_to_update]

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Update case using CaseID
        sql = f"UPDATE Cases SET {set_clause} WHERE CaseID = ?"
        cursor.execute(sql, values + [case_id])
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": f"No case found with CaseID {case_id}"}), 404

        cursor.close()
        conn.close()

        return jsonify({"message": f"Case {case_id} updated successfully!"}), 200

    except Exception as e:
        print("Update by CaseID error:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/delete-case/<int:case_id>", methods=["DELETE"])
def delete_case(case_id):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Optional: check if the case exists first
        cursor.execute("SELECT 1 FROM Cases WHERE CaseID = ?", (case_id,))
        if not cursor.fetchone():
            return jsonify({"error": f"No case found with CaseID {case_id}"}), 404

        # Delete linked Ports, Events, and Deductions (to maintain integrity)
        cursor.execute("SELECT PortID FROM Ports WHERE CaseID = ?", (case_id,))
        port_ids = [row[0] for row in cursor.fetchall()]

        for port_id in port_ids:
            cursor.execute("DELETE FROM Events WHERE PortID = ?", (port_id,))
            cursor.execute("DELETE FROM Deductions WHERE PortID = ?", (port_id,))
        
        cursor.execute("DELETE FROM Ports WHERE CaseID = ?", (case_id,))
        cursor.execute("DELETE FROM Cases WHERE CaseID = ?", (case_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": f"Case {case_id} and all linked data deleted successfully."}), 200

    except Exception as e:
        print("Delete error:", str(e))
        return jsonify({"error": str(e)}), 500

# === NEW CASE EXISTENCE CHECK ROUTE ===
@app.route('/api/case-exists/<string:ref>', methods=['GET'])
def case_exists(ref):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM Cases WHERE DeepBlueRef = ?", ref)
        exists = cursor.fetchone() is not None

        cursor.close()
        conn.close()

        return jsonify({"exists": exists}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # === LOGIN LOGIC ===

@app.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    success = None

    if request.method == 'POST':
        secret_key = request.form['secret_key']
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        if secret_key != "SHINC":
            error = "Invalid secret key."
        else:
            hashed_pw = pbkdf2_sha256.hash(password)
            try:
                conn = pyodbc.connect(conn_str)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Users (Username, Email, HashedPassword, IsActive)
                    VALUES (?, ?, ?, 1)
                """, (username, email, hashed_pw))
                conn.commit()
                cursor.close()
                conn.close()
                success = "Registration successful! You can now log in."
            except Exception as e:
                error = f"Registration failed: {str(e)}"

    return render_template('register.html', error=error, success=success)

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    db_status = "Checking connection..."

    # Test database connection
    try:
        conn = pyodbc.connect(conn_str)
        db_status = "✅ Connected to database"
        db_ok = True
    except Exception as e:
        print("DB connection error:", e)
        db_status = "❌ Database connection failed"
        db_ok = False

    # Only proceed if DB connection is good
    if request.method == 'POST' and db_ok:
        username = request.form['username']
        password = request.form['password']
        print(f"Username submitted: {username}")
        print(f"Password submitted: {password}")

        try:
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            cursor.execute("SELECT HashedPassword FROM Users WHERE Username = ? AND IsActive = 1", username)
            row = cursor.fetchone()
            cursor.close()
            conn.close()

            if row:
                hashed_pw = row[0]
                print("Fetched hash from DB:", hashed_pw)
                print("Raw hash repr:", repr(hashed_pw))
                print("Password entered repr:", repr(password))

                # Decode if it's bytes
                if isinstance(hashed_pw, bytes):
                    hashed_pw = hashed_pw.decode('utf-8')

                # Perform password verification
                if hashed_pw and pbkdf2_sha256.verify(password, hashed_pw.strip()):
                    print("✅ Password match — logging in.")
                    session['username'] = username
                    return redirect(url_for('home'))
                else:
                    print("❌ Password mismatch.")
                    error = 'Invalid username or password.'
            else:
                print("❌ No matching user found.")
                error = 'Invalid username or password.'

        except Exception as e:
            print("Login logic error:", str(e))
            error = 'Login failed due to a server error.'

    return render_template('login.html', error=error, db_status=db_status)

from passlib.hash import pbkdf2_sha256

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    username = request.form.get('username')
    email = request.form.get('email')
    new_password = request.form.get('new_password')
    hashed_password = pbkdf2_sha256.hash(new_password)

    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Verify that the username and email match
        cursor.execute("SELECT 1 FROM Users WHERE Username = ? AND Email = ?", (username, email))
        if cursor.fetchone() is None:
            return render_template('login.html', error="Username and email do not match.")

        # Now update password
        cursor.execute("UPDATE Users SET HashedPassword = ? WHERE Username = ?", hashed_password, username)
        conn.commit()
        cursor.close()
        conn.close()

        print(f"Password for {username} was successfully reset.")
        return redirect(url_for('login'))

    except Exception as e:
        print("Password reset error:", str(e))
        return render_template('login.html', error="Failed to reset password.")

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.context_processor
def inject_user():
    if 'username' in session:
        try:
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            cursor.execute("SELECT Username, Email, CompanyName FROM Users WHERE Username = ?", (session['username'],))
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            if row:
                user_data = {
                    "name": row[0],
                    "email": row[1],
                    "company_name": row[2] if row[2] else "Deep Blue",
                    "initials": "".join([word[0].upper() for word in row[0].split() if word])
                }
                return dict(user=user_data)
        except Exception as e:
            print("User context fetch error:", str(e))
    return dict(user=None)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
