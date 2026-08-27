export const SCROLL_POSITION_KEY = 'events_scroll_position';
export const RETURN_FROM_KEY = 'return_from_event';

export const templates = {
    eventsPage: document.getElementById('events-page-template'),
    eventCard: document.getElementById('event-card-template'),
    monthSection: document.getElementById('month-section-template'),
    dateSection: document.getElementById('date-section-template'),
    phaseSection: document.getElementById('phase-section-template'),
    groupSection: document.getElementById('group-section-template'),
    elevatorNav: document.getElementById('elevator-nav-template'),
    elevatorNavGroup: document.getElementById('elevator-nav-group-template'),
    eventCardBody: document.getElementById('event-card-body-template'),
    topCharacterItem: document.getElementById('top-character-item-template'),
    infoRow: document.getElementById('info-row-template'),
    postponeHint: document.getElementById('postpone-hint-template')
};

export const NAVIGATION_GROUPS = [
    {
        target: 'nomination',
        label: '主赛事提名阶段',
        items: [
            { target: 'stellar-nomination', label: '恒星组提名' },
            { target: 'nova-nomination', label: '新星组提名' }
        ]
    },
    { target: 'preliminary', label: '预选赛阶段', roundPrefix: 'preliminary-', roundLabel: '预选赛第', rounds: 6 },
    { target: 'phase-1', label: '第一阶段', roundPrefix: 'phase-1-', roundLabel: '第', rounds: 6 },
    { target: 'phase-2', label: '第二阶段', roundPrefix: 'phase-2-', roundLabel: '第', rounds: 6 },
    { target: 'phase-3', label: '第三阶段', roundPrefix: 'phase-3-', roundLabel: '第', rounds: 6 },
    { target: 'phase-4', label: '第四阶段', roundPrefix: 'phase-4-', roundLabel: '第', rounds: 6 },
    { target: 'knockout', label: '淘汰赛阶段', roundPrefix: 'knockout-', roundLabel: '第', rounds: 9 }
];

export const TITLE_MAPPING = {
    '预选赛第一轮': [
        { title: '恒星女子组', format: '赞成投票制', description: 'A组' },
        { title: '恒星男子组', format: '赞成投票制', description: 'A组' }
    ],
    '预选赛第二轮': [
        { title: '恒星女子组', format: '赞成投票制', description: 'B组' },
        { title: '恒星男子组', format: '赞成投票制', description: 'B组' }
    ]
};

export const PHASE_NAME_TARGETS = {
    '主赛事提名阶段': 'nomination',
    '预选赛阶段': 'preliminary',
    '第一阶段': 'phase-1',
    '第二阶段': 'phase-2',
    '第三阶段': 'phase-3',
    '第四阶段': 'phase-4',
    '淘汰赛阶段': 'knockout'
};

export const CHINESE_ROUND_NUMBERS = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9
};
