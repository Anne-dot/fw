/* ===========================================
   Heart Rate Service Handler
   Bluetooth SIG Heart Rate Service (0x180D)
   =========================================== */

/**
 * Heart Rate Service UUIDs
 * Spec: https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/
 */
const HR = {
    SERVICE: 0x180D,
    CHARS: {
        MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb'
    }
};

/**
 * Parse Heart Rate Measurement characteristic
 * Per Bluetooth SIG spec
 * @param {DataView} value - Raw characteristic value
 * @returns {Object} Parsed HR data
 */
function parseHeartRate(value) {
    const flags = value.getUint8(0);
    const hrFormat = flags & 0x01; // 0 = uint8, 1 = uint16

    let heartRate;
    let offset = 1;

    if (hrFormat === 0) {
        heartRate = value.getUint8(offset);
        offset += 1;
    } else {
        heartRate = value.getUint16(offset, true);
        offset += 2;
    }

    const data = {
        heartRate: heartRate,
        contactDetected: null,
        energyExpended: null,
        rrIntervals: []
    };

    // Contact sensor support (bit 1 and 2)
    const contactSupported = (flags & 0x04) !== 0;
    if (contactSupported) {
        data.contactDetected = (flags & 0x02) !== 0;
    }

    // Energy expended (bit 3)
    if (flags & 0x08) {
        data.energyExpended = value.getUint16(offset, true);
        offset += 2;
    }

    // RR intervals (bit 4)
    if (flags & 0x10) {
        const rrIntervals = [];
        while (offset < value.byteLength) {
            const rr = value.getUint16(offset, true);
            rrIntervals.push(rr / 1024 * 1000); // Convert to ms
            offset += 2;
        }
        data.rrIntervals = rrIntervals;
    }

    return data;
}

/**
 * Check if service is Heart Rate
 * @param {string} uuid - Service UUID
 * @returns {boolean}
 */
function isHRService(uuid) {
    return uuid === '0000180d-0000-1000-8000-00805f9b34fb';
}
