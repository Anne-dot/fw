/* ===========================================
   FTMS Treadmill Test - Main Application
   =========================================== */

/* --- Connection State Machine --- */
const ConnectionState = {
    DISCONNECTED: 'disconnected',
    SEARCHING: 'searching',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
};

let connectionState = ConnectionState.DISCONNECTED;
let connectionStartTime = null;
let lastDataTime = null;
let dataReceiveCount = 0;

/* --- Session Info --- */
const session = {
    id: generateSessionId(),
    startTime: new Date().toISOString(),
    deviceInfo: getDeviceInfo(),
    connectionAttempts: 0,
    successfulConnections: 0,
    errors: []
};

function generateSessionId() {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        bluetooth: !!navigator.bluetooth,
        serviceWorker: 'serviceWorker' in navigator,
        online: navigator.onLine,
        screenWidth: screen.width,
        screenHeight: screen.height
    };
}

/* --- State --- */
let device = null;
let currentWorkout = {
    distance: 0,
    elapsedTime: 0,
    maxSpeed: 0,
    speedReadings: []
};

/* --- Heart Rate State (sõltumatu FTMS-ist) --- */
let hrDevice = null;
let hrConnected = false;
let currentHeartRate = null;
let hrData = [];  // Salvestab kõik HR lugemised

/* --- DOM Elements --- */
const elements = {
    status: document.getElementById('status'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    machineFilter: document.getElementById('machineFilter'),
    dataCard: document.getElementById('dataCard'),
    services: document.getElementById('services'),
    workouts: document.getElementById('workouts'),
    exportBtn: document.getElementById('exportBtn'),
    exportRawBtn: document.getElementById('exportRawBtn'),
    exportAllBtn: document.getElementById('exportAllBtn'),
    debugBtn: document.getElementById('debugBtn'),
    saveWorkoutBtn: document.getElementById('saveWorkoutBtn'),
    log: document.getElementById('log'),
    speed: document.getElementById('speed'),
    distance: document.getElementById('distance'),
    time: document.getElementById('time'),
    incline: document.getElementById('incline'),
    // Heart Rate elements
    connectHRBtn: document.getElementById('connectHRBtn'),
    disconnectHRBtn: document.getElementById('disconnectHRBtn'),
    hrCard: document.getElementById('hrCard'),
    heartRate: document.getElementById('heartRate')
};

/* --- Machine Filter Mapping --- */
const MACHINE_FILTERS = {
    all: null,  // No filter - accept any FTMS
    treadmill: 0x2ACD,
    rower: 0x2AD1,
    bike: 0x2AD2,
    cross: 0x2AD3
};

/* --- Initialization --- */
document.addEventListener('DOMContentLoaded', init);

function init() {
    try {
        // Event listeners - FTMS
        elements.connectBtn.addEventListener('click', connect);
        elements.disconnectBtn.addEventListener('click', disconnect);
        elements.saveWorkoutBtn.addEventListener('click', saveCurrentWorkout);
        elements.exportBtn.addEventListener('click', downloadWorkoutsCSV);
        elements.exportRawBtn.addEventListener('click', downloadRawDataJSON);
        elements.exportAllBtn.addEventListener('click', exportAllData);
        elements.debugBtn.addEventListener('click', showDebugInfo);

        // Event listeners - Heart Rate
        if (elements.connectHRBtn) {
            elements.connectHRBtn.addEventListener('click', connectHeartRate);
        }
        if (elements.disconnectHRBtn) {
            elements.disconnectHRBtn.addEventListener('click', disconnectHeartRate);
        }

        // Load saved workouts
        displaySavedWorkouts();

        // Register service worker for offline support
        registerServiceWorker();

        // Check Web Bluetooth support
        if (!navigator.bluetooth) {
            log('Web Bluetooth ei ole toetatud selles brauseris!', 'error');
            setStatus('Brauser ei toeta Bluetoothi', 'error');
            elements.connectBtn.disabled = true;
            showBrowserHelp();
        }
    } catch (error) {
        console.error('Init failed:', error);
        alert('Äpi käivitamine ebaõnnestus: ' + error.message);
    }
}

/* --- Service Worker --- */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            log('Offline tugi aktiveeritud', 'success');
        } catch (error) {
            console.warn('Service worker registration failed:', error);
        }
    }
}

