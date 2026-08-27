import { smoothScrollTo as scrollWindowTo } from '../common/dom.js';

let eventsData;
let nav;

const templates = {
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

// 添加常量
const SCROLL_POSITION_KEY = 'events_scroll_position';
const RETURN_FROM_KEY = 'return_from_event';

const NAVIGATION_GROUPS = [
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
const TITLE_MAPPING = {
    '预选赛第一轮': [
        { 
            title: '恒星女子组', 
            format: '赞成投票制',
            description: 'A组'
        }, 
        { 
            title: '恒星男子组', 
            format: '赞成投票制',
            description: 'A组'
        }
    ],
    '预选赛第二轮': [
        { 
            title: '恒星女子组', 
            format: '赞成投票制',
            description: 'B组'
        }, 
        { 
            title: '恒星男子组', 
            format: '赞成投票制',
            description: 'B组'
        }
    ]
};

function createElevatorNavigation() {
    const navigation = templates.elevatorNav.content.cloneNode(true).firstElementChild;
    const list = navigation.querySelector('.elevator-nav-list');

    NAVIGATION_GROUPS.forEach(groupConfig => {
        const group = templates.elevatorNavGroup.content.cloneNode(true).firstElementChild;
        const mainItem = group.querySelector('.elevator-nav-item');
        const label = group.querySelector('.nav-label');
        const toggle = group.querySelector('.collapse-toggle');
        const subItems = group.querySelector('.nav-sub-items');

        mainItem.dataset.target = groupConfig.target;
        label.textContent = groupConfig.label;
        toggle.setAttribute('aria-label', `展开或折叠${groupConfig.label}`);

        const items = groupConfig.items || Array.from({ length: groupConfig.rounds }, (_, index) => ({
            target: `${groupConfig.roundPrefix}${index + 1}`,
            label: `${groupConfig.roundLabel}${toChineseNumber(index + 1)}轮`
        }));
        items.forEach(itemConfig => {
            const item = document.createElement('div');
            item.className = 'elevator-nav-item sub-item';
            item.dataset.target = itemConfig.target;
            item.textContent = itemConfig.label;
            subItems.appendChild(item);
        });

        list.appendChild(group);
    });

    return navigation;
}


function findNextEventStartTime(data) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    let nextStartTime = null;
    
    // 遍历所有月份和事件，找到最近的未开始的比赛
    for (const [monthKey, month] of Object.entries(data.months)) {
        month.events.forEach(event => {
            // 根据是否重赛选择开始日期
            const startDate = event.dateRange.isRescheduled && event.dateRange.Restart
                ? new Date(event.dateRange.Restart)
                : new Date(event.dateRange.start);
            
            startDate.setHours(0, 0, 0, 0);
            
            if (startDate > now) {
                if (!nextStartTime || startDate < nextStartTime) {
                    nextStartTime = startDate;
                }
            }
        });
    }
    
    return nextStartTime;
}

function getEventStatus(event, nextEventStartTime) {
    if (event.status === 'postponed') {
        return 'postponed';
    }
    
    const now = new Date();
    
    // 根据是否重赛选择开始和结束日期
    const startDate = event.dateRange.isRescheduled && event.dateRange.Restart
        ? new Date(event.dateRange.Restart)
        : new Date(event.dateRange.start);
    
    const endDate = event.dateRange.isRescheduled && event.dateRange.Reend
        ? new Date(event.dateRange.Reend)
        : new Date(event.dateRange.end);
    
    // 设置时间为当天开始和结束
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    now.setHours(0, 0, 0, 0);
    
    if (now > endDate) {
        return 'completed';
    } else if (now >= startDate && now <= endDate) {
        return 'ongoing';
    } else if (startDate.getTime() === nextEventStartTime?.getTime()) {
        return 'upcoming';
    } else {
        return 'notstarted';
    }
}

const PHASE_NAME_TARGETS = {
    '主赛事提名阶段': 'nomination',
    '预选赛阶段': 'preliminary',
    '第一阶段': 'phase-1',
    '第二阶段': 'phase-2',
    '第三阶段': 'phase-3',
    '第四阶段': 'phase-4',
    '淘汰赛阶段': 'knockout'
};

const CHINESE_ROUND_NUMBERS = {
    '一': 1,
    '二': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9
};

function getPhaseTargetId(phaseName) {
    return PHASE_NAME_TARGETS[phaseName] ?? null;
}

function getRoundNumber(title) {
    const round = title.match(/第([一二三四五六七八九])轮/)?.[1];
    return round ? CHINESE_ROUND_NUMBERS[round] : null;
}

function getMatchTargetId(match) {
    if (match.title.includes('恒星组提名')) return 'stellar-nomination';
    if (match.title.includes('新星组') && match.title.includes('提名')) return 'nova-nomination';

    const phaseTarget = getPhaseTargetId(match.phase);
    const round = getRoundNumber(match.title);
    if (!phaseTarget || !round) return '';
    return `${phaseTarget}-${round}`;
}

function getDocumentTop(element) {
    return element.getBoundingClientRect().top + window.scrollY;
}

function syncNavigationTargets() {
    nav.querySelectorAll('.elevator-nav-item[data-target]').forEach(item => {
        item.hidden = !document.querySelector(`[data-phase="${item.dataset.target}"]`);
    });
}

// 修改链接点击事件
function withFromParam(url, from) {
    if (!url) return '#';
    const [base, hash = ''] = url.split('#');
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}from=${encodeURIComponent(from)}${hash ? `#${hash}` : ''}`;
}

function createEventLink(url, className, text, disabled = false) {
    const element = document.createElement(disabled ? 'span' : 'a');
    element.className = `event-link ${className}${disabled ? ' disabled-link' : ''}`;
    element.textContent = text;
    if (!disabled) {
        element.href = withFromParam(url, 'events-data');
        element.addEventListener('click', () => savePosition(className.includes('visualization') ? 'visualization' : 'table'));
    }
    return element;
}

function getEventLinks(match, status) {
    const fragment = document.createDocumentFragment();
    if (match.links && status === 'completed') {
        fragment.appendChild(createEventLink(match.links.visualization, 'visualization-link', '数据可视化'));
        fragment.appendChild(createEventLink(match.links.table, 'table-link', '查看表格'));
        return fragment;
    }
    fragment.appendChild(createEventLink('', 'visualization-link', '数据可视化', true));
    fragment.appendChild(createEventLink('', 'table-link', '查看表格', true));
    return fragment;
}

// 保存位置
function savePosition(from) {
    const currentPosition = window.scrollY;
    sessionStorage.setItem(SCROLL_POSITION_KEY, currentPosition.toString());
    sessionStorage.setItem(RETURN_FROM_KEY, from);
}

function createInfoRow(wrapperClass, keyText, valueText) {
    const wrapper = templates.infoRow.content.cloneNode(true).firstElementChild;
    wrapper.className = wrapperClass;
    wrapper.querySelector('.key').textContent = keyText;
    wrapper.querySelector('.value').textContent = valueText;
    return wrapper;
}

function createTopCharacterItem(item, index, topFiveData, charactersData) {
    const characterKey = `${item.name}@${item.ip}`;
    const characterData = charactersData[characterKey];
    const row = templates.topCharacterItem.content.cloneNode(true).firstElementChild;
    const avatar = row.querySelector('.character-avatar');
    const image = row.querySelector('img');
    const name = row.querySelector('.name');
    const diff = row.querySelector('.votes-diff');

    if (characterData?.avatar) {
        image.src = characterData.avatar;
        image.alt = item.name;
    } else {
        avatar.hidden = true;
    }

    row.querySelector('.rank').textContent = String(index + 1);
    name.textContent = item.name;
    const ip = document.createElement('span');
    ip.className = 'ip';
    ip.textContent = `@${characterData?.ip || item.ip}`;
    name.appendChild(ip);
    row.querySelector('.votes').textContent = `${item.votes}票`;

    if (index > 0) {
        diff.textContent = `↓${topFiveData[index - 1].votes - item.votes}`;
    } else {
        diff.hidden = true;
    }

    return row;
}

function createEventCardBody(match, status, topFiveData, charactersData) {
    const body = templates.eventCardBody.content.cloneNode(true).firstElementChild;
    const header = body.querySelector('.event-header');
    const info = body.querySelector('.event-info');
    const title = body.querySelector('.event-title');
    const description = body.querySelector('.event-content');
    const topCharacters = body.querySelector('.top-characters');
    const footer = body.querySelector('.event-footer');

    title.textContent = match.title;
    description.hidden = !match.details?.qualified?.description;
    if (!description.hidden) {
        description.textContent = match.details.qualified.description;
    }

    if (match.format) {
        info.appendChild(createInfoRow('voting-format-wrapper', '投票制度：', match.format));
    }
    if (match.resultDate) {
        info.appendChild(createInfoRow('result-date-wrapper', '出结果日：', formatDateTime(match.resultDate)));
    }
    if (status === 'postponed') {
        header.appendChild(templates.postponeHint.content.cloneNode(true));
    }

    if (topFiveData?.length) {
        const list = topCharacters.querySelector('.character-list');
        topFiveData.forEach((item, index) => {
            list.appendChild(createTopCharacterItem(item, index, topFiveData, charactersData));
        });
    } else {
        topCharacters.hidden = true;
    }

    footer.appendChild(getEventLinks(match, status));
    return body;
}

function getCurrentPhase(eventsData) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    for (const month of Object.values(eventsData.months)) {
        for (const event of month.events) {
            const startDate = event.dateRange.isRescheduled && event.dateRange.Restart
                ? new Date(event.dateRange.Restart)
                : new Date(event.dateRange.start);
            
            const endDate = event.dateRange.isRescheduled && event.dateRange.Reend
                ? new Date(event.dateRange.Reend)
                : new Date(event.dateRange.end);
            
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            
            if (now >= startDate && now <= endDate) {
                const match = event.matches[0];
                if (match.phase) {
                    return match.phase;
                }
            }
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const [data, rankingData, charactersData] = await Promise.all([
            fetch("data/config/events.json").then(r => r.json()),
            fetch("data/votes/top5-rankings.json").then(r => r.json()),
            fetch("data/characters/base/characters-data.json").then(r => r.json())
        ]);
        eventsData = data;
        
        // 获取 hash
        const hash = window.location.hash.slice(1);
        
        window.createEventCard = function(event, match, nextEventStartTime) {
            const card = templates.eventCard.content.cloneNode(true).querySelector('.event-card');
            const status = getEventStatus(event, nextEventStartTime);
            const topFiveData = rankingData?.[match.title]?.top5;
            card.replaceChildren(createEventCardBody(match, status, topFiveData, charactersData));
            return card;
        }
        
        const container = document.querySelector('.container');
        const pageContent = templates.eventsPage.content.cloneNode(true).firstElementChild;
        container.replaceChildren(pageContent);
        
        // 添加电梯导航
        nav = createElevatorNavigation();
        
        // 获取当前阶段
        const currentPhase = getCurrentPhase(eventsData);
        
        // 初始化导航栏状态
        nav.querySelectorAll('.elevator-nav-group').forEach(group => {
            const mainItem = group.querySelector('.elevator-nav-item');
            const phase = mainItem.textContent.trim();
            
            // 默认折叠所有组
            group.classList.add('collapsed');
            const icon = group.querySelector('.collapse-icon');
            if (icon) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            }
            
            // 如果是当前阶段，则展开
            if (currentPhase && phase.includes(currentPhase)) {
                group.classList.remove('collapsed');
                if (icon) {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
                }
            }
        });
        
        nav.addEventListener('click', (e) => {
            const toggle = e.target.closest('.collapse-toggle');
            if (toggle && nav.contains(toggle)) {
                e.preventDefault();
                e.stopPropagation();
                const group = toggle.closest('.elevator-nav-group');
                const icon = toggle.querySelector('.collapse-icon');
                group.classList.toggle('collapsed');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-right');
                nav.querySelectorAll('.elevator-nav-group').forEach(otherGroup => {
                    if (otherGroup !== group && !otherGroup.classList.contains('collapsed')) {
                        otherGroup.classList.add('collapsed');
                        const otherIcon = otherGroup.querySelector('.collapse-icon');
                        otherIcon?.classList.remove('fa-chevron-down');
                        otherIcon?.classList.add('fa-chevron-right');
                    }
                });
                return;
            }

            const item = e.target.closest('.elevator-nav-item');
            if (!item || !nav.contains(item)) return;

            const targetId = item.dataset.target;
            const targetElement = document.querySelector(`[data-phase="${targetId}"]`);
            if (!targetElement) {
                return;
            }
            e.preventDefault();
            scrollWindowTo(getDocumentTop(targetElement) - 80);
            history.pushState(null, '', `./pages/events-data/events-data.html#${targetId}`);
            updateNavActiveState(targetId);
        });

        
        document.body.appendChild(nav);
        
        const eventsContainer = container.querySelector('.events-container');
        const nextEventStartTime = findNextEventStartTime(eventsData);
        const monthFragment = document.createDocumentFragment();
        
        for (const [monthKey, month] of Object.entries(eventsData.months)) {
            const monthSection = createMonthSection(month, nextEventStartTime);
            monthFragment.appendChild(monthSection);
        }
        eventsContainer.appendChild(monthFragment);
        syncNavigationTargets();

        // 在页面加载时检查
        const returnFrom = sessionStorage.getItem(RETURN_FROM_KEY);
        const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
        
        if (returnFrom && savedPosition) {
            setTimeout(() => {
                const targetPosition = parseInt(savedPosition);
                scrollWindowTo(targetPosition);
                
                // 清理存储
                sessionStorage.removeItem(SCROLL_POSITION_KEY);
                sessionStorage.removeItem(RETURN_FROM_KEY);
            }, 100);
        }

        // 更新导航激活状态
        if (hash) {
            updateNavActiveState(hash);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

function createMonthSection(month, nextEventStartTime) {
    const section = templates.monthSection.content.cloneNode(true).querySelector('.month-section');
    const title = section.querySelector('.month-title');
    const grid = section.querySelector('.events-grid');
    const eventsByDate = groupEventsByStructure(month.events);
    
    title.textContent = month.title;
    
    // 按日期顺序创建日期区块
    const dateFragment = document.createDocumentFragment();
    Object.keys(eventsByDate).sort((a, b) => {
        const dateA = new Date(eventsByDate[a].date);
        const dateB = new Date(eventsByDate[b].date);
        return dateA - dateB;
    }).forEach(dateKey => {
        const dateGroup = eventsByDate[dateKey];
        const dateSection = createDateSection(dateKey, dateGroup, nextEventStartTime);
        dateFragment.appendChild(dateSection);
    });
    grid.appendChild(dateFragment);
    
    return section;
}

function groupEventsByStructure(events) {
    const structure = {};
    const processedEvents = new Set();
    
    events.forEach(event => {
        // 根据是否重赛选择开始日期
        const startDate = event.dateRange.isRescheduled && event.dateRange.Restart
            ? new Date(event.dateRange.Restart)
            : new Date(event.dateRange.start);
        
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const dateKey = `${month}.${day}`;
        
        if (!structure[dateKey]) {
            structure[dateKey] = {
                date: event.dateRange.isRescheduled && event.dateRange.Restart 
                    ? event.dateRange.Restart 
                    : event.dateRange.start,
                phases: {}
            };
        }
        
        event.matches.forEach(match => {
            // 使用重赛日期或原始日期创建唯一标识
            const eventId = `${
                event.dateRange.isRescheduled && event.dateRange.Restart 
                    ? event.dateRange.Restart 
                    : event.dateRange.start
            }-${match.title}`;
            
            if (processedEvents.has(eventId)) return;
            processedEvents.add(eventId);
            
            const phase = match.phase;
            if (!structure[dateKey].phases[phase]) {
                structure[dateKey].phases[phase] = {
                    groups: {}
                };
            }
            
            const phaseId = getMatchTargetId(match);

            // 保留原有的分组逻辑
            let mainGroup;
            if (match.title.includes('预选赛')) {
                const roundMatch = match.title.match(/第([一二三四五六])轮/);
                if (roundMatch) {
                    mainGroup = `预选赛${roundMatch[0]}`;
                } else {
                    mainGroup = match.title;
                }
            } else {
                mainGroup = match.title.includes('恒星组') ? '恒星组提名' : 
                          match.title.includes('新星组') ? '新星组提名' : '其他';
            }
            
            if (!structure[dateKey].phases[phase].groups[mainGroup]) {
                structure[dateKey].phases[phase].groups[mainGroup] = [];
            }
            
            structure[dateKey].phases[phase].groups[mainGroup].push({
                event,
                match,
                phaseId 
            });
        });
    });
    
    return structure;
}

function createDateSection(date, dateGroup, nextEventStartTime) {
    const dateSection = templates.dateSection.content.cloneNode(true).querySelector('.date-section');
    const dateHeader = dateSection.querySelector('.date-header');
    
    dateHeader.textContent = date;
    
    const phaseFragment = document.createDocumentFragment();
    Object.entries(dateGroup.phases).forEach(([phaseName, phase]) => {
        const phaseSection = createPhaseSection(phaseName, phase, nextEventStartTime);
        phaseFragment.appendChild(phaseSection);
    });
    dateSection.appendChild(phaseFragment);
    
    return dateSection;
}

function createPhaseSection(phaseName, phase, nextEventStartTime) {
    const phaseSection = templates.phaseSection.content.cloneNode(true).querySelector('.phase-group');
    const phaseHeader = phaseSection.querySelector('.phase-header');
    const phaseContent = phaseSection.querySelector('.phase-content');
    
    const phaseTargetId = getPhaseTargetId(phaseName);
    if (phaseTargetId) {
        phaseSection.dataset.phase = phaseTargetId;
    }
    
    phaseSection.id = phaseName;
    phaseHeader.textContent = phaseName;
    
    const groupFragment = document.createDocumentFragment();
    Object.entries(phase.groups).forEach(([groupName, matches]) => {
        const finalGroupTitle = 
            TITLE_MAPPING[groupName]?.groupTitle || groupName;
        
        const modifiedMatches = matches.flatMap((eventMatch) => {
            const match = eventMatch.match;
            
            if (TITLE_MAPPING[match.title]) {
                return TITLE_MAPPING[match.title].map(item => ({
                    ...eventMatch,
                    match: {
                        ...match,
                        title: item.title,
                        format: item.format,
                        details: {
                            ...match.details,
                            qualified: {
                                description: item.description
                            }
                        }
                    }
                }));
            }
            
            return [eventMatch];
        });
        
        const groupSection = createGroupSection(finalGroupTitle, modifiedMatches, nextEventStartTime);
        groupFragment.appendChild(groupSection);
    });
    phaseContent.appendChild(groupFragment);
    
    phaseHeader.addEventListener('click', () => {
        phaseSection.classList.toggle('collapsed');
    });
    
    return phaseSection;
}

function createDateContent(event) {
    const fragment = document.createDocumentFragment();
    if (event.dateRange.isRescheduled) {
        fragment.appendChild(document.createTextNode(`原定：${formatDateTime(event.dateRange.start)} - ${formatDateTime(event.dateRange.end)}`));
        fragment.appendChild(document.createElement('br'));
        fragment.appendChild(document.createTextNode(`重赛：${formatDateTime(event.dateRange.Restart)} - ${formatDateTime(event.dateRange.Reend)}`));
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip-trigger';
        tooltip.textContent = '?';
        tooltip.dataset.title = event.dateRange.rescheduledReason;
        fragment.appendChild(document.createTextNode(' '));
        fragment.appendChild(tooltip);
    } else {
        fragment.appendChild(document.createTextNode(`${formatDateTime(event.dateRange.start)} - ${formatDateTime(event.dateRange.end)}`));
    }
    if (event.dateRange.result) {
        fragment.appendChild(document.createTextNode(` | 结果公布：${formatDateTime(event.dateRange.result, 'date')}`));
    }
    return fragment;
}

function createStatusInfo(status, stats) {
    const fragment = document.createDocumentFragment();
    if (status === 'postponed') {
        const wrapper = document.createElement('div');
        wrapper.className = 'status-wrapper';
        const statusLabel = document.createElement('span');
        statusLabel.className = 'event-status status-postponed';
        statusLabel.textContent = '已延期';
        const hint = document.createElement('div');
        hint.className = 'postpone-hint';
        const icon = document.createElement('i');
        icon.className = 'fas fa-question-circle';
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = '该赛事已延期，具体时间待定';
        hint.appendChild(icon);
        hint.appendChild(tooltip);
        wrapper.appendChild(statusLabel);
        wrapper.appendChild(hint);
        fragment.appendChild(wrapper);
    } else {
        const statusNode = document.createElement('span');
        statusNode.className = `event-status status-${status}`;
        statusNode.textContent = getStatusText(status);
        fragment.appendChild(statusNode);
    }
    if (stats) {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'event-stats';
        const item = document.createElement('span');
        item.className = 'stat-item';
        item.textContent = `总选票数: ${stats.votes.total}（有效：${stats.votes.valid}）`;
        statsContainer.appendChild(item);
        fragment.appendChild(statsContainer);
    }
    return fragment;
}

function createGroupSection(groupTitle, groupData, nextEventStartTime) {
    const section = templates.groupSection.content.cloneNode(true).querySelector('.group-section');
    const phaseId = groupData.find(item => item.phaseId)?.phaseId;
    if (phaseId) {
        section.dataset.phase = phaseId;
    }
    const titleEl = section.querySelector('.group-title');
    const dateEl = section.querySelector('.group-date');
    const statusInfo = section.querySelector('.status-info');
    const cardsContainer = section.querySelector('.cards-container');
    
    const firstEvent = groupData[0].event;
    const stats = firstEvent?.stats;
    const status = getEventStatus(firstEvent, nextEventStartTime);

    titleEl.textContent = groupTitle;
    dateEl.replaceChildren(createDateContent(firstEvent));
    statusInfo.replaceChildren(createStatusInfo(status, stats));

    cardsContainer.hidden = status !== 'completed';
    const cardsFragment = document.createDocumentFragment();
    groupData.forEach(data => {
        cardsFragment.appendChild(createEventCard(data.event, data.match, nextEventStartTime));
    });
    cardsContainer.appendChild(cardsFragment);
    
    return section;
}

function formatDateTime(date, format = 'full') {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const d = new Date(date);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekDay = weekDays[d.getDay()];
    
    if (format === 'date') {
        return `${year}-${month}-${day} (${weekDay})`;
    }
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} (${weekDay})`;
}

function formatEventTitle(title) {  
    // 只处理预选赛的标题
    if (title.includes('预选赛')) {
        if (title.includes('恒星组')) {
            return '恒星组';
        } else if (title.includes('新星组')) {
            return '新星组';
        }
    }
    return title;
}

function getStatusText(status) {
    const statusMap = {
        'completed': '已结束',
        'ongoing': '进行中',
        'upcoming': '即将开始',
        'notstarted': '未开始',
        'postponed': '已延期'  
    };
    return statusMap[status] || status;
}

function toChineseNumber(num) {
    const chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    return chineseNumbers[num];
}

// 更新导航激活状态
function updateNavActiveState(activeId) {
    nav.querySelectorAll('.elevator-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.target === activeId);
    });
}

// 滚动监听
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout(() => {
        const scrollPosition = window.scrollY + 100;
        
        // 找到当前可见的阶段
        const phases = document.querySelectorAll('[data-phase]');
        let currentPhase = null;
        let minDistance = Infinity;
        
        phases.forEach(phase => {
            const rect = phase.getBoundingClientRect();
            const distance = Math.abs(rect.top - 100);
            
            if (distance < minDistance) {
                minDistance = distance;
                currentPhase = phase.dataset.phase;
            }
        });
        
        // 更新导航栏状态
        if (currentPhase) {
            updateNavActiveState(currentPhase);
        }
    }, 100); // 100ms 的防抖
});

// 页面加载时检查 hash 并滚动
window.addEventListener('load', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
        const targetElement = document.querySelector(`[data-phase="${hash}"]`);
        if (targetElement) {
            setTimeout(() => {
                scrollWindowTo(getDocumentTop(targetElement) - 80);
                updateNavActiveState(targetElement.dataset.phase);
            }, 100);
        }
    }
});


