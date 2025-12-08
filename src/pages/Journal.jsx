import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';

const Journal = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        alcohol: false,
        alcoholDrinks: 0,
        lateMeal: false,
        screenTime: false,
        supplements: false,
        stress: 5,
        notes: ''
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Check if already logged for today
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const journal = localStorage.getItem(`journal_${today}`);
        if (journal) {
            setFormData(JSON.parse(journal));
            setSaved(true);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        localStorage.setItem(`journal_${today}`, JSON.stringify(formData));
        setSaved(true);
        setTimeout(() => navigate('/'), 1500);
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 mr-4">← Back</button>
                <h1 className="text-2xl font-bold">Daily Journal</h1>
            </div>

            {saved ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="text-green-500 text-6xl mb-4">✓</div>
                    <h2 className="text-2xl font-bold mb-2">Journal Logged!</h2>
                    <p className="text-gray-400">Redirecting to dashboard...</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <h3 className="font-bold text-lg mb-4">Behaviors</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        name="alcohol"
                                        checked={formData.alcohol}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span>Drank Alcohol?</span>
                                </label>
                                {formData.alcohol && (
                                    <input
                                        type="number"
                                        name="alcoholDrinks"
                                        value={formData.alcoholDrinks}
                                        onChange={handleChange}
                                        placeholder="Drinks"
                                        className="w-20 bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                                        min="1"
                                    />
                                )}
                            </div>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="lateMeal"
                                    checked={formData.lateMeal}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                                />
                                <span>Late Meal (within 2h of bed)?</span>
                            </label>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="screenTime"
                                    checked={formData.screenTime}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                                />
                                <span>Screens in bed?</span>
                            </label>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="supplements"
                                    checked={formData.supplements}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                                />
                                <span>Took Supplements?</span>
                            </label>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-bold text-lg mb-4">Wellness</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Perceived Stress (1-10)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        name="stress"
                                        min="1"
                                        max="10"
                                        value={formData.stress}
                                        onChange={handleChange}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xl font-bold w-8 text-center">{formData.stress}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                    rows="3"
                                    placeholder="Any other details..."
                                />
                            </div>
                        </div>
                    </Card>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                    >
                        Save Journal
                    </button>
                </form>
            )}
        </div>
    );
};

export default Journal;
