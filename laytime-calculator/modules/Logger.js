  export function logDebug(message, level = "DEBUG") {
    const debugLog = document.getElementById("debugLog");
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
  
    if (debugLog) {
      debugLog.textContent += `\n${formattedMessage}`;
      debugLog.scrollTop = debugLog.scrollHeight; // Auto-scroll
    } else {
      console.log(formattedMessage);
    }
  }

  export function clearLog() {
    const debugLog = document.getElementById("debugLog");
    if (debugLog) {
      debugLog.textContent = "";
    }
  }