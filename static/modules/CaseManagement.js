document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("caseSummaryTable");
  const tableBody = table.querySelector("tbody");
  const headerRow = document.getElementById("tableHeaderRow");

  const modal = document.getElementById("editCaseModal");
  const closeModalBtn = document.getElementById("closeEditModal");
  const form = document.getElementById("edit-case-form");

  const manageColumnsBtn = document.getElementById("manageColumnsBtn");
  const columnPickerPanel = document.getElementById("columnPickerPanel");
  const closeColumnPicker = document.getElementById("closeColumnPicker");
  const columnList = document.getElementById("columnToggleList");
  const applyColumnPrefsBtn = document.getElementById("applyColumnPrefs");
  const cancelColumnPrefsBtn = document.getElementById("cancelColumnPrefs");

  const fieldMap = {
    editRef: "DeepBlueRef", editAccount: "ClientName", editVesselName: "VesselName",
    editVoyageNumber: "VoyageNumber", editVoyageEndDate: "VoyageEndDate", editCPDate: "CPDate",
    editCPType: "CPType", editCPForm: "CPForm", editOwnersName: "OwnersName",
    editBrokersName: "BrokersName", editCharterersName: "CharterersName", editLayday: "Layday",
    editCancelling: "Cancelling", editLoadRate: "LoadRate", editDischRate: "DischRate",
    editDemurrageRate: "DemurrageRate", editInitialClaim: "InitialClaim", editNoticeReceived: "NoticeReceived",
    editNoticeDays: "NoticeDays", editClaimReceived: "ClaimReceived", editClaimDays: "ClaimDays",
    editContractType: "ContractType", editClaimType: "ClaimType", editClaimFiledAmount: "ClaimFiledAmount",
    editClaimStatus: "ClaimStatus", editReversible: "Reversible", editLumpsumHours: "LumpsumHours",
    editCalculationType: "CalculationType", editTotalAllowedLaytime: "TotalAllowedLaytime",
    editTotalTimeUsed: "TotalTimeUsed", editTotalTimeOnDemurrage: "TotalTimeOnDemurrage",
    editTotalDemurrageCost: "TotalDemurrageCost", editCalculatorNotes: "CalculatorNotes"
  };

  const defaultColumns = [
    { key: "DeepBlueRef", label: "DeepBlueRef", visible: true },
    { key: "ClientName", label: "Account", visible: true },
    { key: "VesselName", label: "Vessel Name", visible: true },
    { key: "CPDate", label: "C/P Date", visible: true },
    { key: "CPType", label: "C/P Type", visible: true },
    { key: "CPForm", label: "C/P Form", visible: true },
    { key: "OwnersName", label: "Owners Name", visible: true },
    { key: "BrokersName", label: "Brokers Name", visible: true },
    { key: "Layday", label: "Layday", visible: true },
    { key: "Cancelling", label: "Cancelling", visible: true },
    { key: "LoadRate", label: "Load Rate", visible: true },
    { key: "DischRate", label: "Disch Rate", visible: true },
    { key: "DemurrageRate", label: "Demurrage Rate", visible: true },
    { key: "ClaimFiledAmount", label: "Initial Claim", visible: true },
    { key: "NoticeReceived", label: "Notice Received", visible: true },
    { key: "ClaimReceived", label: "Claim Received", visible: true },
    { key: "VoyageEndDate", label: "Voyage End", visible: true },
    { key: "VoyageNumber", label: "Voyage Number", visible: true },
    { key: "NoticeDays", label: "Notice Days", visible: true },
    { key: "ClaimDays", label: "Claim Days", visible: true }
  ];

  const getColumnPrefs = () => {
    try {
      return JSON.parse(localStorage.getItem("columnPrefs")) || [...defaultColumns];
    } catch {
      return [...defaultColumns];
    }
  };

  const setColumnPrefs = (prefs) => {
    localStorage.setItem("columnPrefs", JSON.stringify(prefs));
  };

  function renderHeader() {
    const prefs = getColumnPrefs().filter(col => col.visible);
    headerRow.innerHTML = "";

    prefs.forEach(col => {
      const th = document.createElement("th");
      th.textContent = col.label;
      headerRow.appendChild(th);
    });
  }

  function renderTable(records) {
    const prefs = getColumnPrefs().filter(col => col.visible);
    tableBody.innerHTML = "";

    records.forEach(record => {
      const row = document.createElement("tr");

      prefs.forEach(col => {
        const cell = document.createElement("td");

        let value = record[col.key];
        if (["CPDate", "VoyageEndDate", "Layday", "Cancelling", "NoticeReceived", "ClaimReceived"].includes(col.key)) {
          value = formatFriendlyDate(value);
        }

        if (col.key === "VesselName") {
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

  function formatFriendlyDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date) ? "-" : date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function openEditModal(record) {
    modal.style.display = "block";
    document.getElementById("editCaseID").value = record.CaseID || "";
    for (const [inputId, fieldKey] of Object.entries(fieldMap)) {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = input.type === "date" ? formatFriendlyDate(record[fieldKey]) : record[fieldKey] ?? "";
      }
    }
    form.dataset.original = JSON.stringify(record);

    const modalCalcBtn = document.getElementById("modalOpenCalculationBtn");
    if (modalCalcBtn) {
      modalCalcBtn.onclick = () => {
        localStorage.setItem("currentCaseRef", record.DeepBlueRef);
        localStorage.setItem("currentCaseID", record.CaseID);
        window.location.href = "/calculator";
      };
    }
  }

  // Column Picker Events
  if (manageColumnsBtn) {
    manageColumnsBtn.addEventListener("click", () => {
      renderColumnPicker();
      columnPickerPanel.classList.add("show");
    });
  }

  if (closeColumnPicker || cancelColumnPrefsBtn) {
    [closeColumnPicker, cancelColumnPrefsBtn].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        columnPickerPanel.classList.remove("show");
      });
    });
  }

  if (applyColumnPrefsBtn) {
    applyColumnPrefsBtn.addEventListener("click", () => {
      const updatedPrefs = Array.from(columnList.children).map(li => {
        const checkbox = li.querySelector("input[type='checkbox']");
        const label = li.querySelector("label");
        return {
          key: defaultColumns.find(col => col.label === label.textContent).key,
          label: label.textContent,
          visible: checkbox.checked
        };
      });
      setColumnPrefs(updatedPrefs);
      columnPickerPanel.classList.remove("show");
      renderHeader();
      renderTable(allRecords);
    });
  }

  const resetColumnPrefsBtn = document.getElementById("resetColumnPrefs");
  if (resetColumnPrefsBtn) {
    resetColumnPrefsBtn.addEventListener("click", () => {
      const confirmReset = confirm("Are you sure you want to reset the column view to default?");
      if (confirmReset) {
        localStorage.removeItem("columnPrefs");
        renderHeader();
        renderTable(allRecords);
        columnPickerPanel.classList.remove("show");
      }
    });
  }


  function renderColumnPicker() {
    const prefs = getColumnPrefs();
    columnList.innerHTML = "";

    prefs.forEach((col, i) => {
      const li = document.createElement("li");
      li.className = "column-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = col.visible;
      checkbox.id = `col-${i}`;

      const label = document.createElement("label");
      label.setAttribute("for", `col-${i}`);
      label.textContent = col.label;

      li.appendChild(checkbox);
      li.appendChild(label);
      columnList.appendChild(li);
    });
  }

  // Initial fetch
  let allRecords = [];

  fetch("/api/cases")
    .then(res => res.json())
    .then(data => {
      allRecords = data;
      renderHeader();
      renderTable(allRecords);
    })
    .catch(err => {
      console.error("Failed to load cases:", err);
    });

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }
});