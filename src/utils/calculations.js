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
        }))
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
const formatHrs = (decimalHours) => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return { h, m, str: `${h}h ${m}m` };
};

export const calculateSleepNeed = (strainScore, sleepDebt = 0) => {
    const baseline = 7.5; // Baseline sleep need in hours
    const strainLoad = (strainScore / 21) * 1.5; // Up to 1.5 hours extra for max strain
    const debt = sleepDebt; // Sleep debt from previous nights

    const totalHours = baseline + strainLoad + debt;
    return formatHrs(totalHours);
};

export const calculateTargetStrain = (recoveryScore) => {
    if (recoveryScore >= 67) return { min: 14, max: 18, label: "High Strain" };
    if (recoveryScore >= 34) return { min: 10, max: 14, label: "Moderate Strain" };
    return { min: 0, max: 10, label: "Rest / Active Recovery" };
};

export const processRecoveryData = (sleepData, hrvData, spo2Data, brData, rhr = 0, skinTempData = null) => {
    // HRV - Normalizing mock logic (Whoop scale: 0-100ish, but varies wildly by person)
    // We treat 100ms as "high" (100% contribution) for this simple calc
    const hrv = hrvData?.hrv?.[0]?.value?.dailyRmssd || 0;

    // Sleep Score (Fitbit provides 0-100)
    const sleepScore = sleepData?.sleep?.[0]?.efficiency || 0;

    // RHR Contribution (Lower is better, assume 40 is max score, 100 is min score)
    // This is a rough approximation.
    const rhrScore = rhr > 0 ? Math.max(0, 100 - (rhr - 40)) : 0;

    // Components weights: Sleep 40%, HRV 40%, RHR 20%
    // If data is missing, we re-weight.

    let score = 0;
    let divisor = 0;

    if (sleepScore > 0) {
        score += sleepScore * 0.4;
        divisor += 0.4;
    }

    if (hrv > 0) {
        // Normalize HRV: 100ms+ -> 100 score. 
        const hrvScore = Math.min(100, (hrv / 80) * 100);
        score += hrvScore * 0.4;
        divisor += 0.4;
    } else {
        // If HRV is missing but we have sleep, maybe purely sleep based?
        // Or if we have nothing?
    }

    if (rhr > 0) {
        score += rhrScore * 0.2;
        divisor += 0.2;
    }

    const finalRecovery = divisor > 0 ? Math.round(score / divisor) : 0;

    // SpO2
    const spo2 = spo2Data?.value?.avg || 0;
    // Breathing Rate
    const br = brData?.br?.[0]?.value?.breathingRate || 0;
    // Skin Temp
    const skinTemp = skinTempData?.tempSkin?.[0]?.value?.nightlyRelative || 0;

    return {
        score: finalRecovery,
        hrv: hrv,
        rhr: rhr,
        respiratoryRate: br,
        spo2: spo2,
        skinTemp: skinTemp
    };
};

export const processSleepData = (sleepData) => {
    if (!sleepData || !sleepData.sleep || sleepData.sleep.length === 0) {
        return {
            score: 0,
            startTime: null,
            endTime: null,
            totalSleep: 0,
            stages: { deep: 0, light: 0, rem: 0, awake: 0 }
        };
    }

    const mainSleep = sleepData.sleep.find(s => s.isMainSleep) || sleepData.sleep[0];
    const summary = mainSleep.levels?.summary || {};

    // Handle "Classic" sleep data (asleep, restless, awake) vs "Stages" (deep, light, rem, wake)
    let deep = 0, light = 0, rem = 0, awake = 0;

    if (summary.deep || summary.light || summary.rem) {
        // Stages available
        deep = summary.deep?.minutes || 0;
        light = summary.light?.minutes || 0;
        rem = summary.rem?.minutes || 0;
        awake = summary.wake?.minutes || 0;
    } else if (summary.asleep) {
        // Fallback to Classic
        // We can map 'asleep' to 'light' generically or split it?
        // Let's just put it all in light for visualization purposes if broken
        light = summary.asleep?.minutes || 0;
        awake = summary.awake?.minutes || 0;
        // Count restless as awake or light? Fitbit counts it as part of efficiency usually?
        // Let's add restless to 'awake' or ignored? Whoop uses 'Wake', 'Light', 'REM', 'SWS'.
        // Restless is kinda like Light/Wake.
        // Let's put restless in "Awake" for now to penalize it visible.
        awake += summary.restless?.minutes || 0;
    }

    return {
        score: mainSleep.efficiency || 0,
        startTime: mainSleep.startTime,
        endTime: mainSleep.endTime,
        totalSleep: parseFloat((mainSleep.minutesAsleep / 60).toFixed(1)),
        stages: {
            deep: parseFloat((deep / 60).toFixed(1)),
            light: parseFloat((light / 60).toFixed(1)),
            rem: parseFloat((rem / 60).toFixed(1)),
            awake: parseFloat((awake / 60).toFixed(1))
        }
    };
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