/* --- Bluetooth Connection --- */
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
let retryAttempts = 0;

function setState(newState) {
    const oldState = connectionState;
    connectionState = newState;
    log(`State: ${oldState} → ${newState}`, 'info');

    // Update UI based on state
    switch (newState) {
        case ConnectionState.DISCONNECTED:
            setStatus('Ootab ühendust...', 'waiting');
            elements.connectBtn.disabled = false;
            elements.disconnectBtn.disabled = true;
            break;
        case ConnectionState.SEARCHING:
            setStatus('Otsin seadmeid...', 'searching');
            elements.connectBtn.disabled = true;
            break;
        case ConnectionState.CONNECTING:
            setStatus('Ühendun...', 'searching');
            break;
        case ConnectionState.CONNECTED:
            setStatus(`Ühendatud: ${device?.name || 'Nimetu'}`, 'connected');
            elements.disconnectBtn.disabled = false;
            connectionStartTime = Date.now();
            session.successfulConnections++;
            break;
        case ConnectionState.ERROR:
            setStatus('Viga!', 'error');
            elements.connectBtn.disabled = false;
            elements.disconnectBtn.disabled = true;
            break;
    }

    // Save state change to session
    saveSessionEvent('state_change', { from: oldState, to: newState });
}

function saveSessionEvent(eventType, data) {
    try {
        const events = JSON.parse(localStorage.getItem('ftms_session_events') || '[]');
        events.push({
            sessionId: session.id,
            timestamp: new Date().toISOString(),
            type: eventType,
            data: data
        });
        // Keep last 100 events
        if (events.length > 100) events.splice(0, events.length - 100);
        localStorage.setItem('ftms_session_events', JSON.stringify(events));
    } catch (e) {
        console.error('Failed to save session event:', e);
    }
}

async function connect() {
    session.connectionAttempts++;

    try {
        setState(ConnectionState.SEARCHING);

        const filterValue = elements.machineFilter.value;
        const machineCharUUID = MACHINE_FILTERS[filterValue];

        if (machineCharUUID) {
            log(`Otsin: ${filterValue} (UUID: 0x${machineCharUUID.toString(16).toUpperCase()})`);
        } else {
            log('Otsin kõiki FTMS masinaid...');
        }

        // Timeout for Bluetooth search (30 seconds)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: seadmeid ei leitud 30 sekundi jooksul')), 30000);
        });

        // Build request options based on filter
        const requestOptions = {
            filters: [{ services: [FTMS.SERVICE] }],
            optionalServices: [FTMS.SERVICE, 0x180D, 0x180F, 0x180A]
        };

        // If specific machine type selected, add characteristic filter
        if (machineCharUUID) {
            requestOptions.optionalServices.push(machineCharUUID);
        }

        const devicePromise = navigator.bluetooth.requestDevice(requestOptions);
        device = await Promise.race([devicePromise, timeoutPromise]);

        log(`Leitud seade: ${device.name || 'Nimetu'}`, 'success');
        device.addEventListener('gattserverdisconnected', onDisconnected);

        setState(ConnectionState.CONNECTING);

        // GATT connection with timeout
        const gattTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('GATT ühenduse timeout (10s)')), 10000);
        });

        const server = await Promise.race([device.gatt.connect(), gattTimeoutPromise]);
        log('GATT server ühendatud', 'success');

        // Discover services
        const services = await server.getPrimaryServices();
        displayServices(services);

        // Look for FTMS
        let ftmsFound = false;
        for (const service of services) {
            if (isFTMSService(service.uuid)) {
                log('FTMS teenus leitud!', 'success');
                await setupFTMS(service, machineCharUUID);
                ftmsFound = true;
            }
        }

        if (!ftmsFound) {
            log('FTMS teenust ei leitud!', 'warn');
        }

        setState(ConnectionState.CONNECTED);
        retryAttempts = 0;  // Reset retry counter on success

        // Reset current workout
        resetCurrentWorkout();

    } catch (error) {
        handleConnectionError(error);
    }
}

