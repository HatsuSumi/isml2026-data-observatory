export class CharacterDetailScrollController {
    constructor({ reports, nav }) {
        this.reports = reports;
        this.nav = nav;
        this.scrollAnimation = null;
        this.navScrollAnimation = null;
    }

    smoothScroll(target, duration = 500) {
        if (typeof target !== 'number' || target < 0) {
            console.warn('Invalid scroll target:', target);
            return;
        }
        if (typeof duration !== 'number' || duration <= 0) duration = 500;
        if (this.scrollAnimation) cancelAnimationFrame(this.scrollAnimation);

        const start = this.reports.scrollTop;
        const distance = target - start;
        const startTime = performance.now();
        const easeOutCubic = value => 1 - Math.pow(1 - value, 3);
        const animate = currentTime => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            this.reports.scrollTop = start + distance * easeOutCubic(progress);
            if (progress < 1) this.scrollAnimation = requestAnimationFrame(animate);
        };
        this.scrollAnimation = requestAnimationFrame(animate);
    }

    handleScroll() {
        if (this.scrollTimer) cancelAnimationFrame(this.scrollTimer);
        this.scrollTimer = requestAnimationFrame(() => {
            const reports = this.reports.querySelectorAll('.event-report');
            let currentReport = null;
            const scrollTop = this.reports.scrollTop;
            const containerHeight = this.reports.clientHeight;
            const buffer = 100;

            for (const report of reports) {
                const reportTop = report.offsetTop - scrollTop;
                if (reportTop >= -buffer && reportTop <= containerHeight / 2) {
                    currentReport = report;
                    break;
                }
            }

            if (!currentReport) {
                for (const report of reports) {
                    const reportTop = report.offsetTop - scrollTop;
                    if (reportTop > -report.offsetHeight) {
                        currentReport = report;
                        break;
                    }
                }
            }

            if (!currentReport) return;
            const id = currentReport.id;
            this.nav.querySelectorAll('.nav-item').forEach(item => {
                const link = item.querySelector('a');
                item.classList.toggle('active', link.dataset.target === id);
            });

            const activeItem = this.nav.querySelector('.nav-item.active');
            if (!activeItem) return;
            const itemTop = activeItem.offsetTop;
            const containerScrollTop = this.nav.scrollTop;
            const navHeight = this.nav.clientHeight;
            if (itemTop < containerScrollTop || itemTop > containerScrollTop + navHeight) {
                const targetScroll = itemTop - navHeight / 2 + activeItem.offsetHeight / 2;
                this.smoothScrollNav(targetScroll);
            }
        });
    }

    smoothScrollNav(target, duration = 300) {
        if (this.navScrollAnimation) cancelAnimationFrame(this.navScrollAnimation);
        const start = this.nav.scrollTop;
        const distance = target - start;
        const startTime = performance.now();
        const easeOutCubic = value => 1 - Math.pow(1 - value, 3);
        const animate = currentTime => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            this.nav.scrollTop = start + distance * easeOutCubic(progress);
            if (progress < 1) this.navScrollAnimation = requestAnimationFrame(animate);
        };
        this.navScrollAnimation = requestAnimationFrame(animate);
    }

    destroy() {
        if (this.scrollAnimation) cancelAnimationFrame(this.scrollAnimation);
        if (this.navScrollAnimation) cancelAnimationFrame(this.navScrollAnimation);
        if (this.scrollTimer) cancelAnimationFrame(this.scrollTimer);
        this.reports = null;
        this.nav = null;
    }
}
