import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchSleep,
    fetchHRV,
    fetchSpO2,
    fetchBreathingRate,
    fetchHeartRate
} from '../services/fitbitApi';
import { processRecoveryData, getMockRecoveryData } from '../utils/calculations';
import Card from '../components/ui/Card';
import CircularMetric from '../components/ui/CircularMetric';

const RecoveryDetails = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [sleepData, hrvData, spo2Data, brData, hrData] = await Promise.all([
                    fetchSleep(),
                    fetchHRV(),
                    fetchSpO2(),
                    fetchBreathingRate(),
                    fetchHeartRate()
                ]);

                const rhr = hrData['activities-heart']?.[0]?.value?.restingHeartRate || 60;
                setData(processRecoveryData(sleepData, hrvData, spo2Data, brData, rhr));
            } catch (error) {
                console.error("Error fetching recovery details", error);
                // No mock fallback
                setData(processRecoveryData(null, null, null, null));
            }
        };
        loadData();
    }, []);

    if (!data) return <div className="text-white p-4">Loading...</div>;

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
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">HRV (Heart Rate Variability)</h3>
                    <div className="text-2xl font-bold">{data.hrv} <span className="text-sm text-gray-500 font-normal">ms</span></div>
                    <p className="text-xs text-gray-500 mt-1">Higher is generally better.</p>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Resting Heart Rate</h3>
                    <div className="text-2xl font-bold">{data.rhr} <span className="text-sm text-gray-500 font-normal">bpm</span></div>
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
        </div>
    );
};

export default RecoveryDetails;
