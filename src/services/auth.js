const CLIENT_ID = import.meta.env.VITE_FITBIT_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_FITBIT_REDIRECT_URI || window.location.origin + '/callback';

// Scopes required for the app
const SCOPES = 'heartrate sleep profile activity oxygen_saturation respiratory_rate';

export const loginWithFitbit = () => {
    console.log('Initiating Fitbit login...');
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        alert('Please configure your Fitbit Client ID in the .env file.\n\n1. Go to dev.fitbit.com\n2. Register a new app\n3. Copy the Client ID to VITE_FITBIT_CLIENT_ID in .env');
        return;
    }

    const params = new URLSearchParams({
        response_type: 'token', // Implicit grant
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        expires_in: '604800', // 1 week
    });

    const authUrl = `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
};

export const parseCallback = () => {
    console.log('Parsing callback URL:', window.location.href);
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const userId = params.get('user_id');

    console.log('Parsed params:', { accessToken: accessToken ? '***' : null, userId });

    if (accessToken) {
        console.log('Access token found, saving to localStorage');
        localStorage.setItem('fitbit_access_token', accessToken);
        localStorage.setItem('fitbit_user_id', userId);
        return { accessToken, userId };
    }
    console.error('No access token found in callback');
    return null;
};

export const getAccessToken = () => {
    return localStorage.getItem('fitbit_access_token');
};

export const logout = () => {
    localStorage.removeItem('fitbit_access_token');
    localStorage.removeItem('fitbit_user_id');
    window.location.href = '/';
};
