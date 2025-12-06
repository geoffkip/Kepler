import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseCallback } from '../services/auth';

const Callback = () => {
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            const result = parseCallback();
            if (result) {
                navigate('/dashboard');
            } else {
                setError('Failed to retrieve access token. Please check console logs.');
            }
        } catch (err) {
            console.error('Error in callback processing:', err);
            setError('An unexpected error occurred.');
        }
    }, [navigate]);

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
