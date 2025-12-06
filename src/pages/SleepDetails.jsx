import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSleep } from '../services/fitbitApi';
import { processSleepData, getMockSleepData } from '../utils/calculations';
import Card from '../components/ui/Card';
import CircularMetric from '../components/ui/CircularMetric';

const SleepDetails = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const sleepData = await fetchSleep();
                setData(processSleepData(sleepData));
            } catch (error) {
                console.error("Error fetching sleep details", error);
                // No mock fallback
                setData(processSleepData(null));
            }
        };
        loadData();
    }, []);

    if (!data) return <div className="text-white p-4">Loading...</div>;

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getScoreColor = (score) => {
        if (score >= 67) return 'green';
        if (score >= 34) return 'yellow';
        return 'red';
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 mr-4">
                    &larr; Back
                </button>
                <h1 className="text-2xl font-bold">Sleep Details</h1>
            </div>

            <div className="flex justify-center mb-8">
                <CircularMetric value={data.score} label="Sleep" color={getScoreColor(data.score)} size={200} />
            </div>

            <div className="grid grid-cols-1 gap-4">
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Duration</h3>
                    <div className="flex justify-between items-end">
                        <div className="text-2xl font-bold">{data.totalSleep} <span className="text-sm text-gray-500 font-normal">hrs</span></div>
                        <div className="text-sm text-gray-400">
                            {formatTime(data.startTime)} - {formatTime(data.endTime)}
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Sleep Stages</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Deep</span>
                                <span className="text-gray-400">{data.stages.deep} hrs</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${(data.stages.deep / data.totalSleep) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Light</span>
                                <span className="text-gray-400">{data.stages.light} hrs</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400" style={{ width: `${(data.stages.light / data.totalSleep) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>REM</span>
                                <span className="text-gray-400">{data.stages.rem} hrs</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-400" style={{ width: `${(data.stages.rem / data.totalSleep) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Awake</span>
                                <span className="text-gray-400">{data.stages.awake} hrs</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-500" style={{ width: `${(data.stages.awake / data.totalSleep) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SleepDetails;
