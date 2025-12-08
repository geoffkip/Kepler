import { Preferences } from '@capacitor/preferences';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getAccessToken, logout } from './auth';

const isNative = Capacitor.isNativePlatform();

// Web uses Proxy (/api/fitbit -> https://api.fitbit.com/1)
// Native uses Direct (https://api.fitbit.com/1)
const BASE_URL = isNative ? 'https://api.fitbit.com/1' : '/api/fitbit';
const BASE_URL_V1_2 = isNative ? 'https://api.fitbit.com/1.2' : '/api/fitbit-v1.2';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const getHeaders = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("No access token");
    return {
        Authorization: `Bearer ${token}`,
    };
};

const request = async (url) => {
    console.log(`Fetching: ${url}`); // Debug Log
    try {
        const headers = await getHeaders();
        const isNativePlatform = Capacitor.isNativePlatform();

        if (isNativePlatform) {
            // NATIVE: Use CapacitorHttp to bypass WebView CORS/SSL issues
            const options = {
                url: url,
                headers: headers,
            };
            const response = await CapacitorHttp.get(options);

            // CapacitorHttp returns .status and .data directly
            if (response.status >= 400) {
                if (response.status === 401) {
                    await logout();
                    throw new Error("Unauthorized");
                }
                if (response.status === 429) {
                    throw new Error("Rate Limit Exceeded");
                }
                // response.data might be an object or string
                const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                throw new Error(`API Error ${response.status} at ${url}: ${errorText}`);
            }
            return response.data; // Native returns parsed JSON usually

        } else {
            // WEB: Use standard fetch (proxied)
            const response = await fetch(url, { headers });
            if (!response.ok) {
                if (response.status === 401) {
                    await logout();
                    throw new Error("Unauthorized");
                }
                if (response.status === 429) {
                    throw new Error("Rate Limit Exceeded. Please wait a while.");
                }
                const text = await response.text();
                throw new Error(`API Error ${response.status} at ${url}: ${text}`);
            }
            return response.json();
        }

    } catch (error) {
        throw new Error(`Request Failed for ${url}: ${error.message}`);
    }
};

const requestWithCache = async (endpoint, cacheKeySuffix, isV12 = false, cacheTime = CACHE_DURATION) => {
    // endpoint usually starts with /user/...
    const baseUrl = isV12 ? BASE_URL_V1_2 : BASE_URL;
    // Construct full URL
    const fullUrl = `${baseUrl}${endpoint}`;

    // Cache logic using Preferences
    const cacheKey = `fitbit_cache_${endpoint}_${cacheKeySuffix}`;
    const { value: cached } = await Preferences.get({ key: cacheKey });

    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTime) {
            console.log(`Returning cached data for ${endpoint} (${cacheKeySuffix})`);
            return data;
        }
    }

    const data = await request(fullUrl);
    try {
        await Preferences.set({
            key: cacheKey,
            value: JSON.stringify({
                timestamp: Date.now(),
                data
            })
        });
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

// Sleep API (v1.2) - Was previously missing slash '/sleepdate/' -> '/sleep/date/'
// Sleep API (v1.2) - Was previously missing slash '/sleepdate/' -> '/sleep/date/'
// Sleep API (v1.2) - Was previously missing slash '/sleepdate/' -> '/sleep/date/'
export const fetchSleep = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    // v1.2 is required for sleep stages
    let data = await requestWithCache(`/user/-/sleep/date/${dateStr}.json`, dateStr, true);

    // Fallback: If "today" (or the explicit date matches today) has no sleep data, try yesterday.
    const isToday = date === 'today' || dateStr === getTodayDate();

    if (isToday && (!data || !data.sleep || data.sleep.length === 0)) {
        console.log("No sleep data for today, trying yesterday...");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // FIX: Use local time for yesterday string
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yStr = `${year}-${month}-${day}`;

        data = await requestWithCache(`/user/-/sleep/date/${yStr}.json`, yStr, true);
    }
    return data;
};

// HRV API (v1)
export const fetchHRV = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    return requestWithCache(`/user/-/hrv/date/${dateStr}.json`, dateStr, false); // Explicitly v1
};

