import { getAccessToken } from './auth';

const BASE_URL = '/api/fitbit';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const headers = () => {
    const token = getAccessToken();
    if (!token) throw new Error("No access token");
    return {
        Authorization: `Bearer ${token} `,
    };
};

const request = async (url) => {
    const response = await fetch(url, { headers: headers() });
    if (!response.ok) {
        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('fitbit_access_token');
            localStorage.removeItem('fitbit_user_id');
            window.location.href = '/'; // Force re-login
            throw new Error("Unauthorized");
        }
        if (response.status === 429) {
            throw new Error("Rate Limit Exceeded. Please wait a while.");
        }
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
    }
    return response.json();
};

const requestWithCache = async (endpoint, cacheKeySuffix, isV12 = false, cacheTime = CACHE_DURATION) => {
    const cacheKey = `fitbit_cache_${endpoint}_${cacheKeySuffix}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTime) {
            console.log(`Returning cached data for ${endpoint} (${cacheKeySuffix})`);
            return data;
        }
    }

    const baseUrl = isV12 ? '/api/fitbit-v1.2' : BASE_URL;
    const data = await request(`${baseUrl}${endpoint}`);
    try {
        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    } catch (e) {
        console.warn("Failed to save to cache", e);
    }
    return data;
};

export const fetchProfile = async () => {
    // Profile changes rarely, cache it too but maybe just use 'profile' as key
    return requestWithCache('/user/-/profile.json', 'profile');
};

const getTodayDate = () => {
    // Return local date string YYYY-MM-DD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const fetchHeartRate = async (date = 'today', period = '1d') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    // GET https://api.fitbit.com/1/user/-/activities/heart/date/[date]/[period].json
    return requestWithCache(`/user/-/activities/heart/date/${dateStr}/${period}.json`, `${dateStr}_${period}`);
};

export const fetchSleep = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    // Note: Sleep API is v1.2, handled by proxy rewrite rule for /api/fitbit-v1.2
    // My proxy config: '/api/fitbit-v1.2' -> 'https://api.fitbit.com/1.2'
    // BUT 'request' uses BASE_URL ('/api/fitbit') by default.
    // I need to override the base url logic or manually construct the url for sleep.
    // Simplest fix: Just use the explicit proxy path for v1.2 here.
    const V12_BASE_URL = '/api/fitbit-v1.2';
    // We can't reuse requestWithCache easily if it hardcodes BASE_URL.
    // Let's modify request function to handle full URLs or just make a manual call here.
    // OR BETTER: Modify requestWithCache to accept an optional baseUrl logic, but for now I'll just do a manual cached request logic or update requestWithCache.
    // Actually, let's just make requestWithCache robust to starting with /.

    // Changing approach: I will modify requestWithCache in a separate edit to allow overriding base URL.
    // For now, I will assume I can pass a full path if I tweak the helper.
    // Wait, let's just use the fetch directly for now or see below.

    // To avoid breaking changes, I'll temporarily hack it by using '..' to go up if needed, but that's messy.
    // No, let's fix requestWithCache/request to handle absolute paths or differnet bases.
    // See separate edit for request/requestWithCache.

    return requestWithCache(`/user/-/sleep/date/${dateStr}.json`, dateStr, true); // Added IsV12 flag
};

export const fetchHRV = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    return requestWithCache(`/user/-/hrv/date/${dateStr}.json`, dateStr);
};

export const fetchSpO2 = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    return requestWithCache(`/user/-/spo2/date/${dateStr}.json`, dateStr);
};

export const fetchBreathingRate = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    return requestWithCache(`/user/-/br/date/${dateStr}.json`, dateStr);
};

export const fetchSkinTemp = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    return requestWithCache(`/user/-/temp/skin/date/${dateStr}.json`, dateStr);
};

export const fetchActivitySummary = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    // GET https://api.fitbit.com/1/user/-/activities/date/[date].json
    const data = await requestWithCache(`/user/-/activities/date/${dateStr}.json`, dateStr);
    console.log("Activity Summary RAW:", data);
    return data;
};

export const fetchRecentActivities = async (limit = 20, offset = 0) => {
    // GET https://api.fitbit.com/1/user/-/activities/list.json?sort=desc&limit=20&offset=0
    // ERROR FIX: Must provide beforeDate or afterDate.
    // We use beforeDate = tomorrow to ensure we get today's activities in descending order.

    const now = new Date();
    now.setDate(now.getDate() + 1); // Tomorrow
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const tomorrowStr = `${year}-${month}-${day}`;

    // Cache for only 1 minute to keep list fresh
    const data = await requestWithCache(
        `/user/-/activities/list.json?beforeDate=${tomorrowStr}&sort=desc&limit=${limit}&offset=${offset}`,
        `recent_activities_${tomorrowStr}_${limit}_${offset}`,
        false,
        60 * 1000 // 1 minute
    );
    console.log("Recent Activities RAW:", data);
    return data;
};
