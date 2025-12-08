
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHeartRate, fetchActivitySummary, fetchStressScore } from '../services/fitbitApi';
import {
    processStrainData,
    processStressScore,
    formatDuration,
    getMockStrainData
} from '../utils/calculations';
import Card from '../components/ui/Card';
import CircularMetric from '../components/ui/CircularMetric';

const StrainDetails = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const results = await Promise.allSettled([
                    fetchHeartRate(),
                    fetchActivitySummary()
                ]);

                const hrData = results[0].status === 'fulfilled' ? results[0].value : null;
                const activityData = results[1].status === 'fulfilled' ? results[1].value : null;

                const baseStrain = processStrainData(hrData, activityData);

                setData({ ...baseStrain });
            } catch (error) {
                console.error("Critical error in strain data processing", error);
                setData(processStrainData(null, null));
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
                <h1 className="text-2xl font-bold">Strain Details</h1>
            </div>

            <div className="flex justify-center mb-8">
                <CircularMetric value={data.score} label="Strain" color="blue" size={200} />
            </div>

            <div className="grid grid-cols-1 gap-4">
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Active Time</h3>
                    <div className="text-2xl font-bold">{formatDuration(data.activity)}</div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Calories</h3>
                    <div className="text-2xl font-bold">{data.calories.toLocaleString()} <span className="text-sm text-gray-500 font-normal">kcal</span></div>
                </Card>

                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Steps</h3>
                    <div className="text-2xl font-bold">{data.steps?.toLocaleString()}</div>
                </Card>
                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Heart Rate</h3>
                    <div className="flex justify-between">
                        <div>
                            <div className="text-xs text-gray-500">Average</div>
                            <div className="text-xl font-bold">{data.averageHeartRate} <span className="text-sm text-gray-500 font-normal">bpm</span></div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Max</div>
                            <div className="text-xl font-bold">{data.maxHeartRate} <span className="text-sm text-gray-500 font-normal">bpm</span></div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Heart Rate Zones</h3>
                    <div className="space-y-3">
                        {data.zones.map((zone) => (
                            <div key={zone.name}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{zone.name} ({zone.min}-{zone.max})</span>
                                    <span className="text-gray-400">{zone.time} min</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500"
                                        style={{ width: `${(zone.time / 60) * 100}% ` }} // Rough percentage for demo
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div >
        </div >
    );
};

export default StrainDetails;

