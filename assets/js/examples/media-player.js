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
    let isVisualizerInitialized = false;

    // ============================================================
    // Playlist
    // ============================================================
    const tracks = [
        { title: 'Sample Track 1', url: '/w3/w1.mp3' },
        { title: 'Sample Track 2', url: '/w3/w2.mp3' },
        { title: 'Sample Track 3', url: '/w3/w3.mp3' },
    ];

    // ============================================================
    // Media Controls
    // ============================================================
    function togglePlay() {
        if (!audioElement) return;
        
        // Lazy initialize AudioContext on user interaction to abide by browser autoplay policies
        initVisualizer();

        if (audioElement.paused) {
            audioElement.play().catch(function(err) {
                console.warn('Playback interrupted:', err);
            });
        } else {
            audioElement.pause();
        }
    }

    function playTrack(index, autoPlay = true) {
        if (!audioElement || index < 0 || index >= tracks.length) return;
        currentTrack = index;
        const track = tracks[index];
        audioElement.src = track.url;
        audioElement.load();

        if (autoPlay) {
            initVisualizer();
            audioElement.play().catch(function(err) {
                console.warn('Playback interrupted:', err);
            });
        }
        
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
        if (!audioElement) return;
        if (audioElement.duration) {
            const percent = (audioElement.currentTime / audioElement.duration) * 100;
            if (progressFill) progressFill.style.width = percent + '%';
            updateTimeDisplay();
        }
    }

    function updateTimeDisplay() {
        if (!timeDisplay || !audioElement) return;
        const current = formatTime(audioElement.currentTime);
        const duration = formatTime(audioElement.duration);
        timeDisplay.textContent = `${current} / ${duration}`;
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function seek(e) {
        if (!audioElement || !progressBar || !audioElement.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioElement.currentTime = x * audioElement.duration;
    }

    // ============================================================
    // Volume Control
    // ============================================================
    function toggleMute() {
        if (!audioElement) return;
        isMuted = !isMuted;
        audioElement.muted = isMuted;
        
        if (volumeBtn) {
            volumeBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        }
        if (volumeSlider) {
            volumeSlider.value = isMuted ? 0 : audioElement.volume * 100;
        }
    }

    function updateVolume(value) {
        if (!audioElement) return;
        const vol = value / 100;
        audioElement.volume = vol;
        audioElement.muted = vol === 0;

        if (volumeBtn) {
            if (vol === 0) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else if (vol < 0.5) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
            } else {
                volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        }
    }

    // ============================================================
    // Visualizer
    // ============================================================
    function initVisualizer() {
        if (isVisualizerInitialized || !audioElement) return;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            isVisualizerInitialized = true;
        } catch (e) {
            console.warn('Audio visualizer not supported or failed to initialize:', e);
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
            document.documentElement.requestFullscreen().catch(function(err) {
                console.warn('Error attempting to enable fullscreen:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    // ============================================================
    // Event Listeners
    // ============================================================
    function initEvents() {
        if (!audioElement) return;

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
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            startVisualizer();
        });

        audioElement.addEventListener('pause', function() {
            isPlaying = false;
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
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
                updateVolume(parseInt(this.value, 10));
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
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
            if (e.code === 'ArrowRight') {
                audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 5);
            }
            if (e.code === 'ArrowLeft') {
                audioElement.currentTime = Math.max(0, audioElement.currentTime - 5);
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
        if (!audioElement) return;

        // Display configuration
        audioElement.style.display = 'block';
        if (videoElement) {
            videoElement.style.display = 'none';
        }

        // Load first track without auto-playing (avoids unhandled Autoplay Policy promise rejection)
        playTrack(0, false);

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