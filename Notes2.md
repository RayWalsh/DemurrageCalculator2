// PRevious Case management code 

// Fetch and Populate Case Management Table
document.addEventListener("DOMContentLoaded", () => {
  const apiUrl = "https://api.airtable.com/v0/apprFJLqkgu6Mi0sD/tbl2hMFQHSYlxi1rO"; // Replace with your actual API endpoint
  const apiKey = "patxHsnDtrvFZSaS9.660b0aeef9114acc64006442de946eb4461b4c728e7def6886ac69bdebd15272"; // Replace with your actual PAT

  const tableBody = document.querySelector("#caseSummaryTable tbody");

  // Fetch data from Airtable
  const fetchData = async () => {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      populateTable(data.records);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Populate the table with data
  const populateTable = (records) => {
    tableBody.innerHTML = ""; // Clear existing table rows

    records.forEach((record) => {
      const fields = record.fields;

      // Create a table row
      const row = document.createElement("tr");

      // Add the Action column with the "Open Calculation" button
      const actionCell = document.createElement("td");
      const openButton = document.createElement("button");
      openButton.textContent = "Open Calculation";
      openButton.classList.add("open-calculation-btn");
      openButton.dataset.caseId = fields.CaseID || ""; // Attach CaseID as a data attribute
      actionCell.appendChild(openButton);
      row.appendChild(actionCell); // Append the Action cell as the first column

      // Add other fields to the row
      const fieldKeys = [
        "CaseID",
        "Account",
        "VesselName",
        "CPDate",
        "CPType",
        "CPForm",
        "OwnersName",
        "BrokersName",
        "Layday",
        "Cancelling",
        "LoadRate",
        "DischRate",
        "DemurrageRate",
        "InitialClaim",
        "NoticeReceived",
        "ClaimReceived",
        "VoyEnd",
        "NoticeDays",
        "ClaimDays",
      ];

      fieldKeys.forEach((key) => {
        const cell = document.createElement("td");
        cell.textContent = fields[key] || "";
        row.appendChild(cell);
      });

      tableBody.appendChild(row);
    });

    // Attach event listeners to "Open Calculation" buttons
    attachOpenCalculationListeners();
  };

  // Attach event listeners to the "Open Calculation" buttons
  const attachOpenCalculationListeners = () => {
    document.querySelectorAll(".open-calculation-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        const caseId = event.target.dataset.caseId;
        console.log("Button clicked for CaseID:", caseId); // Debug log
        if (caseId) {
          console.log("Navigating to calculator with CaseID:", caseId); // Debugging log
          // Navigate to the calculator with a small delay to ensure log is printed
          setTimeout(() => {
            window.location.href = `calculator.html?CaseID=${caseId}`;
          }, 0);
        } else {
          console.error("No CaseID found for this row.");
        }
      });
    });
  };

  // Fetch and populate data on page load
  fetchData();
});

///////////////////

// PRevious populatecalculator code

import { savePortToAirtable, loadPortsFromAirtable, deletePortFromAirtable } from "./AirtablePortManager.js";

export function populateCalculator(fields = {}) {
    try {
        // Populate calculator fields with data from Airtable or use defaults
        document.getElementById("caseNumber").value = fields.CaseID || "";
        document.getElementById("account").value = fields.Account || "";
        document.getElementById("vesselName").value = fields.VesselName || "";
        document.getElementById("cpDate").value = fields.CPDate || "";
        document.getElementById("loadingRate").value = fields.LoadRate || "";
        document.getElementById("dischargingRate").value = fields.DischRate || "";
        document.getElementById("demurrageRate").value = fields.DemurrageRate || "";
        // Log successful population
        console.log("Calculator fields populated successfully with data:", fields);
    } catch (error) {
        console.error("Error populating calculator fields:", error);
    }
}

// Fetch data from Airtable and populate the calculator
document.addEventListener("DOMContentLoaded", () => {
    try {
        // Debug: Log the full URL
        console.log("Full URL:", window.location.href);

        // Get CaseID from the URL query string
        const urlParams = new URLSearchParams(window.location.search);
        const caseId = urlParams.get("CaseID");

        // Debug: Log extracted CaseID
        console.log("Extracted CaseID from URL:", caseId);

        if (caseId) {
            const apiUrl = "https://api.airtable.com/v0/apprFJLqkgu6Mi0sD/tbl2hMFQHSYlxi1rO";
            const apiKey = "patxHsnDtrvFZSaS9.660b0aeef9114acc64006442de946eb4461b4c728e7def6886ac69bdebd15272";

            // Debug: Log the Airtable API request URL
            console.log("Airtable API Request URL:", `${apiUrl}?filterByFormula=CaseID="${caseId}"`);

            fetch(`${apiUrl}?filterByFormula=CaseID="${caseId}"`, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            })
                .then((response) => {
                    console.log("Response Status:", response.status); // Debug: Log HTTP status
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log("Fetched Data:", data); // Debug: Log the fetched data
                    if (data.records.length > 0) {
                        console.log("Case data fetched successfully:", data.records[0].fields);
                        populateCalculator(data.records[0].fields); // Populate with fetched data
                    } else {
                        console.warn("No case found for the provided CaseID:", caseId);
                        populateCalculator(); // Populate with default data
                    }
                })
                .catch((error) => {
                    console.error("Error fetching case data from Airtable:", error);
                    populateCalculator(); // Populate with default data
                });
        } else {
            console.warn("No CaseID provided in the URL.");
            populateCalculator(); // Populate with default data
        }
    } catch (error) {
        console.error("Error in DOMContentLoaded handler:", error);
    }
});

/////// 

The old static caseid from calculator.html 

    const fixedQueryString = "?CaseID=2024-3";
    if (!window.location.search) {
        window.location.replace(window.location.pathname + fixedQueryString);
    }