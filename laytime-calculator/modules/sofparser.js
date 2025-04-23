document.addEventListener("DOMContentLoaded", () => {
    const uploadBtn = document.getElementById("uploadBtn");
    const pdfInput = document.getElementById("pdfInput");
    const debugLog = document.getElementById("debugLog");
    const resultsTable = document.querySelector("#resultsTable tbody");
  
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
  
        if (!response.ok) throw new Error("Server error: " + response.status);
  
        const data = await response.json();
        debugLog.textContent = "Parsing complete. Rendering table...";
  
        // Clear previous results
        resultsTable.innerHTML = "";
  
        if (data.length === 0) {
          resultsTable.innerHTML = "<tr><td colspan='2'>No events found.</td></tr>";
        } else {
          data.forEach(entry => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${entry.event}</td>
              <td>${entry.datetime}</td>
            `;
            resultsTable.appendChild(row);
          });
        }
  
        debugLog.textContent += "\nDone.";
      } catch (error) {
        console.error("Error during OCR:", error);
        debugLog.textContent = "Error: " + error.message;
      }
    });
  });