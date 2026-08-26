import { smoothScrollTo } from '../common/dom.js';

export class CharacterDetailScrollController {
    constructor({ reports, nav }) {
        this.reports = reports;
        this.nav = nav;
        this.cancelReportScroll = null;
        this.cancelNavScroll = null;
        this.scrollTimer = null;
    }

    smoothScroll(target, duration = 500) {
        if (typeof target !== 'number' || target < 0) {
            console.warn('Invalid scroll target:', target);
            return;
        }
        if (this.cancelReportScroll) this.cancelReportScroll();
        this.cancelReportScroll = smoothScrollTo(target, duration, this.reports);
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
        if (this.cancelNavScroll) this.cancelNavScroll();
        this.cancelNavScroll = smoothScrollTo(target, duration, this.nav);
    }

    destroy() {
        if (this.cancelReportScroll) this.cancelReportScroll();
        if (this.cancelNavScroll) this.cancelNavScroll();
        if (this.scrollTimer) cancelAnimationFrame(this.scrollTimer);
        this.reports = null;
        this.nav = null;
    }
}
