import { state, addPort, updatePort, deletePort, updateDefaultRates } from './modules/DataManager.js';
import { calculateAllowedLaytime, calculateDemurrage } from './modules/CalculationEngine.js';
import { generateReport, generatePortReport } from './modules/ReportGenerator.js';
import { logDebug } from './modules/Logger.js';
import { savePortToAirtable, loadPortsFromAirtable, deletePortFromAirtable } from "./modules/AirtablePortManager.js";



// Initial Render Function
function renderApp() {
  logDebug("renderApp() function called");

  document.getElementById('app').innerHTML = `
      <div class="header">
    <h2></h2>
    <div id="tabs-container" class="tabs-container">
      <!-- Tabs Section -->
      <div id="tabs" class="tabs">
        <button class="tab active" data-tab="summary">Summary</button>
      </div>

      <!-- Icons Section -->
      <div class="icons-container">

      <!-- Update Calculation Button -->
      <button id="updateCalculationIcon" class="icon-button" title="Update Calculation">
        <i class="icon-save">💾</i>
      </button>

      <!-- Paper Icon (Generate Report) -->
      <button id="generateReportIcon" class="icon-button" title="Generate reports">
        <i class="icon-file">📄</i>
      </button>

        <!-- Hamburger Menu Icon -->
        <button id="hamburgerIcon" class="icon-button">
          <i class="icon-hamburger">☰</i>
        </button>
      </div>
    </div>
  </div>

    <div id="tab-content" class="tab-content">
      <div id="summary" class="tab-panel active">
        <!-- Existing App Content -->

        <!-- Contract Info and Laytime Section -->
        <div class="flex-container">
          <div class="section contract-info">
            <h2>Contract Info</h2>
            <label>Case Number: <input id="caseNumber" type="text"></label>
            <label>Account: <input id="account" type="text"></label>
            <label>Vessel Name: <input id="vesselName" type="text"></label>
            <label>CP Date: <input id="cpDate" type="date"></label>
          </div>

          <div class="section" id="laytime-section">
            <div id="laytime-header">
              <h2>Laytime</h2>
              <div>
                <input id="reversible" type="checkbox" checked>
                <button id="updateRatesBtn">Update Laytime</button>
              </div>
            </div>
            <div id="laytime-controls">
              <div class="laytime-row">
                <input type="radio" name="laytimeOption" id="lumpsumRadio">
                <label for="lumpsumRadio">Lumpsum Hours:</label>
                <input id="lumpsumHours" type="number" placeholder="Enter Lumpsum Hours">
              </div>
              <div class="laytime-row">
                <input type="radio" name="laytimeOption" id="ratesRadio" checked>
                <label for="ratesRadio">Loading Rate (MTPH):</label>
                <input id="loadingRate" type="number" value="150">
                <label for="dischargingRate">Discharging Rate (MTPH):</label>
                <input id="dischargingRate" type="number" value="100">
              </div>
              <div class="laytime-row">
                <label for="demurrageRate">Demurrage Rate (Per Day):</label>
                <input id="demurrageRate" type="number" value="24000">
              </div>
            </div>
          </div>
        </div>

        <div class="section port-management">
          <h2>Port Management</h2>
          <button id="addPortBtn">Add Port</button>
          <table>
            <thead>
              <tr>
                <th>Port Name</th>
                <th>Cargo Qty</th>
                <th>Port Type</th>
                <th>Allowed Laytime</th>
                <th>Time Used</th>
                <th>Time on Demurrage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="ports"></tbody>
          </table>
        </div>

        <div class="section results-section">
          <h2>Summary Results</h2>
          <div id="summary-results"></div>
        </div>

        <div class="flex-container results-notes">
          <div class="section results-section">
            <h2>Results</h2>
            <p>Total Allowed Laytime: <span id="totalAllowed">0.0000000</span> hrs</p>
            <p>Total Time Used: <span id="totalUsed">0.0000000</span> hrs</p>
            <p>Time on Demurrage: <span id="timeOnDemurrage">0.0000000</span> hrs</p>
            <p><strong>Demurrage Cost:</strong> $<span id="demurrageCost">0.00</span></p>
          </div>

          <div class="section notes-section">
            <h2>Notes</h2>
            <textarea id="notes"></textarea>
          </div>
        </div>

        <div class="section debug-console">
          <h2>Debug Log</h2>
          <pre id="debugLog"></pre>
        </div>
      </div>
    </div>
  `;

  // Attach Event Listener to Generate Report button
  document.getElementById("generateReportIcon").addEventListener("click", () => {
    logDebug("Generate Report icon clicked.");
    generateReport();
  });

  // Event Delegation for Tab Switching
  document.getElementById("tabs").addEventListener("click", (event) => {
    const clickedTab = event.target;

    // Ensure the click is on a tab
    if (clickedTab.classList.contains("tab")) {
      switchTab(event);
    }
  });

  // Attach Event Listeners for other functionalities
  document.getElementById("addPortBtn").addEventListener("click", addNewPort);
  document.getElementById("updateRatesBtn").addEventListener("click", updateRates);
  document.getElementById("lumpsumRadio").addEventListener("change", calculateResults);
  document.getElementById("ratesRadio").addEventListener("change", calculateResults);
  document.getElementById("reversible").addEventListener("change", calculateResults);

  // New Save event listener

  
  document.getElementById("updateCalculationIcon").addEventListener("click", async () => {
  console.log("Update Calculation clicked.");
  try {
      await Promise.all(state.ports.map((port) => savePortToAirtable(port)));
      alert("Calculation updated successfully!");
  } catch (error) {
      console.error("Error updating calculation:", error);
      alert("Failed to update calculation. Please try again.");
  }
  });

  // end new save event listener 

      // Emit a custom event when rendering is done
      const event = new Event("AppRendered");
      document.dispatchEvent(event);
      logDebug("renderApp() completed, AppRendered event dispatched.");

  // Initial render of summary, ports, and results
  renderSummaryResults();
  renderPorts();
  calculateResults();
}