async function retryConnect() {
    if (retryAttempts < MAX_RETRY_ATTEMPTS) {
        retryAttempts++;
        log(`Proovin uuesti (${retryAttempts}/${MAX_RETRY_ATTEMPTS})...`, 'warn');
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        connect();
    } else {
        log(`Kõik ${MAX_RETRY_ATTEMPTS} katset ebaõnnestusid`, 'error');
        retryAttempts = 0;
    }
}

function disconnect() {
    try {
        if (device && device.gatt.connected) {
            device.gatt.disconnect();
        }
    } catch (error) {
        log(`Viga ühenduse katkestamisel: ${error.message}`, 'error');
        // Force state reset anyway
        setState(ConnectionState.DISCONNECTED);
    }
}

function onDisconnected() {
    try {
        const connectionDuration = connectionStartTime ? Math.round((Date.now() - connectionStartTime) / 1000) : 0;
        log(`Ühendus katkestatud (kestis ${connectionDuration}s, ${dataReceiveCount} andmepaketti)`, 'warn');

        saveSessionEvent('disconnected', {
            duration: connectionDuration,
            dataPackets: dataReceiveCount,
            deviceName: device?.name
        });

        // Automaatne dump - salvesta kõik andmed
        const rawData = getRawData();
        if (rawData.length > 0) {
            downloadRawDataJSON();
            log(`Raw data automaatselt alla laetud (${rawData.length} kirjet)`, 'success');
        }
    } catch (error) {
        console.error('Error in onDisconnected:', error);
    } finally {
        // Always reset state, even if something failed above
        setState(ConnectionState.DISCONNECTED);
        elements.dataCard.hidden = true;
        dataReceiveCount = 0;
        connectionStartTime = null;
    }
}

function handleConnectionError(error) {
    session.errors.push({
        timestamp: new Date().toISOString(),
        type: error.name,
        message: error.message
    });

    saveSessionEvent('error', {
        type: error.name,
        message: error.message,
        attempt: session.connectionAttempts
    });

    if (error.name === 'NotFoundError') {
        log('Seadet ei valitud', 'warn');
        setState(ConnectionState.DISCONNECTED);
    } else {
        log(`Viga: ${error.message}`, 'error');
        setState(ConnectionState.ERROR);

        // Automaatne dump vea puhul
        autoDumpOnError('connection_error', error.message);

        // Auto-retry for certain errors
        if (error.message.includes('Timeout') || error.message.includes('GATT')) {
            retryConnect();
        }
    }
}

function autoDumpOnError(errorType, errorMessage) {
    const rawData = getRawData();
    if (rawData.length > 0) {
        downloadRawDataJSON();
        log(`Raw data automaatselt alla laetud (viga: ${errorType})`, 'success');
    }

    // Lisa viga ka localStorage'i hilisemaks analüüsiks
    try {
        const errors = JSON.parse(localStorage.getItem('ftms_errors') || '[]');
        errors.push({
            timestamp: new Date().toISOString(),
            type: errorType,
            message: errorMessage,
            rawDataCount: rawData.length
        });
        // Keep last 20 errors
        if (errors.length > 20) errors.splice(0, errors.length - 20);
        localStorage.setItem('ftms_errors', JSON.stringify(errors));
    } catch (e) {
        console.error('Error saving error log:', e);
    }
}

/* --- FTMS Setup --- */
let selectedMachineFilter = null;  // Store filter for processCharacteristic

async function setupFTMS(service, machineCharUUID = null) {
    try {
        selectedMachineFilter = machineCharUUID;
        const characteristics = await service.getCharacteristics();
        log(`FTMS-il on ${characteristics.length} karakteristikut`);

        for (const char of characteristics) {
            await processCharacteristic(char);
        }
    } catch (error) {
        log(`Viga FTMS seadistamisel: ${error.message}`, 'error');
        autoDumpOnError('ftms_setup_error', error.message);
    }
}

