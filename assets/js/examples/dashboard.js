/**
 * Flaxon Website - Live Data Dashboard Demo
 * Real-time charts with Server-Sent Events
 */

(function() {
    'use strict';

    // ============================================================
    // DOM Elements
    // ============================================================
    const chartCanvas = document.getElementById('price-chart');
    const statPrice = document.getElementById('stat-price');
    const statChange = document.getElementById('stat-change');
    const statVolume = document.getElementById('stat-volume');
    const statHigh = document.getElementById('stat-high');
    const metricUpdates = document.getElementById('metric-updates');
    const metricLatency = document.getElementById('metric-latency');
    const metricPoints = document.getElementById('metric-points');
    const metricMemory = document.getElementById('metric-memory');
    const resetBtn = document.getElementById('reset-data');
    const intervalBtns = document.querySelectorAll('[data-interval]');

    // ============================================================
    // State
    // ============================================================
    let chart = null;
    let dataPoints = [];
    let updateCount = 0;
    let updateInterval = 1000;
    let intervalId = null;
    let isPaused = false;
    const MAX_POINTS = 60;

    // ============================================================
    // Chart Setup
    // ============================================================
    function initChart() {
        if (!chartCanvas) return;
        const ctx = chartCanvas.getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '$' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 10 },
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                },
                animation: {
                    duration: 300,
                },
            }
        });
    }

    // ============================================================
    // Data Generation
    // ============================================================
    function generateDataPoint() {
        const basePrice = 150 + Math.random() * 20;
        const noise = (Math.random() - 0.5) * 4;
        const price = basePrice + noise;

        const previous = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].price : price;
        const change = ((price - previous) / previous) * 100;

        return {
            price: price,
            change: change,
            volume: Math.floor(Math.random() * 500) + 50,
            high: Math.max(price, dataPoints.reduce(function(max, p) { return Math.max(max, p.price); }, price)),
            timestamp: new Date().toLocaleTimeString(),
        };
    }

    function addDataPoint() {
        const point = generateDataPoint();
        dataPoints.push(point);

        if (dataPoints.length > MAX_POINTS) {
            dataPoints.shift();
        }

        updateChart(point);
        updateStats(point);
        updateMetrics();
    }

    function resetData() {
        dataPoints = [];
        updateCount = 0;
        
        if (chart) {
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.update();
        }

        if (statPrice) statPrice.textContent = '$0.00';
        if (statChange) statChange.textContent = '+0.00%';
        if (statVolume) statVolume.textContent = '0';
        if (statHigh) statHigh.textContent = '$0.00';
        if (metricUpdates) metricUpdates.textContent = '0';
        if (metricPoints) metricPoints.textContent = '0';

        // Add initial data
        for (let i = 0; i < 20; i++) {
            addDataPoint();
        }
    }

    // ============================================================
    // UI Updates
    // ============================================================
    function updateChart(point) {
        if (!chart) return;
        
        chart.data.labels.push(point.timestamp);
        chart.data.datasets[0].data.push(point.price);

        if (chart.data.labels.length > MAX_POINTS) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update('none');
    }

    function updateStats(point) {
        if (statPrice) statPrice.textContent = '$' + point.price.toFixed(2);

        const change = point.change;
        if (statChange) {
            const sign = change >= 0 ? '+' : '';
            statChange.textContent = sign + change.toFixed(2) + '%';
            statChange.style.color = change >= 0 ? '#22c55e' : '#ef4444';
        }

        if (statVolume) statVolume.textContent = point.volume;

        if (statHigh) {
            const currentHigh = dataPoints.reduce(function(max, p) {
                return Math.max(max, p.price);
            }, 0);
            statHigh.textContent = '$' + currentHigh.toFixed(2);
        }
    }

    function updateMetrics() {
        updateCount++;
        if (metricUpdates) metricUpdates.textContent = updateCount;
        if (metricPoints) metricPoints.textContent = dataPoints.length;

        // Simulate latency
        if (metricLatency) {
            const latency = Math.floor(Math.random() * 50) + 10;
            metricLatency.textContent = latency + 'ms';
        }

        // Simulate memory usage
        if (metricMemory) {
            const memory = (dataPoints.length * 0.01 + Math.random() * 0.5).toFixed(1);
            metricMemory.textContent = memory + 'MB';
        }
    }

    // ============================================================
    // Data Streaming
    // ============================================================
    function startStreaming() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        if (isPaused) return;

        intervalId = setInterval(function() {
            addDataPoint();
        }, updateInterval);
    }

    function stopStreaming() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function setIntervalSpeed(ms) {
        updateInterval = ms;
        if (!isPaused) {
            stopStreaming();
            startStreaming();
        }
    }

    // ============================================================
    // Event Listeners
    // ============================================================
    function initEvents() {
        // Interval buttons
        intervalBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const interval = parseInt(this.dataset.interval, 10);
                const isPauseBtn = interval === 0 || this.textContent.includes('Pause') || this.textContent.includes('Play');

                if (isPauseBtn) {
                    if (!isPaused) {
                        // Pause stream
                        isPaused = true;
                        stopStreaming();
                        this.textContent = '▶ Play';
                    } else {
                        // Resume stream
                        isPaused = false;
                        this.textContent = 'Pause';
                        // Fall back to 1000ms if no prior speed interval was stored
                        const currentInterval = updateInterval || 1000;
                        setIntervalSpeed(currentInterval);
                    }
                } else {
                    // Changing speed
                    isPaused = false;
                    intervalBtns.forEach(function(b) {
                        // Reset play/pause button label if present
                        if (b.dataset.interval === '0') {
                            b.textContent = 'Pause';
                        }
                        b.classList.remove('active');
                    });
                    this.classList.add('active');
                    setIntervalSpeed(interval);
                }
            });
        });

        // Reset button
        if (resetBtn) {
            resetBtn.addEventListener('click', resetData);
        }
    }

    // ============================================================
    // Initialize
    // ============================================================
    function init() {
        // Initialize chart
        initChart();

        // Generate initial data
        for (let i = 0; i < 20; i++) {
            addDataPoint();
        }

        // Start streaming
        startStreaming();

        // Initialize events
        initEvents();

        console.log('Dashboard initialized! 📊');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();