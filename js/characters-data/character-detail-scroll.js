import { smoothScrollTo } from '../common/dom.js';

const NAVIGATION_DEBUG_PREFIX = '[CharacterDetailNav]';

function logNavigationDebug(event, details = {}) {
    console.debug(NAVIGATION_DEBUG_PREFIX, event, details);
}

export class CharacterDetailScrollController {
    constructor({ reports, nav }) {
        this.reports = reports;
        this.nav = nav;
        this.cancelReportScroll = null;
        this.cancelNavScroll = null;
        this.isProgrammaticReportScroll = false;
        this.pendingReportId = null;
        this.scrollTimer = null;
    }

    smoothScroll(target, duration = 500, activeReportId = null) {
        if (typeof target !== 'number' || target < 0) {
            console.warn('Invalid scroll target:', target);
            return;
        }
        logNavigationDebug('report-scroll-start', {
            activeReportId,
            requestedTarget: target,
            startScrollTop: this.reports.scrollTop,
            maxScrollTop: this.reports.scrollHeight - this.reports.clientHeight,
            duration
        });
        if (this.cancelReportScroll) this.cancelReportScroll();
        this.pendingReportId = activeReportId;
        this.isProgrammaticReportScroll = true;
        this.cancelReportScroll = smoothScrollTo(target, duration, this.reports, () => {
            this.isProgrammaticReportScroll = false;
            const reportId = this.pendingReportId;
            this.pendingReportId = null;
            logNavigationDebug('report-scroll-complete', {
                reportId,
                finalScrollTop: this.reports.scrollTop,
                maxScrollTop: this.reports.scrollHeight - this.reports.clientHeight
            });
            if (reportId) {
                this.setActiveReport(reportId, 'navigation-scroll-complete');
            } else {
                this.handleScroll();
            }
        });
    }

    setActiveReport(reportId, source = 'unknown') {
        const activeBefore = this.nav.querySelector('.nav-item.active a')?.dataset.target;
        logNavigationDebug('active-report-update', {
            source,
            reportId,
            activeBefore
        });
        this.nav.querySelectorAll('.nav-item').forEach(item => {
            const link = item.querySelector('a');
            item.classList.toggle('active', link.dataset.target === reportId);
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
    }

    handleScroll() {
        if (this.isProgrammaticReportScroll) return;
        if (this.scrollTimer) cancelAnimationFrame(this.scrollTimer);
        this.scrollTimer = requestAnimationFrame(() => {
            const reports = this.reports.querySelectorAll('.event-report');
            let currentReport = null;
            let closestDistance = Infinity;
            const scrollTop = this.reports.scrollTop;
            const activeLine = 0;

            for (const report of reports) {
                const reportTop = report.offsetTop - scrollTop;
                const distance = Math.abs(reportTop - activeLine);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    currentReport = report;
                }
            }

            if (!currentReport) return;
            logNavigationDebug('scroll-position-candidate', {
                scrollTop,
                currentReportId: currentReport.id,
                reports: Array.from(reports, report => ({
                    id: report.id,
                    top: report.offsetTop - scrollTop,
                    distance: Math.abs(report.offsetTop - scrollTop - activeLine)
                }))
            });
            this.setActiveReport(currentReport.id, 'scroll-position');
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
