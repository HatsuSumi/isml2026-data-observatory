class StageHandler {
    constructor({ participantId, charactersData, config = {} } = {}) {
        this.participantId = participantId;
        this.charactersData = charactersData;
        this.config = config;
        this.roundConfig = config.roundConfig;
        this.stageConfig = config.stageConfig;
    }

    getFields() {
        throw new Error('必须实现 getFields 方法');
    }

    getConfig() {
        throw new Error('必须实现 getConfig 方法');
    }
}

class NominationHandler extends StageHandler {
    getFields(round) {
        return {
            '提名时间': this.stageConfig?.['提名时间'],
            '被提名角色数': round['名次'] !== '自动晋级' ? this.roundConfig?.['被提名角色数'] : null,
            '提名票': round['提名票'],
            '名次': round['名次'],
            '结果': round['结果'],
            '上届世萌战绩': round['上届世萌战绩']
        };
    }

    getConfig(round, stages) {
        const gender = round.round.includes('女性') ? '女性组别' : '男性组别';
        if (round.round.includes('恒星组')) {
            return {
                roundConfig: stages['提名阶段']['恒星组'][gender],
                stageConfig: stages['提名阶段']['恒星组']
            };
        }

        const season = ['冬季赛', '春季赛', '夏季赛', '秋季赛']
            .find(item => round.round.includes(item)) || '冬季赛';
        return {
            roundConfig: stages['提名阶段']['新星组'][season][gender],
            stageConfig: stages['提名阶段']['新星组'][season]
        };
    }
}

class Phase1Handler extends StageHandler {
    getFields(round) {
        const event = String(round['赛事'] || '');
        if (event.includes('项链赛') || event.includes('垂饰赛')) {
            return {
                '赛事时间': this.roundConfig?.['赛事时间'],
                '赛制': round['赛制'],
                '赛事': round['赛事'],
                ...Object.fromEntries(round['轮次'].map(item => [`第${item.round}轮票数`, item.votes])),
                '最终排名': round['最终排名'],
                '最终结果': round['最终结果']
            };
        }
        if (event.includes('外卡赛')) {
            return {
                '赛事时间': this.roundConfig?.['赛事时间'],
                '赛制': round['赛制'],
                '赛事': round['赛事'],
                '得票数': round['轮次'][0]?.votes,
                '最终排名': round['最终排名'],
                '最终结果': round['最终结果']
            };
        }
        return {
            '赛事时间': this.roundConfig?.['赛事时间'],
            '小组': round['小组'],
            '种子': round['种子'],
            '组内名次': round['组内名次'],
            '票数': round['票数'],
            '全局名次': round['全局名次']
        };
    }

    getConfig(round, stages) {
        const characterData = this.charactersData?.[this.participantId];
        const gender = round.round.includes('女性')
            ? '女性组别'
            : round.round.includes('男性')
                ? '男性组别'
                : characterData?.rounds?.find((item) => item.round.includes('女性组别') || item.round.includes('男性组别'))?.round.includes('女性组别')
                    ? '女性组别'
                    : '男性组别';
        const roundMatch = round.round.match(/第一阶段第([一二三四五六])轮/);
        if (!roundMatch) {
            console.error('无法解析第一阶段轮次:', round.round);
            return { roundConfig: null, stageConfig: null };
        }
        const roundKey = `第${roundMatch[1]}轮`;
        const event = String(round['赛事'] || '');
        const eventGroup = event.includes('项链赛') || event.includes('垂饰赛') ? '项链赛' : event.includes('外卡赛') ? '外卡赛' : '恒星组';
        const stage = stages['第一阶段']?.[roundKey];
        if (!stage) {
            console.error(`未找到配置: 第一阶段 -> ${roundKey}`);
            return { roundConfig: null, stageConfig: null };
        }
        return {
            roundConfig: {
                ...stage[eventGroup]?.[gender],
                '赛事时间': stage['赛事时间']
            },
            stageConfig: stage
        };
    }
}

class PreliminariesHandler extends StageHandler {
    getFields(round) {
        return {
            '赛事时间': this.roundConfig?.['赛事时间'],
            '小组': round['小组'],
            '组内名次': round['组内名次'],
            '票数': round['票数'],
            '结果': round['结果'],
            '全局名次': round['全局名次']
        };
    }

    getConfig(round, stages) {
        const characterData = this.charactersData?.[this.participantId];
        if (!characterData?.rounds?.length) {
            console.error('无法获取角色数据:', { participantId: this.participantId });
            return { roundConfig: null, stageConfig: null };
        }

        const gender = characterData.rounds[0].round.includes('女性组别') ? '女性组别' : '男性组别';
        const roundMatch = round.round.match(/第([一二三四五六七八])轮/);
        if (!roundMatch) {
            console.error('无法解析轮次:', round.round);
            return { roundConfig: null, stageConfig: null };
        }

        const roundKey = `预选赛第${roundMatch[1]}轮`;
        const stage = stages['预选赛阶段']?.[roundKey];
        if (!stage) {
            console.error(`未找到配置: 预选赛阶段 -> ${roundKey}`);
            return { roundConfig: null, stageConfig: null };
        }

        const stageConfig = stage['恒星组'];
        if (!stageConfig) {
            console.error(`未找到恒星组配置: 预选赛阶段 -> ${roundKey} -> 恒星组`);
            return { roundConfig: null, stageConfig: null };
        }

        return {
            roundConfig: {
                ...stageConfig[gender],
                '赛事时间': stage['赛事时间']
            },
            stageConfig
        };
    }
}

export class StageHandlerFactory {
    static patterns = [
        { pattern: /恒星组提名/, handler: NominationHandler },
        { pattern: /新星组.*?[春夏秋冬]季赛提名/, handler: NominationHandler },
        { pattern: /第一阶段第[一二三四五六]轮(?:-(?:女性|男性)组别)?/, handler: Phase1Handler },
        { pattern: /预选赛第[一二三四五六七八]轮/, handler: PreliminariesHandler }
    ];

    static getHandler(round, { stages, participantId, charactersData }) {
        const match = this.patterns.find(({ pattern }) => pattern.test(round.round));
        if (!match) {
            throw new Error(`未找到对应的处理器: ${round.round}`);
        }

        const baseConfig = { participantId, charactersData };
        const initialHandler = new match.handler(baseConfig);
        const config = initialHandler.getConfig(round, stages);
        return new match.handler({ ...baseConfig, config });
    }
}
