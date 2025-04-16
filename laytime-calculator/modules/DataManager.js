

export const state = {
  contract: {
    dailyRate: 24000, // Default daily rate for demurrage cost calculation
  },
  ports: [],
  defaultRates: {
    loadingRate: 150, // Default loading rate (MTPH)
    dischargingRate: 100, // Default discharging rate (MTPH)
    reversible: true, // Reversible checkbox flag
  },
};

// Add a new port
export function addPort(portData) {
  state.ports.push({
    id: portData.id || Date.now(), // Allow an optional custom ID
    name: portData.name || `Port ${state.ports.length + 1}`,
    cargoQty: portData.cargoQty || 0,
    portType: portData.portType || 'L',
    timeUsed: portData.timeUsed || 0,
  });
}

// Update a specific port
export function updatePort(id, updatedData) {
  const port = state.ports.find((p) => p.id === id);
  if (port) Object.assign(port, updatedData);
  console.log(`Port Updated: ID=${id}, Updated Data:`, JSON.stringify(port, null, 2));
}

// Delete a port
export function deletePort(id) {
  state.ports = state.ports.filter((p) => p.id !== id);
}

// Update default rates (loading, discharging, reversible)
export function updateDefaultRates(newRates) {
  Object.assign(state.defaultRates, newRates);
}