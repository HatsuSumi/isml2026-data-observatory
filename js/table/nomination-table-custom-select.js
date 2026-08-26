const CUSTOM_SELECT_TRIGGER_CLASS = 'custom-select-trigger';
const CUSTOM_SELECT_VALUE_CLASS = 'custom-select-value';
const CUSTOM_SELECT_OPTIONS_CLASS = 'custom-select-options';
const CUSTOM_SELECT_OPTION_CLASS = 'custom-select-option';

export function closeCustomSelects(exceptWrapper) {
    document.querySelectorAll('.select-wrapper.active').forEach(wrapper => {
        if (wrapper !== exceptWrapper) wrapper.classList.remove('active');
    });
}

export function syncCustomSelect(select) {
    const wrapper = select.closest('.select-wrapper');
    if (!wrapper) return;
    const valueLabel = wrapper.querySelector(`.${CUSTOM_SELECT_VALUE_CLASS}`);
    const options = wrapper.querySelectorAll(`.${CUSTOM_SELECT_OPTION_CLASS}`);
    const selectedOption = select.options[select.selectedIndex];
    if (valueLabel) {
        valueLabel.textContent = selectedOption?.textContent?.trim() || '';
    }
    options.forEach(option => {
        option.classList.toggle('selected', option.dataset.value === select.value);
    });
}

export function buildCustomSelect(select) {
    const wrapper = select.closest('.select-wrapper');
    if (!wrapper || wrapper.querySelector(`.${CUSTOM_SELECT_TRIGGER_CLASS}`)) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = CUSTOM_SELECT_TRIGGER_CLASS;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const value = document.createElement('span');
    value.className = CUSTOM_SELECT_VALUE_CLASS;
    trigger.appendChild(value);

    const options = document.createElement('div');
    options.className = CUSTOM_SELECT_OPTIONS_CLASS;
    options.setAttribute('role', 'listbox');

    Array.from(select.options).forEach(nativeOption => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = CUSTOM_SELECT_OPTION_CLASS;
        option.dataset.value = nativeOption.value;
        option.textContent = nativeOption.textContent;
        options.appendChild(option);
    });

    options.addEventListener('click', event => {
        const option = event.target.closest(`.${CUSTOM_SELECT_OPTION_CLASS}`);
        if (!option || !options.contains(option)) return;
        const nextValue = option.dataset.value;
        if (select.value === nextValue) {
            wrapper.classList.remove('active');
            trigger.setAttribute('aria-expanded', 'false');
            return;
        }
        select.value = nextValue;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncCustomSelect(select);
        wrapper.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
    });

    trigger.addEventListener('click', () => {
        const isOpen = wrapper.classList.toggle('active');
        closeCustomSelects(isOpen ? wrapper : null);
        trigger.setAttribute('aria-expanded', String(isOpen));
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(options);
    select.addEventListener('change', () => syncCustomSelect(select));
    syncCustomSelect(select);
}