async function processCharacteristic(char) {
    try {
        const props = [];
        if (char.properties.read) props.push('read');
        if (char.properties.write) props.push('write');
        if (char.properties.notify) props.push('notify');

        // Check if this is a machine data characteristic
        const machineType = getMachineType(char.uuid);
        if (machineType) {
            // Check if matches filter (or no filter = accept all)
            const charShortUUID = parseInt(char.uuid.substring(4, 8), 16);
            const matchesFilter = !selectedMachineFilter || charShortUUID === selectedMachineFilter;

            if (matchesFilter) {
                log(`→ ${machineType} (${props.join(', ')})`, 'success');

                if (char.properties.notify) {
                    await char.startNotifications();
                    char.addEventListener('characteristicvaluechanged', handleMachineData);
                    log(`Kuulan ${machineType} andmeid...`, 'success');
                    elements.dataCard.hidden = false;
                }
            } else {
                log(`→ ${machineType} (välja filtreeritud)`, 'info');
            }
        }
        // Control Point
        else if (char.uuid === FTMS.CHARS.CONTROL_POINT) {
            log(`→ Control Point (${props.join(', ')})`, 'success');
            if (char.properties.write) {
                log('  ⚠️ Kirjutamine võimalik, aga vajab sertifitseerimist', 'warn');
            }
        }
        // Machine Feature
        else if (char.uuid === FTMS.CHARS.MACHINE_FEATURE) {
            log('→ Machine Feature', 'info');
            if (char.properties.read) {
                try {
                    const value = await char.readValue();
                    const features = value.getUint32(0, true);
                    log(`  Funktsioonid: 0x${features.toString(16)}`, 'info');
                } catch (readError) {
                    log(`  Funktsioonide lugemine ebaõnnestus: ${readError.message}`, 'warn');
                }
            }
        }
        else {
            log(`→ ${char.uuid.substring(4, 8)} (${props.join(', ')})`, 'info');
        }
    } catch (error) {
        log(`Viga karakteristiku töötlemisel: ${error.message}`, 'error');
        autoDumpOnError('characteristic_error', error.message);
    }
}

/* --- Data Handling --- */
let parsingErrorCount = 0;

function handleMachineData(event) {
    try {
        dataReceiveCount++;
        lastDataTime = Date.now();

        const value = event.target.value;
        const rawBytes = new Uint8Array(value.buffer);
        const charUuid = event.target.uuid;
        const machineType = getMachineType(charUuid);

        let data = null;
        try {
            // For now, try treadmill parser for all - raw data will show what's really happening
            data = parseTreadmillData(value);
            parsingErrorCount = 0;  // Reset on success
        } catch (parseError) {
            parsingErrorCount++;
            log(`Parsing viga (${machineType}): ${parseError.message}`, 'error');

            // Dump after 3 consecutive parsing errors
            if (parsingErrorCount >= 3) {
                autoDumpOnError('parsing_error', `${parsingErrorCount} järjestikust viga: ${parseError.message}`);
                parsingErrorCount = 0;
            }
        }

        // Save raw data for later analysis - this is the important part!
        try {
            saveRawData(charUuid, rawBytes, data, machineType);
        } catch (saveError) {
            console.error('Failed to save raw data:', saveError);
        }

        if (!data) return;

        // Update display
        if (data.speed !== null) {
            elements.speed.textContent = data.speed;
            updateWorkoutSpeed(parseFloat(data.speed));
        }
        if (data.distance !== null) {
            elements.distance.textContent = data.distance;
            currentWorkout.distance = data.distance;
        }
        if (data.elapsedTime !== null) {
            elements.time.textContent = data.elapsedTime;
            currentWorkout.elapsedTime = data.elapsedTime;
        }
        if (data.incline !== null) {
            elements.incline.textContent = data.incline;
        }
    } catch (error) {
        console.error('Critical error in handleMachineData:', error);
        autoDumpOnError('data_handler_error', error.message);
    }
}

