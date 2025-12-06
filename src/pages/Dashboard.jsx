
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchProfile,
    fetchHeartRate,
    fetchSleep,
    fetchHRV,
    fetchSpO2,
    fetchBreathingRate,
    fetchActivitySummary
} from '../services/fitbitApi';
import { logout } from '../services/auth';
import CircularMetric from '../components/ui/CircularMetric';
import Card from '../components/ui/Card';
import {
    processStrainData,
    processRecoveryData,
    processSleepData,
    calculateSleepNeed,
    getMockStrainData,
    getMockRecoveryData,
    getMockSleepData
} from '../utils/calculations';

const Dashboard = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [strainData, setStrainData] = useState(null);
    const [recoveryData, setRecoveryData] = useState(null);
    const [sleepData, setSleepData] = useState(null);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);
    const hrDataRef = React.useRef(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Initialize with empty/zero data so we can render even if fetch fails
                setStrainData(processStrainData(null, null));
                setRecoveryData(processRecoveryData(null, null, null, null, null)); // Added null for rhr
                setSleepData(processSleepData(null));

                const profileData = await fetchProfile();
                setProfile(profileData.user);

                // Fetch all required data using allSettled to prevent one failure from breaking everything
                const results = await Promise.allSettled([
                    fetchHeartRate(),
                    fetchSleep(),
                    fetchHRV(),
                    fetchSpO2(),
                    fetchBreathingRate(),
                    fetchActivitySummary()
                ]);

                const [hrResult, sleepResult, hrvResult, spo2Result, brResult, activityResult] = results;

                // Collect errors
                const newErrors = [];
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        const apiNames = ['Heart Rate', 'Sleep', 'HRV', 'SpO2', 'Breathing Rate', 'Activity'];
                        console.error(`API Call ${apiNames[index]} failed:`, result.reason);
                        newErrors.push(`${apiNames[index]}: ${result.reason.message}`);
                    }
                });
                setErrors(newErrors);

                const activityData = activityResult.status === 'fulfilled' ? activityResult.value : null;
                const hrData = hrResult.status === 'fulfilled' ? hrResult.value : null;
                const hrvData = hrvResult.status === 'fulfilled' ? hrvResult.value : null;
                const spo2Data = spo2Result.status === 'fulfilled' ? spo2Result.value : null;
                const brData = brResult.status === 'fulfilled' ? brResult.value : null;

                // Store raw HR data for debugging
                hrDataRef.current = hrData;

                // Process Data
                // We pass whatever we got. The processing functions need to handle nulls gracefully 
                // and return 0/empty instead of mocks if we want "real" data behavior.
                const processedStrain = processStrainData(hrData, activityData);
                const processedSleep = processSleepData(sleepData); // note: sleepData (state) is not yet updated, but we have sleepResult available. 
                // Actually, wait, setSleepData(processSleepData(null)) was called earlier. 
                // Here we should use the fresh result:
                const freshSleepData = sleepResult.status === 'fulfilled' ? sleepResult.value : null;
                const processedSleepUpdated = processSleepData(freshSleepData);

                // Extract RHR from HR data for Recovery calculation
                const rhr = hrData?.['activities-heart']?.[0]?.value?.restingHeartRate || 0;
                const processedRecovery = processRecoveryData(freshSleepData, hrvData, spo2Data, brData, rhr);

                setStrainData(processedStrain);
                setRecoveryData(processedRecovery);
                setSleepData(processedSleepUpdated);

            } catch (error) {
                console.error("Error in main dashboard load", error);
                setErrors(prev => [...prev, `Main Load Error: ${error.message}`]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) return <div className="text-white p-4">Loading...</div>;

    const isRateLimited = errors.some(e => e.includes("Rate Limit Exceeded"));
    const sleepNeed = strainData ? calculateSleepNeed(strainData.score, 0) : 8; // Default 8 if no data

    // Check if journal is logged for today
    const today = new Date().toISOString().split('T')[0];
    const isJournalLogged = localStorage.getItem(`journal_${today}`);

    const getScoreColor = (score) => {
        if (score >= 67) return 'green';
        if (score >= 34) return 'yellow';
        return 'red';
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex justify-between items-center mb-8 pt-4">
                <div className="flex items-center gap-3">
                    {profile?.avatar && (
                        <img src={profile.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-700" />
                    )}
                    <h1 className="text-xl font-bold">{profile?.displayName || 'User'}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/settings')} className="text-gray-400 hover:text-white">
                        ⚙️
                    </button>
                    <button onClick={logout} className="text-xs text-gray-500 hover:text-white uppercase tracking-widest">Logout</button>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {!isJournalLogged && (
                    <button
                        onClick={() => navigate('/journal')}
                        className="w-full bg-blue-600/20 border border-blue-500/50 p-4 rounded-xl flex items-center justify-between hover:bg-blue-600/30 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">?</div>
                            <div className="text-left">
                                <h3 className="font-bold text-blue-100">Daily Journal</h3>
                                <p className="text-xs text-blue-300">Log yesterday's habits</p>
                            </div>
                        </div>
                        <span className="text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                )}

                {/* Permission Error Alert */}
                {errors.some(e => e.includes("403")) && (
                    <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3 text-red-100">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="font-bold">Missing Permissions</h3>
                                <p className="text-sm">Your current login session is missing permissions for SpO2, Sleep, or Activity data.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                logout();
                                window.location.reload();
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors w-full sm:w-auto self-end"
                        >
                            Reconnect Fitbit & Update Permissions
                        </button>
                    </div>
                )}

                {isRateLimited && (
                    <div className="bg-yellow-900/50 border border-yellow-600 p-4 rounded text-yellow-200 text-sm">
                        <p className="font-bold">⚠️ Fitbit API Rate Limit Reached</p>
                        <p className="mt-1">You have made too many requests recently. Fitbit limits requests to 150 per hour.</p>
                        <p className="mt-1">Please wait a while (up to an hour) for the limit to reset. I have implemented caching to prevent this in the future.</p>
                    </div>
                )}

                {/* DEBUG SECTION */}
                <div className="bg-gray-800 p-4 rounded text-xs font-mono overflow-auto max-h-60">
                    <h3 className="text-red-400 font-bold mb-2">DEBUG DATA</h3>
                    <p><strong>Profile:</strong> {profile ? 'Loaded' : 'Null'}</p>
                    <p><strong>Errors:</strong></p>
                    <ul className="list-disc pl-4 text-red-300">
                        {errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                    <p><strong>Strain Data:</strong> {JSON.stringify(strainData)}</p>
                    <p><strong>Raw HR Data (First bit):</strong> {JSON.stringify(hrDataRef.current).substring(0, 500)}</p>
                </div>

                {/* Main Metrics Carousel or Stack */}
                <div className="flex justify-center gap-4 overflow-x-auto pb-4">
                    <div onClick={() => navigate('/strain')} className="cursor-pointer transition-transform hover:scale-105">
                        <CircularMetric value={strainData.score} label="Strain" color="blue" size={160} />
                    </div>
                    <div onClick={() => navigate('/recovery')} className="cursor-pointer transition-transform hover:scale-105">
                        <CircularMetric value={recoveryData.score} label="Recovery" color={getScoreColor(recoveryData.score)} size={140} />
                    </div>
                    <div onClick={() => navigate('/sleep')} className="cursor-pointer transition-transform hover:scale-105">
                        <CircularMetric value={sleepData.score} label="Sleep" color={getScoreColor(sleepData.score)} size={140} />
                    </div>
                </div>

                {/* Sleep Need Card */}
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Sleep Need</h3>
                    <div className="flex justify-between items-end">
                        <div className="text-3xl font-bold">{sleepNeed.str}</div>
                        <div className="text-xs text-gray-500">Based on strain & debt</div>
                    </div>
                </Card>

                {/* Strain Coach */}
                <div className="bg-gradient-to-r from-blue-900 to-cyan-900 p-4 rounded-xl border border-blue-700">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-blue-200 text-xs uppercase tracking-wider font-bold">🎯 Strain Coach</h3>
                        <span className="text-xs bg-blue-950 text-blue-200 px-2 py-1 rounded">
                            {(() => {
                                const rec = recoveryData?.score || 0;
                                if (rec >= 67) return "Build";
                                if (rec >= 34) return "Maintain";
                                return "Recover";
                            })()}
                        </span>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-3xl font-bold text-white">
                                {(() => {
                                    const rec = recoveryData?.score || 0;
                                    if (rec >= 67) return "14 - 18";
                                    if (rec >= 34) return "10 - 14";
                                    return "< 10";
                                })()}
                            </p>
                            <p className="text-xs text-blue-300 mt-1">Recommended Strain</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-blue-200">Current: {strainData?.score || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Smart Insights */}
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-4 rounded-xl border border-indigo-700">
                    <h3 className="text-indigo-200 text-xs uppercase tracking-wider mb-2 font-bold">✨ Smart Insight</h3>
                    <p className="text-sm font-medium leading-relaxed">
                        {(() => {
                            const strain = strainData?.score || 0;
                            const recovery = recoveryData?.score || 0;
                            if (recovery < 33) return "Your body is stressed. Prioritize rest and active recovery today to bounce back.";
                            if (recovery > 66 && strain < 10) return "You are primed to perform! Consider a high-intensity workout to build fitness.";
                            if (recovery > 66 && strain > 14) return "Great job balancing high strain with high recovery. Keep it up!";
                            return "You are maintaining a balanced load. Listen to your body.";
                        })()}
                    </p>
                </div>

                {/* Quick Actions / Navigation */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => navigate('/trends')} className="bg-gray-800 p-4 rounded-xl text-left hover:bg-gray-700 transition-colors">
                        <h3 className="font-bold text-lg mb-1">Trends ↗</h3>
                        <p className="text-xs text-gray-400">View weekly progress</p>
                    </button>
                    <button onClick={() => navigate('/health')} className="bg-gray-800 p-4 rounded-xl text-left hover:bg-gray-700 transition-colors">
                        <h3 className="font-bold text-lg mb-1">Health Monitor ↗</h3>
                        <p className="text-xs text-gray-400">Live vitals & skin temp</p>
                    </button>
                    <button onClick={() => navigate('/activities')} className="bg-gray-800 p-4 rounded-xl text-left hover:bg-gray-700 transition-colors">
                        <h3 className="font-bold text-lg mb-1">Recent Workouts ↗</h3>
                        <p className="text-xs text-gray-400">Log of your sessions</p>
                    </button>
                    <button onClick={() => navigate('/report')} className="bg-gray-800 p-4 rounded-xl text-left hover:bg-gray-700 transition-colors">
                        <h3 className="font-bold text-lg mb-1">Weekly Report ↗</h3>
                        <p className="text-xs text-gray-400">Performance assessment</p>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Card onClick={() => navigate('/strain')}>
                        <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Activity</h3>
                        <div className="text-2xl font-bold">{strainData.activity} <span className="text-sm text-gray-500 font-normal">hrs</span></div>
                    </Card>
                    <Card onClick={() => navigate('/strain')}>
                        <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Calories</h3>
                        <div className="text-2xl font-bold">{strainData.calories.toLocaleString()} <span className="text-sm text-gray-500 font-normal">kcal</span></div>
                    </Card>
                </div>
            </div>
        </div >
    );
};

export default Dashboard;

