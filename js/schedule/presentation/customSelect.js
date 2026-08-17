export function createCustomSelect({ id, placeholder, options, onChange }) {
    const selectTemplate = document.getElementById('schedule-custom-select-template');
    const optionTemplate = document.getElementById('schedule-custom-select-option-template');

    if (!selectTemplate || !optionTemplate) {
        throw new Error('Custom select templates not found');
    }

    const wrapper = selectTemplate.content.cloneNode(true).querySelector('.custom-select');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const label = wrapper.querySelector('.custom-select-label');
    const menu = wrapper.querySelector('.custom-select-menu');

    trigger.id = id;
    menu.setAttribute('aria-labelledby', id);
    label.textContent = placeholder;

    const optionButtons = [];
    let value = '';
    let disabled = false;
    let isOpen = false;

    function closeMenu() {
        if (!isOpen) return;
        isOpen = false;
        wrapper.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
        if (disabled || isOpen) return;
        document.querySelectorAll('.custom-select.active').forEach(select => {
            if (select !== wrapper) {
                select.dispatchEvent(new CustomEvent('custom-select:close'));
            }
        });
        isOpen = true;
        wrapper.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
    }

    function setValue(nextValue, { silent = false } = {}) {
        value = nextValue;
        const selectedOption = options.find(option => option.value === nextValue) || options[0];
        label.textContent = selectedOption ? selectedOption.label : placeholder;

        optionButtons.forEach(button => {
            const isSelected = button.dataset.value === nextValue;
            button.classList.toggle('selected', isSelected);
            button.setAttribute('aria-selected', String(isSelected));
        });

        if (!silent && typeof onChange === 'function') {
            onChange(nextValue);
        }
    }

    function setDisabled(nextDisabled) {
        disabled = nextDisabled;
        trigger.disabled = nextDisabled;
        trigger.tabIndex = nextDisabled ? -1 : 0;
        wrapper.classList.toggle('disabled', nextDisabled);
        if (nextDisabled) {
            closeMenu();
        }
    }

    options.forEach(option => {
        const optionButton = optionTemplate.content.cloneNode(true).querySelector('.custom-select-option');
        optionButton.dataset.value = option.value;
        optionButton.textContent = option.label;

        optionButton.addEventListener('click', () => {
            setValue(option.value);
            closeMenu();
            trigger.focus();
        });

        optionButton.addEventListener('keydown', event => {
            const currentIndex = optionButtons.indexOf(optionButton);

            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu();
                trigger.focus();
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                optionButtons[(currentIndex + 1) % optionButtons.length]?.focus();
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                optionButtons[(currentIndex - 1 + optionButtons.length) % optionButtons.length]?.focus();
                return;
            }

            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setValue(option.value);
                closeMenu();
                trigger.focus();
            }
        });

        optionButtons.push(optionButton);
        menu.appendChild(optionButton);
    });

    trigger.addEventListener('click', () => {
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    trigger.addEventListener('keydown', event => {
        if (disabled) return;

        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openMenu();
            const selectedButton = optionButtons.find(button => button.dataset.value === value) || optionButtons[0];
            selectedButton?.focus();
        }

        if (event.key === 'Escape') {
            closeMenu();
        }
    });

    wrapper.addEventListener('custom-select:close', closeMenu);

    document.addEventListener('click', event => {
        if (!wrapper.contains(event.target)) {
            closeMenu();
        }
    });

    setValue(options[0]?.value ?? '', { silent: true });

    return {
        element: wrapper,
        close: closeMenu,
        getValue: () => value,
        setDisabled,
        setValue
    };
}
