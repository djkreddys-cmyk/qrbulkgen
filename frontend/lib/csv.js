export function parseCsvDetailed(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => String(cell || "").trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some((cell) => String(cell || "").trim() !== "")) {
      rows.push(row);
    }
  }

  if (!rows.length) {
    return {
      headers: [],
      rows: [],
    };
  }

  const headers = rows[0].map((cell) => String(cell || "").trim());
  const parsedRows = rows.slice(1).map((values, index) =>
    headers.reduce(
      (acc, header, valueIndex) => {
        acc[header] = String(values[valueIndex] || "").trim();
        return acc;
      },
      { __rowNumber: index + 2 },
    ),
  );

  return {
    headers,
    rows: parsedRows,
  };
}

export function parseCsv(text) {
  return parseCsvDetailed(text).rows;
}

export function downloadCsv(filename, headers, rows) {
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? "");
          return value.includes(",") || value.includes('"') || value.includes("\n")
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(","),
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
