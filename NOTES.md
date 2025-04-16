//*last working main.js code *// 

import { state, addPort, updatePort, deletePort, updateDefaultRates } from './modules/DataManager.js';
import { calculateAllowedLaytime, calculateDemurrage } from './modules/CalculationEngine.js';
import { generateReport } from './modules/ReportGenerator.js';
import { logDebug } from './modules/Logger.js';



// Initial Render Function
function renderApp() {
  logDebug("renderApp() function called");

  document.getElementById('app').innerHTML = `
    <div class="header">
      <h2>Laytime & Demurrage Calculator</h2>
      <div id="tabs" class="tabs">
        <button class="tab active" data-tab="summary">Summary</button>
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
                <th></th>
              </tr>
            </thead>
            <tbody id="ports"></tbody>
          </table>
        </div>

        <div class="flex-container results-notes">
          <div class="section results-section">
            <h2>Results</h2>
            <p>Total Allowed Laytime: <span id="totalAllowed">0.0000000</span> hrs</p>
            <p>Total Time Used: <span id="totalUsed">0.0000000</span> hrs</p>
            <p>Time on Demurrage: <span id="timeOnDemurrage">0.0000000</span> hrs</p>
            <p><strong>Demurrage Cost:</strong> $<span id="demurrageCost">0.00</span></p>
            <button id="generateReportBtn">Generate Report</button>
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

  // Attach Event Listeners
  document.getElementById('addPortBtn').addEventListener('click', addNewPort);
  document.getElementById('updateRatesBtn').addEventListener('click', updateRates);
  document.getElementById("lumpsumRadio").addEventListener("change", calculateResults);
  document.getElementById("ratesRadio").addEventListener("change", calculateResults);
  document.getElementById("reversible").addEventListener("change", calculateResults);

  document.getElementById("generateReportBtn").addEventListener("click", () => {
    logDebug("Generate Report button clicked.");
    generateReport();
  });

  // Event Listener for Summary Tab
  document.querySelector('[data-tab="summary"]').addEventListener("click", switchTab);

  // Initial Render of Ports and Results
  renderPorts();
  calculateResults();
}




// Add New Port Function
window.addNewPort = () => {
  try {
    logDebug("Add Port button clicked.");
    const newPort = { id: Date.now(), name: "", cargoQty: 0, portType: "L", timeUsed: 0 };
    addPort(newPort);
    logDebug("New port added to state.");

    addPortTab(newPort.name || `Port ${portCount}`);
    renderPorts();
    calculateResults();
  } catch (error) {
    logDebug(`Error in addNewPort: ${error.message}`);
  }
};

// Render Ports Table
function renderPorts() {
  const portsContainer = document.getElementById("ports");
  portsContainer.innerHTML = "";

  state.ports.forEach((port, index) => {
    const rate = port.portType === "L" 
      ? state.defaultRates.loadingRate 
      : state.defaultRates.dischargingRate;

    const allowedLaytime = calculateAllowedLaytime(port.cargoQty, rate, port.portType);
    const timeOnDemurrage = parseFloat(port.timeUsed) - allowedLaytime;

    portsContainer.innerHTML += `
      <tr>
        <td>
          <input type="text" value="${port.name}" 
            onchange="updatePortData(${port.id}, 'name', this.value); updateTabName(${index + 1});">
        </td>
        <td><input type="number" value="${port.cargoQty}" onchange="updatePortData(${port.id}, 'cargoQty', this.value)"></td>
        <td>
          <select onchange="updatePortData(${port.id}, 'portType', this.value)">
            <option value="L" ${port.portType === "L" ? "selected" : ""}>Loading</option>
            <option value="D" ${port.portType === "D" ? "selected" : ""}>Discharge</option>
          </select>
        </td>
        <td>${allowedLaytime.toFixed(7)}</td>
        <td><input type="number" value="${port.timeUsed}" onchange="updatePortData(${port.id}, 'timeUsed', this.value)"></td>
        <td>${timeOnDemurrage.toFixed(7)}</td>
        <td><button onclick="removePort(${port.id})">Delete</button></td>
      </tr>
    `;
  });

  // Recalculate results whenever ports are re-rendered
  calculateResults();
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
  const tabId = event.target.dataset.tab;

  // Remove active class from all tabs and panels
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));

  // Set the selected tab and panel as active
  event.target.classList.add("active");
  document.getElementById(tabId).classList.add("active");
}

function addPortTab() {
  portCount++;

  const tabsContainer = document.getElementById("tabs");
  const tabContent = document.getElementById("tab-content");

  // Create Tab Button
  const tabButton = document.createElement("button");
  tabButton.className = "tab";
  tabButton.dataset.tab = `port${portCount}`;
  tabButton.textContent = `Port ${portCount}`;
  tabButton.addEventListener("click", switchTab);
  tabsContainer.appendChild(tabButton);

  // Create Tab Panel
  const tabPanel = document.createElement("div");
  tabPanel.id = `port${portCount}`;
  tabPanel.className = "tab-panel";
  tabPanel.innerHTML = `<h2>This is the tab for Port ${portCount}</h2>`;
  tabContent.appendChild(tabPanel);
}



// Update Port Data
window.updatePortData = (id, field, value) => {
  updatePort(id, { [field]: value });
  renderPorts();
  calculateResults();
};

// Delete Port
window.removePort = (id) => {
  deletePort(id);
  renderPorts();
  calculateResults();
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




CSS CODE THAT WORKS 


/* Global Styling */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f8f9fa;
  color: #333;
  line-height: 1.4;
}

h1 {
  background-color: #004080;
  color: white;
  text-align: center;
  padding: 5px 0;
}

h2 {
  color: #004080;
  font-size: 14px;
  margin-bottom: 8px;
}

/* Section Styling */
.section {
  background: white;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 10px;
  box-sizing: border-box;
}

/* Layout Structure */
.flex-container {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: space-between;
}

.flex-container .section {
  flex: 1 1 calc(50% - 20px);
  min-width: 300px;
}

.port-management {
  width: 100%; /* Span full width */
  margin-top: 20px;
}

.results-notes {
  display: flex;
  gap: 20px;
  justify-content: space-between;
  flex-wrap: wrap;
}

.results-section,
.notes-section {
  flex: 1 1 calc(50% - 20px); /* Two sections per row */
  min-width: 300px;
}

/* Logo Styling */
.header-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #004080;
  color: white;
  padding: 5px 10px;
  position: relative;
  height: 50px;
}

.header-logo {
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  height: 40px; /* Constrain logo height */
  max-width: 150px; /* Constrain logo width */
  object-fit: contain;
}

.header-bar h1 {
  font-family: 'apotek', sans-serif;
  font-size: 1.2em;
  font-weight: normal;
  margin: 0;
  letter-spacing: 1px;
}

/* Laytime Section */
#laytime-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#laytime-header {
  display: flex;
  justify-content: space-between; /* Align header content left and right */
  align-items: center;
}

#laytime-controls {
  display: flex;
  flex-direction: column;
  gap: 10px; /* Space between rows */
}

.laytime-row {
  display: flex;
  align-items: center;
  gap: 10px; /* Space between items */
}

#reversible {
  margin-left: 10px;
  transform: scale(0.9);
}

#updateRatesBtn {
  width: auto;
  padding: 5px 10px;
  margin-left: auto; /* Push button to the right */
}

/* Input and Button Styling */
input, textarea, button {
  font-size: 12px;
  margin: 5px 0;
  width: auto; /* Prevent stretching */
}

button {
  display: inline-block;
  font-size: 12px;
  padding: 5px 10px;
  background-color: #004080;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:hover {
  background-color: #003060;
}

#addPortBtn {
  width: auto;
  margin-top: 10px;
}

/* Table Styling */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

th, td {
  text-align: center;
  padding: 5px;
  border: 1px solid #ddd;
}

th {
  background-color: #004080;
  color: white;
  font-weight: bold;
}

/* Debug Console */
#debug-console {
  margin-top: 10px;
  font-size: 12px;
}

/* Minimal Tab Style */
.tabs {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid #0051A3; /* Adds the tab underline */
}

.tab {
  background-color: white;
  border: 1px solid #0051A3;
  border-bottom: none;
  color: #0051A3;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  border-radius: 5px 5px 0 0;
}

.tab:hover {
  background-color: #f0f0f0;
}

.tab.active {
  background-color: #0051A3;
  color: white}


.tab-panel {
  display: none;
  padding: 20px;
  border: 1px solid #ccc;
}

.tab-panel.active {
  display: block;
}




.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #0051A3;
  color: #fff;
}

.tabs-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.tabs {
  display: flex;
}

/* Icons Styling */
.icons-container {
  display: flex;
  align-items: center;
  gap: 15px; /* Space between icons */
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px; /* Larger icons */
}

.icon-button i {
  font-style: normal; /* Remove italics */
}

.icon-button:hover {
  color: #FFD700; /* Highlight on hover */
}


//* this is the latest main.js that works

//*last working main.js code *// 

import { state, addPort, updatePort, deletePort, updateDefaultRates } from './modules/DataManager.js';
import { calculateAllowedLaytime, calculateDemurrage } from './modules/CalculationEngine.js';
import { generateReport } from './modules/ReportGenerator.js';
import { logDebug } from './modules/Logger.js';



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
        <!-- Paper Icon (Generate Report) -->
        <button id="generateReportIcon" class="icon-button">
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
                <th></th>
              </tr>
            </thead>
            <tbody id="ports"></tbody>
          </table>
        </div>

        <div class="flex-container results-notes">
          <div class="section results-section">
            <h2>Results</h2>
            <p>Total Allowed Laytime: <span id="totalAllowed">0.0000000</span> hrs</p>
            <p>Total Time Used: <span id="totalUsed">0.0000000</span> hrs</p>
            <p>Time on Demurrage: <span id="timeOnDemurrage">0.0000000</span> hrs</p>
            <p><strong>Demurrage Cost:</strong> $<span id="demurrageCost">0.00</span></p>
            <button id="generateReportBtn">Generate Report</button>
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

    // Attach Event Listeners after rendering
    document.getElementById("generateReportIcon").addEventListener("click", () => {
      logDebug("Generate Report icon clicked.");
      generateReport();
    });

  // Attach Event Listeners
  document.getElementById('addPortBtn').addEventListener('click', addNewPort);
  document.getElementById('updateRatesBtn').addEventListener('click', updateRates);
  document.getElementById("lumpsumRadio").addEventListener("change", calculateResults);
  document.getElementById("ratesRadio").addEventListener("change", calculateResults);
  document.getElementById("reversible").addEventListener("change", calculateResults);

  document.getElementById("generateReportBtn").addEventListener("click", () => {
    logDebug("Generate Report button clicked.");
    generateReport();
  });

  // Event Listener for Summary Tab
  document.querySelector('[data-tab="summary"]').addEventListener("click", switchTab);

  // Initial Render of Ports and Results
  renderPorts();
  calculateResults();
}




// Add New Port Function
window.addNewPort = () => {
  try {
    logDebug("Add Port button clicked.");
    const newPort = { id: Date.now(), name: "", cargoQty: 0, portType: "L", timeUsed: 0 };
    addPort(newPort);
    logDebug("New port added to state.");

    addPortTab(newPort.name || `Port ${portCount}`);
    renderPorts();
    calculateResults();
  } catch (error) {
    logDebug(`Error in addNewPort: ${error.message}`);
  }
};

// Render Ports Table
function renderPorts() {
  const portsContainer = document.getElementById("ports");
  portsContainer.innerHTML = "";

  state.ports.forEach((port, index) => {
    const rate = port.portType === "L" 
      ? state.defaultRates.loadingRate 
      : state.defaultRates.dischargingRate;

    const allowedLaytime = calculateAllowedLaytime(port.cargoQty, rate, port.portType);
    const timeOnDemurrage = parseFloat(port.timeUsed) - allowedLaytime;

    portsContainer.innerHTML += `
      <tr>
        <td>
          <input type="text" value="${port.name}" 
            onchange="updatePortData(${port.id}, 'name', this.value); updateTabName(${index + 1});">
        </td>
        <td><input type="number" value="${port.cargoQty}" onchange="updatePortData(${port.id}, 'cargoQty', this.value)"></td>
        <td>
          <select onchange="updatePortData(${port.id}, 'portType', this.value)">
            <option value="L" ${port.portType === "L" ? "selected" : ""}>Loading</option>
            <option value="D" ${port.portType === "D" ? "selected" : ""}>Discharge</option>
          </select>
        </td>
        <td>${allowedLaytime.toFixed(7)}</td>
        <td><input type="number" value="${port.timeUsed}" onchange="updatePortData(${port.id}, 'timeUsed', this.value)"></td>
        <td>${timeOnDemurrage.toFixed(7)}</td>
        <td><button onclick="removePort(${port.id})">Delete</button></td>
      </tr>
    `;
  });

  // Recalculate results whenever ports are re-rendered
  calculateResults();
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
  const tabId = event.target.dataset.tab;

  // Remove active class from all tabs and panels
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));

  // Set the selected tab and panel as active
  event.target.classList.add("active");
  document.getElementById(tabId).classList.add("active");
}

function addPortTab() {
  portCount++;

  const tabsContainer = document.getElementById("tabs");
  const tabContent = document.getElementById("tab-content");

  // Create Tab Button
  const tabButton = document.createElement("button");
  tabButton.className = "tab";
  tabButton.dataset.tab = `port${portCount}`;
  tabButton.textContent = `Port ${portCount}`;
  tabButton.addEventListener("click", switchTab);
  tabsContainer.appendChild(tabButton);

  // Create Tab Panel
  const tabPanel = document.createElement("div");
  tabPanel.id = `port${portCount}`;
  tabPanel.className = "tab-panel";
  tabPanel.innerHTML = `<h2>This is the tab for Port ${portCount}</h2>`;
  tabContent.appendChild(tabPanel);
}



// Update Port Data
window.updatePortData = (id, field, value) => {
  updatePort(id, { [field]: value });
  renderPorts();
  calculateResults();
};

// Delete Port
window.removePort = (id) => {
  deletePort(id);
  renderPorts();
  calculateResults();
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


Main.js code thats working as of 23/12/24 16:04 

import { state, addPort, updatePort, deletePort, updateDefaultRates } from './modules/DataManager.js';
import { calculateAllowedLaytime, calculateDemurrage } from './modules/CalculationEngine.js';
import { generateReport, generatePortReport } from './modules/ReportGenerator.js';
import { logDebug } from './modules/Logger.js';



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
                <th></th>
              </tr>
            </thead>
            <tbody id="ports"></tbody>
          </table>
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
  
    // Initial render of ports and results
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

    // Re-render ports and recalculate results
    renderPorts();
    calculateResults();
  } catch (error) {
    logDebug(`Error in addNewPort: ${error.message}`);
  }
};

// Render Ports Table
function renderPorts() {
  const portsContainer = document.getElementById("ports");
  portsContainer.innerHTML = "";

  state.ports.forEach((port, index) => {
    const rate = port.portType === "L" 
      ? state.defaultRates.loadingRate 
      : state.defaultRates.dischargingRate;

    const allowedLaytime = calculateAllowedLaytime(port.cargoQty, rate, port.portType);
    const timeOnDemurrage = parseFloat(port.timeUsed) - allowedLaytime;

    portsContainer.innerHTML += `
      <tr>
        <td>
          <input type="text" value="${port.name}" 
            onchange="updatePortData(${port.id}, 'name', this.value); updateTabName(${index + 1});">
        </td>
        <td><input type="number" value="${port.cargoQty}" onchange="updatePortData(${port.id}, 'cargoQty', this.value)"></td>
        <td>
          <select onchange="updatePortData(${port.id}, 'portType', this.value)">
            <option value="L" ${port.portType === "L" ? "selected" : ""}>Loading</option>
            <option value="D" ${port.portType === "D" ? "selected" : ""}>Discharge</option>
          </select>
        </td>
        <td>${allowedLaytime.toFixed(7)}</td>
        <td><input type="number" value="${port.timeUsed}" onchange="updatePortData(${port.id}, 'timeUsed', this.value)"></td>
        <td>${timeOnDemurrage.toFixed(7)}</td>
        <td><button onclick="removePort(${port.id})">Delete</button></td>
      </tr>
    `;
  });

  // Recalculate results whenever ports are re-rendered
  calculateResults();
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
  // Get elements from the tab panel
  const totalAllowedLaytimeElem = tabPanel.querySelector(".total-allowed-laytime");
  const timeOnDemurrageElem = tabPanel.querySelector(".time-on-demurrage");
  const portDemurrageCostElem = tabPanel.querySelector(".port-demurrage-cost");

  // Get totals from events and deductions
  const eventsSubtotal = parseFloat(
    tabPanel.querySelector(".events-subtotal").textContent
  ) || 0;
  const deductionsTotal = parseFloat(
    tabPanel.querySelector(".deductions-total").textContent
  ) || 0;

  // Find the corresponding port index
  const portTabId = tabPanel.id.replace("port", ""); // e.g., "port1" -> "1"
  const portIndex = parseInt(portTabId, 10) - 1; // Adjust for zero-based index

  // Fetch the Total Allowed Laytime for the port
  const portManagementRow = document.querySelector(`#ports tr:nth-child(${portIndex + 1})`);
  const allowedLaytime =
    portManagementRow &&
    parseFloat(portManagementRow.cells[3].textContent) || 0;

  // Calculate Time on Demurrage
  const timeOnDemurrage = Math.max(eventsSubtotal - deductionsTotal, 0);

  // Fetch demurrage rate from the summary section
  const demurrageRate = parseFloat(
    document.getElementById("demurrageRate").value
  ) || 0;
  const hourlyDemurrageRate = demurrageRate / 24;

  // Calculate Port Demurrage Cost
  const portDemurrageCost = timeOnDemurrage * hourlyDemurrageRate;

  // Update UI elements
  totalAllowedLaytimeElem.textContent = allowedLaytime.toFixed(7);
  timeOnDemurrageElem.textContent = timeOnDemurrage.toFixed(7);
  portDemurrageCostElem.textContent = portDemurrageCost.toFixed(2);

  console.log(`Updated results for ${tabPanel.id}:`, {
    allowedLaytime,
    timeOnDemurrage,
    portDemurrageCost,
  });
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
  updatePort(id, { [field]: value });
  renderPorts();
  calculateResults();
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
