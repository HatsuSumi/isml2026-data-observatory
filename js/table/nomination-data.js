const AUTO_PROMOTION_VOTE = -1;

function parseVoteValue(value) {
  if (value === '-') return AUTO_PROMOTION_VOTE;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function withStellarPromotionState(row, config) {
  const isAutoPromoted = row.votes === AUTO_PROMOTION_VOTE;
  const characterName = row.name || row.columns?.[2] || '未知角色';
  if (isAutoPromoted && row.sourceRank !== null) {
    throw new Error(`${characterName} 的自动晋级记录必须使用 rank: null`);
  }
  if (!isAutoPromoted && (!Number.isInteger(row.sourceRank) || row.sourceRank < 1)) {
    throw new Error(`${characterName} 的恒星组提名记录缺少合法 rank`);
  }
  return {
    ...row,
    rank: isAutoPromoted ? null : row.sourceRank,
    isAutoPromoted,
    isPromoted: isAutoPromoted || row.votes >= config.promotionThreshold
  };
}

export function rankStellarRows() {
  throw new Error('恒星组排名必须由提名 JSON 提供');
}

export function buildStellarDisplayRows(rows) {
  return rows;
}

export function parseNominationDataRow(config, item) {
  if (config.mode === 'stellar') {
    return withStellarPromotionState({
      columns: [item.date || '', item.event || '', item.name || '', item.ip || '', item.cv || '', item.votes ?? '', item.name_en || '', item.auto_promoted ? 'True' : '', item.avatar || ''],
      votes: parseVoteValue(item.votes),
      sourceRank: item.rank ?? null
    }, config);
  }

  return {
    columns: [item.date || '', item.event || '', item.name || '', item.ip || '', item.cv || '', item.votes ?? '', item.name_en || '', item.is_advanced ? 'True' : '', item.avatar || '', item.rank ?? ''],
    votes: parseVoteValue(item.votes),
    rank: parseVoteValue(item.rank),
    isAutoPromoted: false,
    isPromoted: item.is_advanced === true
  };
}

export function parseNominationCsvRow(config, line) {
  const columns = line.split(',').map((col) => col.trim());

  if (config.mode === 'stellar') {
    return withStellarPromotionState({ columns, name: columns[2], votes: parseVoteValue(columns[5]), sourceRank: columns[6] === '' ? null : Number.parseInt(columns[6], 10) }, config);
  }

  return {
    columns,
    votes: parseVoteValue(columns[5]),
    rank: parseVoteValue(columns[9]),
    isAutoPromoted: false,
    isPromoted: columns[7] === 'True'
  };
}

export function normalizeNominationVisualizationRows(config, rawData) {
  const sourceRows = Array.isArray(rawData?.data) ? rawData.data : [];

  if (config.mode === 'stellar') {
    const rows = sourceRows
      .map((item) => withStellarPromotionState({ ...item, votes: parseVoteValue(item.votes), sourceRank: item.rank ?? null }, config))
      .filter((item) => !item.isAutoPromoted && item.votes > 0)
      .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, 'zh-CN'));

    return buildStellarDisplayRows(rows);
  }

  return sourceRows
    .map((item) => ({
      ...item,
      votes: parseVoteValue(item.votes),
      sourceRank: item.rank ?? null,
      rank: parseVoteValue(item.rank),
      isAutoPromoted: false,
      isPromoted: item.is_advanced === true
    }))
    .filter((item) => item.votes > 0)
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.votes - a.votes));
}
