document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#caseSummaryTable tbody");
  const modal = document.getElementById("editCaseModal");
  const closeModalBtn = document.getElementById("closeEditModal");
  const form = document.getElementById("edit-case-form");

  const fieldMap = {
    editRef: "DeepBlueRef",
    editAccount: "ClientName",
    editVesselName: "VesselName",
    editVoyageNumber: "VoyageNumber",
    editVoyageEndDate: "VoyageEndDate",
    editCPDate: "CPDate",
    editCPType: "CPType",
    editCPForm: "CPForm",
    editOwnersName: "OwnersName",
    editBrokersName: "BrokersName",
    editCharterersName: "CharterersName",
    editLayday: "Layday",
    editCancelling: "Cancelling",
    editLoadRate: "LoadRate",
    editDischRate: "DischRate",
    editDemurrageRate: "DemurrageRate",
    editInitialClaim: "InitialClaim",
    editNoticeReceived: "NoticeReceived",
    editNoticeDays: "NoticeDays",
    editClaimReceived: "ClaimReceived",
    editClaimDays: "ClaimDays",
    editContractType: "ContractType",
    editClaimType: "ClaimType",
    editClaimFiledAmount: "ClaimFiledAmount",
    editClaimStatus: "ClaimStatus",
    editReversible: "Reversible",
    editLumpsumHours: "LumpsumHours",
    editCalculationType: "CalculationType",
    editTotalAllowedLaytime: "TotalAllowedLaytime",
    editTotalTimeUsed: "TotalTimeUsed",
    editTotalTimeOnDemurrage: "TotalTimeOnDemurrage",
    editTotalDemurrageCost: "TotalDemurrageCost",
    editCalculatorNotes: "CalculatorNotes"
  };

  const formatDateInput = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return isNaN(date) ? "" : date.toISOString().split("T")[0];
  };

  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date) ? "-" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  function openEditModal(record) {
    modal.style.display = "block";
    document.getElementById("editCaseID").value = record.CaseID || "";

    for (const [inputId, fieldKey] of Object.entries(fieldMap)) {
      const input = document.getElementById(inputId);
      if (!input) continue;

      if (input.type === "date") {
        input.value = formatDateInput(record[fieldKey]);
      } else {
        input.value = record[fieldKey] ?? "";
      }
    }

    form.dataset.original = JSON.stringify(record);
  }

  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const caseId = document.getElementById("editCaseID").value;
    const original = JSON.parse(form.dataset.original || "{}");

    const payload = {};

    for (const [inputId, fieldKey] of Object.entries(fieldMap)) {
      const input = document.getElementById(inputId);
      if (!input) continue;
      const newVal = input.value || null;
      const origVal = original[fieldKey] != null ? String(original[fieldKey]) : "";

      if (newVal !== origVal) {
        payload[fieldKey] = newVal;
      }
    }

    if (Object.keys(payload).length === 0) {
      alert("No changes detected.");
      return;
    }

    console.log("Updating with payload:", payload);

    try {
      const response = await fetch(`/api/update-case-by-id/${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        alert("Case updated successfully!");
        modal.style.display = "none";
        location.reload();
      } else {
        console.error("Update failed:", result.error);
        alert("Error: " + result.error);
      }
    } catch (err) {
      console.error("API error:", err);
      alert("Failed to update case.");
    }
  });

  const deleteBtn = document.getElementById("deleteCaseBtn");

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const caseId = document.getElementById("editCaseID").value;
  
      if (!caseId) {
        alert("No CaseID found. Cannot proceed with deletion.");
        console.warn("Deletion aborted: CaseID not set.");
        return;
      }
  
      const confirmed = confirm("Are you sure you want to delete this case? This action cannot be undone.");
      if (!confirmed) return;
  
      try {
        const res = await fetch(`/api/delete-case/${caseId}`, {
          method: "DELETE"
        });
  
        const result = await res.json();
  
        if (res.ok) {
          alert("Case deleted successfully.");
          modal.style.display = "none";
          location.reload();
        } else {
          alert("Error deleting case: " + (result.error || "Unknown error"));
          console.error("Delete failed:", result.error);
        }
      } catch (err) {
        console.error("API error during delete:", err);
        alert("Failed to delete case due to a network or server error.");
      }
    });
  } else {
    console.warn("Delete button not found in the DOM.");
  }
  
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
          localStorage.setItem("currentCaseRef", record.DeepBlueRef);
          localStorage.setItem("currentCaseID", record.CaseID);
          window.location.href = "/calculator";
        });
        actionCell.appendChild(openBtn);
        row.appendChild(actionCell);

        const fields = [
          "DeepBlueRef", "ClientName", "VesselName", "CPDate", "CPType", "CPForm", "OwnersName",
          "BrokersName", "Layday", "Cancelling", "LoadRate", "DischRate", "DemurrageRate",
          "ClaimFiledAmount", "NoticeReceived", "ClaimReceived", "VoyageEndDate",
          "VoyageNumber", "NoticeDays", "ClaimDays"
        ];

        fields.forEach((field) => {
          const cell = document.createElement("td");
          let value = record[field];

          if (["CPDate", "VoyageEndDate", "Layday", "Cancelling", "NoticeReceived", "ClaimReceived"].includes(field)) {
            value = formatFriendlyDate(value);
          }

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