function updateWorkoutSpeed(speed) {
    currentWorkout.speedReadings.push(speed);
    if (speed > currentWorkout.maxSpeed) {
        currentWorkout.maxSpeed = speed;
    }
}

function resetCurrentWorkout() {
    currentWorkout = {
        distance: 0,
        elapsedTime: 0,
        maxSpeed: 0,
        speedReadings: []
    };
}

/* --- Workout Management --- */
function saveCurrentWorkout() {
    if (currentWorkout.distance === 0 && currentWorkout.elapsedTime === 0) {
        log('Pole andmeid salvestamiseks', 'warn');
        return;
    }

    const avgSpeed = currentWorkout.speedReadings.length > 0
        ? (currentWorkout.speedReadings.reduce((a, b) => a + b, 0) / currentWorkout.speedReadings.length).toFixed(2)
        : null;

    const workout = {
        distance: currentWorkout.distance,
        elapsedTime: currentWorkout.elapsedTime,
        maxSpeed: currentWorkout.maxSpeed.toFixed(2),
        avgSpeed: avgSpeed
    };

    if (saveWorkout(workout)) {
        log('Treening salvestatud!', 'success');
        displaySavedWorkouts();
        resetCurrentWorkout();
    } else {
        log('Salvestamine ebaõnnestus', 'error');
    }
}

function displaySavedWorkouts() {
    const workouts = getWorkouts();

    if (workouts.length === 0) {
        elements.workouts.innerHTML = '<p class="placeholder">Treeninguid pole veel salvestatud</p>';
        elements.exportBtn.hidden = true;
        return;
    }

    // Show newest first
    const sorted = workouts.slice().reverse();
    elements.workouts.innerHTML = sorted.map(formatWorkoutHTML).join('');
    elements.exportBtn.hidden = false;

    // Show raw export if data exists
    const rawData = getRawData();
    elements.exportRawBtn.hidden = rawData.length === 0;
}

/* --- Services Display --- */
function displayServices(services) {
    if (services.length === 0) {
        elements.services.innerHTML = '<p class="placeholder">Teenuseid ei leitud</p>';
        return;
    }

    elements.services.innerHTML = services.map(service => {
        const name = getServiceName(service.uuid);
        const isFTMS = isFTMSService(service.uuid);
        const className = isFTMS ? 'service-ftms' : 'service-other';

        return `
            <div class="service-item ${className}">
                <strong>${name}</strong>
                <small>${service.uuid}</small>
            </div>
        `;
    }).join('');

    log(`Leitud ${services.length} teenust`, 'info');
}

/* --- UI Helpers --- */
function setStatus(msg, type = 'waiting') {
    elements.status.textContent = msg;
    elements.status.className = 'status ' + type;
}

