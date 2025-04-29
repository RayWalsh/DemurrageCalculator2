document.addEventListener("DOMContentLoaded", () => {
    const uploadBtn = document.getElementById("uploadBtn");
    const pdfInput = document.getElementById("pdfInput");
    const downloadBtn = document.getElementById("downloadBtn");
    const toggleEditBtn = document.getElementById("toggleEditBtn");
    const debugLog = document.getElementById("debugLog");
    const resultsTable = document.querySelector("#resultsTable tbody");

    let parsedEvents = [];
    let editMode = false;

    uploadBtn.addEventListener("click", async () => {
        const file = pdfInput.files[0];

        if (!file) {
            alert("Please upload a PDF file first.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("pdf", file);

            debugLog.textContent = "Uploading and processing PDF...";

            const response = await fetch("/api/parse-sof", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error("Server error: " + response.status);
            }

            const data = await response.json();
            parsedEvents = data.events;
            const missingFields = data.missing_fields || [];

            // Save parsed events to localStorage
            localStorage.setItem("parsedSOFEvents", JSON.stringify(data.events));

            buildResultsTable();
            buildDebugLog(data);

            if (parsedEvents.length > 0) {
                downloadBtn.disabled = false;
                toggleEditBtn.disabled = false;
            }

        } catch (error) {
            console.error("Error during processing:", error);
            debugLog.textContent = "Error: " + error.message;
        }
    });

    toggleEditBtn.addEventListener("click", () => {
        editMode = !editMode;
        toggleEditBtn.textContent = editMode ? "Disable Edit Mode" : "Enable Edit Mode";
        buildResultsTable();
    });

    downloadBtn.addEventListener("click", async () => {
        if (parsedEvents.length === 0) {
            alert("No parsed events to download!");
            return;
        }

        try {
            const response = await fetch("/api/download-excel", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ events: parsedEvents })
            });

            if (!response.ok) {
                throw new Error("Server error during Excel generation.");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "extracted_events.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error during download:", error);
            alert("Failed to download Excel file.");
        }
    });

    function buildResultsTable() {
        resultsTable.innerHTML = "";

        if (parsedEvents.length === 0) {
            resultsTable.innerHTML = "<tr><td colspan='3'>No events found.</td></tr>";
            return;
        }

        parsedEvents.forEach((entry, index) => {
            const row = document.createElement("tr");

            const confidence = entry.confidence !== undefined ? entry.confidence : "N/A";
            const confidenceStyle = confidence !== "N/A" && confidence < 0.4 ? "style='color:red;'" : "";

            if (editMode) {
                row.innerHTML = `
                    <td><input type="text" value="${entry.event}" data-index="${index}" data-field="event" /></td>
                    <td><input type="text" value="${entry.datetime}" data-index="${index}" data-field="datetime" /></td>
                    <td ${confidenceStyle}>${confidence}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${entry.event}</td>
                    <td>${entry.datetime}</td>
                    <td ${confidenceStyle}>${confidence}</td>
                `;
            }

            resultsTable.appendChild(row);
        });

        if (editMode) {
            resultsTable.querySelectorAll("input").forEach(input => {
                input.addEventListener("input", (e) => {
                    const idx = e.target.dataset.index;
                    const field = e.target.dataset.field;
                    parsedEvents[idx][field] = e.target.value;
                });
            });
        }
    }

    function buildDebugLog(data) {
        debugLog.textContent = "--- RAW LINES FROM AZURE ---\n";
        if (data.raw_lines && data.raw_lines.length > 0) {
            data.raw_lines.forEach((line, idx) => {
                debugLog.textContent += `${idx + 1}. ${line}\n`;
            });
        }

        debugLog.textContent += "\n--- EVENTS ---\n";
        if (parsedEvents.length > 0) {
            parsedEvents.forEach((event, idx) => {
                const confDisplay = event.confidence !== undefined ? ` (confidence: ${event.confidence})` : "";
                debugLog.textContent += `${idx + 1}. ${event.event} — ${event.datetime}${confDisplay}\n`;
            });
        } else {
            debugLog.textContent += "No events found.\n";
        }

        debugLog.textContent += "\n--- MISSING FIELDS ---\n";
        if (data.missing_fields && data.missing_fields.length > 0) {
            data.missing_fields.forEach((field, idx) => {
                debugLog.textContent += `${idx + 1}. ${field} (no data found)\n`;
            });
        } else {
            debugLog.textContent += "None\n";
        }

        debugLog.textContent += "\nDone.";
    }
});