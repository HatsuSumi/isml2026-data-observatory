import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const CONFIG = {
  female: {
    source: 'temp.html',
    outputBase: '51-phase2-r06-necklace-female',
    publicDir: 'data/phase2/stellar/female',
    internalDir: 'data/internal/phase2/stellar/female',
    event: '第二阶段第六轮-恒星女子黄玉项链赛',
    ids: {
      '雷姆\0Re:从零开始的异世界生活': 'SF093',
      '八奈见杏菜\0败犬女主太多了！': 'SF003',
      '时崎狂三\0约会大作战': 'SF002',
      '爱蜜莉雅\0Re:从零开始的异世界生活': 'SF034',
      '友利奈绪\0Charlotte': 'SF020',
      '小鸟游六花\0中二病也要谈恋爱！': 'SF022',
      '白\0NO GAME NO LIFE 游戏人生': 'SF017',
      '四宫辉夜\0辉夜大小姐想让我告白～天才们的恋爱头脑战～': 'SF023'
    }
  },
  male: {
    source: 'temp2.html',
    outputBase: '52-phase2-r06-necklace-male',
    publicDir: 'data/phase2/stellar/male',
    internalDir: 'data/internal/phase2/stellar/male',
    event: '第二阶段第六轮-恒星男子黄玉垂饰赛',
    ids: {
      '菜月昴\0Re:从零开始的异世界生活': 'SM028',
      '空\0NO GAME NO LIFE 游戏人生': 'SM001',
      '里克·多拉\0NO GAME NO LIFE 游戏人生': 'SM003',
      '立花泷\0你的名字。': 'SM002',
      '石上优\0辉夜大小姐想让我告白～天才们的恋爱头脑战～': 'SM017',
      '晓山瑞希\0世界计划 缤纷舞台！ feat. 初音未来': 'SM008',
      '五条悟\0咒术回战': 'SM006',
      '水柿司\0可塑性记忆': 'SM018'
    }
  }
};

const DATE_PUBLIC = '2026-10-23 - 2026-10-24';

