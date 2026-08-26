import { loadCharacterDetailData } from './character-detail-data.js';
import { StageHandlerFactory } from './character-detail-stage-handlers.js';
import { collectCharacterDetailView, renderCharacterInfo as renderCharacterInfoView, setPageLoaded } from './character-detail-view.js';
import { CharacterDetailScrollController } from './character-detail-scroll.js';
import { ErrorToast } from './character-detail-toast.js';
import { renderEventReports, renderEventNavigation } from './character-detail-reports.js';
import { setupCharacterNavigation } from './character-detail-navigation.js';

class CharacterDetail {
    constructor() {
        const params = new URLSearchParams(window.location.search);
        this.characterId = params.get('id');
        this.fromNav = params.get('from') === 'characters-data';
        
        this.characterData = null;
        this.eventData = null;
        this.allCharacters = null;  
        
        const view = collectCharacterDetailView();
        this.templates = view.templates;
        this.containers = view.containers;
        this.infoElements = view.infoElements;
        this.toast = new ErrorToast(this.templates.errorToast);
        this.scrollController = new CharacterDetailScrollController({
            reports: this.containers.reports,
            nav: this.containers.nav
        });
        this.SCROLL_POSITION_KEY = 'character_detail_scroll_position';
        
        // 添加返回按钮
        this.addBackButton();
        this.bindEvents();
    }
    
    addBackButton() {
        const backBtn = this.templates.backBtn.content.cloneNode(true).querySelector('.back-btn');
        backBtn.addEventListener('click', () => {
            sessionStorage.setItem(this.SCROLL_POSITION_KEY, this.containers.reports.scrollTop);
            window.location.href = 'pages/characters-data/characters-data.html';
        });
        
        this.containers.info.insertBefore(backBtn, this.containers.info.firstChild);
    }
    
    async init() {
        if (!this.characterId) {
            console.error('未指定角色ID');
            return;
        }
        
        let loadingContainer;
        if (!this.fromNav) {
            loadingContainer = this.templates.loadingContainer.content.cloneNode(true).querySelector('.loading-container');
            document.body.appendChild(loadingContainer);
            
            requestAnimationFrame(() => {
                loadingContainer.style.opacity = '1';
            });
        }
        
        try {
            await this.loadData();
            this.renderCharacterInfo();
            this.renderEventReports();
            this.setupNavigation();
            this.setupCharacterNav();
            
            setPageLoaded();
            
            const savedPosition = sessionStorage.getItem(this.SCROLL_POSITION_KEY);
            if (savedPosition) {
                this.smoothScroll(parseInt(savedPosition), 800);
                sessionStorage.removeItem(this.SCROLL_POSITION_KEY);
            }
        } catch (error) {
            console.error('初始化失败:', error);
        } finally {
            if (loadingContainer) {
                loadingContainer.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(loadingContainer);
                }, 300);
            }
        }
    }
    
    async loadData() {
        try {
            const data = await loadCharacterDetailData(this.characterId);
            Object.assign(this, data);
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('数据加载失败，请稍后重试');
            throw error;
        }
    }
    
    renderCharacterInfo() {
        renderCharacterInfoView({ infoElements: this.infoElements }, this.characterData);
    }
    
    showError(message) {
        this.toast.show(message);
    }

    renderEventReports() {
        renderEventReports(this.eventData, {
            templates: this.templates,
            reports: this.containers.reports,
            rulesData: this.rulesData,
            stageContext: {
                stages: this.configData.stages,
                characterId: this.characterId,
                charactersData: this.allCharacters
            },
            stageHandlerFactory: (round, context) => StageHandlerFactory.getHandler(round, context),
            onScroll: () => this.handleScroll(),
            onSmoothScroll: (target, duration) => this.smoothScroll(target, duration)
        });
    }
    
    setupNavigation() {
        renderEventNavigation(this.eventData, {
            templates: this.templates,
            nav: this.containers.nav
        });
    }
    
    smoothScroll(target, duration = 500) {
        this.scrollController.smoothScroll(target, duration);
    }
    
    bindEvents() {
        // 监听滚动事件
        this.containers.reports.addEventListener('scroll', (e) => {
            this.handleScroll(e);
        });
        
        // 监听导航点击
        this.containers.nav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // 更新激活状态
            this.containers.nav.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            link.parentElement.classList.add('active');
            
            // 平滑滚动到目标位置
            const targetId = link.dataset.target;
            const target = document.getElementById(targetId);
            if (target) {
                // 计算目标滚动位置
                const targetRect = target.getBoundingClientRect();
                const containerRect = this.containers.reports.getBoundingClientRect();
                const targetTop = this.containers.reports.scrollTop + targetRect.top - containerRect.top;
                this.smoothScroll(targetTop);
            }
        });
    }
    
    handleScroll(e) {
        this.scrollController.handleScroll(e);
    }
    
    destroy() {
        this.scrollController.destroy();
        this.toast.destroy();
        this.templates = null;
        this.infoElements = null;
    }

    smoothScrollNav(target, duration = 300) {
        this.scrollController.smoothScrollNav(target, duration);
    }

    setupCharacterNav() {
        setupCharacterNavigation({
            filters: document.querySelector('.nav-filters'),
            list: document.querySelector('.characters-list'),
            templates: this.templates,
            characterId: this.characterId,
            characterData: this.characterData,
            eventData: this.eventData,
            allCharacters: this.allCharacters,
            onNavigate: id => {
                sessionStorage.setItem(this.SCROLL_POSITION_KEY, this.containers.reports.scrollTop);
                window.location.href = `pages/characters-data/character-detail.html?id=${encodeURIComponent(id)}&from=characters-data`;
            }
        });
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    const detail = new CharacterDetail();
    detail.init();
});