// Add New Port Function
window.addNewPort = () => {
  try {
    logDebug("Add Port button clicked.");

    // Generate a unique ID for the port
    const portId = Date.now();

    // Create a new port object with the generated ID
    const newPort = { id: portId, name: `Port ${state.ports.length + 1}`, cargoQty: 0, portType: "L", timeUsed: 0 };

    // Add the new port to the state
    addPort(newPort);

    // Add a corresponding tab using the same ID
    addPortTab(newPort);

    // Debugging the current ports state
    console.log("Current Ports State:", JSON.stringify(state.ports, null, 2));

    // Re-render ports and recalculate results
    renderPorts();
    calculateResults();
  } catch (error) {
    logDebug(`Error in addNewPort: ${error.message}`);
  }
};

// Render Summary results to be called before renderports
function renderSummaryResults() {
  console.log("Rendering Summary Results. Current Ports State:", JSON.stringify(state.ports, null, 2)); // Debug log
  
  const summaryContainer = document.getElementById("summary-results");
  summaryContainer.innerHTML = "";

  state.ports.forEach((port) => {
    summaryContainer.innerHTML += `
      <p><strong>${port.name}:</strong> 
      <span id="summary-time-used-${port.id}">0.0000000</span> hrs</p>
    `;
  });
}

// Render Ports Table
function renderPorts() {
  const portsContainer = document.getElementById("ports");
  portsContainer.innerHTML = ""; // Clear existing rows

  state.ports.forEach((port, index) => {
    const rate = port.portType === "L" 
      ? state.defaultRates.loadingRate 
      : state.defaultRates.dischargingRate;

    const allowedLaytime = calculateAllowedLaytime(port.cargoQty, rate, port.portType);
    const timeOnDemurrage = Math.max(parseFloat(port.timeUsed) - allowedLaytime, 0);

    // Ensure the row has the correct structure
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input type="text" value="${port.name}" onchange="updatePortData(${port.id}, 'name', this.value); updateTabName(${index + 1});"></td>
      <td><input type="number" value="${port.cargoQty}" onchange="updatePortData(${port.id}, 'cargoQty', this.value)"></td>
      <td>
        <select onchange="updatePortData(${port.id}, 'portType', this.value)">
          <option value="L" ${port.portType === "L" ? "selected" : ""}>Loading</option>
          <option value="D" ${port.portType === "D" ? "selected" : ""}>Discharge</option>
        </select>
      </td>
      <td>${allowedLaytime.toFixed(7)}</td>
      <td>${port.timeUsed ? port.timeUsed.toFixed(7) : "0.0000000"}</td> <!-- Safely handle "Time Used" -->
      <td>${timeOnDemurrage.toFixed(7)}</td>
      <td><button onclick="removePort(${port.id})">Delete</button></td>
    `;

    portsContainer.appendChild(row);

    // Debug: Log the row structure
    console.log(`Row ${index + 1}:`, row.outerHTML);
  });

  calculateResults(); // Recalculate results after rendering
}



function updateTabName(portIndex) {
  const portNameInput = document.querySelector(
    `#ports tr:nth-child(${portIndex}) td:first-child input`
  );
  const tabButton = document.querySelector(`.tab[data-tab="port${portIndex}"]`);

  if (tabButton && portNameInput) {
    const portName = portNameInput.value.trim();
    tabButton.textContent = portName ? portName : `Port ${portIndex}`;
  }
}

let portCount = 0;

function switchTab(event) {
  const clickedTab = event.target;

  // Ensure only tabs trigger the function
  if (!clickedTab.classList.contains("tab")) {
    return;
  }

  const tabId = clickedTab.dataset.tab;
  console.log("Switching to tab:", tabId);

  const targetTabPanel = document.getElementById(tabId);
  if (!targetTabPanel) {
    console.error(`Tab panel with id "${tabId}" does not exist.`);
    return;
  }

  // Remove active class from all tabs and panels
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));

  // Add active class to the clicked tab and its corresponding panel
  clickedTab.classList.add("active");
  targetTabPanel.classList.add("active");

  console.log(`Switched to tab: ${tabId}`);
}


