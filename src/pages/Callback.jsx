import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { parseCallback } from '../services/auth';

const Callback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState(null);

    useEffect(() => {
        const process = async () => {
            try {
                // Pass the Router location hash explicitly
                const result = await parseCallback(location.hash);
                if (result) {
                    navigate('/'); // Go to root (which redirects to dashboard via PrivateRoute)
                } else {
                    setError('Failed to retrieve access token. Please check console logs.');
                }
            } catch (err) {
                console.error('Error in callback processing:', err);
                setError('An unexpected error occurred.');
            }
        };
        process();
    }, [navigate, location]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                    Return to Login
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-screen bg-black text-white">
            <p>Authenticating...</p>
        </div>
    );
};

export default Callback;
