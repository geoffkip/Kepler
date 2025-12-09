export const calculateStrain = (heartRateData) => {
    if (!heartRateData) return 0;
    // In a real app, we would calculate this from HR data
    return 14.5;
};

export const calculateRecovery = (sleepData) => {
    if (!sleepData) return 0;
    return 67;
};

export const calculateSleepScore = (sleepData) => {
    if (!sleepData) return 0;
    return 82;
};

export const processStrainData = (hrData, activityData) => {
    if (!hrData || !activityData) {
        return {
            score: 0,
            activity: 0,
            calories: 0,
            averageHeartRate: 0,
            maxHeartRate: 0,
            zones: []
        };
    }

    const summary = activityData.summary || {};
    const heartRateZones = hrData['activities-heart']?.[0]?.value?.heartRateZones || [];

    // Calculate a mock strain score based on activity if real strain isn't available
    // (Fitbit doesn't have a direct "Strain" score like Whoop, so we approximate)
    const activeMinutes = (summary.veryActiveMinutes || 0) + (summary.fairlyActiveMinutes || 0);
    const strainScore = Math.min(21, Math.max(0, (activeMinutes / 60) * 4 + (summary.caloriesOut / 2000) * 6));

    return {
        score: parseFloat(strainScore.toFixed(1)),
        activity: parseFloat(((activeMinutes + (summary.lightlyActiveMinutes || 0)) / 60).toFixed(1)),
        calories: summary.caloriesOut || 0,
        averageHeartRate: hrData['activities-heart']?.[0]?.value?.restingHeartRate || 0,
        maxHeartRate: 190,
        zones: heartRateZones.map(z => ({
            name: z.name,
            min: z.min,
            max: z.max,
            time: z.minutes
        })),
        steps: summary.steps || 0 // NEW: Steps
    };
};

export const processSkinTempData = (tempData) => {
    if (!tempData || !tempData.tempSkin) return { current: 0, log: [] };

    // Fitbit returns relative skin temp
    const latest = tempData.tempSkin[0]?.value?.nightlyRelative || 0;
    return {
        current: latest,
        log: tempData.tempSkin
    };
};

// Helper to get formatted time
export const formatDuration = (decimalHours) => {
    if (!decimalHours && decimalHours !== 0) return "--";
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
};

// Deprecated local helper, mapping to new export for safety if used fast
const formatHrs = (d) => {
    const res = formatDuration(d); // returns string "7h 30m"
    // The old formatHrs returned object { h, m, str }. 
    // Let's keep the old signature for calculateSleepNeed to avoid breaking it yet, 
    // or just refactor calculateSleepNeed to use formatDuration for its string part.
    const h = Math.floor(d);
    const m = Math.round((d - h) * 60);
    return { h, m, str: `${h}h ${m}m` };
};

export const calculateSleepNeed = (strainScore, sleepDebt = 0) => {
    const baseline = 7.5; // Baseline sleep need in hours
    const strainLoad = (strainScore / 21) * 1.5; // Up to 1.5 hours extra for max strain
    const debt = sleepDebt; // Sleep debt from previous nights

    const totalHours = baseline + strainLoad + debt;
    return formatHrs(totalHours); // Returns { h, m, str }
};

export const calculateTargetStrain = (recoveryScore) => {
    if (recoveryScore >= 67) return { min: 14, max: 18, label: "High Strain" };
    if (recoveryScore >= 34) return { min: 10, max: 14, label: "Moderate Strain" };
    return { min: 0, max: 10, label: "Rest / Active Recovery" };
};