function addPortTab(port) {
  const tabsContainer = document.getElementById("tabs");
  const tabContent = document.getElementById("tab-content");

  // Use the port's ID for unique identifiers
  const portId = port.id;

  // Create Tab Button
  const tabButton = document.createElement("button");
  tabButton.className = "tab";
  tabButton.dataset.tab = `port${portId}`;
  tabButton.textContent = port.name;

  tabButton.addEventListener("click", switchTab);
  tabsContainer.appendChild(tabButton);

  // Create Tab Panel
  const tabPanel = document.createElement("div");
  tabPanel.id = `port${portId}`;
  tabPanel.className = "tab-panel";

  tabPanel.innerHTML = `
    <h2>${port.name}</h2>
    <div class="section">
      <h3>Events</h3>
      <button class="add-event">Add Event</button>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Time</th>
            <th>Start/End</th>
            <th>Remarks</th>
            <th>Subtotal (hrs)</th>
            <th></th>
          </tr>
        </thead>
        <tbody class="events-body"></tbody>
        <tfoot>
          <tr>
            <td colspan="4"><strong>Total:</strong></td>
            <td class="events-subtotal">0.0000000</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="section">
      <h3>Deductions</h3>
      <button class="add-deduction">Add Deduction</button>
      <table>
        <thead>
          <tr>
            <th>Reason</th>
            <th>Start</th>
            <th>End</th>
            <th>Used Time (hrs)</th>
            <th></th>
          </tr>
        </thead>
        <tbody class="deductions-body"></tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>Total:</strong></td>
            <td class="deductions-total">0.0000000</td>
          </tr>
        </tfoot>
      </table>
    </div>
  <div class="results-container flex-container">
    <div class="section results-section">
      <h3>Results</h3>
      <p>Total Allowed Laytime: <span class="total-allowed-laytime">0.0000000</span> hrs</p>
      <p>Total Time Used: <span class="total-time-used">0.0000000</span> hrs</p>
      <p>Time on Demurrage: <span class="time-on-demurrage">0.0000000</span> hrs</p>
      <p>Port Demurrage Cost: $<span class="port-demurrage-cost">0.00</span></p>
      <button class="generate-report">Generate Report</button>
    </div>
    <div class="section notes-section">
      <h3>Notes</h3>
      <textarea placeholder="Enter notes"></textarea>
    </div>
  </div>
`;

  tabContent.appendChild(tabPanel);

  // Attach functionality to the newly added tab panel
  setupPortTab(tabPanel);

  //Attach Generate Report event listener
  const generateReportBtn = tabPanel.querySelector(".generate-report");
generateReportBtn.addEventListener("click", () => {
  const portName = port.name; // Port name for the report
  logDebug(`Generate Report clicked for Port: ${portName}`);
  generatePortReport(tabPanel, portName); // Pass tabPanel and portName
});

  logDebug(`Port tab added: port${portId}`);
}

