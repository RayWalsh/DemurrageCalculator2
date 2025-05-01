from flask import Flask
import pyodbc

app = Flask(__name__)

# Replace this with your actual connection string and password
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

@app.route("/test-insert")
def test_insert():
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Cases (
                DeepBlueRef, ClientName, VesselName, CPDate, ClaimStatus
            ) VALUES (?, ?, ?, ?, ?)
        """, ("TEST-REF-001", "Sokana3", "MV Test Vessel", "2025-04-29", "1. Documents Received"))
        conn.commit()
        cursor.close()
        conn.close()
        return "Test row inserted successfully into 'Cases' table!"
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    app.run(debug=True)