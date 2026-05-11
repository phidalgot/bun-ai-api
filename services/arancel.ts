import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ArancelEntry {
  codigo: string;
  descripcion: string;
  aeic: string;
  unidad: string;
  arancel_importacion: number | null;
  arancel_exportacion: number | null;
  nivel_tarifa: string;
}

let cachedArancel: ArancelEntry[] | null = null;

function normalizeCode(code: string): string {
  return code.replace(/\r\n/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeText(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();
}

export function loadArancel(): ArancelEntry[] {
  if (cachedArancel) return cachedArancel;

  const filePath = resolve('./docs/2-CONSOLIDADO Decreto_4944+8VAREFORMA.xlsx');
  const buffer = readFileSync(filePath);
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];

  const entries: ArancelEntry[] = [];

  for (let i = 17; i < data.length; i++) {
    const row = data[i];
    const code = normalizeCode(row[0] as string);

    if (!code || !/^\d/.test(code)) continue;

    const descripcionCols = [1, 2, 3, 4, 5].map(j => normalizeText(row[j])).filter(t => t && t !== '-');
    const descripcion = descripcionCols.join(' ');

    const arancelRaw = row[10];
    const arancelImportacion = typeof arancelRaw === 'number' ? arancelRaw : null;

    const arancelExpRaw = row[11];
    const arancelExportacion = typeof arancelExpRaw === 'number' ? arancelExpRaw : null;

    const aeic = normalizeText(row[9]);
    const unidad = normalizeText(row[12]);
    const nivelTarifa = normalizeText(row[8]);

    entries.push({
      codigo: code,
      descripcion,
      aeic,
      unidad,
      arancel_importacion: arancelImportacion,
      arancel_exportacion: arancelExportacion,
      nivel_tarifa: nivelTarifa,
    });
  }

  cachedArancel = entries;
  console.log(`Loaded ${entries.length} arancel entries`);
  return entries;
}

export function searchArancel(query: string, limit = 50): ArancelEntry[] {
  const entries = loadArancel();
  const q = query.toLowerCase();
  const results: ArancelEntry[] = [];

  for (const entry of entries) {
    if (entry.codigo.includes(q) || entry.descripcion.toLowerCase().includes(q)) {
      results.push(entry);
      if (results.length >= limit) break;
    }
  }

  return results;
}

export function formatArancelForPrompt(entries: ArancelEntry[]): string {
  return entries
    .map(e => {
      const parts = [
        `Código: ${e.codigo}`,
        `Descripción: ${e.descripcion}`,
        e.aeic ? `AEIC: ${e.aeic}` : null,
        `Arancel Importación: ${e.arancel_importacion !== null ? e.arancel_importacion + '%' : 'N/A'}`,
        `Arancel Exportación: ${e.arancel_exportacion !== null ? e.arancel_exportacion + '%' : 'N/A'}`,
        `Unidad: ${e.unidad || 'N/A'}`,
      ].filter(Boolean);
      return parts.join(' | ');
    })
    .join('\n');
}