/**
 * Download an array of objects as a CSV file.
 * Keys of the first object become column headers.
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const escape = (val: unknown): string => {
        const str = val == null ? '' : String(val);
        // Wrap in quotes if it contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csv = [
        headers.map(escape).join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
