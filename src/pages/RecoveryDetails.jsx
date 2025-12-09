import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchSleep,
    fetchHRV,
    fetchSpO2,
    fetchBreathingRate,
    fetchHeartRate,
    fetchHRVHistory

} from '../services/fitbitApi';
import { processRecoveryData, calculateLeanMass, processCardioScore, getMockRecoveryData } from '../utils/calculations';
import Card from '../components/ui/Card';
import CircularMetric from '../components/ui/CircularMetric';

const RecoveryDetails = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch basic data AND history for baselines
                const results = await Promise.allSettled([
                    fetchSleep(),
                    fetchHRV(),
                    fetchSpO2(),
                    fetchBreathingRate(),
                    fetchHeartRate(),
                    // History for Baselines (30 days)
                    fetchHRVHistory(30),
                    fetchHeartRate('today', '30d')
                ]);

                const sleepData = results[0].status === 'fulfilled' ? results[0].value : null;
                const hrvData = results[1].status === 'fulfilled' ? results[1].value : null;
                const spo2Data = results[2].status === 'fulfilled' ? results[2].value : null;
                const brData = results[3].status === 'fulfilled' ? results[3].value : null;
                const hrData = results[4].status === 'fulfilled' ? results[4].value : null;
                const hrvHist = results[5].status === 'fulfilled' ? results[5].value : null;
                const rhrHist = results[6].status === 'fulfilled' ? results[6].value : null;

                // Calculate Baselines
                const { calculateBaselines } = await import('../utils/calculations');

                let baselines = { hrv: null, rhr: null };

                if (hrvHist?.hrv) {
                    const values = hrvHist.hrv.map(d => d.value?.dailyRmssd).filter(n => n > 0);
                    baselines.hrv = calculateBaselines(values);
                }

                if (rhrHist?.['activities-heart']) {
                    const values = rhrHist['activities-heart'].map(d => d.value?.restingHeartRate).filter(n => n > 0);
                    baselines.rhr = calculateBaselines(values);
                }

                const rhr = hrData ? (hrData['activities-heart']?.[0]?.value?.restingHeartRate || 60) : 60;

                // Pass baselines to processor
                const baseData = processRecoveryData(sleepData, hrvData, spo2Data, brData, rhr, null, baselines);

                setData({
                    ...baseData
                });
            } catch (error) {
                console.error("Critical error fetching recovery details", error);
                setData(processRecoveryData(null, null, null, null));
            }
        };
        loadData();
    }, []);

    if (!data) return <div className="text-white p-4">Loading...</div>;

    // Helper to format range
    const formatRange = (b) => {
        if (!b) return "No Data";
        const min = Math.round(b.mean - b.stdDev);
        const max = Math.round(b.mean + b.stdDev);
        return `${min}-${max}`;
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 mr-4">
                    &larr; Back
                </button>
                <h1 className="text-2xl font-bold">Recovery Details</h1>
            </div>

            <div className="flex justify-center mb-8">
                <CircularMetric value={data.score} label="Recovery" color="green" size={200} />
            </div>

            <div className="grid grid-cols-1 gap-4">
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">HRV (Heart Rate Variability)</h3>
                            <div className="text-2xl font-bold">{Math.round(Number(data.hrv || 0))} <span className="text-sm text-gray-500 font-normal">ms</span></div>
                        </div>
                        {data.baselines?.hrv && (
                            <div className="text-right">
                                <p className="text-xs text-gray-500">30 Day Avg</p>
                                <p className="text-sm font-semibold text-blue-400">{Math.round(data.baselines.hrv.mean)} ms</p>
                                <p className="text-[10px] text-gray-600">Range: {formatRange(data.baselines.hrv)}</p>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Higher is generally better.</p>
                </Card>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Resting Heart Rate</h3>
                            <div className="text-2xl font-bold">{data.rhr} <span className="text-sm text-gray-500 font-normal">bpm</span></div>
                        </div>
                        {data.baselines?.rhr && (
                            <div className="text-right">
                                <p className="text-xs text-gray-500">30 Day Avg</p>
                                <p className="text-sm font-semibold text-blue-400">{Math.round(data.baselines.rhr.mean)} bpm</p>
                                <p className="text-[10px] text-gray-600">Range: {formatRange(data.baselines.rhr)}</p>
                            </div>
                        )}
                    </div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Respiratory Rate</h3>
                    <div className="text-2xl font-bold">{data.respiratoryRate} <span className="text-sm text-gray-500 font-normal">rpm</span></div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">SpO2</h3>
                    <div className="text-2xl font-bold">{data.spo2}%</div>
                </Card>
            </div>
        </div >
    );
};

export default RecoveryDetails;