function addEventRow(tabPanel) {
  const eventsBody = tabPanel.querySelector(".events-body");

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="text" placeholder="Enter Event"></td>
    <td><input type="datetime-local"></td>
    <td>
      <select>
        <option value="start">Start</option>
        <option value="end">End</option>
      </select>
    </td>
    <td><textarea placeholder="Enter Remarks"></textarea></td>
    <td class="subtotal">0.0000000</td>
    <td><button class="delete-row">Delete</button></td>
  `;

  // Add event listener for Delete button
  row.querySelector(".delete-row").addEventListener("click", () => row.remove());

  eventsBody.appendChild(row);

  // Attach listeners to new row
  attachEventListenersToEventRow(row, tabPanel);
}

function addDeductionRow(tabPanel) {
  const deductionsBody = tabPanel.querySelector(".deductions-body");

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="text" placeholder="Reason"></td>
        <td><input type="datetime-local"></td>
    <td><input type="datetime-local"></td>
    <td class="used-time">0.0000000</td>
    <td><button class="delete-row">Delete</button></td>
  `;

  // Add event listener for Delete button
  row.querySelector(".delete-row").addEventListener("click", () => {
    row.remove();
    calculateDeductionTotal(tabPanel);
  });

  deductionsBody.appendChild(row);

  // Attach listeners to new row
  attachEventListenersToDeductionRow(row, tabPanel);
}

function setupPortTab(tabPanel) {
  // Add event row button
  const addEventBtn = tabPanel.querySelector(".add-event");
  addEventBtn.addEventListener("click", () => {
    addEventRow(tabPanel);
    updatePortResults(tabPanel);
  });

  // Add deduction row button
  const addDeductionBtn = tabPanel.querySelector(".add-deduction");
  addDeductionBtn.addEventListener("click", () => {
    addDeductionRow(tabPanel);
    updatePortResults(tabPanel);
  });

  // Initial calculation for totals
  calculateEventTotal(tabPanel);
  calculateDeductionTotal(tabPanel);
  updatePortResults(tabPanel); // Ensure results are initialized
}


function calculateEventSubtotal(row) {
  const timeInput = row.querySelector("input[type='datetime-local']");
  const dropdown = row.querySelector("select");
  const subtotalCell = row.querySelector(".subtotal");

  // Ensure both fields are filled and valid
  if (timeInput && dropdown) {
    const timeValue = new Date(timeInput.value);
    const dropdownValue = dropdown.value;

    if (!isNaN(timeValue.getTime())) {
      // Calculate only if the dropdown is "end"
      if (dropdownValue === "end") {
        const startRow = Array.from(row.parentNode.children)
          .slice(0, Array.from(row.parentNode.children).indexOf(row))
          .reverse()
          .find((prevRow) => prevRow.querySelector("select").value === "start");

        if (startRow) {
          const startTimeValue = new Date(startRow.querySelector("input[type='datetime-local']").value);
          const subtotal = (timeValue - startTimeValue) / (1000 * 60 * 60); // Convert ms to hours
          subtotalCell.textContent = subtotal.toFixed(7);
        }
      } else {
        subtotalCell.textContent = "0.0000000";
      }
    }
  }
}

