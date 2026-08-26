const COLUMN_ORDER = [0, 1, 2, 4, 5, 6, 7, 3];
const EXCEL_COLUMNS = [
    { header: '排名', width: 5 },
    { header: '日期', width: 15 },
    { header: '赛事名称', width: 30 },
    { header: '角色', width: 30 },
    { header: 'IP', width: 50 },
    { header: 'CV', width: 20 },
    { header: '得票数', width: 15 },
    { header: '头像链接', width: 100 }
];

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

async function exportCurrentTableToExcel(state, rows) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(state.config.title);
    worksheet.columns = EXCEL_COLUMNS;
    worksheet.addRows(rows);
    worksheet.eachRow(row => {
        row.height = 30;
        row.eachCell(cell => {
            cell.font = { name: '楷体', size: 12 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'none' },
                left: { style: 'none' },
                bottom: { style: 'none' },
                right: { style: 'none' }
            };
        });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${state.config.title}-当前视图.xlsx`);
}

export async function downloadSourceFile(state, format) {
    const response = await fetch(`${state.config.dataBasePath}.${format}`);
    if (!response.ok) throw new Error(`下载失败: ${response.status}`);
    let blob;
    if (format === 'csv') {
        blob = new Blob([await response.text()], { type: 'text/csv;charset=utf-8' });
    } else if (format === 'json') {
        blob = new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json;charset=utf-8' });
    } else {
        blob = await response.blob();
    }
    triggerDownload(blob, `${state.config.title}.${format}`);
}

export function downloadCurrentTableView(state, format) {
    const table = document.querySelector('table');
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
    const rows = Array.from(document.querySelectorAll('#tableBody tr'))
        .filter(row => !row.hidden)
        .map(row => Array.from(row.cells).map(cell => cell.querySelector('img')?.src || cell.textContent.trim()));
    const reorderedHeaders = COLUMN_ORDER.map(i => headers[i]);
    const reorderedRows = rows.map(row => COLUMN_ORDER.map(i => row[i]));

    if (format === 'json') {
        const data = reorderedRows.map(row => Object.fromEntries(reorderedHeaders.map((header, index) => [header, row[index]])));

        triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), `${state.config.title}-当前视图.json`);
        return;
    }
    if (format === 'csv') {
        const csv = [reorderedHeaders.join(','), ...reorderedRows.map(row => row.join(','))].join('\n');
        triggerDownload(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `${state.config.title}-当前视图.csv`);
        return;
    }
    exportCurrentTableToExcel(state, reorderedRows).catch(error => {
        console.error('Excel 导出错误:', error);
        alert('导出 Excel 时发生错误，请稍后重试');
    });
}
