// assets/js/examples/media-player.js
/**
 * Flaxon Website - Advanced Media Player Demo
 * Audio/Video playback with custom controls and visualizer
 */

(function() {
    'use strict';

    // ============================================================
    // DOM Elements
    // ============================================================
    const audioElement = document.getElementById('media-element');
    const videoElement = document.getElementById('video-element');
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const timeDisplay = document.getElementById('time-display');
    const volumeBtn = document.getElementById('volume-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const playlistItems = document.querySelectorAll('.playlist-item');
    const visualizer = document.getElementById('visualizer');

    // ============================================================
    // State
    // ============================================================
    let currentTrack = 0;
    let isPlaying = false;
    let isMuted = false;
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let animationId = null;

    // ============================================================
    // Playlist
    // ============================================================
    const tracks = [
        { title: 'Sample Track 1', url: '/media/track1.mp3' },
        { title: 'Sample Track 2', url: '/media/track2.mp3' },
        { title: 'Sample Track 3', url: '/media/track3.mp3' },
    ];

    // ============================================================
    // Media Controls
    // ============================================================
    function togglePlay() {
        if (audioElement.paused) {
            audioElement.play();
        } else {
            audioElement.pause();
        }
    }

    function playTrack(index) {
        if (index < 0 || index >= tracks.length) return;
        currentTrack = index;
        const track = tracks[index];
        audioElement.src = track.url;
        audioElement.load();
        audioElement.play();
        updatePlaylistUI();
    }

    function prevTrack() {
        playTrack((currentTrack - 1 + tracks.length) % tracks.length);
    }

    function nextTrack() {
        playTrack((currentTrack + 1) % tracks.length);
    }

    function updatePlaylistUI() {
        playlistItems.forEach(function(item, index) {
            item.classList.toggle('active', index === currentTrack);
        });
    }

    // ============================================================
    // Progress Bar
    // ============================================================
    function updateProgress() {
        if (audioElement.duration) {
            const percent = (audioElement.currentTime / audioElement.duration) * 100;
            progressFill.style.width = percent + '%';
            updateTimeDisplay();
        }
    }

    function updateTimeDisplay() {
        const current = formatTime(audioElement.currentTime);
        const duration = formatTime(audioElement.duration);
        timeDisplay.textContent = `${current} / ${duration}`;
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function seek(e) {
        const rect = progressBar.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = x * audioElement.duration;
    }

    // ============================================================
    // Volume Control
    // ============================================================
    function toggleMute() {
        isMuted = !isMuted;
        audioElement.muted = isMuted;
        volumeBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        volumeSlider.value = isMuted ? 0 : 80;
    }

    function updateVolume(value) {
        const vol = value / 100;
        audioElement.volume = vol;
        if (vol === 0) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (vol < 0.5) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }

    // ============================================================
    // Visualizer
    // ============================================================
    function initVisualizer() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        } catch (e) {
            console.warn('Audio visualizer not supported:', e);
        }
    }

    function updateVisualizer() {
        if (!analyser || !visualizer) return;
        analyser.getByteFrequencyData(dataArray);

        const bars = visualizer.querySelectorAll('.bar');
        const bufferLength = analyser.frequencyBinCount;

        for (let i = 0; i < bars.length && i < bufferLength; i++) {
            const value = dataArray[i] || 0;
            const percent = (value / 255) * 100;
            bars[i].style.height = Math.max(5, percent) + '%';
        }

        animationId = requestAnimationFrame(updateVisualizer);
    }

    function startVisualizer() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        updateVisualizer();
    }

    function stopVisualizer() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (visualizer) {
            const bars = visualizer.querySelectorAll('.bar');
            bars.forEach(function(bar) {
                bar.style.height = '5%';
            });
        }
    }

    // ============================================================
    // Fullscreen
    // ============================================================
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // ============================================================
    // Event Listeners
    // ============================================================
    function initEvents() {
        // Play/Pause
        if (playBtn) {
            playBtn.addEventListener('click', togglePlay);
        }

        // Previous/Next
        if (prevBtn) {
            prevBtn.addEventListener('click', prevTrack);
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', nextTrack);
        }

        // Audio events
        audioElement.addEventListener('play', function() {
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            startVisualizer();
        });

        audioElement.addEventListener('pause', function() {
            isPlaying = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            stopVisualizer();
        });

        audioElement.addEventListener('ended', nextTrack);
        audioElement.addEventListener('timeupdate', updateProgress);
        audioElement.addEventListener('loadedmetadata', updateTimeDisplay);

        // Progress bar
        if (progressBar) {
            progressBar.addEventListener('click', seek);
        }

        // Volume
        if (volumeBtn) {
            volumeBtn.addEventListener('click', toggleMute);
        }
        if (volumeSlider) {
            volumeSlider.addEventListener('input', function() {
                updateVolume(parseInt(this.value));
            });
        }

        // Playlist
        playlistItems.forEach(function(item, index) {
            item.addEventListener('click', function() {
                playTrack(index);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT') return;
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
            if (e.code === 'ArrowRight') {
                audioElement.currentTime += 5;
            }
            if (e.code === 'ArrowLeft') {
                audioElement.currentTime -= 5;
            }
        });

        // Fullscreen
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', toggleFullscreen);
        }
    }

    // ============================================================
    // Initialize
    // ============================================================
    function init() {
        // Use audio element (video is fallback)
        audioElement.style.display = 'block';
        videoElement.style.display = 'none';

        // Load first track
        playTrack(0);

        // Initialize visualizer
        initVisualizer();

        // Initialize events
        initEvents();

        console.log('Media player initialized! 🎵');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();