export const calculateBaselines = (dataArray) => {
    if (!dataArray || dataArray.length < 2) return null;

    // Filter out zeros or nulls
    const valid = dataArray.filter(v => v > 0);
    if (valid.length < 2) return null;

    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const squareDiffs = valid.map(v => Math.pow(v - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    return { mean, stdDev };
};

export const processRecoveryData = (sleepData, hrvData, spo2Data, brData, rhr = 0, skinTempData = null, baselines = null) => {
    // 1. Sleep Score (40%)
    // Usage: Direct efficiency score from Fitbit (0-100)
    const sleepScore = sleepData?.sleep?.[0]?.efficiency || 0;

    // 2. HRV Score (40%) - "Smart" vs "Static"
    const hrv = hrvData?.hrv?.[0]?.value?.dailyRmssd || 0;
    let hrvScore = 0;

    if (baselines?.hrv) {
        // Personalized: Compare to 30-day baseline
        const { mean, stdDev } = baselines.hrv;
        // If within 1 SD of mean (or higher), full score.
        // If below mean - 1 SD, start penalizing.
        // Formula: Z-Score based.
        // Target: Mean.

        if (hrv >= mean - stdDev) {
            // Good zone (Average or better)
            // Bonus for being way higher? Cap at 100.
            hrvScore = 100;
        } else {
            // Below normal range (Mean - 1SD)
            // Example: Mean 50, SD 5. Data 40 (2 SD drops).
            // Drop linearly: 100 at (Mean-SD), 0 at (Mean-3SD).
            const lowerBound = mean - stdDev; // Score 100 threshold
            const zeroBound = mean - (3 * stdDev); // Score 0 threshold
            const range = lowerBound - zeroBound;

            const pct = (hrv - zeroBound) / range;
            hrvScore = Math.max(0, Math.min(100, pct * 100));
        }
    } else {
        // Fallback: Static Benchmark (80ms = 100)
        hrvScore = Math.min(100, (hrv / 80) * 100);
    }

    // 3. RHR Score (20%) - "Smart" vs "Static"
    let rhrScore = 0;
    if (baselines?.rhr) {
        // Personalized: Compare to 30-day baseline
        const { mean, stdDev } = baselines.rhr;

        // RHR: Lower is better.
        // If rhr <= mean + stdDev, good score.
        // If rhr > mean + stdDev, penalize.

        if (rhr <= mean + stdDev) {
            rhrScore = 100;
        } else {
            // Higher than normal range (Mean + 1SD)
            // Linearly drop to 0 at Mean + 3SD
            const upperBound = mean + stdDev; // Score 100 threshold
            const failBound = mean + (3 * stdDev); // Score 0 threshold
            const range = failBound - upperBound;

            // If RHR=60, Upper=50, Fail=60 -> Score 0.
            const diff = rhr - upperBound;
            const pct = 1 - (diff / range);
            rhrScore = Math.max(0, Math.min(100, pct * 100));
        }
    } else {
        // Fallback: Static Benchmark (40bpm = 100)
        rhrScore = rhr > 0 ? Math.max(0, 100 - (rhr - 40)) : 0;
    }


    // Weighted Average
    let score = 0;
    let divisor = 0;

    if (sleepScore > 0) { score += sleepScore * 0.4; divisor += 0.4; }

    // Always include HRV/RHR weights even if current data is 0 (it will just drag score down properly)
    // But if we have NO data (hrv=0), maybe exclude?
    // Let's stick to "If we have a value, weight it".
    if (hrv > 0) { score += hrvScore * 0.4; divisor += 0.4; }
    if (rhr > 0) { score += rhrScore * 0.2; divisor += 0.2; }

    const finalRecovery = divisor > 0 ? Math.round(score / divisor) : 0;

    // SpO2, BR, SkinTemp remain raw
    const spo2 = spo2Data?.value?.avg || 0;
    const br = brData?.br?.[0]?.value?.breathingRate || 0;
    const skinTemp = skinTempData?.tempSkin?.[0]?.value?.nightlyRelative || 0;

    return {
        score: finalRecovery,
        hrv: hrv,
        rhr: rhr,
        respiratoryRate: br,
        spo2: spo2,
        skinTemp: skinTemp,
        // Pass back baselines for UI display
        baselines: baselines
    };
};

export const processSleepData = (sleepData) => {
    if (!sleepData || !sleepData.sleep || sleepData.sleep.length === 0) {
        return {
            score: 0,
            startTime: null,
            endTime: null,
            totalSleep: 0,
            timeInBed: 0,
            stages: { deep: 0, light: 0, rem: 0, awake: 0 },
            restorative: { hours: 0, percentage: 0 }
        };
    }

    const mainSleep = sleepData.sleep.find(s => s.isMainSleep) || sleepData.sleep[0];
    const summary = mainSleep.levels?.summary || {};

    let deep = 0, light = 0, rem = 0, awake = 0;

    if (summary.deep || summary.light || summary.rem) {
        deep = summary.deep?.minutes || 0;
        light = summary.light?.minutes || 0;
        rem = summary.rem?.minutes || 0;
        awake = summary.wake?.minutes || 0;
    } else if (summary.asleep) {
        light = summary.asleep?.minutes || 0;
        awake = (summary.awake?.minutes || 0) + (summary.restless?.minutes || 0);
    }

    const minutesAsleep = mainSleep.minutesAsleep || 0;
    const timeInBed = mainSleep.timeInBed || 0;

    return {
        score: mainSleep.efficiency || 0,
        startTime: mainSleep.startTime,
        endTime: mainSleep.endTime,
        totalSleep: parseFloat((minutesAsleep / 60).toFixed(1)),
        timeInBed: parseFloat((timeInBed / 60).toFixed(1)),
        stages: {
            deep: parseFloat((deep / 60).toFixed(1)),
            light: parseFloat((light / 60).toFixed(1)),
            rem: parseFloat((rem / 60).toFixed(1)),
            awake: parseFloat((awake / 60).toFixed(1))
        },
        restorative: {
            hours: parseFloat(((deep + rem) / 60).toFixed(1)),
            percentage: minutesAsleep > 0 ? Math.round(((deep + rem) / minutesAsleep) * 100) : 0
        }
    };
};

export const calculateSleepConsistency = (sleepHistory) => {
    if (!sleepHistory || !sleepHistory.sleep || sleepHistory.sleep.length < 2) return 100;

    const bedtimes = [];
    const waketimes = [];

    sleepHistory.sleep.forEach(log => {
        if (!log.startTime || !log.endTime) return;

        const start = new Date(log.startTime);
        const end = new Date(log.endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

        const getMinutesFromNoon = (date) => {
            let minutes = date.getHours() * 60 + date.getMinutes();
            if (date.getHours() < 12) {
                minutes += 24 * 60;
            }
            return minutes;
        };

        bedtimes.push(getMinutesFromNoon(start));
        waketimes.push(getMinutesFromNoon(end));
    });

    const calculateSD = (data) => {
        if (data.length < 2) return 0;
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const squareDiffs = data.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    };

    const bedSD = calculateSD(bedtimes);
    const wakeSD = calculateSD(waketimes);

    const totalDeviation = bedSD + wakeSD;
    const consistencyScore = Math.max(0, 100 - (totalDeviation * 0.3));

    return Math.round(consistencyScore) || 0; // Prevent NaN
};

export const calculateSleepDebt = (sleepHistory) => {
    // Calculate accumulated debt over the fetched history period (e.g. 7 days).
    if (!sleepHistory || !sleepHistory.sleep) return 0;

    const baselineNeed = 8.0; // Standard 8 hour baseline.
    let totalDebt = 0;

    // Use up to 7 recent entries
    const recentSleep = sleepHistory.sleep.slice(0, 7);

    recentSleep.forEach(log => {
        const hours = (log.minutesAsleep || 0) / 60;
        const diff = baselineNeed - hours;
        // If diff is positive (underslept), debt increases.
        // If diff is negative (overslept), debt decreases (payback).
        totalDebt += diff;
    });

    // Debt cannot be negative.
    // Cap debt at 2.0 hours max to ensure Sleep Need stays realistic (e.g. max 10h total).
    const cappedDebt = Math.min(2.0, totalDebt);
    return Math.max(0, parseFloat(cappedDebt.toFixed(1)));
};

export const calculateLeanMass = (weightData, fatData) => {
    // weightData and fatData might now be arrays (logs) due to '1m' fetch.
    // Pick the last entry (most recent).

    // Weight can be { weight: [...] } or just { weight: [] }
    const weightLogs = weightData?.weight || [];
    const fatLogs = fatData?.fat || [];

    const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 0;
    const latestFat = fatLogs.length > 0 ? fatLogs[fatLogs.length - 1].fat : 0;

    if (!latestWeight) return { weight: 0, leanMass: 0, fatPct: 0 };

    const leanPct = 100 - latestFat;
    const leanMass = (latestWeight * leanPct) / 100;

    return {
        weight: parseFloat(latestWeight.toFixed(1)),
        leanMass: parseFloat(leanMass.toFixed(1)),
        fatPct: parseFloat(latestFat.toFixed(1))
    };
};

export const processCardioScore = (cardioData) => {
    // VO2 Max is usually in cardioScore[index].value.vo2Max
    // We fetched 1m range, so find the latest entry.
    const logs = cardioData?.cardioScore || [];
    if (logs.length === 0) return "--";

    const latest = logs[logs.length - 1];
    return latest.value?.vo2Max || "--";
};

export const processStressScore = (stressData) => {
    // Fitbit Stress Management Score: 0-100
    // stressData might be an array if we fetched a range, or object if single day?
    // Usually it's { stress: [ { ... } ] }
    if (!stressData || !stressData.stress) return 0;
    // Pick latest
    const latest = stressData.stress[stressData.stress.length - 1];
    return latest?.value || 0;
};

export const getMockStrainData = () => ({
    score: 14.5,
    activity: 4.2, // hours
    calories: 2140,
    averageHeartRate: 135,
    maxHeartRate: 178,
    zones: [
        { name: 'Zone 1', min: 0, max: 100, time: 30 }, // minutes
        { name: 'Zone 2', min: 101, max: 120, time: 45 },
        { name: 'Zone 3', min: 121, max: 140, time: 60 },
        { name: 'Zone 4', min: 141, max: 160, time: 40 },
        { name: 'Zone 5', min: 161, max: 190, time: 20 },
    ]
});

export const getMockRecoveryData = () => ({
    score: 67,
    hrv: 42, // ms
    rhr: 58, // bpm
    respiratoryRate: 14.5, // rpm
    spo2: 96, // %
});

export const getMockSleepData = () => ({
    score: 82,
    startTime: '2023-10-26T23:15:00',
    endTime: '2023-10-27T07:30:00',
    totalSleep: 7.5, // hours
    stages: {
        deep: 1.5, // hours
        light: 4.2,
        rem: 1.8,
        awake: 0.5
    }
});
