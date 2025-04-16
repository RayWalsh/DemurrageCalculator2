// PortTabs.js

import { state, addPort, updatePort, deletePort } from './DataManager.js';
import { calculateResults } from './CalculationEngine.js';

// Keeps track of port count
let portCount = 0;

// Adds a new port tab
export function addPortTab() {
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
  tabPanel.innerHTML = `
    <h2>Details for Port ${portCount}</h2>
    <p>Port-specific content will go here.</p>
  `;
  tabContent.appendChild(tabPanel);
}

// Switches between tabs
export function switchTab(event) {
  const tabId = event.target.dataset.tab;

  // Deactivate all tabs and panels
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));

  // Activate the clicked tab and corresponding panel
  event.target.classList.add("active");
  const activePanel = document.getElementById(tabId);

  if (activePanel) {
    activePanel.classList.add("active");
  }
}

// Update content inside a port tab
export function updatePortTabContent(portId, content) {
  const portPanel = document.getElementById(`port${portId}`);
  if (portPanel) {
    portPanel.innerHTML = content;
  }
}