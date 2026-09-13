// Formats a rupee amount using Indian digit grouping, e.g. 1234567 -> "12,34,567".
function formatINR(amount, { withSymbol = true } = {}) {
  const n = Math.round(Number(amount) || 0);
  const formatted = n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return withSymbol ? `₹${formatted}` : formatted;
}

module.exports = { formatINR };
