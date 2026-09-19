import { loadNominationStats as loadNominationStatsFromFiles } from '../common/data-loader.js';

const STORAGE_KEY = 'isml2026:statistics:nomination-stats:v3';

let dataPromise = null;

function readSessionData() {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.warn('读取统计数据缓存失败:', error);
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

export function loadNominationStats() {
    if (dataPromise) {
        return dataPromise;
    }

    const cachedData = readSessionData();
    if (cachedData) {
        dataPromise = Promise.resolve(cachedData);
        return dataPromise;
    }

    dataPromise = loadNominationStatsFromFiles()
        .then(data => {
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (error) {
                console.warn('写入统计数据缓存失败:', error);
            }
            return data;
        })
        .catch(error => {
            dataPromise = null;
            throw error;
        });

    return dataPromise;
}
