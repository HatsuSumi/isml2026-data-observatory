import fs from 'node:fs';

const CONFIG = [
  {
    detailsPath: 'data/characters/characters-details.json',
    internalPath: 'data/internal/phase2/stellar/female/51-phase2-r06-necklace-female.json',
    publicPath: 'data/phase2/stellar/female/51-phase2-r06-necklace-female.json',
    roundLabel: '第二阶段第六轮',
    event: '女子黄玉项链赛',
    eventTime: '2026-10-23 20:00:00 - 2026-10-24 19:59:59'
  },
  {
    detailsPath: 'data/characters/characters-details.json',
    internalPath: 'data/internal/phase2/stellar/male/52-phase2-r06-necklace-male.json',
    publicPath: 'data/phase2/stellar/male/52-phase2-r06-necklace-male.json',
    roundLabel: '第二阶段第六轮',
    event: '男子黄玉垂饰赛',
    eventTime: '2026-10-23 20:00:00 - 2026-10-24 19:59:59'
  }
];

for (const config of CONFIG) {
  const details = JSON.parse(fs.readFileSync(config.detailsPath, 'utf8'));
  const internal = JSON.parse(fs.readFileSync(config.internalPath, 'utf8'));
  const publicData = JSON.parse(fs.readFileSync(config.publicPath, 'utf8'));

  const rankById = new Map(publicData.data.map(entry => [entry.participantId, entry]));
  const updated = new Set();

  for (const roundData of internal.data) {
    for (const contestant of roundData.contestants) {
      const character = details.characters[contestant.participantId];
      if (!character) throw new Error(`unknown participant: ${contestant.participantId}`);
      const entry = character.rounds.find(round => round.round === config.roundLabel);
      if (!entry) throw new Error(`missing ${config.roundLabel} slot for ${contestant.participantId}`);
      if (updated.has(contestant.participantId)) {
        entry.轮次.push({ round: roundData.round, votes: contestant.votes, status: contestant.status });
        continue;
      }

      entry.赛制 = '排序复选制';
      entry.轮次 = [{ round: roundData.round, votes: contestant.votes, status: contestant.status }];
      entry.赛事 = config.event;
      entry.赛事时间 = config.eventTime;

      updated.add(contestant.participantId);
    }
  }

  for (const participantId of updated) {
    const entry = details.characters[participantId].rounds.find(round => round.round === config.roundLabel);
    const info = rankById.get(participantId);
    entry.最终排名 = info.finalRank;
    entry.最终结果 = info.finalResult;
  }

  fs.writeFileSync(config.detailsPath, JSON.stringify(details, null, 2) + '\n');
  console.log(`${config.event}: updated ${updated.size} contestants -> ${[...updated].join(', ')}`);
}
