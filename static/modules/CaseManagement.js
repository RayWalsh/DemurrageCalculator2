document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("caseSummaryTable");
  const tableBody = table.querySelector("tbody");
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

  let allRecords = []; // Original data
  let currentSort = { index: null, direction: null };

  const formatDateInput = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return isNaN(date) ? "" : date.toISOString().split("T")[0];
  };

  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date) ? "-" : date.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  function openEditModal(record) {
    modal.style.display = "block";
    document.getElementById("editCaseID").value = record.CaseID || "";

    for (const [inputId, fieldKey] of Object.entries(fieldMap)) {
      const input = document.getElementById(inputId);
      if (!input) continue;
      input.value = input.type === "date" ? formatDateInput(record[fieldKey]) : record[fieldKey] ?? "";
    }

    form.dataset.original = JSON.stringify(record);
  }

  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  const deleteBtn = document.getElementById("deleteCaseBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const caseId = document.getElementById("editCaseID").value;
      if (!caseId) return alert("No CaseID found.");
      if (!confirm("Are you sure you want to delete this case?")) return;

      try {
        const res = await fetch(`/api/delete-case/${caseId}`, { method: "DELETE" });
        const result = await res.json();
        if (res.ok) {
          alert("Case deleted successfully.");
          modal.style.display = "none";
          location.reload();
        } else {
          alert("Error deleting case: " + (result.error || "Unknown error"));
        }
      } catch (err) {
        console.error("API error during delete:", err);
        alert("Failed to delete case.");
      }
    });
  }

  function renderTable(records) {
    tableBody.innerHTML = "";
    records.forEach(record => {
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

      fields.forEach(field => {
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
  }

  function parseValue(val) {
    const date = Date.parse(val);
    if (!isNaN(date)) return date;
    const num = parseFloat(val.replace(/[^0-9.\-]/g, ""));
    return isNaN(num) ? val.toLowerCase() : num;
  }

  function sortTableByColumn(index) {
    const ths = table.querySelectorAll("thead th");
    const isSame = currentSort.index === index;
    const nextDirection = isSame
      ? currentSort.direction === "asc" ? "desc" : currentSort.direction === "desc" ? null : "asc"
      : "asc";

    currentSort = { index: nextDirection ? index : null, direction: nextDirection };

    ths.forEach(th => th.classList.remove("sorted-asc", "sorted-desc"));
    if (nextDirection) {
      ths[index].classList.add(`sorted-${nextDirection}`);
    }

    if (!nextDirection) {
      renderTable(allRecords);
      return;
    }

    const sorted = [...tableBody.rows].sort((a, b) => {
      const valA = a.cells[index]?.textContent.trim();
      const valB = b.cells[index]?.textContent.trim();
      const aParsed = parseValue(valA);
      const bParsed = parseValue(valB);
      if (aParsed < bParsed) return nextDirection === "asc" ? -1 : 1;
      if (aParsed > bParsed) return nextDirection === "asc" ? 1 : -1;
      return 0;
    });

    tableBody.innerHTML = "";
    sorted.forEach(row => tableBody.appendChild(row));
  }

  table.querySelectorAll("thead th").forEach((th, index) => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => sortTableByColumn(index));
  });

  // Fetch and render table
  fetch("/api/cases")
    .then(res => res.json())
    .then(cases => {
      allRecords = cases;
      renderTable(allRecords);
    })
    .catch(err => {
      console.error("Failed to load case data:", err);
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 20;
      cell.textContent = "Error loading data.";
      row.appendChild(cell);
      tableBody.appendChild(row);
    });
});