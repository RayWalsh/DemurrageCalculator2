// newCaseHandler.js

document.addEventListener("DOMContentLoaded", () => {
  const charterersDropdown = document.getElementById("charterer");
  const form = document.getElementById("new-case-form");
  const debugLog = document.getElementById("debugLog");
  const spinner = document.getElementById("spinner");

  // Load Charterers from CSV
  fetch("/static/data/charterers.csv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load charterers.csv");
      }
      return response.text();
    })
    .then((csvText) => {
      const lines = csvText.split("\n").map(line => line.trim()).filter(line => line);
      lines.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        charterersDropdown.appendChild(option);
      });
      logDebug("Charterers loaded from CSV.");
    })
    .catch((error) => {
      logDebug("Error loading charterers: " + error.message);
    });

  // Submit Handler
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = {
      DeepBlueRef: document.getElementById("ref").value,
      ClientName: document.getElementById("client").value,
      VesselName: document.getElementById("ship").value,
      VoyageNumber: document.getElementById("voyage").value,
      VoyageEndDate: document.getElementById("endDate").value,
      CPDate: document.getElementById("contractDate").value,
      CPType: "", // (optional)
      OwnersName: "", // (optional)
      BrokersName: document.getElementById("broker").value,
      CharterersName: document.getElementById("charterer").value,
      ContractType: document.getElementById("contractType").value,
      ClaimType: document.getElementById("claimType").value,
      ClaimFiledAmount: parseFloat(document.getElementById("claimAmount").value) || 0,
      ClaimStatus: document.getElementById("claimStatus").value,
    };

    logDebug("Submitting New Case:");
    logDebug(JSON.stringify(formData, null, 2));

    spinner.style.display = "block"; // Show spinner

    try {
      const response = await fetch("/submit-new-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        logDebug("Success: " + data.message);
        alert("New Case created successfully!");
        form.reset();
      } else {
        logDebug("Error: " + (data.error || "Unknown error"));
        alert("Failed to create case. See debug log.");
      }
    } catch (error) {
      logDebug("Error submitting form: " + error.message);
      alert("Error submitting form. See debug log.");
    } finally {
      spinner.style.display = "none"; // Always hide spinner at the end
    }
  });

  function logDebug(message) {
    const timestamp = new Date().toISOString();
    debugLog.textContent += `[${timestamp}] ${message}\n`;
  }
});