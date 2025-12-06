import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { fetchHeartRate, fetchSleep, fetchActivitySummary } from '../services/fitbitApi';
import { processStrainData, processSleepData, getMockStrainData, getMockRecoveryData } from '../utils/calculations';

const Trends = () => {
    const navigate = useNavigate();
    const [strainRecoveryData, setStrainRecoveryData] = useState([]);
    const [sleepData, setSleepData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // In a real app, we would fetch 7 days of data. 
                // For now, we'll simulate a week of data based on today's data + some random variation 
                // because fetching 7 days of real data might hit rate limits immediately.

                const [hrData, activityData, sleepRes] = await Promise.all([
                    fetchHeartRate(),
                    fetchActivitySummary(),
                    fetchSleep()
                ]);

                const todayStrain = processStrainData(hrData, activityData);
                const todaySleep = processSleepData(sleepRes);

                const decimalToHrMin = (hours) => {
                    const h = Math.floor(hours);
                    const m = Math.round((hours - h) * 60);
                    return `${h}h ${m}m`;
                };

                // Generate mock history based on today's real data (or 0 if missing)
                const history = Array.from({ length: 7 }).map((_, i) => {
                    const day = new Date();
                    day.setDate(day.getDate() - (6 - i));
                    const rawHours = Math.max(0, (todaySleep.totalSleep || 7) + (Math.random() * 2 - 1));

                    return {
                        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
                        strain: Math.round(Math.max(0, Math.min(21, todayStrain.score + (Math.random() * 4 - 2)))),
                        recovery: Math.round(Math.max(0, Math.min(100, (todaySleep.score || 80) + (Math.random() * 20 - 10)))),
                        sleepScore: Math.round(Math.max(0, Math.min(100, (todaySleep.score || 80) + (Math.random() * 10 - 5)))),
                        sleepHours: parseFloat(rawHours.toFixed(1)), // Keep decimal for chart height
                        sleepTime: decimalToHrMin(rawHours) // String for tooltip display
                    };
                });

                setStrainRecoveryData(history);
                setSleepData(history);

            } catch (error) {
                console.error("Error loading trends", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="text-white p-4">Loading Trends...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 mr-4">← Back</button>
                <h1 className="text-2xl font-bold">Trends</h1>
            </div>

            <div className="space-y-8">
                {/* Strain vs Recovery */}
                <div className="bg-gray-900 p-4 rounded-xl">
                    <h2 className="text-lg font-bold mb-4">Strain vs Recovery</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={strainRecoveryData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="day" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="strain" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Strain" />
                                <Line type="monotone" dataKey="recovery" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Recovery" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sleep Performance */}
                <div className="bg-gray-900 p-4 rounded-xl">
                    <h2 className="text-lg font-bold mb-4">Sleep Performance</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sleepData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="day" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value, name, props) => {
                                        if (name === 'Hours') return [props.payload.sleepTime, 'Duration'];
                                        return [value, name];
                                    }}
                                />
                                <Bar dataKey="sleepHours" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Hours" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Trends;
