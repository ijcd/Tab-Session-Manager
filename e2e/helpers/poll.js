async function poll(timeoutMs, intervalMs, fn) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value !== undefined && value !== null) return value;
    } catch (e) {
      lastError = e;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`poll timed out after ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ""}`);
}

module.exports = { poll };
