/* ============================================================ */
/* FLAXON PLAYGROUND — "ROUTE MAP" LOADER                        */
/* Draws the SVG route, walks a pulse dot along it, lights each  */
/* node as it's reached, types a terminal ticker, and fills a    */
/* progress bar. Hides once the timeline finishes AND the page   */
/* has finished loading (whichever is later), with a hard cap    */
/* so the page is never stuck behind the overlay.                */
/* ============================================================ */

(function () {
    var overlay = document.getElementById('loader');
    if (!overlay) return;

    document.documentElement.classList.add('loader-active');

    var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var path = document.getElementById('loader-route-path');
    var pulse = document.getElementById('loader-pulse');
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.loader-node'));
    var labels = Array.prototype.slice.call(document.querySelectorAll('.loader-label'));
    var progressBar = document.getElementById('loader-progress-bar');
    var progressPercent = document.getElementById('loader-progress-percent');
    var terminalText = document.getElementById('loader-terminal-text');

    var hidden = false;
    var animDone = false;
    var pageLoaded = false;

    function hideLoader() {
        if (hidden) return;
        hidden = true;
        overlay.classList.add('is-hidden');
        document.documentElement.classList.remove('loader-active');
        window.setTimeout(function () {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 950);
    }

    function maybeHide() {
        if (animDone && pageLoaded) hideLoader();
    }

    window.addEventListener('load', function () {
        pageLoaded = true;
        maybeHide();
    });

    // Absolute safety net: never let the loader block the page.
    window.setTimeout(hideLoader, 8000);

    if (reduceMotion) {
        // Skip the choreography, show the finished state briefly, done.
        nodes.forEach(function (n) { n.classList.add('is-active'); });
        labels.forEach(function (l) { l.classList.add('is-active'); });
        if (progressBar) progressBar.style.width = '100%';
        if (progressPercent) progressPercent.textContent = '100%';
        if (terminalText) terminalText.textContent = 'Ready on http://127.0.0.1:8000';
        animDone = true;
        window.setTimeout(maybeHide, 300);
        if (document.readyState === 'complete') {
            pageLoaded = true;
            maybeHide();
        }
        return;
    }

    // ---- terminal ticker (chained typewriter, like a status line) ----
    var terminalLines = [
        'flaxon run app:app --reload',
        'Booting Flaxon application\u2026',
        'Registering routes\u2026',
        'GET     /                       ok',
        'GET     /users/<int:user_id>    ok',
        'POST    /users                  ok',
        'GET     /health                 ok',
        'Ready on http://127.0.0.1:8000  \u2713'
    ];
    var typingSpeed = 12;
    var linePause = 90;
    var lineIndex = 0;
    var charIndex = 0;

    function typeLine() {
        if (!terminalText || lineIndex >= terminalLines.length) return;
        var line = terminalLines[lineIndex];
        if (charIndex <= line.length) {
            terminalText.textContent = line.substring(0, charIndex);
            charIndex++;
            window.setTimeout(typeLine, typingSpeed);
        } else {
            charIndex = 0;
            lineIndex++;
            if (lineIndex < terminalLines.length) {
                window.setTimeout(typeLine, linePause);
            }
        }
    }

    // ---- route path draw + traveling pulse + node activation ----
    if (path && typeof path.getTotalLength === 'function') {
        var pathLength = path.getTotalLength();
        path.style.strokeDasharray = String(pathLength);
        path.style.strokeDashoffset = String(pathLength);

        // Node activation thresholds, expressed as a fraction of the
        // path's total length, derived from the node coordinates
        // themselves so this stays correct if the path ever changes.
        var verts = nodes.map(function (n) {
            return [parseFloat(n.getAttribute('cx')), parseFloat(n.getAttribute('cy'))];
        });
        var cumulative = [0];
        for (var i = 1; i < verts.length; i++) {
            var dx = verts[i][0] - verts[i - 1][0];
            var dy = verts[i][1] - verts[i - 1][1];
            cumulative.push(cumulative[i - 1] + Math.sqrt(dx * dx + dy * dy));
        }
        var totalVertLength = cumulative[cumulative.length - 1] || 1;
        var thresholds = cumulative.map(function (c) { return c / totalVertLength; });

        var duration = 3600; // ms
        var start = null;

        function easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        function frame(now) {
            if (start === null) start = now;
            var elapsed = now - start;
            var t = Math.min(elapsed / duration, 1);
            var eased = easeInOutQuad(t);

            path.style.strokeDashoffset = String(pathLength * (1 - eased));

            var point = path.getPointAtLength(pathLength * eased);
            if (pulse) {
                pulse.setAttribute('cx', point.x);
                pulse.setAttribute('cy', point.y);
            }

            thresholds.forEach(function (threshold, idx) {
                if (eased >= threshold - 0.008) {
                    if (nodes[idx]) nodes[idx].classList.add('is-active');
                    if (labels[idx]) labels[idx].classList.add('is-active');
                }
            });

            var pct = Math.round(eased * 100);
            if (progressBar) progressBar.style.width = pct + '%';
            if (progressPercent) progressPercent.textContent = pct + '%';

            if (t < 1) {
                window.requestAnimationFrame(frame);
            } else {
                animDone = true;
                if (document.readyState === 'complete') {
                    pageLoaded = true;
                }
                window.setTimeout(maybeHide, 400);
            }
        }

        window.requestAnimationFrame(frame);
    } else {
        // No SVG path API support — skip straight to done.
        animDone = true;
    }

    window.setTimeout(typeLine, 300);
})();