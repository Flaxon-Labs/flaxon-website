// assets/js/header-search.js
/**
 * Flaxon Website - Header Search + Breadcrumb Logic
 *
 * This used to be an inline <script> inside components/header.html.
 * It never ran: header.html is injected into the page with
 * `el.innerHTML = html`, and browsers do not execute <script> tags
 * that arrive that way. Moving it to a real file loaded via
 * document.createElement('script') fixes that.
 */

    (function() {
        'use strict';

        var searchIndex = [];
        var initialized = false;

        function siteUrl(path) {
            return window.flaxonSiteUrl ? window.flaxonSiteUrl(path) : path;
        }

        function escapeRegExp(value) {
            return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        // ============================================================
        // LOAD SEARCH INDEX FROM JSON
        // ============================================================
        function loadSearchIndex() {
            return fetch(siteUrl('/data/search-index.json'))
                .then(function(response) {
                    if (!response.ok) throw new Error('Failed to load search index');
                    return response.json();
                })
                .then(function(data) {
                    searchIndex = data.pages || [];
                    return searchIndex;
                })
                .catch(function(err) {
                    console.error('Search index error:', err);
                    searchIndex = [];
                });
        }

        // ============================================================
        // LOAD SEARCH MODAL
        // ============================================================
        function loadSearchModal() {
            var container = document.getElementById('search-modal-container');
            if (!container) return;
            fetch(siteUrl('/components/search-modal.html'))
                .then(function(response) {
                    if (!response.ok) throw new Error('Failed to load search modal');
                    return response.text();
                })
                .then(function(html) {
                    container.innerHTML = html;
                    // Load search index first, then init
                    loadSearchIndex().then(function() {
                        initSearch();
                    });
                })
                .catch(function(err) {
                    console.error('Search modal error:', err);
                });
        }

        // ============================================================
        // SEARCH FUNCTION (Global JSON Index)
        // ============================================================
        function searchPages(query) {
            var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
            if (terms.length === 0) return [];

            var results = searchIndex.filter(function(page) {
                var content = (page.title + ' ' + page.content + ' ' + page.section).toLowerCase();
                return terms.every(function(term) {
                    return content.includes(term);
                });
            });

            // Score results
            return results.map(function(page) {
                var score = 0;
                var content = (page.title + ' ' + page.content + ' ' + page.section).toLowerCase();
                terms.forEach(function(term) {
                var count = (content.match(new RegExp(escapeRegExp(term), 'g')) || []).length;
                    score += count;
                    // Boost if term is in title
                    if (page.title.toLowerCase().includes(term)) score += 5;
                    // Boost if term is in section
                    if (page.section.toLowerCase().includes(term)) score += 2;
                });
                return { ...page, score: score };
            }).sort(function(a, b) {
                return b.score - a.score;
            });
        }

        // ============================================================
        // INITIALIZE SEARCH
        // ============================================================
        function initSearch() {
            if (initialized) return;
            var searchModal = document.getElementById('search-modal');
            var searchInput = document.getElementById('search-input');
            var searchResults = document.getElementById('search-results-container');
            var searchTrigger = document.getElementById('search-trigger');
            var searchClose = document.getElementById('search-close');

            if (!searchModal || !searchInput || !searchResults) {
                console.warn('Search elements not found');
                return;
            }
            initialized = true;

            // ============================================================
            // OPEN SEARCH
            // ============================================================
            function openSearch() {
                searchModal.classList.remove('hidden');
                searchModal.classList.add('flex');
                document.body.style.overflow = 'hidden';
                setTimeout(function() { searchInput.focus(); }, 100);
            }

            // ============================================================
            // CLOSE SEARCH
            // ============================================================
            function closeSearch() {
                searchModal.classList.add('hidden');
                searchModal.classList.remove('flex');
                document.body.style.overflow = '';
                searchInput.value = '';
                searchResults.innerHTML = '';
            }

            // ============================================================
            // SEARCH INPUT HANDLER
            // ============================================================
            searchInput.addEventListener('input', function() {
                var query = this.value.trim();
                searchResults.innerHTML = '';

                if (query.length < 2) {
                    var hint = document.createElement('div');
                    hint.className = 'search-hint';
                    hint.style.cssText = 'padding: 2rem; text-align: center; color: #94a3b8;';
                    hint.textContent = 'Type at least 2 characters to search the documentation...';
                    searchResults.appendChild(hint);
                    return;
                }

                var results = searchPages(query);

                if (results.length === 0) {
                    var empty = document.createElement('div');
                    empty.style.cssText = 'padding: 2rem; text-align: center; color: #94a3b8;';
                    empty.textContent = 'No results found. Try different keywords.';
                    searchResults.appendChild(empty);
                    return;
                }

                // Group by section
                var grouped = {};
                results.forEach(function(item) {
                    if (!grouped[item.section]) grouped[item.section] = [];
                    grouped[item.section].push(item);
                });

                Object.keys(grouped).forEach(function(section) {
                    var sectionDiv = document.createElement('div');
                    sectionDiv.className = 'search-section';
                    sectionDiv.style.cssText = 'margin-bottom: 1rem;';

                    var title = document.createElement('div');
                    title.style.cssText = 'font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.05em; padding: 0.5rem 0.75rem;';
                    title.textContent = section;
                    sectionDiv.appendChild(title);

                    grouped[section].slice(0, 8).forEach(function(item) {
                        var resultDiv = document.createElement('div');
                        resultDiv.className = 'search-result';
                        resultDiv.style.cssText = 'padding: 0.5rem 0.75rem; cursor: pointer; border-radius: 6px; transition: background 0.2s; font-size: 0.9rem;';
                        resultDiv.addEventListener('mouseenter', function() {
                            this.style.background = 'rgba(37, 99, 235, 0.06)';
                        });
                        resultDiv.addEventListener('mouseleave', function() {
                            this.style.background = 'transparent';
                        });

                        var excerpt = item.content.substring(0, 120) + '...';
                        resultDiv.innerHTML = '<div style="color: #0f172a; dark:text-white; font-weight: 500;">' + item.title + '</div><div style="font-size: 0.8rem; color: #64748b;">' + excerpt + '</div>';

                        resultDiv.addEventListener('click', function() {
                            window.location.href = item.url;
                        });

                        sectionDiv.appendChild(resultDiv);
                    });

                    searchResults.appendChild(sectionDiv);
                });
            });

            // ============================================================
            // EVENT LISTENERS
            // ============================================================
            if (searchTrigger) {
                searchTrigger.addEventListener('click', openSearch);
            }

            if (searchClose) {
                searchClose.addEventListener('click', closeSearch);
            }

            searchModal.addEventListener('click', function(e) {
                if (e.target === this) closeSearch();
            });

            document.addEventListener('keydown', function(e) {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    if (searchModal.classList.contains('hidden')) {
                        openSearch();
                    } else {
                        closeSearch();
                    }
                }
                if (e.key === 'Escape') {
                    if (!searchModal.classList.contains('hidden')) closeSearch();
                }
            });

            console.log('🔍 Global search initialized! (' + searchIndex.length + ' pages indexed)');
        }

        // ============================================================
        // BREADCRUMB LOGIC
        // ============================================================
        function initBreadcrumb() {
            var breadcrumbContainer = document.getElementById('breadcrumb-container');
            var breadcrumbCurrent = document.getElementById('breadcrumb-current');
            var currentPath = window.location.pathname;

            var isDocsPage = currentPath === '/docs.html' ||
                            currentPath.startsWith('/docs/') ||
                            currentPath.startsWith('/docs/getting-started/') ||
                            currentPath.startsWith('/docs/core-concepts/') ||
                            currentPath.startsWith('/docs/guides/') ||
                            currentPath.startsWith('/docs/api/') ||
                            currentPath.startsWith('/docs/examples/');

            if (isDocsPage && breadcrumbContainer) {
                breadcrumbContainer.classList.remove('hidden');

                if (currentPath === '/docs.html' || currentPath === '/docs/') {
                    breadcrumbCurrent.textContent = 'Documentation';
                } else if (currentPath.includes('/getting-started/')) {
                    breadcrumbCurrent.textContent = 'Getting Started';
                } else if (currentPath.includes('/core-concepts/')) {
                    breadcrumbCurrent.textContent = 'Core Concepts';
                } else if (currentPath.includes('/guides/')) {
                    breadcrumbCurrent.textContent = 'Guides';
                } else if (currentPath.includes('/api/')) {
                    breadcrumbCurrent.textContent = 'API Reference';
                } else if (currentPath.includes('/examples/')) {
                    breadcrumbCurrent.textContent = 'Examples';
                } else {
                    var fileName = currentPath.split('/').pop() || 'Documentation';
                    var pageName = fileName.replace('.html', '').replace(/-/g, ' ');
                    breadcrumbCurrent.textContent = pageName.charAt(0).toUpperCase() + pageName.slice(1);
                }
            }
        }

        // ============================================================
        // INIT ON DOM READY
        // ============================================================
        // Run immediately: this file is only loaded (via the bootstrap
        // in header.html) after header.html's markup already exists in
        // the DOM, so there is no DOMContentLoaded event left to wait for.
        function initializeSearch() {
            loadSearchModal();
            initBreadcrumb();
        }

        document.addEventListener('flaxon:header-ready', initializeSearch, { once: true });
        // Covers cached components or pages that already have a static header.
        if (document.getElementById('search-trigger')) {
            initializeSearch();
        }

    })();
