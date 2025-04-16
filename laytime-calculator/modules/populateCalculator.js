document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded event fired.");

    // Retrieve CaseID from local storage
    const caseId = localStorage.getItem("currentCaseID");

    if (caseId) {
        console.log("Retrieved CaseID from localStorage:", caseId);
        // Fetch data for the retrieved CaseID
        const apiUrl = `https://api.airtable.com/v0/apprFJLqkgu6Mi0sD/tbl2hMFQHSYlxi1rO?filterByFormula=CaseID="${caseId}"`;
        const apiKey = "patxHsnDtrvFZSaS9.660b0aeef9114acc64006442de946eb4461b4c728e7def6886ac69bdebd15272";

        fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                if (data.records.length > 0) {
                    console.log("Data fetched successfully:", data.records[0].fields);
                    populateCalculator(data.records[0].fields); // Populate with fetched data
                } else {
                    console.warn("No records found for the given CaseID:", caseId);
                    populateCalculator(); // Populate with default data
                }
            })
            .catch((error) => {
                console.error("Error fetching data from Airtable:", error);
                populateCalculator(); // Populate with default data
            });
    } else {
        console.warn("No CaseID found in localStorage. Populating with default values.");
        populateCalculator(); // Populate with default data
    }
});

// Ensure populateCalculator is defined later in the script
export function populateCalculator(fields = {}) {
    try {
        document.getElementById("caseNumber").value = fields.CaseID || "";
        document.getElementById("account").value = fields.Account || "";
        document.getElementById("vesselName").value = fields.VesselName || "";
        document.getElementById("cpDate").value = fields.CPDate || "";
        document.getElementById("loadingRate").value = fields.LoadRate || "";
        document.getElementById("dischargingRate").value = fields.DischRate || "";
        document.getElementById("demurrageRate").value = fields.DemurrageRate || "";
        console.log("Calculator fields populated successfully with data:", fields);
    } catch (error) {
        console.error("Error populating calculator fields:", error);
    }
}