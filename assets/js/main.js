// assets/js/main.js
/**
 * Flaxon Website - Main JavaScript
 * Core functionality for the Flaxon public website
 */

(function() {
    'use strict';

    // ============================================================
    // ready() - like DOMContentLoaded, but safe to use even after
    // the page has already fully loaded. main.js is now loaded from
    // footer.html *after* header/footer are injected into the page,
    // which is always after the real DOMContentLoaded event has
    // already fired - so a plain DOMContentLoaded listener here
    // would never run. A short delay also gives the async-loaded
    // header/footer/page content a moment to finish landing.
    // ============================================================
    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            setTimeout(fn, 50);
        }
    }

    // ============================================================
    // Mobile Menu Toggle
    // ============================================================
    ready(function() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
                const icon = this.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-bars');
                    icon.classList.toggle('fa-times');
                }
            });
        }
    });

    // ============================================================
    // Smooth Scroll for Anchor Links
    // ============================================================
    ready(function() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                }
            });
        });
    });

    // ============================================================
    // Active Navigation Link Highlighting
    // ============================================================
    ready(function() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('nav a, .sidebar a, .doc-sidebar a');

        navLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href && href !== '#' && href !== '/') {
                if (currentPath === href || currentPath === href + '/') {
                    link.classList.add('active');
                }
            }
            if (href === '/' && currentPath === '/') {
                link.classList.add('active');
            }
        });
    });

    // ============================================================
    // Copy Code Button
    // ============================================================
    ready(function() {
        document.querySelectorAll('.code-block').forEach(function(block) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = 'Copy code';
            copyBtn.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(255,255,255,0.1);
                border: none;
                color: #94a3b8;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                transition: all 0.2s;
            `;

            const codeEl = block.querySelector('code');
            if (codeEl) {
                block.style.position = 'relative';
                block.appendChild(copyBtn);

                copyBtn.addEventListener('click', function() {
                    const text = codeEl.textContent;
                    navigator.clipboard.writeText(text).then(function() {
                        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                        copyBtn.style.color = '#22c55e';
                        setTimeout(function() {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                            copyBtn.style.color = '#94a3b8';
                        }, 2000);
                    });
                });
            }
        });
    });

    // ============================================================
    // Stats Counter Animation
    // ============================================================
    function animateCounter(element, target, duration) {
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (target - start) * progress);
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target;
            }
        }

        requestAnimationFrame(update);
    }

    ready(function() {
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(function(stat) {
            const target = parseInt(stat.getAttribute('data-target')) || parseInt(stat.textContent) || 0;
            if (target > 0) {
                stat.textContent = '0';
                const observer = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            animateCounter(stat, target, 2000);
                            observer.unobserve(stat);
                        }
                    });
                });
                observer.observe(stat);
            }
        });
    });

    // ============================================================
    // Scroll to Top Button
    // ============================================================
    ready(function() {
        const scrollBtn = document.createElement('button');
        scrollBtn.id = 'scroll-top-btn';
        scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollBtn.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, #2563eb, #06b6d4);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 1.2rem;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 999;
        `;
        document.body.appendChild(scrollBtn);

        window.addEventListener('scroll', function() {
            if (window.scrollY > 400) {
                scrollBtn.style.opacity = '1';
                scrollBtn.style.visibility = 'visible';
            } else {
                scrollBtn.style.opacity = '0';
                scrollBtn.style.visibility = 'hidden';
            }
        });

        scrollBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // ============================================================
    // Feature Card Hover Effect (Tilt)
    // ============================================================
    ready(function() {
        const cards = document.querySelectorAll('.feature-card, .card');
        cards.forEach(function(card) {
            card.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                this.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
            });
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg)';
            });
        });
    });

    // ============================================================
    // Toast Notification
    // ============================================================
    window.showToast = function(message, type) {
        const toast = document.createElement('div');
        const colors = {
            success: '#065f46',
            error: '#7f1d1d',
            warning: '#78350f',
            info: '#1e3a5f'
        };
        const textColors = {
            success: '#6ee7b7',
            error: '#fca5a5',
            warning: '#fcd34d',
            info: '#93c5fd'
        };
        const bgColor = colors[type] || colors.info;
        const textColor = textColors[type] || textColors.info;

        toast.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 30px;
            background: ${bgColor};
            color: ${textColor};
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 0.9rem;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            z-index: 1000;
            transform: translateX(120%);
            transition: transform 0.4s ease;
            max-width: 400px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() {
            toast.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(function() {
            toast.style.transform = 'translateX(120%)';
            setTimeout(function() {
                toast.remove();
            }, 400);
        }, 4000);
    };

    console.log('Flaxon website initialized successfully! 🚀');

})();