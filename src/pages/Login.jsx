import React from 'react';
import { loginWithFitbit } from '../services/auth';

const Login = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
            <h1 className="text-4xl font-bold mb-8">Kepler Health</h1>
            <button
                onClick={loginWithFitbit}
                className="px-6 py-3 bg-blue-600 rounded-full font-semibold hover:bg-blue-700 transition"
            >
                Login with Fitbit
            </button>
        </div>
    );
};

export default Login;