function calculateDeductionTotal(tabPanel) {
  const deductionsBody = tabPanel.querySelector(".deductions-body");
  const totalCell = tabPanel.querySelector(".deductions-total");

  let total = 0;

  deductionsBody.querySelectorAll("tr").forEach((row) => {
    const startInput = row.querySelectorAll("input[type='datetime-local']")[0];
    const endInput = row.querySelectorAll("input[type='datetime-local']")[1];
    const usedTimeCell = row.querySelector(".used-time");

    if (startInput && endInput) {
      const startTime = new Date(startInput.value);
      const endTime = new Date(endInput.value);

      if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
        const usedTime = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours
        usedTimeCell.textContent = usedTime.toFixed(7);
        total += usedTime;
      } else {
        usedTimeCell.textContent = "0.0000000";
      }
    }
  });

  totalCell.textContent = total.toFixed(7);

  // Update Port Results after recalculating totals
  updatePortResults(tabPanel);
}

function updatePortResults(tabPanel) {
  const totalAllowedLaytimeElem = tabPanel.querySelector(".total-allowed-laytime");
  const totalTimeUsedElem = tabPanel.querySelector(".total-time-used");
  const timeOnDemurrageElem = tabPanel.querySelector(".time-on-demurrage");
  const portDemurrageCostElem = tabPanel.querySelector(".port-demurrage-cost");

  const eventsSubtotal = parseFloat(tabPanel.querySelector(".events-subtotal")?.textContent) || 0;
  const deductionsTotal = parseFloat(tabPanel.querySelector(".deductions-total")?.textContent) || 0;

  const portId = parseInt(tabPanel.id.replace("port", ""), 10);
  const port = state.ports.find((p) => p.id === portId);

  if (!port) {
    logDebug(`Port with ID ${portId} not found. Current ports state:`, JSON.stringify(state.ports, null, 2));
    return;
  }

  const rate = port.portType === "L" 
    ? state.defaultRates.loadingRate 
    : state.defaultRates.dischargingRate;
  const allowedLaytime = calculateAllowedLaytime(port.cargoQty, rate, port.portType);

  const totalTimeUsed = eventsSubtotal - deductionsTotal;
  const timeOnDemurrage = Math.max(totalTimeUsed - allowedLaytime, 0);

  const demurrageRate = parseFloat(document.getElementById("demurrageRate")?.value) || 0;
  const hourlyDemurrageRate = demurrageRate / 24;
  const portDemurrageCost = timeOnDemurrage * hourlyDemurrageRate;

  // Update DOM elements
  if (totalAllowedLaytimeElem) totalAllowedLaytimeElem.textContent = allowedLaytime.toFixed(7);
  if (totalTimeUsedElem) totalTimeUsedElem.textContent = totalTimeUsed.toFixed(7);
  if (timeOnDemurrageElem) timeOnDemurrageElem.textContent = timeOnDemurrage.toFixed(7);
  if (portDemurrageCostElem) portDemurrageCostElem.textContent = portDemurrageCost.toFixed(2);

  // Update state
  port.timeUsed = totalTimeUsed; // Update timeUsed in state
  port.allowedLaytime = allowedLaytime; // Optional: Track allowed laytime in state
  port.timeOnDemurrage = timeOnDemurrage; // Optional: Track time on demurrage in state

  logDebug(`Updated Port State for ID ${portId}:`, JSON.stringify(port, null, 2));

  // **Immediately re-render ports to reflect changes**
  renderPorts();
}

function attachEventListenersToEventRow(row, tabPanel) {
  const timeInput = row.querySelector("input[type='datetime-local']");
  const dropdown = row.querySelector("select");

  const recalculate = () => {
    calculateEventSubtotal(row);
    calculateEventTotal(tabPanel);
  };

  if (timeInput) timeInput.addEventListener("input", recalculate);
  if (dropdown) dropdown.addEventListener("change", recalculate);
}

function calculateEventTotal(tabPanel) {
  const eventsBody = tabPanel.querySelector(".events-body");
  const totalCell = tabPanel.querySelector(".events-subtotal");

  let total = 0;

  eventsBody.querySelectorAll(".subtotal").forEach((cell) => {
    const subtotal = parseFloat(cell.textContent);
    if (!isNaN(subtotal)) {
      total += subtotal;
    }
  });

  totalCell.textContent = total.toFixed(7);

  // Update Port Results after recalculating totals
  updatePortResults(tabPanel);
}

