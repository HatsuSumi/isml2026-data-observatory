import { buildStellarDisplayRows, parseNominationDataRow } from './nomination-data.js';

function attachNominationMeta(rows, source) {
    return rows.map((row) => ({
        ...row,
        columns: [source.date || '', source.event || '', ...row.columns.slice(2)]
    }));
}

export async function loadNominationRows(config) {
    const response = await fetch(`${config.dataBasePath}.json`);
    if (!response.ok) throw new Error(`加载失败: ${response.status}`);
    const source = await response.json();
    if (!Array.isArray(source.data)) throw new Error('提名数据格式错误：data 必须是数组');
    const rows = attachNominationMeta(source.data.map((item) => parseNominationDataRow(config, item)), source);

    if (config.mode === 'stellar') {
        return buildStellarDisplayRows(rows);
    }

    return rows;
}
