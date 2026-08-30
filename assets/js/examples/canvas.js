// assets/js/examples/canvas.js
/**
 * Flaxon Website - Real-Time Collaborative Canvas Demo
 * WebSocket-powered multi-user drawing
 */

(function() {
    'use strict';

    // ============================================================
    // DOM Elements
    // ============================================================
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const colorOptions = document.querySelectorAll('.color-option');
    const brushSizeInput = document.getElementById('brush-size');
    const sizeDisplay = document.getElementById('size-display');
    const clearBtn = document.getElementById('clear-canvas');
    const undoBtn = document.getElementById('undo-canvas');
    const usersSpan = document.getElementById('canvas-users');
    const statusSpan = document.getElementById('connection-status');

    // ============================================================
    // State
    // ============================================================
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentColor = '#000000';
    let currentSize = 3;
    let drawingHistory = [];
    let historyIndex = -1;
    let isConnected = false;

    // ============================================================
    // Canvas Setup
    // ============================================================
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = Math.min(800, rect.width - 10);
        canvas.height = Math.min(500, canvas.width * 0.625);
        // Redraw on resize
        if (drawingHistory.length > 0) {
            drawAll();
        }
    }

    function initCanvas() {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    // ============================================================
    // Drawing Functions
    // ============================================================
    function getPosition(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX, clientY;

        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
            e.preventDefault();
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getPosition(e);
        lastX = pos.x;
        lastY = pos.y;
        drawDot(lastX, lastY);
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getPosition(e);
        drawLine(lastX, lastY, pos.x, pos.y);
        lastX = pos.x;
        lastY = pos.y;
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            // Save to history
            const imageData = canvas.toDataURL();
            drawingHistory = drawingHistory.slice(0, historyIndex + 1);
            drawingHistory.push(imageData);
            historyIndex = drawingHistory.length - 1;
            // Send to server
            if (isConnected) {
                sendStroke(lastX, lastY, currentColor, currentSize);
            }
        }
    }

    function drawLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        ctx.stroke();
    }

    function drawDot(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.fill();
    }

    function drawAll() {
        if (drawingHistory.length === 0) return;
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
        };
        img.src = drawingHistory[historyIndex] || drawingHistory[0];
    }

    function clearCanvas() {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawingHistory = [];
        historyIndex = -1;
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            drawAll();
        }
    }

    // ============================================================
    // WebSocket Connection
    // ============================================================
    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/canvas`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = function() {
            isConnected = true;
            statusSpan.textContent = '● Connected';
            statusSpan.className = 'text-emerald-500';
            updateUsers(1);
        };

        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'stroke') {
                    drawRemoteStroke(data);
                } else if (data.type === 'clear') {
                    clearCanvas();
                } else if (data.type === 'users') {
                    updateUsers(data.count);
                }
            } catch (e) {
                console.error('WebSocket message error:', e);
            }
        };

        ws.onclose = function() {
            isConnected = false;
            statusSpan.textContent = '● Disconnected';
            statusSpan.className = 'text-red-500';
            setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = function() {
            isConnected = false;
            statusSpan.textContent = '● Error';
            statusSpan.className = 'text-red-500';
        };

        window.canvasWs = ws;
        return ws;
    }

    function sendStroke(x, y, color, size) {
        if (window.canvasWs && isConnected) {
            window.canvasWs.send(JSON.stringify({
                type: 'stroke',
                x: x,
                y: y,
                color: color,
                size: size,
            }));
        }
    }

    function drawRemoteStroke(data) {
        drawLine(data.x, data.y, data.x + 1, data.y + 1);
    }

    function updateUsers(count) {
        if (usersSpan) {
            usersSpan.textContent = count || 1;
        }
    }

    // ============================================================
    // Controls
    // ============================================================
    function initControls() {
        // Color options
        colorOptions.forEach(function(btn) {
            btn.addEventListener('click', function() {
                colorOptions.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                currentColor = this.dataset.color;
            });
        });

        // Brush size
        if (brushSizeInput) {
            brushSizeInput.addEventListener('input', function() {
                currentSize = parseInt(this.value);
                if (sizeDisplay) {
                    sizeDisplay.textContent = currentSize + 'px';
                }
            });
        }

        // Clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                clearCanvas();
                if (window.canvasWs && isConnected) {
                    window.canvasWs.send(JSON.stringify({ type: 'clear' }));
                }
            });
        }

        // Undo button
        if (undoBtn) {
            undoBtn.addEventListener('click', undo);
        }
    }

    // ============================================================
    // Event Listeners
    // ============================================================
    function initEvents() {
        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);

        // Touch events
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing, { passive: false });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            }
        });
    }

    // ============================================================
    // Initialize
    // ============================================================
    function init() {
        initCanvas();
        initControls();
        initEvents();
        connectWebSocket();

        // Set initial drawing history
        const initialData = canvas.toDataURL();
        drawingHistory.push(initialData);
        historyIndex = 0;

        console.log('Canvas demo initialized! 🎨');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();