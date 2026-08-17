export function cloneScheduleTemplate(templateId, selector) {
    const template = document.getElementById(templateId);
    if (!template) {
        throw new Error(`Schedule template not found: ${templateId}`);
    }

    const fragment = template.content.cloneNode(true);
    return selector ? fragment.querySelector(selector) : fragment.firstElementChild;
}
