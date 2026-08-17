export async function loadJson(path, errorLabel) {
    try {
        const response = await fetch(path);
        return await response.json();
    } catch (error) {
        console.error(errorLabel, error);
        return null;
    }
}
