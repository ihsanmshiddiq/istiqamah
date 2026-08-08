/**
 * Data Export/Import Service
 * Handles backup and restore of all app data to/from JSON files.
 */

import { COLLECTIONS, SINGLETONS, getAll, getSingleton, type Row } from "@/lib/store";

export interface ExportData {
  version: number;
  exportedAt: string;
  collections: Record<string, Row[]>;
  singletons: Record<string, Row>;
}

const CURRENT_VERSION = 1;

// ─── Export ───
export function exportAllData(): ExportData {
  const collections: Record<string, Row[]> = {};
  for (const name of COLLECTIONS) {
    collections[name] = getAll(name);
  }

  const singletons: Record<string, Row> = {};
  for (const name of SINGLETONS) {
    const data = getSingleton(name);
    if (data) singletons[name] = data;
  }

  return {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    collections,
    singletons,
  };
}

export function downloadJSON(data: ExportData, filename?: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `istiqamah-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportToFile(): Promise<void> {
  const data = exportAllData();
  downloadJSON(data);
}

// ─── Import ───
export function parseImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as ExportData;

        // Validate structure
        if (!data.version || !data.collections || !data.singletons) {
          throw new Error("Invalid backup file format");
        }

        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function importSummary(data: ExportData): {
  collections: { name: string; count: number }[];
  singletons: { name: string }[];
} {
  const collections = Object.entries(data.collections)
    .map(([name, rows]) => ({ name, count: rows.length }))
    .filter((c) => c.count > 0);

  const singletons = Object.keys(data.singletons).map((name) => ({ name }));

  return { collections, singletons };
}

// ─── PDF Export (simplified - generates HTML for print) ───
export function generatePrintableHTML(data: ExportData): string {
  const rows = Object.entries(data.collections)
    .filter(([, items]) => items.length > 0)
    .map(([name, items]) => {
      const itemsList = items
        .map((item) => {
          const title = String(item.title ?? item.name ?? item.id ?? "—");
          const body = String(item.body ?? item.note ?? "").slice(0, 100);
          return `<li><strong>${escapeHtml(title)}</strong>${body ? ` — ${escapeHtml(body)}` : ""}</li>`;
        })
        .join("\n");

      return `
        <h2 style="color: #173f3d; margin-top: 1.5rem; font-size: 1.1rem;">${escapeHtml(name)} (${items.length})</h2>
        <ul style="padding-left: 1.2rem; line-height: 1.8;">${itemsList}</ul>
      `;
    })
    .join("\n");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Istiqamah Backup - ${new Date(data.exportedAt).toLocaleDateString("id-ID")}</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
        h1 { color: #173f3d; border-bottom: 2px solid #173f3d; padding-bottom: 0.5rem; }
        h2 { color: #173f3d; }
        ul { list-style-type: disc; }
        li { margin-bottom: 0.25rem; }
        .meta { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
      </style>
    </head>
    <body>
      <h1>Istiqamah — Data Backup</h1>
      <p class="meta">Diekspor pada: ${new Date(data.exportedAt).toLocaleString("id-ID")}</p>
      ${rows}
    </body>
    </html>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportToPDF(data: ExportData) {
  const html = generatePrintableHTML(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
