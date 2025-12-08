import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const CLIENT_ID = import.meta.env.VITE_FITBIT_CLIENT_ID;

// Scopes required for the app
const SCOPES = 'heartrate sleep profile activity oxygen_saturation respiratory_rate';

export const loginWithFitbit = async () => {
    console.log('Initiating Fitbit login...');
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        alert('Please configure your Fitbit Client ID in the .env file.');
        return;
    }

    const platform = Capacitor.getPlatform();
    const isNative = platform === 'ios' || platform === 'android';

    const REDIRECT_URI = isNative
        ? 'kepler://callback'
        : (import.meta.env.VITE_FITBIT_REDIRECT_URI || window.location.origin + '/callback');

    const params = new URLSearchParams({
        response_type: 'token',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        expires_in: '604800', // 1 week
    });

    const authUrl = `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
    console.log('Redirecting to:', authUrl);

    if (isNative) {
        try {
            await Browser.open({ url: authUrl });
        } catch (error) {
            console.error('Browser open failed:', error);
            window.location.href = authUrl;
        }
    } else {
        window.location.href = authUrl;
    }
};

export const parseCallback = async (explicitHash) => {
    // Legacy support for web hash flow if needed, but updated to be async
    console.log('Parsing callback URL:', window.location.href);
    const hash = explicitHash ? explicitHash.substring(1) : window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const userId = params.get('user_id');

    if (accessToken && userId) {
        await Preferences.set({ key: 'fitbit_access_token', value: accessToken });
        await Preferences.set({ key: 'fitbit_user_id', value: userId });
        return true;
    }
    return false;
};

// Async Deep Link Handler
export const handleDeepLink = async (url) => {
    try {
        if (!url || !url.includes('access_token')) return false;

        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return false;

        const hash = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const userId = params.get('user_id');

        if (accessToken && userId) {
            console.log("Deep Link Handler: Token found. Saving to Preferences.");
            await Preferences.set({ key: 'fitbit_access_token', value: accessToken });
            await Preferences.set({ key: 'fitbit_user_id', value: userId });
            return true;
        }
    } catch (e) {
        console.error("Deep Link Handler Error:", e);
    }
    return false;
};

export const getAccessToken = async () => {
    const { value } = await Preferences.get({ key: 'fitbit_access_token' });
    return value;
};

export const logout = async () => {
    await Preferences.remove({ key: 'fitbit_access_token' });
    await Preferences.remove({ key: 'fitbit_user_id' });
    window.location.href = '/';
};
