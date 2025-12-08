import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSleep, fetchSleepHistory, fetchHeartRate, fetchActivitySummary } from '../services/fitbitApi';
import { processSleepData, calculateSleepConsistency, calculateSleepDebt, processStrainData, calculateSleepNeed } from '../utils/calculations';
import Card from '../components/ui/Card';
import CircularMetric from '../components/ui/CircularMetric';

const SleepDetails = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get('date');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Sleep, Activity, and HR to calculate Strain (which influences Sleep Need)
                // We use Promise.allSettled to ensure partial data doesn't break the page
                // Handle 'today' or undefined/null param
                const targetDate = !dateParam || dateParam === 'today' ? new Date() : new Date(dateParam);

                // FIX: Use LOCAL date string, not UTC (toISOString), to match Fitbit API expectation
                const year = targetDate.getFullYear();
                const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                const day = String(targetDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                // For Sleep Need relative to THIS sleep session, we need the Strain from the PREVIOUS day.
                // e.g. Sleep on Oct 27 (night of 26-27 or morning of 27) is driven by Oct 26 Activity.
                const prevDate = new Date(targetDate);
                prevDate.setDate(prevDate.getDate() - 1);

                const pYear = prevDate.getFullYear();
                const pMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
                const pDay = String(prevDate.getDate()).padStart(2, '0');
                const prevDateStr = `${pYear}-${pMonth}-${pDay}`;

                const results = await Promise.allSettled([
                    fetchSleep(dateStr),
                    fetchSleepHistory(7),
                    fetchHeartRate(prevDateStr), // Use Previous Day for Strain
                    fetchActivitySummary(prevDateStr) // Use Previous Day for Strain
                ]);

                const sleepResult = results[0];
                const historyResult = results[1];
                const activityResult = results[2];
                const hrResult = results[3];

                const sleepData = sleepResult.status === 'fulfilled' ? sleepResult.value : null;
                const sleepHistory = historyResult.status === 'fulfilled' ? historyResult.value : null;
                const activityData = activityResult.status === 'fulfilled' ? activityResult.value : null;
                const hrData = hrResult.status === 'fulfilled' ? hrResult.value : null;

                if (sleepResult.status === 'rejected') console.error("Sleep Fetch Failed:", sleepResult.reason);
                if (historyResult.status === 'rejected') console.error("Sleep History Fetch Failed:", historyResult.reason);

                // Process Strain (needed for Sleep Need)
                // Note: We need import 'processStrainData' 
                // We need to make sure we import it at the top if not already (checked: it logic is in calculations.js but not imported in SleepDetails yet? Wait, check imports)

                // Logic:
                // Sleep Need = Baseline (7.5) + Strain Load + Sleep Debt

                const { processStrainData } = await import('../utils/calculations'); // Dynamic import or check top
                const strain = processStrainData(hrData, activityData);
                const strainScore = strain.score || 0;

                console.log("Calculated Strain for Sleep Need:", strainScore);

                const consistency = calculateSleepConsistency(sleepHistory);
                const debt = calculateSleepDebt(sleepHistory);

                // Calculate Need: Baseline (7.5) + Strain Load + Debt
                // WE REVERTED to including Debt as requested.
                const needObj = calculateSleepNeed(strainScore, debt);

                // Format everything as "Xh Ym"
                const { formatDuration } = await import('../utils/calculations');

                const processed = processSleepData(sleepData);

                const formattedData = {
                    ...processed,
                    timeInBedStr: formatDuration(processed.timeInBed),
                    totalSleepStr: formatDuration(processed.totalSleep),
                    restorativeStr: formatDuration(processed.restorative.hours),
                    debtStr: formatDuration(debt),
                    needStr: needObj.str,
                    need: needObj.h + needObj.m / 60, // Restore numeric value for calculations

                    // Stages
                    deepStr: formatDuration(processed.stages.deep),
                    lightStr: formatDuration(processed.stages.light),
                    remStr: formatDuration(processed.stages.rem),
                    awakeStr: formatDuration(processed.stages.awake),

                    consistency,
                    debt,
                    strainScore
                };

                setData(formattedData);
            } catch (error) {
                console.error("Critical Error fetching sleep details", error);
                setData(processSleepData(null));
            } finally {
                setLoading(false);
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



            <div className="grid grid-cols-2 gap-4 mb-4">
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Time in Bed</h3>
                    <div className="text-2xl font-bold">{data.timeInBedStr}</div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Efficiency</h3>
                    <div className="text-2xl font-bold">{data.score}%</div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Restorative Sleep</h3>
                    <div className="text-2xl font-bold">{data.restorativeStr}</div>
                    <div className="text-xs text-gray-500">{data.restorative?.percentage}% of total</div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Consistency</h3>
                    <div className="text-2xl font-bold">{data.consistency}%</div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Sleep Debt</h3>
                    <div className="text-2xl font-bold text-red-400">{data.debtStr}</div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Sleep Need</h3>
                    <div className="text-2xl font-bold">{data.needStr}</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-400 text-xs uppercase tracking-wider">Hours vs Need</h3>
                        <span className="text-xs text-blue-400 font-bold">{Math.round((data.totalSleep / data.need) * 100)}% Achieved</span>
                    </div>

                    <div className="relative pt-6 pb-2">
                        {/* Need Bar */}
                        <div className="absolute top-0 left-0 text-xs text-gray-500">Need: {data.needStr}</div>
                        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mb-2 relative">
                            {/* Indicator Line for Need */}
                            <div className="absolute top-0 right-0 h-full w-1 bg-gray-600 z-10" style={{ left: '100%' }}></div>
                        </div>

                        {/* Actual Bar */}
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs text-white">Actual: {data.totalSleepStr}</span>
                        </div>
                        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${data.need > 0 ? Math.min(100, (data.totalSleep / data.need) * 100) : 0}%` }}></div>
                        </div>
                        <div className="text-right text-xs text-gray-500 mt-1">
                            {data.need > 0 ? Math.round((data.totalSleep / data.need) * 100) : 0}% Achieved
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Sleep Stages</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Deep</span>
                                <span className="text-gray-400">{data.deepStr}</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${(data.stages.deep / data.totalSleep) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Light</span>
                                <span className="text-gray-400">{data.lightStr}</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400" style={{ width: `${(data.stages.light / data.totalSleep) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>REM</span>
                                <span className="text-gray-400">{data.remStr}</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-400" style={{ width: `${(data.stages.rem / data.totalSleep) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Awake</span>
                                <span className="text-gray-400">{data.awakeStr}</span>
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
