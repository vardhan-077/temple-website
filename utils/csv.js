// Helpers for the admin "Export Data" page. They turn database records into
// CSV files that open cleanly in Excel, Google Sheets and phone spreadsheet
// apps. What they take care of, so the admin never has to:
//
//  - A UTF-8 byte-order mark at the start of the file, so Excel shows Telugu
//    text and the rupee sign correctly instead of garbled characters.
//  - Windows-style (CRLF) line endings, which is what Excel expects.
//  - Spreadsheet "formula injection": donor names, messages and addresses are
//    typed in by the public. A value that starts with = + - or @ would be run
//    as a formula when the file is opened, so such cells get a leading
//    apostrophe and always show up as plain text.
//  - Phone numbers are written so Excel keeps them as text (no 9.39E+09, and
//    no lost leading zero or "+").
//  - Dates are shown in Indian time (IST), like the rest of the site.
const { toISTDatetimeLocal, fromISTDatetimeLocal } = require('./dates');

const DAY_MS = 24 * 60 * 60 * 1000;

// Built from character codes (not typed in) so the invisible characters can
// never get lost or mangled when this file is edited or copied.
const BOM = String.fromCharCode(0xfeff);
const INVISIBLE_CHARS = new RegExp(
  '[' + '\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F' + BOM + ']',
  'g'
);
const LINE_BREAKS = new RegExp(
  '\\r\\n|\\r|' + String.fromCharCode(0x2028) + '|' + String.fromCharCode(0x2029),
  'g'
);

// Wraps a value (a phone number) that must stay text in the spreadsheet.
class TextCell {
  constructor(value) {
    this.value = value == null ? '' : String(value);
  }
}

function asText(value) {
  return new TextCell(value);
}

// Drops invisible control characters (keeping tab / newline) and turns every
// kind of line break into a plain "\n", so one stray character can't break a row.
function cleanText(value) {
  return String(value).replace(INVISIBLE_CHARS, '').replace(LINE_BREAKS, '\n');
}

// Collapses line breaks into `separator`, so a multi-line message or address
// stays on one tidy spreadsheet row.
function oneLine(value, separator = ' ') {
  if (value == null) return '';
  return cleanText(value)
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(separator);
}

// "2026-10-12 14:35" in Indian time. Returns '' for a missing/invalid date.
function formatIST(value) {
  if (value == null || value === '') return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  return toISTDatetimeLocal(time).replace('T', ' ');
}

function todayIST() {
  return formatIST(Date.now()).slice(0, 10);
}

// A text cell starting with = + - @ (or tab / carriage return, even after
// spaces) could be run as a formula by Excel / Sheets - prefix an apostrophe.
function neutralizeFormula(text) {
  return /^[=+\-@\t\r]/.test(text) || /^\s+[=+\-@]/.test(text) ? `'${text}` : text;
}

// Standard CSV quoting: wrap in quotes (doubling any quote inside) only when needed.
function quoteIfNeeded(text) {
  return /[",\r\n]/.test(text) || /^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvCell(value) {
  if (value == null) return '';

  if (value instanceof TextCell) {
    const text = cleanText(value.value).trim();
    if (!text) return '';
    // Only plain phone-style text gets the ="..." treatment. Digits, + - ( )
    // and spaces can never contain a quote or a formula, so this is safe.
    if (/^[0-9+\-() ]{1,32}$/.test(text)) return quoteIfNeeded(`="${text}"`);
    return csvCell(text);
  }

  if (value instanceof Date) return quoteIfNeeded(formatIST(value));
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  return quoteIfNeeded(neutralizeFormula(cleanText(value)));
}

// headers: array of column titles; rows: array of arrays (same order).
function buildCsv(headers, rows) {
  const lines = [headers.map((h) => csvCell(h)).join(',')];
  rows.forEach((row) => lines.push(row.map((cell) => csvCell(cell)).join(',')));
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

// "YYYY-MM-DD" -> the same text if it is a real calendar date, otherwise ''.
function cleanDateInput(value) {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) return '';
  const probe = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
  return isRealDate ? match[0] : '';
}

// Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD (both optional, both inclusive, both in
// Indian time) and returns { from, to, createdAtFilter }. createdAtFilter is a
// ready-to-use MongoDB condition for the `createdAt` field, or null for "all time".
// If the two dates come in the wrong order they are simply swapped.
function parseDateRange(query) {
  const source = query || {};
  let from = cleanDateInput(source.from);
  let to = cleanDateInput(source.to);
  if (from && to && from > to) [from, to] = [to, from];

  const createdAt = {};
  if (from) createdAt.$gte = fromISTDatetimeLocal(`${from}T00:00`);
  // "up to and including the last day" = before the start of the next day.
  if (to) createdAt.$lt = new Date(fromISTDatetimeLocal(`${to}T00:00`).getTime() + DAY_MS);

  return { from, to, createdAtFilter: from || to ? createdAt : null };
}

// Short, filename-safe description of the chosen dates.
function rangeLabel(range) {
  if (range.from && range.to) return `${range.from}_to_${range.to}`;
  if (range.from) return `from_${range.from}`;
  if (range.to) return `until_${range.to}`;
  return `all_to_${todayIST()}`;
}

module.exports = {
  asText,
  oneLine,
  formatIST,
  todayIST,
  csvCell,
  buildCsv,
  parseDateRange,
  rangeLabel,
};
