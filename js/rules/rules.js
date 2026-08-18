class Rules {
    constructor() {
        this.ruleId = new URLSearchParams(window.location.search).get('id');
        this.templates = {
            rulesList: document.getElementById('rules-list-template'),
            ruleItem: document.getElementById('rule-item-template'),
            rulesError: document.getElementById('rules-error-template')
        };
        this.containers = {
            content: document.querySelector('.rules-content'),
            title: document.querySelector('.rules-title')
        };

        document.querySelector('.back-btn').addEventListener('click', () => {
            window.history.back();
        });
    }

    async init() {
        try {
            await this.loadRules();
            this.renderRules();
            this.animateRules();
        } catch (error) {
            console.error('初始化规则页面失败:', error);
            this.showError('规则加载失败，请稍后重试');
        } finally {
            document.querySelector('.loading-container').style.display = 'none';
        }
    }

    async loadRules() {
        const response = await fetch("data/rules/rules.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.rulesData = await response.json();
    }

    renderRules() {
        const rule = this.rulesData[this.ruleId];
        if (!rule) {
            this.showError('未找到对应的规则内容');
            return;
        }

        this.containers.title.textContent = rule.title;

        const list = this.templates.rulesList.content.cloneNode(true).querySelector('.rules-list');
        Object.entries(rule.content).forEach(([number, text]) => {
            const item = this.templates.ruleItem.content.cloneNode(true).querySelector('li');
            item.textContent = text;
            list.appendChild(item);
        });

        this.containers.content.replaceChildren(list);
    }

    showError(message) {
        const errorEl = this.templates.rulesError.content.cloneNode(true).querySelector('.error-message');
        errorEl.textContent = message;
        this.containers.content.replaceChildren(errorEl);
    }

    animateRules() {
        const rules = this.containers.content.querySelectorAll('li');
        rules.forEach((rule, index) => {
            setTimeout(() => {
                rule.classList.add('slide-in');
            }, index * 100);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const rules = new Rules();
    rules.init();
});
