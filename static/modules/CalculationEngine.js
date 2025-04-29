// Calculate Allowed Laytime
export function calculateAllowedLaytime(cargoQty, rate, portType) {
  if (!cargoQty || !rate) return 0;

  // Only calculate for Loading ("L") or Discharging ("D") ports
  return portType === "L" || portType === "D" ? cargoQty / rate : 0;
}

// Calculate Time Used between Start and End Timestamps
export function calculateTimeUsed(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  // Validate dates
  if (isNaN(start) || isNaN(end)) return 0;

  // Calculate time difference in hours
  const timeDiff = (end - start) / (1000 * 60 * 60); // Convert ms to hours
  return timeDiff > 0 ? timeDiff : 0; // Only positive values
}

// Calculate Time on Demurrage and Demurrage Cost
export function calculateDemurrage(totalAllowed, totalUsed, dailyRate) {
  const timeOnDemurrage = Math.max(0, totalUsed - totalAllowed); // No negative demurrage
  const cost = (timeOnDemurrage * dailyRate) / 24; // Cost based on hourly rate
  return { timeOnDemurrage, cost };
}

// Calculate Results based on current state
export function calculateResults(state) {
  let totalAllowed = 0;
  let totalUsed = 0;
  let totalTimeOnDemurrage = 0;
  const dailyRate = state.contract?.dailyRate || 0;

  state.ports.forEach((port) => {
    const rate = port.portType === "L" 
      ? state.defaultRates.loadingRate 
      : state.defaultRates.dischargingRate;

    const allowedLaytime = calculateAllowedLaytime(port.cargoQty, rate, port.portType);
    const timeUsed = parseFloat(port.timeUsed) || 0;
    const timeOnDemurrage = Math.max(0, timeUsed - allowedLaytime);

    totalAllowed += allowedLaytime;
    totalUsed += timeUsed;
    totalTimeOnDemurrage += timeOnDemurrage;
  });

  const hourlyRate = dailyRate / 24;
  const demurrageCost = totalTimeOnDemurrage * hourlyRate;

  console.log("Calculation Results:", { totalAllowed, totalUsed, totalTimeOnDemurrage, demurrageCost });
  
  return {
    totalAllowed,
    totalUsed,
    totalTimeOnDemurrage,
    demurrageCost,
  };
}