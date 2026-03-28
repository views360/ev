// formatting.js
// Extracted from your original functions.js with no logic changes

export function formatDuration(totalMinutes) {
    if (totalMinutes < 60) {
        return `${totalMinutes} mins`;
    }
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
}

// Extracted from fun3.js — unchanged logic
export function formatChargingTime(hours) {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes < 60) {
        return `${totalMinutes} mins`;
    }
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
}