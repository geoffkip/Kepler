import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchHeartRate,
    fetchHRV,
    fetchSpO2,
    fetchBreathingRate,
    fetchSkinTemp
} from '../services/fitbitApi';
import { processRecoveryData, processSkinTempData } from '../utils/calculations';
import Card from '../components/ui/Card';

const HealthMonitor = () => {
    const navigate = useNavigate();
    const [vitals, setVitals] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [hrRes, hrvRes, spo2Res, brRes, tempRes] = await Promise.allSettled([
                    fetchHeartRate(),
                    fetchHRV(),
                    fetchSpO2(),
                    fetchBreathingRate(),
                    fetchSkinTemp()
                ]);

                const hrData = hrRes.status === 'fulfilled' ? hrRes.value : null;
                const hrvData = hrvRes.status === 'fulfilled' ? hrvRes.value : null;
                const spo2Data = spo2Res.status === 'fulfilled' ? spo2Res.value : null;
                const brData = brRes.status === 'fulfilled' ? brRes.value : null;
                const tempData = tempRes.status === 'fulfilled' ? tempRes.value : null;

                const rhr = hrData?.['activities-heart']?.[0]?.value?.restingHeartRate || 0;
                // We reuse processRecoveryData to extract most vitals
                const recoveryMetrics = processRecoveryData(null, hrvData, spo2Data, brData, rhr);
                const skinTemp = processSkinTempData(tempData);

                setVitals({
                    rhr: recoveryMetrics.rhr,
                    hrv: recoveryMetrics.hrv,
                    spo2: recoveryMetrics.spo2,
                    br: recoveryMetrics.respiratoryRate,
                    skinTemp: skinTemp.current
                });

            } catch (error) {
                console.error("Error loading health monitor", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="text-white p-4">Loading Health Monitor...</div>;

    const getStatusColor = (val, type) => {
        if (val === 0) return 'text-gray-500';
        // Simple mock thresholds
        if (type === 'hrv' && val < 30) return 'text-red-400';
        if (type === 'spo2' && val < 95) return 'text-red-400';
        return 'text-green-400';
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 mr-4">← Back</button>
                <h1 className="text-2xl font-bold">Health Monitor</h1>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Resting HR</h3>
                    <div className={`text-3xl font-bold ${getStatusColor(vitals?.rhr, 'rhr')}`}>
                        {vitals?.rhr ?? '--'} <span className="text-sm text-gray-500 font-normal">bpm</span>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">HRV</h3>
                    <div className={`text-3xl font-bold ${getStatusColor(vitals?.hrv, 'hrv')}`}>
                        {vitals?.hrv ? Math.round(vitals.hrv) : '--'} <span className="text-sm text-gray-500 font-normal">ms</span>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">SpO2</h3>
                    <div className={`text-3xl font-bold ${getStatusColor(vitals?.spo2, 'spo2')}`}>
                        {vitals?.spo2 ?? '--'} <span className="text-sm text-gray-500 font-normal">%</span>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Respiratory Rate</h3>
                    <div className={`text-3xl font-bold ${getStatusColor(vitals?.br, 'br')}`}>
                        {vitals?.br ?? '--'} <span className="text-sm text-gray-500 font-normal">rpm</span>
                    </div>
                </Card>

                <Card className="col-span-2">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Skin Temperature</h3>
                    <div className="flex items-end gap-2">
                        <div className={`text-3xl font-bold ${vitals?.skinTemp > 1 ? 'text-red-400' : 'text-green-400'}`}>
                            {vitals?.skinTemp !== undefined && vitals?.skinTemp !== null ? (
                                <>
                                    {vitals.skinTemp > 0 ? '+' : ''}{Number(vitals.skinTemp).toFixed(1)}°C
                                </>
                            ) : '--'}
                        </div>
                        <span className="text-sm text-gray-500 mb-1">deviation from baseline</span>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default HealthMonitor;