function attachEventListenersToDeductionRow(row, tabPanel) {
  const startInput = row.querySelectorAll("input[type='datetime-local']")[0];
  const endInput = row.querySelectorAll("input[type='datetime-local']")[1];

  const recalculate = () => calculateDeductionTotal(tabPanel);

  if (startInput) startInput.addEventListener("input", recalculate);
  if (endInput) endInput.addEventListener("input", recalculate);
}





// Update Port Data
window.updatePortData = (id, field, value) => {
  try {
    // Update the port data in state
    updatePort(id, { [field]: value });

    // Re-render ports and recalculate overall results
    renderPorts();
    calculateResults();

    // Recalculate and update the respective port tab results
    const tabPanel = document.getElementById(`port${id}`);
    if (tabPanel) {
      updatePortResults(tabPanel);
    }

    logDebug(`Port data updated: ID=${id}, ${field}=${value}`);
  } catch (error) {
    logDebug(`Error in updatePortData: ${error.message}`);
  }
};

// Delete Port
window.removePort = (id) => {
  try {
    // Remove from the state
    deletePort(id);

    // Find and remove the corresponding tab button
    const tabButton = document.querySelector(`.tab[data-tab="port${id}"]`);
    if (tabButton) tabButton.remove();

    // Find and remove the corresponding tab panel
    const tabPanel = document.getElementById(`port${id}`);
    if (tabPanel) tabPanel.remove();

    // Re-render ports and recalculate results
    renderPorts();
    calculateResults();

    logDebug(`Port with ID ${id} removed successfully.`);
  } catch (error) {
    logDebug(`Error in removePort: ${error.message}`);
  }
};

// Update Default Rates
window.updateRates = () => {
  try {
    const lumpsumRadioChecked = document.getElementById("lumpsumRadio").checked;
    const lumpsumHours = parseFloat(document.getElementById("lumpsumHours").value) || 0;
    const loadingRate = parseFloat(document.getElementById("loadingRate").value) || 0;
    const dischargingRate = parseFloat(document.getElementById("dischargingRate").value) || 0;
    const demurrageRate = parseFloat(document.getElementById("demurrageRate").value) || 0; // Ensure this exists
    const reversible = document.getElementById("reversible").checked;

    // Update global state for rates and options
    updateDefaultRates({ loadingRate, dischargingRate, reversible });
    state.contract.dailyRate = demurrageRate; // Store demurrage rate in state

    // Log the update based on the selected radio button
    if (lumpsumRadioChecked) {
      logDebug(`Lumpsum Hours: ${lumpsumHours}`);
    } else {
      logDebug(`Rates Updated: Loading ${loadingRate}, Discharging ${dischargingRate}, Demurrage Rate ${demurrageRate}, Reversible ${reversible}`);
    }

    renderPorts();
    calculateResults();
  } catch (error) {
    logDebug(`Error in updateRates: ${error.message}`);
  }
};

// Calculate Results
function calculateResults() {
  const lumpsumRadioChecked = document.getElementById("lumpsumRadio").checked;
  const ratesRadioChecked = document.getElementById("ratesRadio").checked;
  const reversible = document.getElementById("reversible").checked;

  // Debug log for current state
  logDebug(`Reversible: ${reversible}, RatesRadioChecked: ${ratesRadioChecked}`);

  if (lumpsumRadioChecked) {
    // Handle Lumpsum Hours
    const lumpsumHours = parseFloat(document.getElementById("lumpsumHours").value) || 0;
    document.getElementById("totalAllowed").textContent = lumpsumHours.toFixed(7);
    logDebug(`Lumpsum Hours applied: ${lumpsumHours}`);
  } else if (ratesRadioChecked) {
    // Handle Rates with Reversible/Non-Reversible logic
    if (reversible) {
      calculateReversibleResults();
    } else {
      calculateNonReversibleResults();
    }
  }
}

