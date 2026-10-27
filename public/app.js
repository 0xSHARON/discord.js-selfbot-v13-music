// 0xSHARON INDUSTRIAL BRUTALIST AUDIO CONTROLLER

let state = {
    online: false,
    playing: false,
    paused: false,
    volume: 4,
    loop: false,
    stay247: false,
    elapsedSeconds: 0,
    duration: 0,
    currentSong: null,
    queue: [],
    lastLogCount: 0
};

// DOM Selectors
const userAvatar = document.getElementById('userAvatar');
const userTag = document.getElementById('userTag');
const botStatusLed = document.getElementById('botStatusLed');
const voiceStatusPill = document.getElementById('voiceStatusPill');
const voiceStatusText = document.getElementById('voiceStatusText');

const coverArt = document.getElementById('coverArt');
const visualizer = document.getElementById('visualizer');
const streamCode = document.getElementById('streamCode');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const requesterCol = document.getElementById('requesterCol');
const requesterName = document.getElementById('requesterName');

const progressFill = document.getElementById('progressFill');
const currentTime = document.getElementById('currentTime');
const totalDuration = document.getElementById('totalDuration');

const btnPlayPause = document.getElementById('btnPlayPause');
const iconPlay = btnPlayPause.querySelector('.icon-play');
const iconPause = btnPlayPause.querySelector('.icon-pause');
const btnSkip = document.getElementById('btnSkip');
const btnStop = document.getElementById('btnStop');

const btnToggleLoop = document.getElementById('btnToggleLoop');
const lightLoop = document.getElementById('lightLoop');
const loopBadge = document.getElementById('loopBadge');

const btnToggle247 = document.getElementById('btnToggle247');
const light247 = document.getElementById('light247');
const stayBadge = document.getElementById('stayBadge');

const volumeSlider = document.getElementById('volumeSlider');
const volumeVal = document.getElementById('volumeVal');

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const btnAddQueue = document.getElementById('btnAddQueue');
const searchSpinner = document.getElementById('searchSpinner');

const queueList = document.getElementById('queueList');
const queueEmpty = document.getElementById('queueEmpty');
const queueCount = document.getElementById('queueCount');

const terminalLogs = document.getElementById('terminalLogs');
const btnClearLogs = document.getElementById('btnClearLogs');
const toast = document.getElementById('toast');

// Time Format: 00:00 or 00:00:00
function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const pad = n => (n < 10 ? '0' : '') + n;
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${pad(hrs)}:${pad(remMins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
}

// Brutalist Alert Stamp
let toastTimeout = null;
function showToast(msg, duration = 3000) {
    toast.textContent = msg.toUpperCase();
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Poll Status from API
async function fetchStatus() {
    try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        updateUI(data);
    } catch (err) {
        if (botStatusLed) botStatusLed.className = 'status-led';
        userTag.textContent = 'OFFLINE // DISCONNECTED';
    }
}

// Update UI
function updateUI(data) {
    state.online = data.online;
    const user = data.user;
    const voice = data.voice;
    const playback = data.playback;
    const queue = data.queue || [];
    const logs = data.logs || [];

    // Header & Identity
    if (user) {
        userTag.textContent = user.tag.toUpperCase();
        if (user.avatar) userAvatar.src = user.avatar;
        if (botStatusLed) botStatusLed.className = 'status-led online';
    } else {
        userTag.textContent = 'STANDBY // DISCONNECTED';
        if (botStatusLed) botStatusLed.className = 'status-led';
    }

    // Voice Link
    if (voice && voice.connected) {
        voiceStatusPill.classList.add('active');
        const typeTag = voice.channelType === 'DM' ? 'DM_CALL' : 'VOICE_CH';
        voiceStatusText.textContent = `${voice.channelName.toUpperCase()} [${typeTag}]`;
    } else {
        voiceStatusPill.classList.remove('active');
        voiceStatusText.textContent = 'STANDBY // UNLINKED';
    }

    // Playback State
    state.playing = playback.playing;
    state.paused = playback.paused;
    state.volume = playback.volume;
    state.loop = playback.loop;
    state.stay247 = playback.stay247;
    state.elapsedSeconds = playback.elapsedSeconds || 0;
    state.duration = playback.duration || 0;
    state.currentSong = playback.currentSong;

    // 24/7 Flags
    if (state.stay247) {
        stayBadge.textContent = '24/7::LOCK';
        stayBadge.classList.add('active');
        btnToggle247.classList.add('active');
    } else {
        stayBadge.textContent = '24/7::DIS';
        stayBadge.classList.remove('active');
        btnToggle247.classList.remove('active');
    }

    // Loop Flags
    if (state.loop) {
        loopBadge.textContent = 'LOOP::ENGAGED';
        loopBadge.classList.add('active');
        btnToggleLoop.classList.add('active');
    } else {
        loopBadge.textContent = 'LOOP::OFF';
        loopBadge.classList.remove('active');
        btnToggleLoop.classList.remove('active');
    }

    // Action button state
    if (state.playing) {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'inline';
        visualizer.classList.add('active');
        streamCode.textContent = 'STREAM::ACTIVE';
    } else {
        iconPlay.style.display = 'inline';
        iconPause.style.display = 'none';
        visualizer.classList.remove('active');
        streamCode.textContent = state.paused ? 'STREAM::PAUSED' : 'STREAM::IDLE';
    }

    // Metadata
    if (state.currentSong) {
        trackTitle.textContent = state.currentSong.title.toUpperCase();
        trackArtist.textContent = (state.currentSong.author || 'YOUTUBE_STREAM').toUpperCase();
        if (state.currentSong.thumbnail) {
            coverArt.src = state.currentSong.thumbnail;
        }
        if (state.currentSong.requestedby) {
            requesterCol.style.display = 'block';
            requesterName.textContent = state.currentSong.requestedby.toUpperCase();
        } else {
            requesterCol.style.display = 'none';
        }
    } else {
        trackTitle.textContent = 'STANDBY - NO CARRIER';
        trackArtist.textContent = 'WAITING FOR INPUT STREAM';
        coverArt.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
        requesterCol.style.display = 'none';
    }

    // Progress timeline
    totalDuration.textContent = formatTime(state.duration);
    updateProgressDisplay();

    // Volume readout
    if (document.activeElement !== volumeSlider) {
        volumeSlider.value = state.volume;
        volumeVal.textContent = state.volume < 10 ? `0${state.volume}` : `${state.volume}`;
    }

    // Render Queue and Logs
    renderQueue(queue);
    renderLogs(logs);
}

// Progress Display
function updateProgressDisplay() {
    currentTime.textContent = formatTime(state.elapsedSeconds);
    if (state.duration > 0) {
        const pct = Math.min(100, Math.max(0, (state.elapsedSeconds / state.duration) * 100));
        progressFill.style.width = `${pct}%`;
    } else {
        progressFill.style.width = '0%';
    }
}

// Render Queue Manifest
function renderQueue(queue) {
    state.queue = queue;
    const pad = n => (n < 10 ? '0' : '') + n;
    queueCount.textContent = `${pad(queue.length)} ITEMS`;

    if (!queue || queue.length === 0) {
        queueEmpty.style.display = 'flex';
        const oldRows = queueList.querySelectorAll('.queue-row-brutal');
        oldRows.forEach(el => el.remove());
        return;
    }

    queueEmpty.style.display = 'none';
    const oldRows = queueList.querySelectorAll('.queue-row-brutal');
    oldRows.forEach(el => el.remove());

    queue.forEach((song, idx) => {
        const row = document.createElement('div');
        row.className = 'queue-row-brutal';
        row.innerHTML = `
            <span class="q-idx">#${pad(idx + 1)}</span>
            <img src="${song.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&auto=format&fit=crop&q=80'}" alt="Thumb" class="q-thumb">
            <div class="q-body">
                <div class="q-title">${escapeHtml(song.title.toUpperCase())}</div>
                <div class="q-artist">${escapeHtml((song.author || 'YOUTUBE').toUpperCase())}</div>
            </div>
            <span class="q-time">${formatTime(song.duration)}</span>
            <button class="btn-del-track" data-index="${idx}" title="ABORT TRACK">X</button>
        `;
        queueList.appendChild(row);
    });

    const removeBtns = queueList.querySelectorAll('.btn-del-track');
    removeBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            await removeTrack(index);
        });
    });
}

