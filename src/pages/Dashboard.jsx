import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchProfile,
    fetchHeartRate,
    fetchSleep,
    fetchHRV,
    fetchSpO2,
    fetchBreathingRate,
    fetchActivitySummary,
    fetchSkinTemp,
    fetchSleepHistory
} from '../services/fitbitApi';
import { logout, getAccessToken } from '../services/auth';
import CircularMetric from '../components/ui/CircularMetric';
import Card from '../components/ui/Card';
import {
    processStrainData,
    processRecoveryData,
    processSleepData,
    processSkinTempData,
    calculateSleepNeed,
    calculateSleepDebt,
    formatDuration,
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
                const token = await getAccessToken();
                // alert(`Dashboard Mount.Token: ${ token ? 'OK' : 'MISSING' } `); // Optional verify

                // Initialize with empty/zero data so we can render even if fetch fails
                setStrainData(processStrainData(null, null));
                setRecoveryData(processRecoveryData(null, null, null, null, null)); // Added null for rhr
                setSleepData(processSleepData(null));

                const profileData = await fetchProfile();
                setProfile(profileData.user);

                setProfile(profileData.user);

                // SEQUENTIAL EXECUTION STRATEGY
                // We execute one by one to avoid overwhelming the mobile network stack
                // and to isolate failures more clearly.

                const results = [];

                // Helper to safely fetch
                const safeFetch = async (name, promise) => {
                    try {
                        const value = await promise;
                        return { status: 'fulfilled', value };
                    } catch (reason) {
                        return { status: 'rejected', reason };
                    }
                };

                // 1. Heart Rate
                results.push(await safeFetch('Heart Rate', fetchHeartRate()));

                // 2. Sleep
                results.push(await safeFetch('Sleep', fetchSleep()));

                // 3. HRV
                results.push(await safeFetch('HRV', fetchHRV()));

                // 4. SpO2
                results.push(await safeFetch('SpO2', fetchSpO2()));

                // 5. Breathing Rate
                results.push(await safeFetch('Breathing Rate', fetchBreathingRate()));

                // 6. Activity
                results.push(await safeFetch('Activity', fetchActivitySummary()));

                const { calculateSleepDebt, calculateSleepConsistency, formatDuration } = await import('../utils/calculations'); // Dynamic import for safety

                // 7. Sleep History (for Debt calculation)
                results.push(await safeFetch('Sleep History', fetchSleepHistory(7)));

                const [hrResult, sleepResult, hrvResult, spo2Result, brResult, activityResult, historyResult] = results;

                // Collect errors and successes
                const newErrors = [];
                const debugMessages = [];

                results.forEach((result, index) => {
                    const apiNames = ['Heart Rate', 'Sleep', 'HRV', 'SpO2', 'Breathing Rate', 'Activity', 'Sleep History'];
                    const name = apiNames[index];

                    if (result.status === 'rejected') {
                        console.error(`API Call ${name} failed:`, result.reason);
                        // Extract concise error (e.g. "Error: 403 Forbidden" or "TypeError...")
                        const errorMsg = result.reason.message || String(result.reason);
                        newErrors.push(`${name}: ${errorMsg}`);
                        debugMessages.push(`${name}: ❌ ${errorMsg}`);
                    } else {
                        const val = result.value;
                        let sizeInfo = "0";

                        // Specific size checks per type
                        if (index === 0) sizeInfo = val?.['activities-heart']?.length || 0; // HR
                        if (index === 1) sizeInfo = val?.sleep?.length || 0; // Sleep
                        if (index === 2) sizeInfo = val?.hrv?.length || 0; // HRV
                        if (index === 3) sizeInfo = val?.value?.avg ? "1" : "0"; // SpO2 (single day usually has avg)
                        if (index === 4) sizeInfo = val?.br?.length || 0; // BR
                        if (index === 5) sizeInfo = val?.summary ? "OK" : "Empty"; // Activity
                        if (index === 6) sizeInfo = val?.sleep?.length || 0; // Sleep History

                        console.log(`${name} Success. Size: ${sizeInfo}`);
                        debugMessages.push(`${name}: ✅ (${sizeInfo})`);
                    }
                });

                // Consolidated Alert - REMOVED for production
                if (newErrors.length > 0) {
                    console.error("Dashboard Errors:", newErrors);
                    // Optional: Toast or non-intrusive notification
                } else {
                    console.log("Dashboard Loaded Successfully");
                }

                setErrors(newErrors);

                const activityData = activityResult.status === 'fulfilled' ? activityResult.value : null;
                const hrData = hrResult.status === 'fulfilled' ? hrResult.value : null;
                const hrvData = hrvResult.status === 'fulfilled' ? hrvResult.value : null;
                const spo2Data = spo2Result.status === 'fulfilled' ? spo2Result.value : null;
                const brData = brResult.status === 'fulfilled' ? brResult.value : null;
                // New:
                const sleepHistory = historyResult.status === 'fulfilled' ? historyResult.value : null;
                const debt = calculateSleepDebt(sleepHistory);

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

                // Store calculated debt in state if needed, or just derived? 
                // Let's store it in a new state or just calculate derived.
                // Actually simpler to store derived data in a state object "metrics" or just use local vars.
                // For now, let's put it in a Ref or just calculate during render if we had state. 
                // Wait, logic is: render depends on state. We need to set state.
                // Let's add `debt` to `sleepData` or separate state. 
                // easiest is setSleepData({...processedSleepUpdated, debt})

                setSleepData({
                    ...processedSleepUpdated,
                    debt: debt
                });

            } catch (error) {
                console.error("Error in main dashboard load", error);
                setErrors(prev => [...prev, `Main Load Error: ${error.message} `]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) return <div className="text-white p-4">Loading...</div>;


    // Calculate Sleep Need using State data
    // Need = Baseline + Strain + Debt
    const currentStrain = strainData?.score || 0;
    const currentDebt = sleepData?.debt || 0;
    const { str: sleepNeedStr } = calculateSleepNeed(currentStrain, currentDebt);



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





                {/* Main Metrics Carousel or Stack */}
                {/* Main Metrics - Compact Single Row */}
                <div className="grid grid-cols-3 gap-2 w-full justify-items-center">
                    {/* Strain Target Calculation */}
                    {(() => {
                        const rec = recoveryData?.score || 0;
                        let targetStrain = 10;
                        if (rec >= 67) targetStrain = 18;
                        else if (rec >= 34) targetStrain = 14;

                        return (
                            <div onClick={() => navigate('/strain')} className="cursor-pointer transition-transform hover:scale-105">
                                <CircularMetric
                                    value={strainData.score}
                                    label="Strain"
                                    color="blue"
                                    size={105}
                                    max={21}
                                    target={targetStrain}
                                />
                            </div>
                        );
                    })()}
                    <div onClick={() => navigate('/recovery')} className="cursor-pointer transition-transform hover:scale-105">
                        <CircularMetric value={Math.round(recoveryData.score * 10) / 10} label="Recovery" color={getScoreColor(recoveryData.score)} size={105} />
                    </div>
                    <div onClick={() => navigate('/sleep')} className="cursor-pointer transition-transform hover:scale-105">
                        <CircularMetric value={sleepData.score} label="Sleep" color={getScoreColor(sleepData.score)} size={105} />
                    </div>
                </div>

                {/* Sleep Need Card */}
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Sleep Need</h3>
                    <div className="flex justify-between items-end">
                        <div className="text-3xl font-bold">{sleepNeedStr}</div>
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


            </div>
        </div >
    );
};

export default Dashboard;

