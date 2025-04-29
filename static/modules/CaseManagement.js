// Fetch and Populate Case Management Table
document.addEventListener("DOMContentLoaded", () => {
    const apiUrl = "https://api.airtable.com/v0/apprFJLqkgu6Mi0sD/tbl2hMFQHSYlxi1rO"; // Replace with your actual API endpoint
    const apiKey = "patxHsnDtrvFZSaS9.660b0aeef9114acc64006442de946eb4461b4c728e7def6886ac69bdebd15272"; // Replace with your actual Airtable API Key
    const tableBody = document.querySelector("#caseSummaryTable tbody");
  
    // Step 1: Fetch data from Airtable
    const fetchData = async () => {
      try {
        console.log("Fetching data from Airtable..."); // Debug log
        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        const data = await response.json();
        console.log("Data fetched successfully:", data.records); // Debug log
        populateTable(data.records);
      } catch (error) {
        console.error("Error fetching data from Airtable:", error);
      }
    };
  
    // Step 2: Populate the table with data
    const populateTable = (records) => {
      tableBody.innerHTML = ""; // Clear existing table rows
      console.log("Populating the table with records..."); // Debug log
  
      records.forEach((record) => {
        const fields = record.fields;
  
        // Create a new table row
        const row = document.createElement("tr");
  
        // Add the Action column with the "Open Calculation" button
        const actionCell = document.createElement("td");
        const openButton = document.createElement("button");
        openButton.textContent = "Open Calculation";
        openButton.classList.add("open-calculation-btn");
        openButton.dataset.caseId = fields.CaseID || ""; // Attach CaseID as a data attribute
        actionCell.appendChild(openButton);
        row.appendChild(actionCell); // Append the Action cell to the row
  
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
  
      console.log("Table populated successfully."); // Debug log
      attachOpenCalculationListeners(); // Attach event listeners to buttons
    };
  
    // Step 3: Attach event listeners to the "Open Calculation" buttons
    const attachOpenCalculationListeners = () => {
      document.querySelectorAll(".open-calculation-btn").forEach((button) => {
          button.addEventListener("click", (event) => {
              const caseId = event.target.dataset.caseId;
  
              if (caseId) {
                  console.log("Storing CaseID in localStorage:", caseId);
                  localStorage.setItem("currentCaseID", caseId); // Store CaseID in local storage
                  window.location.href = "calculator.html"; // Navigate to calculator.html
              } else {
                  console.error("No CaseID found for this button.");
              }
          });
      });
  };
  
    // Step 4: Fetch and populate data on page load
    fetchData();
  });