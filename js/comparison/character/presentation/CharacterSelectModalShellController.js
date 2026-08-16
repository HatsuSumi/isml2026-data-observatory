export class CharacterSelectModalShellController {
    constructor({ animationClasses, config }) {
        this.animationClasses = animationClasses;
        this.config = config;
    }

    initialize({ modal, closeBtn, cancelBtn, confirmBtn, onConfirm }) {
        const closeModal = () => {
            modal.classList.remove(this.animationClasses.show);
            setTimeout(() => modal.remove(), this.config.alert.animation.duration);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        confirmBtn.addEventListener('click', () => {
            const shouldClose = onConfirm();
            if (shouldClose !== false) {
                closeModal();
            }
        });

        requestAnimationFrame(() => modal.classList.add(this.animationClasses.show));

        modal.addEventListener('click', e => {
            if (e.target === modal) {
                closeModal();
            }
        });

        const handleEsc = e => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
}
