// chargingTimes.js
// Extracted from your original functions.js

import { formatChargingTime } from '../utils/formatting.js';

export function buildChargingTimesTable(publicKwh, maxChargingSpeed, inputs) {
    const chargingSpeeds = [
        { speed: 7, type: 'AC', descriptor: 'Standard' },
        { speed: 11, type: 'AC', descriptor: 'Standard Plus' },
        { speed: 22, type: 'AC', descriptor: 'Fast' },
        { speed: 50, type: 'DC', descriptor: 'Rapid' },
        { speed: 60, type: 'DC', descriptor: 'Rapid' },
        { speed: 75, type: 'DC', descriptor: 'Rapid Plus' },
        { speed: 90, type: 'DC', descriptor: 'Rapid Plus' },
        { speed: 100, type: 'DC', descriptor: 'Rapid Plus' },
        { speed: 120, type: 'DC', descriptor: 'Ultra-Rapid' },
        { speed: 150, type: 'DC', descriptor: 'Ultra-Rapid' },
        { speed: 175, type: 'DC', descriptor: 'Ultra-Rapid' },
        { speed: 250, type: 'DC', descriptor: 'Ultra-Rapid' },
        { speed: 300, type: 'DC', descriptor: 'Hyper-Rapid' },
        { speed: 350, type: 'DC', descriptor: 'Hyper-Rapid' },
        { speed: 360, type: 'DC', descriptor: 'Hyper-Rapid' }
    ];

    let speedsToDisplay = [...chargingSpeeds];

    if (maxChargingSpeed > 0 && !speedsToDisplay.some(s => Math.abs(s.speed - maxChargingSpeed) < 0.01)) {
        speedsToDisplay.push({
            speed: maxChargingSpeed,
            type: 'Custom',
            descriptor: 'Vehicle Max'
        });
        speedsToDisplay.sort((a, b) => a.speed - b.speed);
    }

    let tableRows = '';
    speedsToDisplay.forEach(speedObj => {
        const timeHours = publicKwh / speedObj.speed;
        const timeFormatted = formatChargingTime(timeHours);
        const isMaxSpeed = Math.abs(maxChargingSpeed - speedObj.speed) < 0.01;
        const highlightStyle = isMaxSpeed ? 'font-weight:bold; color:#4A9EFF;' : '';
        tableRows += `<tr style="${highlightStyle}"><td>${speedObj.speed}kW</td><td>${speedObj.type}</td><td>${speedObj.descriptor}</td><td>${timeFormatted}</td></tr>`;
    });

    return `
        <div class="speed-comparison-container" style="width: fit-content; max-width: 100%; margin: 0;">
            <p style="font-size: 0.85rem; margin-bottom: 10px;">
                <span class="tooltip-container">
                    <span class="info-icon" onclick="toggleTooltip(this)">💡<span class="tooltip-box">A comparison of estimated total journey charge durations at various speeds for the public-charging section of your journey assumes that charging will begin each time the battery reaches your recharge threshold (${inputs.rechargeAt}%) and that you will charge to 80% (except for the final charge, which only charges enough to reach your destination with a ${inputs.rechargeAt}% reserve). All charges use the vehicle's maximum charging speed of ${inputs.maxChargingSpeed}kW.</span></span>
                </span>
                <strong>Estimated Total Public Charging Duration Required</strong>
            </p>
            <table class="mini-table">
                <thead>
                    <tr><th>Charging Speed</th><th>Type</th><th>Descriptor</th><th>Journey Charging Duration</th></tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>`;
}