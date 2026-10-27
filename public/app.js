// 0xSHARON Music Controller Client Logic

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

let localTimer = null;
let pollInterval = null;

// DOM Elements
const userAvatar = document.getElementById('userAvatar');
const userTag = document.getElementById('userTag');
const botStatus = document.getElementById('botStatus');
const voiceStatusPill = document.getElementById('voiceStatusPill');
const voiceStatusText = document.getElementById('voiceStatusText');

const coverArt = document.getElementById('coverArt');
const visualizer = document.getElementById('visualizer');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const requesterTag = document.getElementById('requesterTag');
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
const btnToggle247 = document.getElementById('btnToggle247');
const stayBadge = document.getElementById('stayBadge');
const loopBadge = document.getElementById('loopBadge');

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
const ambientGlow = document.getElementById('ambientGlow');

// Time Formatter (seconds to mm:ss or hh:mm:ss)
function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Notification Toast
let toastTimeout = null;
function showToast(msg, duration = 3000) {
    toast.textContent = msg;
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Fetch Status from Backend
async function fetchStatus() {
    try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        updateUI(data);
    } catch (err) {
        botStatus.textContent = 'Disconnected';
        botStatus.style.color = '#f43f5e';
    }
}

// Update UI Components
function updateUI(data) {
    state.online = data.online;
    const user = data.user;
    const voice = data.voice;
    const playback = data.playback;
    const queue = data.queue || [];
    const logs = data.logs || [];

    // Header User & Voice info
    if (user) {
        userTag.textContent = user.tag;
        if (user.avatar) userAvatar.src = user.avatar;
        botStatus.textContent = 'Online & Active';
        botStatus.style.color = '#10b981';
    } else {
        userTag.textContent = 'Offline';
        botStatus.textContent = 'Disconnected';
        botStatus.style.color = '#f43f5e';
    }

    if (voice && voice.connected) {
        voiceStatusPill.classList.add('active');
        const typeLabel = voice.channelType === 'DM' ? 'Direct Message Call' : 'Voice Channel';
        voiceStatusText.textContent = `${voice.channelName} (${typeLabel})`;
    } else {
        voiceStatusPill.classList.remove('active');
        voiceStatusText.textContent = 'Not in voice / call';
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

    // Badges & Toggle button states
    if (state.stay247) {
        stayBadge.classList.add('active');
        btnToggle247.classList.add('active');
    } else {
        stayBadge.classList.remove('active');
        btnToggle247.classList.remove('active');
    }

    if (state.loop) {
        loopBadge.classList.add('active');
        btnToggleLoop.classList.add('active');
    } else {
        loopBadge.classList.remove('active');
        btnToggleLoop.classList.remove('active');
    }

    // Play/Pause icon
    if (state.playing) {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
        visualizer.classList.add('active');
    } else {
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        visualizer.classList.remove('active');
    }

    // Track details
    if (state.currentSong) {
        trackTitle.textContent = state.currentSong.title;
        trackArtist.textContent = state.currentSong.author || 'YouTube';
        if (state.currentSong.thumbnail) {
            coverArt.src = state.currentSong.thumbnail;
        }
        if (state.currentSong.requestedby) {
            requesterTag.style.display = 'inline-flex';
            requesterName.textContent = state.currentSong.requestedby;
        } else {
            requesterTag.style.display = 'none';
        }
    } else {
        trackTitle.textContent = 'No Music Playing';
        trackArtist.textContent = 'Queue songs via Discord or search bar below';
        coverArt.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
        requesterTag.style.display = 'none';
    }

    // Timeline Progress
    totalDuration.textContent = formatTime(state.duration);
    updateProgressDisplay();

    // Volume Slider
    if (document.activeElement !== volumeSlider) {
        volumeSlider.value = state.volume;
        volumeVal.textContent = state.volume;
    }

    // Render Queue
    renderQueue(queue);

    // Render Logs
    renderLogs(logs);
}

// Progress Display helper
function updateProgressDisplay() {
    currentTime.textContent = formatTime(state.elapsedSeconds);
    if (state.duration > 0) {
        const pct = Math.min(100, Math.max(0, (state.elapsedSeconds / state.duration) * 100));
        progressFill.style.width = `${pct}%`;
    } else {
        progressFill.style.width = '0%';
    }
}

// Render Up Next Queue
function renderQueue(queue) {
    state.queue = queue;
    queueCount.textContent = `${queue.length} song${queue.length === 1 ? '' : 's'}`;

    if (!queue || queue.length === 0) {
        queueEmpty.style.display = 'flex';
        // Remove old queue item elements
        const oldItems = queueList.querySelectorAll('.queue-item');
        oldItems.forEach(el => el.remove());
        return;
    }

    queueEmpty.style.display = 'none';
    
    // Clear and re-populate
    const oldItems = queueList.querySelectorAll('.queue-item');
    oldItems.forEach(el => el.remove());

    queue.forEach((song, idx) => {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.innerHTML = `
            <span class="queue-num">#${idx + 1}</span>
            <img src="${song.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&auto=format&fit=crop&q=80'}" alt="Thumb" class="queue-thumb">
            <div class="queue-info">
                <div class="queue-title" title="${song.title}">${song.title}</div>
                <div class="queue-meta">${song.author || 'YouTube'} • ${formatTime(song.duration)}</div>
            </div>
            <button class="btn-remove-track" data-index="${idx}" title="Remove from queue">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        queueList.appendChild(item);
    });

    // Add click listeners to remove buttons
    const removeButtons = queueList.querySelectorAll('.btn-remove-track');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            await removeTrack(index);
        });
    });
}

// Render Terminal Logs
function renderLogs(logs) {
    if (!logs || logs.length === 0) return;
    if (logs.length === state.lastLogCount) return;
    state.lastLogCount = logs.length;

    terminalLogs.innerHTML = '';
    logs.forEach(entry => {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = `<span class="log-time">[${entry.time || ''}]</span> ${escapeHtml(entry.message || entry.raw || '')}`;
        terminalLogs.appendChild(line);
    });
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Dispatch Action to API
async function sendAction(action) {
    try {
        const res = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (!data.success) {
            showToast(`⚠️ ${data.message || 'Action failed'}`);
        } else {
            fetchStatus();
        }
    } catch (err) {
        showToast(`❌ Network error: ${err.message}`);
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
            showToast(`🗑️ Removed: ${data.removed?.title || 'Track'}`);
            fetchStatus();
        } else {
            showToast(`⚠️ ${data.message || 'Could not remove track'}`);
        }
    } catch (err) {
        showToast(`❌ Error: ${err.message}`);
    }
}

// Event Listeners
btnPlayPause.addEventListener('click', () => sendAction('play_pause'));
btnSkip.addEventListener('click', () => sendAction('skip'));
btnStop.addEventListener('click', () => sendAction('stop'));
btnToggleLoop.addEventListener('click', () => sendAction('toggle_loop'));
btnToggle247.addEventListener('click', () => sendAction('toggle_247'));

// Debounced Volume Slider
let volumeDebounce = null;
volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    volumeVal.textContent = val;
    if (volumeDebounce) clearTimeout(volumeDebounce);
    volumeDebounce = setTimeout(async () => {
        try {
            await fetch('/api/volume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volume: val })
            });
        } catch (err) {}
    }, 200);
});

// Search & Add Track Form
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    btnAddQueue.disabled = true;
    searchSpinner.style.display = 'block';

    try {
        const res = await fetch('/api/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        if (data.success) {
            searchInput.value = '';
            showToast(`✅ Added: ${data.song.title}`);
            fetchStatus();
        } else {
            showToast(`⚠️ ${data.message || 'Failed to add track'}`);
        }
    } catch (err) {
        showToast(`❌ Error adding song: ${err.message}`);
    } finally {
        btnAddQueue.disabled = false;
        searchSpinner.style.display = 'none';
    }
});

// Clear Logs
btnClearLogs.addEventListener('click', () => {
    terminalLogs.innerHTML = '<div class="log-line text-muted">[Console cleared]</div>';
});

// Local Second Progress Ticker
setInterval(() => {
    if (state.playing && !state.paused && state.duration > 0) {
        if (state.elapsedSeconds < state.duration) {
            state.elapsedSeconds += 1;
            updateProgressDisplay();
        }
    }
}, 1000);

// Status Poller (every 1200ms)
fetchStatus();
pollInterval = setInterval(fetchStatus, 1200);
