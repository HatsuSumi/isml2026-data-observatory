export class ErrorToast {
    constructor(template) {
        this.template = template;
        this.timer = null;
    }

    show(message) {
        document.querySelector('.error-toast')?.remove();
        if (this.timer) clearTimeout(this.timer);

        const toast = this.template.content.cloneNode(true).querySelector('.error-toast');
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));

        this.timer = setTimeout(() => {
            toast.classList.remove('visible');
            this.timer = setTimeout(() => {
                toast.remove();
                this.timer = null;
            }, 240);
        }, 2800);
    }

    destroy() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
    }
}