function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString('et-EE');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${time}] ${msg}`;
    elements.log.appendChild(entry);
    elements.log.scrollTop = elements.log.scrollHeight;
    console.log(`[${type}] ${msg}`);
}

function showBrowserHelp() {
    const helpDiv = document.createElement('div');
    helpDiv.className = 'browser-help';
    helpDiv.innerHTML = `
        <p><strong>Proovi:</strong></p>
        <ul>
            <li><strong>Arvutis:</strong> Chrome, Edge või Opera</li>
            <li><strong>Android:</strong> Chrome</li>
            <li><strong>iPhone/Mac:</strong> <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank">Bluefy brauser</a></li>
        </ul>
        <p>Kontrolli ka, et Bluetooth on sisse lülitatud.</p>
    `;
    elements.status.after(helpDiv);
}

function showDebugInfo() {
    // Collect all localStorage data
    const debugData = {
        localStorage: {},
        localStorageSize: 0,
        session: session,
        connectionState: connectionState,
        dataReceiveCount: dataReceiveCount,
        lastDataTime: lastDataTime ? new Date(lastDataTime).toISOString() : null
    };

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        debugData.localStorage[key] = value.length > 100
            ? `${value.substring(0, 100)}... (${value.length} chars)`
            : value;
        debugData.localStorageSize += value.length;
    }

    // Show in modal
    const modal = document.createElement('div');
    modal.className = 'debug-modal';
    modal.innerHTML = `
        <div class="debug-content">
            <h3>Debug Info</h3>
            <div class="debug-section">
                <strong>LocalStorage:</strong> ${localStorage.length} võtit, ${Math.round(debugData.localStorageSize / 1024)} KB
            </div>
            <div class="debug-section">
                <strong>Sessiooni ID:</strong> ${session.id}
            </div>
            <div class="debug-section">
                <strong>Ühenduse olek:</strong> ${connectionState}
            </div>
            <div class="debug-section">
                <strong>Ühenduse katseid:</strong> ${session.connectionAttempts}
            </div>
            <div class="debug-section">
                <strong>Andmepakette:</strong> ${dataReceiveCount}
            </div>
            <div class="debug-section">
                <strong>Raw data kirjeid:</strong> ${getRawData().length}
            </div>
            <div class="debug-section">
                <strong>Vigu:</strong> ${session.errors.length}
            </div>
            <pre class="debug-raw">${JSON.stringify(debugData.localStorage, null, 2)}</pre>
            <button onclick="this.parentElement.parentElement.remove()">Sulge</button>
        </div>
    `;
    document.body.appendChild(modal);
}

/* ===========================================
   Heart Rate Connection (Sõltumatu FTMS-ist)
   =========================================== */

async function connectHeartRate() {
    try {
        log('Otsin pulsivööd...', 'info');

        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR.SERVICE] }],
            optionalServices: [HR.SERVICE]
        });

        hrDevice = device;
        log(`Leitud: ${device.name || 'Pulsivöö'}`, 'success');

        hrDevice.addEventListener('gattserverdisconnected', onHRDisconnected);

        const server = await hrDevice.gatt.connect();
        const service = await server.getPrimaryService(HR.SERVICE);
        const char = await service.getCharacteristic(HR.CHARS.MEASUREMENT);

        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', handleHeartRateData);

        hrConnected = true;
        log('Pulsivöö ühendatud!', 'success');
        updateHRUI(true);

    } catch (error) {
        log(`HR viga: ${error.message}`, 'error');
        hrConnected = false;
        updateHRUI(false);
    }
}

function disconnectHeartRate() {
    try {
        if (hrDevice && hrDevice.gatt.connected) {
            hrDevice.gatt.disconnect();
        }
        hrConnected = false;
        currentHeartRate = null;
        updateHRUI(false);
        log('Pulsivöö ühendus katkestatud', 'info');
    } catch (error) {
        log(`HR katkestamise viga: ${error.message}`, 'error');
    }
}

function onHRDisconnected() {
    log('Pulsivöö ühendus katkestatud', 'warn');
    hrConnected = false;
    currentHeartRate = null;
    updateHRUI(false);
}

function handleHeartRateData(event) {
    try {
        const value = event.target.value;
        const data = parseHeartRate(value);

        currentHeartRate = data.heartRate;

        // Salvesta andmed
        hrData.push({
            timestamp: Date.now(),
            heartRate: data.heartRate,
            rrIntervals: data.rrIntervals,
            contactDetected: data.contactDetected
        });

        // Uuenda UI
        updateHRDisplay(data);

    } catch (error) {
        log(`HR parsing viga: ${error.message}`, 'error');
    }
}

function updateHRDisplay(data) {
    if (elements.heartRate) {
        elements.heartRate.textContent = data.heartRate;

        // Näita kontakti staatust
        if (data.contactDetected === false) {
            elements.heartRate.classList.add('no-contact');
        } else {
            elements.heartRate.classList.remove('no-contact');
        }
    }
}

function updateHRUI(connected) {
    if (elements.connectHRBtn) elements.connectHRBtn.hidden = connected;
    if (elements.disconnectHRBtn) elements.disconnectHRBtn.hidden = !connected;
    if (elements.hrCard) elements.hrCard.hidden = !connected;
}
