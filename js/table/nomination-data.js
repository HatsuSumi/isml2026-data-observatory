const AUTO_PROMOTION_VOTE = -1;

function parseVoteValue(value) {
  if (value === '-') return AUTO_PROMOTION_VOTE;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function withStellarPromotionState(row, config) {
  const isAutoPromoted = row.votes === AUTO_PROMOTION_VOTE;
  return {
    ...row,
    rank: null,
    isAutoPromoted,
    isPromoted: isAutoPromoted || row.votes >= config.promotionThreshold
  };
}

export function rankStellarRows(rows) {
  let currentRank = 1;
  let previousVotes = null;
  let skipCount = 0;

  return rows.map((row) => {
    if (previousVotes !== null && row.votes !== previousVotes) {
      currentRank += skipCount + 1;
      skipCount = 0;
    } else if (previousVotes !== null) {
      skipCount += 1;
    }

    previousVotes = row.votes;
    return { ...row, rank: currentRank };
  });
}

export function buildStellarDisplayRows(rows) {
  const autoRows = rows.filter((row) => row.isAutoPromoted).map((row) => ({ ...row, rank: null }));
  const rankedRows = rankStellarRows(rows.filter((row) => !row.isAutoPromoted));
  return [...autoRows, ...rankedRows];
}

export function parseNominationCsvRow(config, line) {
  const columns = line.split(',').map((col) => col.trim());

  if (config.mode === 'stellar') {
    return withStellarPromotionState({ columns, votes: parseVoteValue(columns[5]) }, config);
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
      .map((item) => withStellarPromotionState({ ...item, votes: parseVoteValue(item.votes) }, config))
      .filter((item) => !item.isAutoPromoted && item.votes > 0)
      .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, 'zh-CN'));

    return buildStellarDisplayRows(rows);
  }

  return sourceRows
    .map((item) => ({
      ...item,
      votes: parseVoteValue(item.votes),
      rank: parseVoteValue(item.rank),
      isAutoPromoted: false,
      isPromoted: item.is_advanced === true
    }))
    .filter((item) => item.votes > 0)
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.votes - a.votes));
}
