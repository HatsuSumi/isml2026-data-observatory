export const SERIES_ALIASES = {
    '我的青春恋爱物语果然有问题。': ['春物', '俺ガイル', '果青'],
    '孤独摇滚！': ['孤独摇滚', '孤独のロック', '孤独摇滚'],
    'NO GAME NO LIFE 游戏人生': ['游戏人生', 'NGNL', 'no game no life'],
    '魔法禁书目录': ['魔禁', '魔法禁书目录'],
    '约会大作战': ['约战', 'DAL'],
    '为美好的世界献上祝福！': ['为美好的世界献上祝福', '为美好世界献上祝福', '这美好世界', '素晴', 'konosuba'],
    '刀剑神域': ['刀剑', 'SAO', '桐人', '亚丝娜'],
    '进击的巨人': ['巨人', 'AOT'],
    '辉夜大小姐想让我告白~天才们的恋爱头脑战~': ['辉夜', '辉夜大小姐'],
    '欢迎来到实力至上主义的教室': ['实教'],
    '末日时在做什么？有没有空？可以来拯救吗？': ['末日三问'],
    'Re:从零开始的异世界生活': ['Re0', 'Re:从零开始'],
    '【我推的孩子】': ['推子'],
    '在地下城寻求邂逅是否搞错了什么': ['地错'],
    '魔法少女小圆': ['魔圆'],
    '吹响！上低音号': ['京吹'],
    '紫罗兰永恒花园': ['京紫'],
    '青春猪头少年': ['青春猪头少年系列', '青猪', '青猪系列'],
    'GIRLS BAND CRY': ['少女乐队的呐喊', 'GBC'],
    'Summer Pockets': ['夏日口袋']
};

function buildNominationUrls(id) {
    return {
        visualization: `pages/visualization/visualization.html?id=${id}`,
        table: `pages/tables/nomination-table.html?id=${id}`
    };
}

function buildPreliminaryUrls(id) {
    return {
        visualization: `pages/visualization/visualization.html?id=${id}`,
        table: `pages/tables/preliminaries-table.html?id=${id}`
    };
}

export const EVENT_DEFINITIONS = [
    {
        id: '01-stellar-female-nomination',
        name: '恒星组提名-女性组别',
        phase: 'nomination',
        urls: buildNominationUrls('01-stellar-female-nomination')
    },
    {
        id: '02-stellar-male-nomination',
        name: '恒星组提名-男性组别',
        phase: 'nomination',
        urls: buildNominationUrls('02-stellar-male-nomination')
    },
    {
        id: '03-nova-winter-female-nomination',
        name: '新星组冬季赛提名-女性组别',
        phase: 'nomination',
        urls: buildNominationUrls('03-nova-winter-female-nomination')
    },
    {
        id: '04-nova-winter-male-nomination',
        name: '新星组冬季赛提名-男性组别',
        phase: 'nomination',
        urls: buildNominationUrls('04-nova-winter-male-nomination')
    },
    {
        id: '05-nova-spring-female-nomination',
        name: '新星组春季赛提名-女性组别',
        phase: 'nomination',
        urls: buildNominationUrls('05-nova-spring-female-nomination')
    },
    {
        id: '06-nova-spring-male-nomination',
        name: '新星组春季赛提名-男性组别',
        phase: 'nomination',
        urls: buildNominationUrls('06-nova-spring-male-nomination')
    },
    {
        id: '07-nova-summer-female-nomination',
        name: '新星组夏季赛提名-女性组别',
        phase: 'nomination',
        urls: buildNominationUrls('07-nova-summer-female-nomination')
    },
    {
        id: '08-nova-summer-male-nomination',
        name: '新星组夏季赛提名-男性组别',
        phase: 'nomination',
        urls: buildNominationUrls('08-nova-summer-male-nomination')
    },
    {
        id: '09-nova-autumn-female-nomination',
        name: '新星组秋季赛提名-女性组别',
        phase: 'nomination',
        urls: buildNominationUrls('09-nova-autumn-female-nomination')
    },
    {
        id: '10-nova-autumn-male-nomination',
        name: '新星组秋季赛提名-男性组别',
        phase: 'nomination',
        urls: buildNominationUrls('10-nova-autumn-male-nomination')
    },
    {
        id: 'preliminary-r01-stellar-female',
        name: '预选赛第一轮-女性组别',
        phase: 'preliminary',
        urls: buildPreliminaryUrls('preliminary-r01-stellar-female')
    },
    {
        id: 'preliminary-r01-stellar-male',
        name: '预选赛第一轮-男性组别',
        phase: 'preliminary',
        urls: buildPreliminaryUrls('preliminary-r01-stellar-male')
    }
];

export const EVENT_LINKS = EVENT_DEFINITIONS.reduce((links, event) => {
    links[event.id] = {
        name: event.name,
        phase: event.phase,
        pageType: 'visualization',
        url: event.urls.visualization,
        baseId: event.id
    };
    links[`${event.id}-table`] = {
        name: event.name,
        phase: event.phase,
        pageType: 'table',
        url: event.urls.table,
        baseId: event.id
    };
    return links;
}, {});
