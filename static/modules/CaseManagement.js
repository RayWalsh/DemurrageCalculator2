document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#caseSummaryTable tbody");
  const modal = document.getElementById("editCaseModal");
  const closeModalBtn = document.getElementById("closeEditModal");
  const form = document.getElementById("edit-case-form");

  // Format date to yyyy-mm-dd
  const formatDateInput = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return isNaN(date) ? "" : date.toISOString().split("T")[0];
  };

  // Format date for table
  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date)) return "-";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  // Populate modal form fields
  function openEditModal(record) {
    modal.style.display = "block";

    document.getElementById("editCaseID").value = record.CaseID || "";
    document.getElementById("editRef").value = record.DeepBlueRef || "";
    document.getElementById("editAccount").value = record.ClientName || "";
    document.getElementById("editVesselName").value = record.VesselName || "";
    document.getElementById("editVoyageNumber").value = record.VoyageNumber || "";
    document.getElementById("editVoyageEndDate").value = formatDateInput(record.VoyageEndDate);
    document.getElementById("editCPDate").value = formatDateInput(record.CPDate);
    document.getElementById("editCPType").value = record.CPType || "";
    document.getElementById("editCPForm").value = record.CPForm || "";
    document.getElementById("editOwnersName").value = record.OwnersName || "";
    document.getElementById("editBrokersName").value = record.BrokersName || "";
    document.getElementById("editCharterersName").value = record.CharterersName || "";
    document.getElementById("editLayday").value = formatDateInput(record.Layday);
    document.getElementById("editCancelling").value = formatDateInput(record.Cancelling);
    document.getElementById("editLoadRate").value = record.LoadRate || "";
    document.getElementById("editDischRate").value = record.DischRate || "";
    document.getElementById("editDemurrageRate").value = record.DemurrageRate || "";
    document.getElementById("editInitialClaim").value = record.InitialClaim || "";
    document.getElementById("editNoticeReceived").value = formatDateInput(record.NoticeReceived);
    document.getElementById("editNoticeDays").value = record.NoticeDays || "";
    document.getElementById("editClaimReceived").value = formatDateInput(record.ClaimReceived);
    document.getElementById("editClaimDays").value = record.ClaimDays || "";
    document.getElementById("editContractType").value = record.ContractType || "";
    document.getElementById("editClaimType").value = record.ClaimType || "";
    document.getElementById("editClaimFiledAmount").value = record.ClaimFiledAmount || "";
    document.getElementById("editClaimStatus").value = record.ClaimStatus || "";
    document.getElementById("editReversible").value = record.Reversible ?? "";
    document.getElementById("editLumpsumHours").value = record.LumpsumHours || "";
    document.getElementById("editCalculationType").value = record.CalculationType || "";
    document.getElementById("editTotalAllowedLaytime").value = record.TotalAllowedLaytime || "";
    document.getElementById("editTotalTimeUsed").value = record.TotalTimeUsed || "";
    document.getElementById("editTotalTimeOnDemurrage").value = record.TotalTimeOnDemurrage || "";
    document.getElementById("editTotalDemurrageCost").value = record.TotalDemurrageCost || "";
    document.getElementById("editCalculatorNotes").value = record.CalculatorNotes || "";

    // Store original values to detect changes
    form.dataset.original = JSON.stringify(record);
  }

  // Close modal
  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Save changes to API
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const caseId = document.getElementById("editCaseID").value;
    const original = JSON.parse(form.dataset.original || "{}");

    const fields = [
      "DeepBlueRef", "ClientName", "VesselName", "VoyageNumber", "VoyageEndDate", "CPDate",
      "CPType", "CPForm", "OwnersName", "BrokersName", "CharterersName", "ContractType",
      "ClaimType", "ClaimFiledAmount", "ClaimStatus", "Layday", "Cancelling", "LoadRate",
      "DischRate", "DemurrageRate", "InitialClaim", "NoticeReceived", "ClaimReceived",
      "NoticeDays", "ClaimDays", "Reversible", "LumpsumHours", "CalculationType",
      "TotalAllowedLaytime", "TotalTimeUsed", "TotalTimeOnDemurrage", "TotalDemurrageCost",
      "CalculatorNotes"
    ];

    const payload = {};

    fields.forEach((field) => {
      const input = document.getElementById("edit" + field);
      if (input) {
        const newVal = input.value || null;
        const origVal = original[field] != null ? String(original[field]) : "";
        if (newVal !== origVal) {
          payload[field] = newVal;
        }
      }
    });

    if (Object.keys(payload).length === 0) {
      alert("No changes detected.");
      return;
    }

    try {
      const response = await fetch(`/api/update-case/${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        alert("Case updated successfully!");
        modal.style.display = "none";
        location.reload(); // Refresh table
      } else {
        console.error("Update failed:", result.error);
        alert("Error: " + result.error);
      }
    } catch (err) {
      console.error("API error:", err);
      alert("Failed to update case.");
    }
  });

  // Load table
  fetch("/api/cases")
    .then((res) => res.json())
    .then((cases) => {
      tableBody.innerHTML = "";

      cases.forEach((record) => {
        const row = document.createElement("tr");

        const actionCell = document.createElement("td");
        const openBtn = document.createElement("button");
        openBtn.textContent = "Open Calculation";
        openBtn.classList.add("open-calculation-btn");
        openBtn.dataset.caseId = record.CaseID;
        openBtn.addEventListener("click", () => {
          localStorage.setItem("currentCaseRef", record.DeepBlueRef);  // CHANGE
          localStorage.setItem("currentCaseID", record.CaseID);
          window.location.href = "/calculator";
        });
        actionCell.appendChild(openBtn);
        row.appendChild(actionCell);

        const fields = [
          "CaseID", "ClientName", "VesselName", "CPDate", "CPType", "CPForm", "OwnersName",
          "BrokersName", "Layday", "Cancelling", "LoadRate", "DischRate", "DemurrageRate",
          "InitialClaim", "NoticeReceived", "ClaimReceived", "VoyageEndDate", "VoyageNumber",
          "NoticeDays", "ClaimDays"
        ];

        fields.forEach((field) => {
          const cell = document.createElement("td");
          let value = record[field];

          if (["CPDate", "VoyageEndDate", "Layday", "Cancelling", "NoticeReceived", "ClaimReceived"].includes(field)) {
            value = formatFriendlyDate(value);
          }

          // Make the VesselName clickable
          if (field === "VesselName") {
            const link = document.createElement("a");
            link.href = "#";
            link.textContent = value || "-";
            link.addEventListener("click", (e) => {
              e.preventDefault();
              openEditModal(record);
            });
            cell.appendChild(link);
          } else {
            cell.textContent = value ?? "-";
          }

          row.appendChild(cell);
        });

        tableBody.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("Failed to load case data:", err);
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 20;
      cell.textContent = "Error loading data.";
      row.appendChild(cell);
      tableBody.appendChild(row);
    });
});