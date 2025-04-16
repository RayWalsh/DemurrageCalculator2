// Ports table API
const portsApiUrl = "https://api.airtable.com/v0/appnfDgXF3CKLyZQ3/tbl3t7TxUknEYCYW6"; // Ports table API endpoint
const portsApiKey = "patxHsnDtrvFZSaS9.660b0aeef9114acc64006442de946eb4461b4c728e7def6886ac69bdebd15272"; // Airtable API key for Ports

// CaseSummary table API
const caseSummaryApiUrl = "https://api.airtable.com/v0/apprFJLqkgu6Mi0sD/tbl2hMFQHSYlxi1rO"; // CaseSummary table API endpoint
const caseSummaryApiKey = "patxHsnDtrvFZSaS9.660b0aeef9114acc64006442de946eb4461b4c728e7def6886ac69bdebd15272"; // Airtable API key for CaseSummary

// Utility to extract CaseID from local storage
export function getCaseId() {
    const caseId = localStorage.getItem("currentCaseID"); // Match the key used in CaseManagement.js
    if (!caseId) {
        console.error("CaseID not found in local storage.");
        throw new Error("CaseID is required but was not found in local storage.");
    }
    return caseId;
}

// Save a port to the Ports table
export async function savePortToAirtable(port, portNumber) {
    const caseId = getCaseId(); // Fetch CaseID from local storage

    // Step 1: Save the port to the Ports table
    const payload = {
        fields: {
            PortName: port.name || "Unnamed Port",
            CaseID: caseId,
            PortNumber: portNumber,
            CargoQuantity: Number(port.cargoQty) || 0,
        },
    };

    const response = await fetch(portsApiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${portsApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const portData = await response.json();

    if (!response.ok) {
        throw new Error(`Failed to save port: ${portData.error.message}`);
    }

    console.log("Port saved successfully:", portData);

    // Step 2: Update CaseSummary with the new PortID
    await updateCaseSummary(caseId, portData.id, portNumber);

    return portData; // Return the saved port data
}

// Update the CaseSummary table with the PortID
async function updateCaseSummary(caseId, portId, portNumber) {
    // Fetch the CaseSummary record for the given CaseID
    const response = await fetch(`${caseSummaryApiUrl}?filterByFormula=CaseID="${caseId}"`, {
        headers: {
            Authorization: `Bearer ${caseSummaryApiKey}`,
        },
    });

    const caseData = await response.json();

    if (!response.ok) {
        throw new Error(`Failed to fetch CaseSummary: ${caseData.error.message}`);
    }

    const caseRecord = caseData.records[0]; // Assuming CaseID is unique

    if (!caseRecord) {
        throw new Error(`No CaseSummary record found for CaseID: ${caseId}`);
    }

    // Prepare the payload to update the correct PortID field
    const fieldToUpdate = `${portNumber}ID`; // e.g., Port1ID, Port2ID
    const updatePayload = {
        fields: {
            [fieldToUpdate]: portId, // Assign the PortID to the correct field
        },
    };

    // Send the PATCH request to update the CaseSummary record
    const updateResponse = await fetch(`${caseSummaryApiUrl}/${caseRecord.id}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${caseSummaryApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
    });

    const updateData = await updateResponse.json();

    if (!updateResponse.ok) {
        throw new Error(`Failed to update CaseSummary: ${updateData.error.message}`);
    }

    console.log("CaseSummary updated successfully:", updateData);
}

// Load ports from the Ports table
export async function loadPortsFromAirtable() {
    const caseId = getCaseId(); // Get CaseID from local storage

    try {
        const response = await fetch(`${portsApiUrl}?filterByFormula=CaseID="${caseId}"`, {
            headers: {
                Authorization: `Bearer ${portsApiKey}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Airtable response error:", JSON.stringify(data, null, 2));
            throw new Error(`Failed to load ports: ${data.error.message}`);
        }

        console.log("Ports loaded from Airtable:", data.records);
        return data.records;
    } catch (error) {
        console.error("Error loading ports from Airtable:", error);
        throw error;
    }
}

// Delete a port from the Ports table
export async function deletePortFromAirtable(recordId) {
    try {
        const response = await fetch(`${portsApiUrl}/${recordId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${portsApiKey}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Airtable response error:", JSON.stringify(errorData, null, 2));
            throw new Error(`Failed to delete port: ${errorData.error.message}`);
        }

        console.log("Port deleted successfully:", recordId);
    } catch (error) {
        console.error("Error deleting port from Airtable:", error);
        throw error;
    }
}