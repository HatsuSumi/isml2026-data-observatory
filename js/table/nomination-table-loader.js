import { buildStellarDisplayRows, parseNominationCsvRow } from './nomination-data.js';

export async function loadNominationRows(config) {
    const response = await fetch(`${config.dataBasePath}.csv`);
    if (!response.ok) throw new Error(`加载失败: ${response.status}`);
    const text = await response.text();
    const rows = text.split(/\r?\n/).slice(1).filter(Boolean).map(line => parseNominationCsvRow(config, line));

    if (config.mode === 'stellar') {
        const autoRows = rows.filter(row => row.isAutoPromoted);
        const normalRows = rows.filter(row => !row.isAutoPromoted).sort((a, b) => b.votes - a.votes);
        return buildStellarDisplayRows([...autoRows, ...normalRows]);
    }

    return rows;
}
