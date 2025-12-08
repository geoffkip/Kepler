import React from 'react';

const CircularMetric = ({ value, label, color = 'blue', size = 120, strokeWidth = 8, max = 100, target = null }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // Cap percentage at 100% for the ring fill, but allow value to show higher
    const percentage = Math.min((value / max), 1);
    const offset = circumference - percentage * circumference;

    const colorMap = {
        blue: 'text-blue-500',
        red: 'text-red-500',
        green: 'text-green-500',
        yellow: 'text-yellow-500',
        purple: 'text-purple-500', // For overreaching
    };

    // Determine color: If explicit, use it. If passed target and exceeded, use 'purple' (Overreaching) or Keep 'blue' but style differently?
    // Whoop turns "Overreaching" red usually if recovery is low, or keeps it blue if high.
    // Let's stick to the passed color mostly, but if we exceed target significantly, we could flag it.
    // User asked: "show if the strain goes past the target strain".
    // I will simply let the fill go past the target line visible. 
    // If value > target, the bar naturally passes the line.

    // However, if we want a specific "Overreaching" color shift (optional):
    const activeColor = (target && value > target) ? 'text-purple-500' : (colorMap[color] || colorMap.blue);

    // Target Line Logic
    const renderTargetLine = () => {
        if (!target) return null;
        const targetPercentage = Math.min((target / max), 1);
        const rotation = targetPercentage * 360;

        return (
            <div
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ transform: `rotate(${rotation}deg)` }}
            >
                <div
                    className="absolute top-0 left-1/2 -ml-[1px] w-[2px] bg-white shadow-[0_0_2px_rgba(0,0,0,0.8)] z-10"
                    style={{ height: strokeWidth + 4, marginTop: -2 }}
                />
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center relative">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="text-gray-800"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className={`${activeColor} transition-all duration-1000 ease-out`}
                    />
                </svg>

                {renderTargetLine()}

                <div className="absolute inset-0 flex flex-col items-center justify-center text-white" style={{ transform: 'none' }}>
                    <span className="text-3xl font-bold">{value}</span>
                    <span className="text-xs uppercase tracking-wider text-gray-400">{label}</span>
                </div>
            </div>
            {target && value > target && (
                <div className="absolute -bottom-6 text-[10px] text-purple-300 font-bold uppercase tracking-widest bg-purple-900/50 px-2 py-0.5 rounded-full border border-purple-500/30">
                    Overreaching
                </div>
            )}
        </div>
    );
};

export default CircularMetric;
