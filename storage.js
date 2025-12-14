/* ===========================================
   Workout Storage
   LocalStorage-based workout persistence
   =========================================== */

const STORAGE_KEY = 'ftms_workouts';
const RAW_DATA_KEY = 'ftms_raw_data';

/**
 * Save a workout to local storage
 * @param {Object} workout - Workout data to save
 * @returns {boolean} Success status
 */
function saveWorkout(workout) {
    try {
        const workouts = getWorkouts();

        const workoutWithMeta = {
            id: Date.now(),
            date: new Date().toISOString(),
            ...workout
        };

        workouts.push(workoutWithMeta);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));

        console.log('Treening salvestatud:', workoutWithMeta);
        return true;
    } catch (error) {
        console.error('Viga salvestamisel:', error);
        return false;
    }
}

/**
 * Get all saved workouts
 * @returns {Array} Array of workout objects
 */
function getWorkouts() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Viga lugemisel:', error);
        return [];
    }
}

/**
 * Delete a workout by ID
 * @param {number} id - Workout ID to delete
 * @returns {boolean} Success status
 */
function deleteWorkout(id) {
    try {
        const workouts = getWorkouts();
        const filtered = workouts.filter(w => w.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Viga kustutamisel:', error);
        return false;
    }
}

/**
 * Export workouts as CSV
 * @returns {string} CSV formatted string
 */
function exportWorkoutsCSV() {
    const workouts = getWorkouts();

    if (workouts.length === 0) {
        return '';
    }

    const headers = ['Kuupäev', 'Distants (m)', 'Aeg (sek)', 'Max kiirus (km/h)', 'Keskmine kiirus (km/h)'];
    const rows = workouts.map(w => [
        new Date(w.date).toLocaleDateString('et-EE'),
        w.distance || '',
        w.elapsedTime || '',
        w.maxSpeed || '',
        w.avgSpeed || ''
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    return csv;
}

/**
 * Download workouts as CSV file
 */
function downloadWorkoutsCSV() {
    const csv = exportWorkoutsCSV();

    if (!csv) {
        alert('Pole treeninguid eksportimiseks');
        return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `treeningud_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}

/* ===========================================
   Raw Data Logging (for debugging)
   =========================================== */

/**
 * Save raw Bluetooth data for later analysis
 * @param {string} charUuid - Characteristic UUID
 * @param {Uint8Array} rawBytes - Raw data bytes
 * @param {Object} parsed - Parsed result (or null if failed)
 * @param {string} machineType - Machine type name (optional)
 */
function saveRawData(charUuid, rawBytes, parsed, machineType = null) {
    try {
        const rawLog = getRawData();

        rawLog.push({
            timestamp: new Date().toISOString(),
            machineType: machineType,
            characteristic: charUuid,
            hex: Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join(' '),
            bytes: Array.from(rawBytes),
            parsed: parsed
        });

        // Keep last 500 entries
        if (rawLog.length > 500) {
            rawLog.splice(0, rawLog.length - 500);
        }

        localStorage.setItem(RAW_DATA_KEY, JSON.stringify(rawLog));
    } catch (error) {
        console.error('Viga raw data salvestamisel:', error);
    }
}

/**
 * Get all raw data logs
 * @returns {Array} Array of raw data entries
 */
function getRawData() {
    try {
        const data = localStorage.getItem(RAW_DATA_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Viga raw data lugemisel:', error);
        return [];
    }
}

/**
 * Clear raw data logs
 */
function clearRawData() {
    localStorage.removeItem(RAW_DATA_KEY);
}

/**
 * Export raw data as JSON file
 */
function downloadRawDataJSON() {
    const data = getRawData();

    if (data.length === 0) {
        alert('Pole raw datat eksportimiseks');
        return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `ftms_raw_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
}

/**
 * Export ALL localStorage data as single JSON file
 * Includes: workouts, raw data, errors, current state, HR data
 */
function exportAllData() {
    const allData = {
        exportTimestamp: new Date().toISOString(),
        session: typeof session !== 'undefined' ? session : null,
        connectionState: typeof connectionState !== 'undefined' ? connectionState : null,
        workouts: getWorkouts(),
        rawData: getRawData(),
        // Heart Rate data
        hrData: typeof hrData !== 'undefined' ? hrData : [],
        hrConnected: typeof hrConnected !== 'undefined' ? hrConnected : false,
        currentHeartRate: typeof currentHeartRate !== 'undefined' ? currentHeartRate : null,
        errors: JSON.parse(localStorage.getItem('ftms_errors') || '[]'),
        sessionEvents: JSON.parse(localStorage.getItem('ftms_session_events') || '[]'),
        // Include any other ftms_ keys
        allKeys: {}
    };

    // Grab all ftms_ prefixed localStorage items
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ftms_')) {
            try {
                allData.allKeys[key] = JSON.parse(localStorage.getItem(key));
            } catch {
                allData.allKeys[key] = localStorage.getItem(key);
            }
        }
    }

    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `ftms_full_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();

    URL.revokeObjectURL(url);

    console.log('Full export done:', {
        workouts: allData.workouts.length,
        rawData: allData.rawData.length,
        errors: allData.errors.length
    });
}

/**
 * Format workout for display
 * @param {Object} workout - Workout object
 * @returns {string} HTML string
 */
function formatWorkoutHTML(workout) {
    const date = new Date(workout.date);
    const dateStr = date.toLocaleDateString('et-EE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div class="workout-item" data-id="${workout.id}">
            <div class="workout-date">${dateStr}</div>
            <div class="workout-stats">
                <span class="workout-stat"><strong>${workout.distance || '--'}</strong> m</span>
                <span class="workout-stat"><strong>${workout.elapsedTime || '--'}</strong> sek</span>
                <span class="workout-stat"><strong>${workout.maxSpeed || '--'}</strong> km/h max</span>
            </div>
        </div>
    `;
}
