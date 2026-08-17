import { ROUND_NAME_MAP } from '../utils/roundNameMap.js';

export function normalizeRoundNames() {
    setTimeout(() => {
        $('.current-match-info .match-name').each(function() {
            const $this = $(this);
            const originalText = $this.text();
            const rescheduledMark = originalText.includes('(重赛)') ? ' (重赛)' : '';
            const newText = ROUND_NAME_MAP[originalText.replace(rescheduledMark, '')] || originalText;
            $this.text(newText + rescheduledMark);
        });

        $('.round-item .round-title').each(function() {
            const $this = $(this);
            const originalText = $this.text();
            const rescheduledMark = originalText.includes('(重赛)') ? ' (重赛)' : '';
            const newText = ROUND_NAME_MAP[originalText.replace(rescheduledMark, '')] || originalText;
            $this.text(newText + rescheduledMark);
        });

        $('*').filter(function() {
            return $(this).text().includes('预选赛第') ||
                ($(this).attr('data-match-title') && $(this).attr('data-match-title').includes('预选赛第'));
        }).each(function() {
            const $this = $(this);
            const originalText = $this.text();
            const originalTitle = $this.attr('data-match-title');

            if (originalText && ROUND_NAME_MAP[originalText]) {
                $this.text(ROUND_NAME_MAP[originalText]);
            }

            if (originalTitle && ROUND_NAME_MAP[originalTitle]) {
                $this.attr('data-match-title', ROUND_NAME_MAP[originalTitle]);
            }
        });
    }, 1000);
}
