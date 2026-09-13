// Helpers for the festival countdown's <input type="datetime-local">, which
// has no timezone of its own. This app is built for Indian temples, so we
// pin that field to India Standard Time (UTC+5:30) explicitly - otherwise a
// server running in UTC (the default on most hosts) would silently shift
// whatever time the admin picks by 5.5 hours.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Date -> "YYYY-MM-DDTHH:mm" for pre-filling the form input, shown in IST.
function toISTDatetimeLocal(date) {
  const d = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  return d.toISOString().slice(0, 16);
}

// "YYYY-MM-DDTHH:mm" (assumed IST, as entered by the admin) -> real UTC Date.
function fromISTDatetimeLocal(value) {
  return new Date(`${value}+05:30`);
}

module.exports = { toISTDatetimeLocal, fromISTDatetimeLocal };
