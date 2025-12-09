import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { fetchHeartRate, fetchSleep, fetchActivitySummary, fetchStrainHistory, fetchSleepHistory, fetchHRVHistory } from '../services/fitbitApi';
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

                // Fetch Real History
                // - Strain History (7 days)
                // - Sleep History (7 days)
                // - HRV History (30 days - we only need last 7)
                const results = await Promise.allSettled([
                    fetchStrainHistory(7),
                    fetchSleepHistory(7),
                    fetchHRVHistory(7)
                ]);

                const getVal = (res) => res.status === 'fulfilled' ? res.value : null;

                const strainHist = getVal(results[0]) || [];
                const sleepHist = getVal(results[1]) || { sleep: [] };
                const hrvHist = getVal(results[2]) || { hrv: [] };

                // Map Sleep by Date
                const sleepMap = {};
                (sleepHist.sleep || []).forEach(log => {
                    const d = log.dateOfSleep; // YYYY-MM-DD
                    sleepMap[d] = {
                        score: log.efficiency || 0,
                        hours: (log.minutesAsleep || 0) / 60
                    };
                });

                // Map HRV by Date
                const hrvMap = {};
                (hrvHist.hrv || []).forEach(log => {
                    const d = log.dateTime;
                    hrvMap[d] = log.value?.dailyRmssd || 0;
                });

                // Combine into Chart Data
                // strainHist has { date, strain, ... }
                // We want to map this to the chart format

                const chartData = strainHist.map(day => {
                    const date = day.date;
                    const dateObj = new Date(date + 'T00:00:00'); // Force local midnight parsing roughly
                    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                    const sleep = sleepMap[date] || { score: 0, hours: 0 };

                    // Recovery Score (Simplified recalc for chart)
                    // We don't have full baseline context here easily without fetching 30d.
                    // Let's use HRV as a proxy for Recovery calc in this view or partial logic.
                    // Or just use the HRV value scaled? 
                    // Let's approximate: 100% if HRV > 50, else scaled.
                    // Better: Use HRV normalized.
                    const hrvVal = hrvMap[date] || 0;
                    const recScore = hrvVal > 0 ? Math.min(100, (hrvVal / 60) * 100) : 0;

                    return {
                        day: dayLabel,
                        fullDate: date,
                        strain: day.strain,
                        recovery: Math.round(recScore), // Approximate for now
                        sleepScore: sleep.score,
                        sleepHours: parseFloat(sleep.hours.toFixed(1)),
                        sleepTime: `${Math.floor(sleep.hours)}h ${Math.round((sleep.hours % 1) * 60)}m`
                    };
                });

                // If we have less than 7 days, they just show what we have.
                setStrainRecoveryData(chartData);
                setSleepData(chartData);

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
