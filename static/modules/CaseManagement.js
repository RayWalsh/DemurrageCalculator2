document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("caseSummaryTable");
  const tableBody = table.querySelector("tbody");
  const headerRow = document.getElementById("tableHeaderRow");

  const modal = document.getElementById("editCaseModal");
  const closeModalBtn = document.getElementById("closeEditModal");
  const form = document.getElementById("edit-case-form");

  const manageColumnsBtn = document.getElementById("manageColumnsBtn");

  const exportCSVBtn = document.getElementById("exportCSVBtn");
  if (exportCSVBtn) {
    exportCSVBtn.addEventListener("click", () => {
      downloadCSV(allRecords);
    });
  }

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

  function updateColumnPrefsFromSQL() {
    const currentPrefs = getColumnPrefs();
    const currentKeys = currentPrefs.map(c => c.key);

    sqlColumns.forEach(col => {
      if (!currentKeys.includes(col.name)) {
        currentPrefs.push({
          key: col.name,
          label: col.name,
          visible: false
        });
      }
    });

    setColumnPrefs(currentPrefs);
  }


function renderHeader() {
  const prefs = getColumnPrefs().filter(col => col.visible);
  headerRow.innerHTML = "";

  prefs.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col.label;

    if (col.key === currentSortKey) {
      th.classList.add(`sorted-${currentSortDirection}`);
    }

    th.addEventListener("click", () => {
      if (currentSortKey === col.key) {
        if (currentSortDirection === "asc") {
          currentSortDirection = "desc";
        } else if (currentSortDirection === "desc") {
          // 3rd click resets sort
          currentSortKey = null;
          currentSortDirection = "asc";
          allRecords = [...originalRecords]; // restore original order
          renderTable(allRecords);
          renderHeader();
          return;
        }
      } else {
        currentSortKey = col.key;
        currentSortDirection = "asc";
      }

      sortRecords();
      renderTable(allRecords);
      renderHeader();
    });

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

      if (col.key === "DeepBlueRef") {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = value || "-";
        link.classList.add("clickable-ref");
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

function filterRecords(records, query) {
  const lowerQuery = query.toLowerCase();
  const prefs = getColumnPrefs().filter(col => col.visible);
  return records.filter(record =>
    prefs.some(col => {
      const val = record[col.key];
      return val && String(val).toLowerCase().includes(lowerQuery);
    })
  );
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
          key: checkbox.dataset.key,
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
    checkbox.dataset.key = col.key; 

    const label = document.createElement("label");
    label.setAttribute("for", `col-${i}`);
    label.textContent = col.label;

    // Chevron controls
    const controls = document.createElement("div");
    controls.className = "column-controls";

    const upBtn = document.createElement("button");
    upBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    upBtn.title = "Move Up";
    upBtn.disabled = i === 0;
    upBtn.onclick = () => {
      if (i > 0) {
        const newPrefs = [...prefs];
        [newPrefs[i], newPrefs[i - 1]] = [newPrefs[i - 1], newPrefs[i]];
        setColumnPrefs(newPrefs);
        renderColumnPicker(); // Re-render with new order
      }
    };

    const downBtn = document.createElement("button");
    downBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    downBtn.title = "Move Down";
    downBtn.disabled = i === prefs.length - 1;
    downBtn.onclick = () => {
      if (i < prefs.length - 1) {
        const newPrefs = [...prefs];
        [newPrefs[i], newPrefs[i + 1]] = [newPrefs[i + 1], newPrefs[i]];
        setColumnPrefs(newPrefs);
        renderColumnPicker(); // Re-render with new order
      }
    };

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);

    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(controls);
    columnList.appendChild(li);
  });
}

function downloadCSV(data) {
  const prefs = getColumnPrefs().filter(col => col.visible);
  const headers = prefs.map(col => col.label);
  const keys = prefs.map(col => col.key);

  const csvRows = [
    headers.join(","),
    ...data.map(row =>
      keys.map(key => {
        let value = row[key] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(",")
    )
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "case_export.csv";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sortRecords() {
  if (!currentSortKey) return;

  allRecords.sort((a, b) => {
    let valA = a[currentSortKey];
    let valB = b[currentSortKey];

    // Try to treat values as dates or numbers if possible
    if (!isNaN(Date.parse(valA)) && !isNaN(Date.parse(valB))) {
      valA = new Date(valA);
      valB = new Date(valB);
    } else if (!isNaN(valA) && !isNaN(valB)) {
      valA = parseFloat(valA);
      valB = parseFloat(valB);
    } else {
      valA = valA?.toString().toLowerCase() ?? "";
      valB = valB?.toString().toLowerCase() ?? "";
    }

    if (valA < valB) return currentSortDirection === "asc" ? -1 : 1;
    if (valA > valB) return currentSortDirection === "asc" ? 1 : -1;
    return 0;
  });
}

  // Initial fetch
  let sqlColumns = []; // holds dynamic column info
  let allRecords = [];
  let originalRecords = [];
  let currentSortKey = null;
  let currentSortDirection = "asc";

  // First fetch the SQL columns
  fetch("/api/case-columns")
    .then(res => res.json())
    .then(columns => {
      sqlColumns = columns.filter(col => col.name !== "CaseID");
      updateColumnPrefsFromSQL();

      // Then fetch the actual case data
      return fetch("/api/cases");
    })
    .then(res => res.json())
    .then(data => {
      allRecords = data;
      originalRecords = [...data];
      renderHeader();
      renderTable(allRecords);
    })
    .catch(err => {
      console.error("Error loading data:", err);
    });

const globalSearch = document.getElementById("globalSearch");
if (globalSearch) {
  globalSearch.addEventListener("input", (e) => {
    const query = e.target.value;
    const filtered = filterRecords(allRecords, query);
    renderTable(filtered);
  });
}

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }
});