// Render Terminal Telemetry
function renderLogs(logs) {
    if (!logs || logs.length === 0) return;
    if (logs.length === state.lastLogCount) return;
    state.lastLogCount = logs.length;

    terminalLogs.innerHTML = '';
    logs.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span class="log-time">[${entry.time || ''}]</span> ${escapeHtml(entry.message || entry.raw || '')}`;
        terminalLogs.appendChild(div);
    });
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// Dispatch Control Action
async function sendAction(action) {
    try {
        const res = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (!data.success) {
            showToast(`ERR // ${data.message || 'ACTION_REJECTED'}`);
        } else {
            fetchStatus();
        }
    } catch (err) {
        showToast(`FATAL // NETWORK_FAIL: ${err.message}`);
    }
}

// Remove Track
async function removeTrack(index) {
    try {
        const res = await fetch('/api/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`PURGED // TRACK_EXPELLED`);
            fetchStatus();
        } else {
            showToast(`ERR // ${data.message || 'PURGE_FAILED'}`);
        }
    } catch (err) {
        showToast(`FATAL // ${err.message}`);
    }
}

// Button Events
btnPlayPause.addEventListener('click', () => sendAction('play_pause'));
btnSkip.addEventListener('click', () => sendAction('skip'));
btnStop.addEventListener('click', () => sendAction('stop'));
btnToggleLoop.addEventListener('click', () => sendAction('toggle_loop'));
btnToggle247.addEventListener('click', () => sendAction('toggle_247'));

// Volume Slider
let volTimer = null;
volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    volumeVal.textContent = val < 10 ? `0${val}` : `${val}`;
    if (volTimer) clearTimeout(volTimer);
    volTimer = setTimeout(async () => {
        try {
            await fetch('/api/volume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volume: val })
            });
        } catch (e) {}
    }, 200);
});

// Enqueue Search Form
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    btnAddQueue.disabled = true;
    searchSpinner.style.display = 'inline';

    try {
        const res = await fetch('/api/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        if (data.success) {
            searchInput.value = '';
            showToast(`ENQUEUED // ${data.song.title}`);
            fetchStatus();
        } else {
            showToast(`ERR // ${data.message || 'ENQUEUE_REJECTED'}`);
        }
    } catch (err) {
        showToast(`FATAL // ${err.message}`);
    } finally {
        btnAddQueue.disabled = false;
        searchSpinner.style.display = 'none';
    }
});

// Purge Terminal Logs
btnClearLogs.addEventListener('click', () => {
    terminalLogs.innerHTML = '<div class="log-entry">// TELEMETRY LOG BUFFER PURGED.</div>';
});

// Local 1s Progress Ticker
setInterval(() => {
    if (state.playing && !state.paused && state.duration > 0) {
        if (state.elapsedSeconds < state.duration) {
            state.elapsedSeconds += 1;
            updateProgressDisplay();
        }
    }
}, 1000);

// Status Poller
fetchStatus();
setInterval(fetchStatus, 1200);
