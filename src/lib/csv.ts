// Minimal CSV parser with support for quoted fields and commas inside quotes.
// Returns an array of rows, each row is an array of strings.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const n = text.length;
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          // Escaped quote
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      if (ch === '\r') {
        // Normalize CRLF -> handle on next LF
        i++;
        continue;
      }
      field += ch;
      i++;
    }
  }
  // push last field/row
  row.push(field);
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }
  // Trim trailing empty rows
  return rows.filter(r => r.some(c => c.trim().length > 0));
}

export function toCSV(rows: (string | number)[][]): string {
  const esc = (s: string | number) => {
    const str = String(s);
    if (/[",\n\r]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  return rows.map(r => r.map(esc).join(",")).join("\n");
}
