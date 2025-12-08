import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRecentActivities } from '../services/fitbitApi';
import Card from '../components/ui/Card';

const Activities = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const LIMIT = 20;

    const loadData = async (currentOffset) => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchRecentActivities(LIMIT, currentOffset);
            const newActivities = data.activities || [];

            if (newActivities.length < LIMIT) {
                setHasMore(false);
            }

            if (currentOffset === 0) {
                setActivities(newActivities);
            } else {
                setActivities(prev => [...prev, ...newActivities]);
            }
        } catch (error) {
            console.error("Error loading activities", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(0);
    }, []);

    const handleLoadMore = () => {
        const newOffset = offset + LIMIT;
        setOffset(newOffset);
        loadData(newOffset);
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 mr-4">← Back</button>
                <h1 className="text-2xl font-bold">Recent Workouts</h1>
            </div>

            <div className="space-y-4">
                {error && (
                    <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl text-red-200 mb-4">
                        <h3 className="font-bold">Error Loading Activities</h3>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {activities.length === 0 && !loading && !error ? (
                    <div className="text-gray-500 text-center py-10">No recent activities found.</div>
                ) : (
                    activities.map((activity, index) => (
                        <Card key={`${activity.logId}-${index}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{activity.activityName}</h3>
                                    <p className="text-xs text-gray-400">
                                        {new Date(activity.startTime).toLocaleDateString()} • {new Date(activity.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-blue-400">{activity.calories} <span className="text-xs text-gray-500 font-normal">kcal</span></div>
                                    <div className="text-xs text-gray-400">
                                        {Math.round(activity.duration / 60000)} min
                                        {activity.averageHeartRate && ` • ${activity.averageHeartRate} bpm`}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}

                {loading && <div className="text-center text-gray-500 py-4">Loading...</div>}

                {!loading && hasMore && activities.length > 0 && (
                    <button
                        onClick={handleLoadMore}
                        className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors mt-4"
                    >
                        Load More
                    </button>
                )}
            </div>
        </div>
    );
};

export default Activities;
