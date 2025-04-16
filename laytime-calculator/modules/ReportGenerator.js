import { state } from './DataManager.js'; // Import state for ports data
import { logDebug } from './Logger.js';

export async function generateReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  logDebug("Initializing Report Generation...");

  // ** Add Company Logo **
  const logoUrl = "https://i.imgur.com/Au7Ynej.jpeg";
  const img = new Image();
  img.src = logoUrl;

  img.onload = () => {
    try {
      doc.addImage(img, "JPEG", 150, 10, 40, 20); // Top-right corner
      logDebug("Logo loaded successfully.");

      // ** Title Section **
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text("Laytime & Demurrage Report", 20, 20);

      // ** Summary Section **
      const vesselName = document.getElementById("vesselName").value || "N/A";
      const cpDate = document.getElementById("cpDate").value || "N/A";
      const originalAmount = "TBD"; // Placeholder for future data
      const revisedAmount = `$${document.getElementById("demurrageCost").textContent}`;
      const demurrageDuration = `${document.getElementById("timeOnDemurrage").textContent} hrs`;
      const caseRef = document.getElementById("caseNumber").value || "N/A";

      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.text(`Vessel Name: ${vesselName}`, 20, 30);
      doc.text(`CP Date: ${cpDate}`, 20, 36);
      doc.text(`Original Amount: ${originalAmount}`, 20, 42);
      doc.text(`Revised Amount: ${revisedAmount}`, 20, 48);
      doc.text(`Demurrage Duration: ${demurrageDuration}`, 20, 54);
      doc.text(`Ref: ${caseRef}`, 20, 60);

      // ** Port Management Table Section **
      const portsTable = state.ports.map((port) => [
        port.name || "N/A",
        port.cargoQty || "N/A",
        port.portType === "L" ? "Loading" : "Discharge",
        port.allowedLaytime || "N/A",
        port.timeUsed || "N/A",
        port.timeOnDemurrage || "N/A",
      ]);

      doc.autoTable({
        startY: 65,
        head: [["Port Name", "Cargo Qty", "Port Type", "Allowed Laytime", "Time Used", "Time on Demurrage"]],
        body: portsTable,
        styles: { font: "times", fontSize: 10, cellPadding: 3 },
      });

      logDebug("Port management table generated.");

      // ** Recommendation Section **
      const totalDemurrage = document.getElementById("demurrageCost").textContent;
      doc.setFont("times", "italic");
      doc.text(
        `We hereby recommend paying the demurrage claim of $${totalDemurrage}`,
        20,
        doc.lastAutoTable.finalY + 10
      );

      // ** Notes Section **
      const notes = document.getElementById("notes").value;
      if (notes.trim()) {
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        doc.text("Notes:", 20, doc.lastAutoTable.finalY + 20);
        doc.setFontSize(10);
        doc.text(notes, 20, doc.lastAutoTable.finalY + 30, { maxWidth: 170 });
      }

      // ** Open Report in New Tab **
      doc.output("dataurlnewwindow");
      logDebug("Report generated and displayed in a new tab.");
    } catch (error) {
      logDebug(`Error during report generation: ${error.message} at ${error.stack}`);
    }
  };

  img.onerror = () => {
    logDebug("Failed to load logo image.");
  };
}


// New function for port-specific reports
export function generatePortReport(tabPanel, portName) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // Collect data from the port tab
  const eventsData = Array.from(tabPanel.querySelectorAll(".events-body tr")).map(row => ({
    event: row.querySelector("td:nth-child(1) input")?.value || "",
    time: row.querySelector("td:nth-child(2) input")?.value || "",
    startOrEnd: row.querySelector("td:nth-child(3) select")?.value || "",
    remarks: row.querySelector("td:nth-child(4) textarea")?.value || "",
    subtotal: row.querySelector("td:nth-child(5)").textContent || "0.0000000"
  }));

  const deductionsData = Array.from(tabPanel.querySelectorAll(".deductions-body tr")).map(row => ({
    reason: row.querySelector("td:nth-child(1) input")?.value || "",
    start: row.querySelector("td:nth-child(2) input")?.value || "",
    end: row.querySelector("td:nth-child(3) input")?.value || "",
    usedTime: row.querySelector("td:nth-child(4)").textContent || "0.0000000"
  }));

  const totalAllowedLaytime = tabPanel.querySelector(".total-allowed-laytime")?.textContent || "0.0000000";
  const totalTimeUsed = tabPanel.querySelector(".total-time-used")?.textContent || "0.0000000";
  const timeOnDemurrage = tabPanel.querySelector(".time-on-demurrage")?.textContent || "0.0000000";
  const portDemurrageCost = tabPanel.querySelector(".port-demurrage-cost")?.textContent || "0.00";
  const notes = tabPanel.querySelector(".notes-section textarea")?.value || "None";

  // Add header and title
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(`Laytime & Demurrage Report - ${portName}`, 10, 10);

  // Add port-specific data
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text(`Total Allowed Laytime: ${totalAllowedLaytime} hrs`, 10, 20);
  doc.text(`Total Time Used: ${totalTimeUsed} hrs`, 10, 30);
  doc.text(`Time on Demurrage: ${timeOnDemurrage} hrs`, 10, 40);
  doc.text(`Demurrage Cost: $${portDemurrageCost}`, 10, 50);

  // Add events table
  doc.setFont("times", "bold");
  doc.text("Events", 10, 60);
  doc.autoTable({
    startY: 65,
    head: [["Event", "Time", "Start/End", "Remarks", "Subtotal (hrs)"]],
    body: eventsData.map(event => [
      event.event,
      event.time,
      event.startOrEnd,
      event.remarks,
      event.subtotal
    ]),
    styles: { font: "times", fontSize: 10 }
  });

  // Add deductions table
  doc.text("Deductions", 10, doc.lastAutoTable.finalY + 10);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    head: [["Reason", "Start", "End", "Used Time (hrs)"]],
    body: deductionsData.map(deduction => [
      deduction.reason,
      deduction.start,
      deduction.end,
      deduction.usedTime
    ]),
    styles: { font: "times", fontSize: 10 }
  });

  // Add notes section
  doc.setFont("times", "normal");
  doc.text("Notes:", 10, doc.lastAutoTable.finalY + 20);
  doc.setFont("times", "italic");
  doc.text(notes, 10, doc.lastAutoTable.finalY + 30, { maxWidth: 180 });

  // Save the report
  doc.save(`Laytime_Demurrage_Report_${portName}.pdf`);
}