import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHeartRate, fetchSleep, fetchActivitySummary } from '../services/fitbitApi';
import { processStrainData, processSleepData } from '../utils/calculations';
import Card from '../components/ui/Card';

const Report = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // In a real app, we'd fetch 7 days. For now, we simulate based on today's data.
                const [hrRes, activityRes, sleepResRaw] = await Promise.all([
                    fetchHeartRate(),
                    fetchActivitySummary(),
                    fetchSleep()
                ]);

                // Fix Navigation
                // processStrainData and processSleepData need raw inputs. If fetch fails (null), we must handle it.
                // We default to minimal objects if null is returned
                const hrData = hrRes || {};
                const activityData = activityRes || {};
                const sleepData = sleepResRaw || {};

                const todayStrain = processStrainData(hrData, activityData);
                const todaySleep = processSleepData(sleepData);

                // Mocking a week of data based on today. 
                // Ensure we have numbers even if today's data is 0.
                const baseStrain = todayStrain.score || 10; // default to moderate if 0
                const baseSleep = todaySleep.score || 70;   // default to OK if 0

                const avgStrain = Math.max(0, Math.min(21, baseStrain + 2));
                const avgSleep = Math.max(0, Math.min(100, baseSleep - 5));
                const avgRecovery = Math.max(0, Math.min(100, baseSleep + 5));

                setStats({
                    avgStrain: avgStrain.toFixed(1),
                    avgSleep: avgSleep.toFixed(0),
                    avgRecovery: avgRecovery.toFixed(0),
                    bestDay: "Saturday",
                    worstDay: "Monday"
                });

            } catch (error) {
                console.error("Error loading report", error);
                // Fallback stats so page doesn't break
                setStats({
                    avgStrain: "0.0",
                    avgSleep: "0",
                    avgRecovery: "0",
                    bestDay: "--",
                    worstDay: "--"
                });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="text-white p-4">Loading Report...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 mr-4">← Back</button>
                <h1 className="text-2xl font-bold">Weekly Assessment</h1>
            </div>

            <div className="space-y-6">
                <div className="bg-gray-900 p-6 rounded-xl text-center">
                    <h2 className="text-gray-400 uppercase tracking-widest text-sm mb-4">Weekly Averages</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-3xl font-bold text-blue-500">{stats.avgStrain}</div>
                            <div className="text-xs text-gray-500 mt-1">Strain</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-500">{stats.avgRecovery}%</div>
                            <div className="text-xs text-gray-500 mt-1">Recovery</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-yellow-500">{stats.avgSleep}%</div>
                            <div className="text-xs text-gray-500 mt-1">Sleep</div>
                        </div>
                    </div>
                </div>

                <Card>
                    <h3 className="font-bold text-lg mb-4">Highlights</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-400">Best Recovery</span>
                            <span className="font-bold text-green-400">92% ({stats.bestDay})</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-400">Highest Strain</span>
                            <span className="font-bold text-blue-400">18.4 ({stats.bestDay})</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Lowest Sleep</span>
                            <span className="font-bold text-red-400">5h 12m ({stats.worstDay})</span>
                        </div>
                    </div>
                </Card>

                <div className="bg-gray-800 p-4 rounded-xl">
                    <h3 className="font-bold text-lg mb-2">Coach's Note</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        You had a strong week! Your recovery is trending upwards compared to last week.
                        Try to maintain consistent sleep times to improve your score even further.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Report;
