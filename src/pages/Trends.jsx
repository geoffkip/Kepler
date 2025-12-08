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
                // Get Date Strings
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const yDate = new Date(now);
                yDate.setDate(yDate.getDate() - 1);
                const yesterdayStr = yDate.toISOString().split('T')[0];

                // Fetch Today (Real current status) AND Yesterday (Real completed baseline)
                // We use Promise.allSettled to allow partial failures
                const results = await Promise.allSettled([
                    fetchHeartRate('today'),
                    fetchActivitySummary('today'),
                    fetchSleep('today'),
                    fetchHeartRate(yesterdayStr),
                    fetchActivitySummary(yesterdayStr)
                ]);

                // Helper to get value or null
                const getVal = (res) => res.status === 'fulfilled' ? res.value : null;

                const hrToday = getVal(results[0]);
                const actToday = getVal(results[1]);
                const sleepRes = getVal(results[2]);
                const hrYesterday = getVal(results[3]);
                const actYesterday = getVal(results[4]);

                const todayStrain = processStrainData(hrToday, actToday);
                const yesterdayStrain = processStrainData(hrYesterday, actYesterday);
                const todaySleep = processSleepData(sleepRes);

                // Baseline for History: Use Yesterday's strain if valid (>= 4), otherwise default to 12 (Moderate)
                // This prevents "New User" or "Forgot to wear" days from flatlining the graph
                const historyBaseline = yesterdayStrain.score >= 4 ? yesterdayStrain.score : 12;

                const decimalToHrMin = (hours) => {
                    const h = Math.floor(hours);
                    const m = Math.round((hours - h) * 60);
                    return `${h}h ${m}m`;
                };

                // Generate mock history for previous 6 days using Baseline
                // Index 6 is Today (Real)
                const history = Array.from({ length: 7 }).map((_, i) => {
                    const day = new Date();
                    day.setDate(day.getDate() - (6 - i));

                    const isToday = i === 6;

                    // If Today, use Real Today Strain. If History, use Baseline +/- variation.
                    const strainVal = isToday
                        ? todayStrain.score
                        : Math.max(0, Math.min(21, historyBaseline + (Math.random() * 4 - 2)));

                    // Sleep: Use today's sleep as anchor for now (or randomize around 7.5)
                    const sleepBase = todaySleep.totalSleep || 7.5;
                    const rawHours = Math.max(0, sleepBase + (Math.random() * 2 - 1));

                    return {
                        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
                        strain: parseFloat(strainVal.toFixed(1)),
                        recovery: Math.round(Math.max(0, Math.min(100, (todaySleep.score || 80) + (Math.random() * 20 - 10)))),
                        sleepScore: Math.round(Math.max(0, Math.min(100, (todaySleep.score || 80) + (Math.random() * 10 - 5)))),
                        sleepHours: parseFloat(rawHours.toFixed(1)),
                        sleepTime: decimalToHrMin(rawHours)
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