// SpO2 API (v1)
export const fetchSpO2 = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    return requestWithCache(`/user/-/spo2/date/${dateStr}.json`, dateStr, false); // Explicitly v1
};

// Breathing Rate API (v1)
export const fetchBreathingRate = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    // Docs say v1, user saw failure with 1.2
    return requestWithCache(`/user/-/br/date/${dateStr}.json`, dateStr, false); // Explicitly v1
};

// Skin Temp (v1)
export const fetchSkinTemp = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    return requestWithCache(`/user/-/temp/skin/date/${dateStr}.json`, dateStr, false); // Explicitly v1
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

// --- NEW METRICS IMPLEMENTATION ---

// 1. Weight & Body Composition
export const fetchWeight = async (date = 'today') => {
    const endDate = date === 'today' ? getTodayDate() : date;
    const d = new Date(endDate);
    d.setDate(d.getDate() - 90); // Look back 90 days
    const fromYear = d.getFullYear();
    const fromMonth = String(d.getMonth() + 1).padStart(2, '0');
    const fromDay = String(d.getDate()).padStart(2, '0');
    const startDate = `${fromYear}-${fromMonth}-${fromDay}`;

    // GET /1/user/-/body/log/weight/date/[startDate]/[endDate].json
    const data = await requestWithCache(`/user/-/body/log/weight/date/${startDate}/${endDate}.json`, `weight_${startDate}_${endDate}`);
    console.log("Weight Data RAW:", data);
    return data;
};

export const fetchBodyFat = async (date = 'today') => {
    const endDate = date === 'today' ? getTodayDate() : date;
    const d = new Date(endDate);
    d.setDate(d.getDate() - 90); // Look back 90 days
    const fromYear = d.getFullYear();
    const fromMonth = String(d.getMonth() + 1).padStart(2, '0');
    const fromDay = String(d.getDate()).padStart(2, '0');
    const startDate = `${fromYear}-${fromMonth}-${fromDay}`;

    // GET /1/user/-/body/log/fat/date/[startDate]/[endDate].json
    const data = await requestWithCache(`/user/-/body/log/fat/date/${startDate}/${endDate}.json`, `fat_${startDate}_${endDate}`);
    console.log("Body Fat Data RAW:", data);
    return data;
};

// 2. Cardio Fitness Score (VO2 Max)
export const fetchCardioScore = async (date = 'today') => {
    const endDate = date === 'today' ? getTodayDate() : date;
    const d = new Date(endDate);
    d.setDate(d.getDate() - 90); // Look back 90 days
    const fromYear = d.getFullYear();
    const fromMonth = String(d.getMonth() + 1).padStart(2, '0');
    const fromDay = String(d.getDate()).padStart(2, '0');
    const startDate = `${fromYear}-${fromMonth}-${fromDay}`;

    // GET /1/user/-/cardioscore/date/[startDate]/[endDate].json
    const data = await requestWithCache(`/user/-/cardioscore/date/${startDate}/${endDate}.json`, `cardio_${startDate}_${endDate}`);
    console.log("Cardio Score RAW:", data);
    return data;
};

// 3. Stress Management Score
// Range fetch failed (Error 400). Reverting to single day.
export const fetchStressScore = async (date = 'today') => {
    const dateStr = date === 'today' ? getTodayDate() : date;
    // GET /1/user/-/stress/score/date/[date].json
    const data = await requestWithCache(`/user/-/stress/score/date/${dateStr}.json`, `stress_${dateStr}`);
    console.log("Stress Score RAW:", data);
    return data;
}

// 4. Sleep History for Consistency
export const fetchSleepHistory = async (days = 7) => {
    const today = getTodayDate();
    const date = new Date();
    date.setDate(date.getDate() - days);

    // FIX: Use local time for start date similar to getTodayDate()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const startDate = `${year}-${month}-${day}`;

    // GET /1.2/user/-/sleep/date/[startDate]/[endDate].json
    return requestWithCache(`/user/-/sleep/date/${startDate}/${today}.json`, `sleep_hist_${startDate}_${today}`, true);
};
