export function toCsv(headers: string[], rows: unknown[][]): string {
  const escape = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return "\ufeff" + [headers, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
}
