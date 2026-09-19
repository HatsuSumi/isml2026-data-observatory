export const SERIES_ALIASES = {
    '我的青春恋爱物语果然有问题。': ['春物', '俺ガイル', '果青'],
    '孤独摇滚！': ['孤独摇滚', '孤独のロック'],
    'NO GAME NO LIFE 游戏人生': ['游戏人生', 'NGNL', 'no game no life'],
    '魔法禁书目录': ['魔禁'],
    '约会大作战': ['约战', 'DAL'],
    '为美好的世界献上祝福！': ['为美好的世界献上祝福', '为美好世界献上祝福', '这美好世界', '素晴', 'konosuba'],
    '刀剑神域': ['刀剑', 'SAO', '桐人', '亚丝娜'],
    '进击的巨人': ['巨人', 'AOT'],
    '辉夜大小姐想让我告白～天才们的恋爱头脑战～': ['辉夜大小姐想让我告白~天才们的恋爱头脑战~', '辉夜', '辉夜大小姐'],
    '欢迎来到实力至上主义的教室': ['实教'],
    '末日时在做什么？有没有空？可以来拯救吗？': ['末日三问'],
    'Re:从零开始的异世界生活': ['Re0', 'Re:从零开始'],
    '【我推的孩子】': ['推子'],
    '在地下城寻求邂逅是否搞错了什么': ['地错'],
    '魔法少女小圆': ['魔圆'],
    '吹响！上低音号': ['京吹'],
    '紫罗兰永恒花园': ['京紫'],
    '青春猪头少年系列': ['青春猪头少年', '青猪', '青猪系列'],
    '少女乐队的呐喊': ['GIRLS BAND CRY', 'GBC'],
    '百变的七仓同学': ['疑似后宫'],
    '反叛的鲁路修': ['Code Geass'],
    '治愈魔法的错误使用法': ['治愈魔法的错误使用法～奔赴战场的回复要员～'],
    'Summer Pockets': ['夏日口袋']
};

export function canonicalSeriesName(name) {
    const value = String(name ?? '').trim();
    if (!value) return value;
    if (Object.prototype.hasOwnProperty.call(SERIES_ALIASES, value)) return value;
    for (const [canonical, aliases] of Object.entries(SERIES_ALIASES)) {
        if (aliases.includes(value)) return canonical;
    }
    return value;
}

export function getSeriesNames(name) {
    const canonical = canonicalSeriesName(name);
    const aliases = SERIES_ALIASES[canonical] || [];
    return [canonical, ...aliases.filter(alias => alias !== canonical)];
}
