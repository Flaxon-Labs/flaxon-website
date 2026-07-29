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
                    legend: { display: false },
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
                animation: { duration: 300 }
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
        const change = previous !== 0 ? ((price - previous) / previous) * 100 : 0;

        let currentHigh = price;
        for (let i = 0; i < dataPoints.length; i++) {
            if (dataPoints[i].price > currentHigh) {
                currentHigh = dataPoints[i].price;
            }
        }

        return {
            price: price,
            change: change,
            volume: Math.floor(Math.random() * 500) + 50,
            high: currentHigh,
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

    function populateInitialData(count) {
        dataPoints = [];
        if (chart) {
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
        }

        for (let i = 0; i < count; i++) {
            const point = generateDataPoint();
            dataPoints.push(point);
            if (chart) {
                chart.data.labels.push(point.timestamp);
                chart.data.datasets[0].data.push(point.price);
            }
        }

        if (chart) {
            chart.update();
        }

        if (dataPoints.length > 0) {
            const lastPoint = dataPoints[dataPoints.length - 1];
            updateStats(lastPoint);
            updateMetrics();
        }
    }

    function resetData() {
        updateCount = 0;
        populateInitialData(20);
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
        if (!point) return;

        if (statPrice) statPrice.textContent = '$' + point.price.toFixed(2);

        const change = point.change;
        if (statChange) {
            const sign = change >= 0 ? '+' : '';
            statChange.textContent = sign + change.toFixed(2) + '%';
            statChange.style.color = change >= 0 ? '#22c55e' : '#ef4444';
        }

        if (statVolume) statVolume.textContent = point.volume;

        if (statHigh) {
            let maxPrice = 0;
            for (let i = 0; i < dataPoints.length; i++) {
                if (dataPoints[i].price > maxPrice) {
                    maxPrice = dataPoints[i].price;
                }
            }
            statHigh.textContent = '$' + maxPrice.toFixed(2);
        }
    }

    function updateMetrics() {
        updateCount++;
        if (metricUpdates) metricUpdates.textContent = updateCount;
        if (metricPoints) metricPoints.textContent = dataPoints.length;

        if (metricLatency) {
            const latency = Math.floor(Math.random() * 50) + 10;
            metricLatency.textContent = latency + 'ms';
        }

        if (metricMemory) {
            const memory = (dataPoints.length * 0.01 + Math.random() * 0.5).toFixed(1);
            metricMemory.textContent = memory + 'MB';
        }
    }

    // ============================================================
    // Data Streaming
    // ============================================================
    function startStreaming() {
        stopStreaming();

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
            startStreaming();
        }
    }

    // ============================================================
    // Event Listeners
    // ============================================================
    function initEvents() {
        intervalBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const interval = parseInt(this.dataset.interval, 10);
                const isPauseBtn = interval === 0 || this.textContent.includes('Pause') || this.textContent.includes('Play');

                if (isPauseBtn) {
                    if (!isPaused) {
                        isPaused = true;
                        stopStreaming();
                        this.textContent = '▶ Play';
                    } else {
                        isPaused = false;
                        this.textContent = 'Pause';
                        setIntervalSpeed(updateInterval || 1000);
                    }
                } else {
                    isPaused = false;
                    intervalBtns.forEach(function(b) {
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

        if (resetBtn) {
            resetBtn.addEventListener('click', resetData);
        }
    }

    // ============================================================
    // Initialize
    // ============================================================
    function init() {
        initChart();
        populateInitialData(20);
        startStreaming();
        initEvents();

        console.log('Dashboard initialized! 📊');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();