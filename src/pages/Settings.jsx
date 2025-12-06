import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';

const Settings = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState({
        maxHeartRate: 190,
        sleepGoal: 7.5,
        theme: 'dark'
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('user_settings');
        if (stored) {
            setSettings(JSON.parse(stored));
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = () => {
        localStorage.setItem('user_settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 mr-4">← Back</button>
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className="space-y-6">
                <Card>
                    <h3 className="font-bold text-lg mb-4">Biometrics</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Max Heart Rate</label>
                            <input
                                type="number"
                                name="maxHeartRate"
                                value={settings.maxHeartRate}
                                onChange={handleChange}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">Used to calculate Strain accuracy.</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Sleep Goal (Hours)</label>
                            <input
                                type="number"
                                name="sleepGoal"
                                value={settings.sleepGoal}
                                onChange={handleChange}
                                step="0.5"
                                className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </Card>

                <button
                    onClick={handleSave}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                >
                    {saved ? 'Saved!' : 'Save Settings'}
                </button>

                <div className="text-center text-xs text-gray-600 mt-8">
                    Gravitic Kepler v1.0.0
                </div>
            </div>
        </div>
    );
};

export default Settings;