function clean(value) {
  return value.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

function parseIrv(html) {
  const names = [...html.matchAll(/<span class="alt-name-text">([\s\S]*?)<\/span>/g)].map(m => clean(m[1]));
  const ips = [...html.matchAll(/<p class="contestantSeries">([\s\S]*?)<\/p>/g)].map(m => clean(m[1]));
  const avatars = [...html.matchAll(/<img class="contestantFlag[^>]*src="([^"]+)"/g)].map(m => m[1]);
  const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map(row => row[1])
    .filter(rowHtml => rowHtml.includes('<td>'));
  const roundCells = rows.map(rowHtml =>
    [...rowHtml.matchAll(/<td>([\s\S]*?)<\/td>/g)].map(cellHtml => {
      const cell = cellHtml[1].match(/contestantInfo (\w+)">([\d,]+)</);
      return cell ? { cls: cell[1], votes: Number(cell[2].replace(/,/g, '')) } : null;
    })
  );
  const roundCount = roundCells.length;
  const columnCount = names.length;
  const contestants = names.map((name, index) => {
    const votes = roundCells.map(cells => cells[index]?.votes ?? null);
    const marks = roundCells.map(cells => cells[index]?.cls ?? null);
    let eliminationRound = null;
    let finalResult = '淘汰';
    for (let round = 0; round < roundCount; round += 1) {
      if (marks[round] === 'victoryText') { finalResult = '胜者'; break; }
      if (marks[round] === 'eliminatedText') { eliminationRound = round + 1; break; }
    }
    return { name, ip: ips[index], avatar: avatars[index] || '', votes, marks, eliminationRound, finalResult };
  });
  return { contestants, roundCount, columnCount };
}

function assignRanks(contestants, roundCount) {
  const sorted = [...contestants].sort((a, b) => {
    const aOut = a.finalResult === '胜者' ? roundCount + 1 : a.eliminationRound;
    const bOut = b.finalResult === '胜者' ? roundCount + 1 : b.eliminationRound;
    if (aOut !== bOut) return bOut - aOut;
    return b.votes[roundCount - 1] - a.votes[roundCount - 1];
  });
  sorted.forEach((contestant, index) => { contestant.finalRank = index + 1; });
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsv(records, roundCount) {
  const header = ['最终排名', '角色', 'IP'];
  for (let round = 1; round <= roundCount; round += 1) header.push(`第${round}轮票数`);
  header.push('淘汰轮次', '最终结果', '头像');
  const rows = records.map(record => [
    record.finalRank, record.name, record.ip,
    ...record.votes.map(vote => vote ?? ''),
    record.eliminationRound ?? '', record.finalResult, record.avatar
  ]);
  return `\ufeff${[header, ...rows].map(row => row.map(csvEscape).join(',')).join('\n')}\n`;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildXlsx(records, roundCount) {
  const header = ['最终排名', '角色', 'IP'];
  for (let round = 1; round <= roundCount; round += 1) header.push(`第${round}轮票数`);
  header.push('淘汰轮次', '最终结果', '头像');
  const rows = [header, ...records.map(record => [
    record.finalRank, record.name, record.ip,
    ...record.votes.map(vote => vote ?? ''),
    record.eliminationRound ?? '', record.finalResult, record.avatar
  ])];
  const escapeXml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const sheetRows = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`).join('')}</row>`).join('');
  const parts = {
    types: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    rels: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    workbook: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="赛事数据" sheetId="1" r:id="rId1"/></sheets></workbook>',
    workbookRels: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    sheet: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
  };
  const encoder = new TextEncoder();
  const files = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of Object.entries({ '[Content_Types].xml': parts.types, '_rels/.rels': parts.rels, 'xl/workbook.xml': parts.workbook, 'xl/_rels/workbook.xml.rels': parts.workbookRels, 'xl/worksheets/sheet1.xml': parts.sheet })) {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const checksum = crc32(dataBytes);
    const header = new Uint8Array(30);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x04034b50, true);
    headerView.setUint16(4, 20, true);
    headerView.setUint32(14, checksum, true);
    headerView.setUint32(18, dataBytes.length, true);
    headerView.setUint32(22, dataBytes.length, true);
    headerView.setUint16(26, nameBytes.length, true);
    files.push(Buffer.from(header), Buffer.from(nameBytes), Buffer.from(dataBytes));
    const record = new Uint8Array(46);
    const recordView = new DataView(record.buffer);
    recordView.setUint32(0, 0x02014b50, true);
    recordView.setUint16(4, 20, true);
    recordView.setUint16(6, 20, true);
    recordView.setUint32(16, checksum, true);
    recordView.setUint32(20, dataBytes.length, true);
    recordView.setUint32(24, dataBytes.length, true);
    recordView.setUint16(28, nameBytes.length, true);
    recordView.setUint32(42, offset, true);
    central.push(Buffer.from(record), Buffer.from(nameBytes));
    offset += 30 + nameBytes.length + dataBytes.length;
  }
  const centralData = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(5, 8);
  end.writeUInt16LE(5, 10);
  end.writeUInt32LE(centralData.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, centralData, end]);
}

for (const gender of ['female', 'male']) {
  const config = CONFIG[gender];
  const html = fs.readFileSync(path.join(root, config.source), 'utf8');
  const { contestants, roundCount, columnCount } = parseIrv(html);
  if (contestants.length !== 8 || columnCount !== 8) throw new Error(`${gender}: expected 8 contestants, got ${contestants.length}`);
  if (roundCount !== 6) throw new Error(`${gender}: expected 6 IRV rounds, got ${roundCount}`);
  assignRanks(contestants, roundCount);

  const records = contestants.map(contestant => {
    const participantId = config.ids[`${contestant.name}\0${contestant.ip}`];
    if (!participantId) throw new Error(`${gender}: no participantId for ${contestant.name} / ${contestant.ip}`);
    return { ...contestant, participantId };
  });

  const winner = records.find(record => record.finalResult === '胜者');
  if (!winner) throw new Error(`${gender}: no winner found`);
  const losers = records.filter(record => record.finalResult !== '胜者');
  if (losers.some(record => record.eliminationRound === null)) throw new Error(`${gender}: eliminated contestant without round`);

  const publicData = {
    date: DATE_PUBLIC,
    event: config.event,
    rounds: Array.from({ length: roundCount }, (_, index) => index + 1),
    data: records.map(record => ({
      participantId: record.participantId,
      name: record.name,
      ip: record.ip,
      avatar: record.avatar,
      votes: record.votes,
      finalRank: record.finalRank,
      eliminationRound: record.finalResult === '胜者' ? null : record.eliminationRound,
      finalResult: record.finalResult
    }))
  };

  const internalData = {
    date: DATE_PUBLIC,
    event: config.event,
    data: Array.from({ length: roundCount }, (_, roundIndex) => {
      const isFinalRound = roundIndex + 1 === roundCount;
      return {
        round: roundIndex + 1,
        contestants: records
          .filter(record => record.votes[roundIndex] !== null)
          .map(record => {
            let status = 'active';
            if (isFinalRound) {
              const mark = record.marks?.[roundIndex];
              status = mark === 'victoryText' ? 'winner' : 'eliminated';
            } else if (record.votes[roundIndex + 1] === null) {
              status = record.finalResult === '胜者' ? 'winner' : 'eliminated';
            }
            return { participantId: record.participantId, votes: record.votes[roundIndex], status };
          })
      };
    })
  };

  const publicPath = path.join(root, config.publicDir, `${config.outputBase}.json`);
  const csvPath = path.join(root, config.publicDir, `${config.outputBase}.csv`);
  const xlsxPath = path.join(root, config.publicDir, `${config.outputBase}.xlsx`);
  const internalPath = path.join(root, config.internalDir, `${config.outputBase}.json`);
  fs.writeFileSync(publicPath, JSON.stringify(publicData, null, 2) + '\n');
  fs.writeFileSync(csvPath, buildCsv(records, roundCount));
  fs.writeFileSync(xlsxPath, buildXlsx(records, roundCount));
  fs.writeFileSync(internalPath, JSON.stringify(internalData, null, 2) + '\n');

  const firstRoundTotal = records.reduce((sum, record) => sum + record.votes[0], 0);
  console.log(`${gender}: ${config.outputBase} | winner: ${winner.name} | round-1 votes total: ${firstRoundTotal}`);
}