function calculateLumpsumResults() {
  const lumpsumHours = parseFloat(document.getElementById("lumpsumHours").value) || 0;
  let totalUsed = 0;
  let totalTimeOnDemurrage = 0;

  const dailyRate = parseFloat(document.getElementById("demurrageRate").value) || state.contract.dailyRate;

  state.ports.forEach((port) => {
    const timeUsed = parseFloat(port.timeUsed) || 0;
    let timeOnDemurrage = timeUsed - lumpsumHours;

    // Ignore negative Time on Demurrage
    if (timeOnDemurrage < 0) {
      timeOnDemurrage = 0;
    }

    totalUsed += timeUsed;
    totalTimeOnDemurrage += timeOnDemurrage;
  });

  const hourlyRate = dailyRate / 24;
  const demurrageCost = totalTimeOnDemurrage * hourlyRate;

  // Update Results Section
  document.getElementById("totalAllowed").textContent = lumpsumHours.toFixed(7);
  document.getElementById("totalUsed").textContent = totalUsed.toFixed(7);
  document.getElementById("timeOnDemurrage").textContent = totalTimeOnDemurrage.toFixed(7);
  document.getElementById("demurrageCost").textContent = demurrageCost.toFixed(2);

  logDebug("Lumpsum Results calculated.");
}

function calculateReversibleResults() {
  let totalAllowed = 0;
  let totalUsed = 0;
  let totalTimeOnDemurrage = 0;

  const dailyRate = parseFloat(document.getElementById("demurrageRate").value) || state.contract.dailyRate;

  state.ports.forEach((port) => {
    const rate = port.portType === "L" 
      ? state.defaultRates.loadingRate 
      : state.defaultRates.dischargingRate;

    const allowedLaytime = calculateAllowedLaytime(port.cargoQty, rate, port.portType);
    const timeUsed = parseFloat(port.timeUsed) || 0;
    const timeOnDemurrage = timeUsed - allowedLaytime;

    totalAllowed += allowedLaytime;
    totalUsed += timeUsed;
    totalTimeOnDemurrage += timeOnDemurrage;
  });

  const hourlyRate = dailyRate / 24;
  const demurrageCost = totalTimeOnDemurrage * hourlyRate;

  // Update Results Section
  document.getElementById("totalAllowed").textContent = totalAllowed.toFixed(7);
  document.getElementById("totalUsed").textContent = totalUsed.toFixed(7);
  document.getElementById("timeOnDemurrage").textContent = totalTimeOnDemurrage.toFixed(7);
  document.getElementById("demurrageCost").textContent = demurrageCost.toFixed(2);

  // Check for elements before applying styles
  const totalAllowedRow = document.getElementById("totalAllowedRow");
  const totalUsedRow = document.getElementById("totalUsedRow");

  if (totalAllowedRow) totalAllowedRow.style.display = "table-row";
  if (totalUsedRow) totalUsedRow.style.display = "table-row";

  logDebug("Reversible Results calculated.");
}

function calculateNonReversibleResults() {
  let totalUsed = 0;
  let totalTimeOnDemurrage = 0;

  const dailyRate = parseFloat(document.getElementById("demurrageRate").value) || state.contract.dailyRate;

  state.ports.forEach((port) => {
    const rate = port.portType === "L" 
      ? state.defaultRates.loadingRate 
      : state.defaultRates.dischargingRate;

    const allowedLaytime = calculateAllowedLaytime(port.cargoQty, rate, port.portType);
    const timeUsed = parseFloat(port.timeUsed) || 0;
    let timeOnDemurrage = timeUsed - allowedLaytime;

    // Ignore negative Time on Demurrage
    if (timeOnDemurrage < 0) {
      timeOnDemurrage = 0;
    }

    totalUsed += timeUsed;
    totalTimeOnDemurrage += timeOnDemurrage;
  });

  const hourlyRate = dailyRate / 24;
  const demurrageCost = totalTimeOnDemurrage * hourlyRate;

  // Update Results Section
  document.getElementById("totalAllowed").textContent = "N/A";
  document.getElementById("totalUsed").textContent = totalUsed.toFixed(7);
  document.getElementById("timeOnDemurrage").textContent = totalTimeOnDemurrage.toFixed(7);
  document.getElementById("demurrageCost").textContent = demurrageCost.toFixed(2);

  logDebug("Non-Reversible Results calculated with hours saved ignored.");
}




// Call Initial Render
renderApp();

