// assets/js/search.js
/**
 * Flaxon Website - Search Functionality
 * Full-text search for documentation
 */

(function() {
    'use strict';

    // ============================================================
    // Search Index
    // ============================================================
    let searchIndex = [];
    let searchInitialized = false;

    function buildSearchIndex() {
        const index = [];

        // Collect all text content from the page
        const contentElements = document.querySelectorAll(
            '.doc-content h1, .doc-content h2, .doc-content h3, .doc-content p, .doc-content li, .doc-content .code-block'
        );

        contentElements.forEach(function(el) {
            const text = el.textContent.trim();
            if (text && text.length > 3) {
                // Find the section heading
                let section = 'General';
                let parent = el.parentElement;
                while (parent) {
                    const heading = parent.querySelector('h1, h2, h3');
                    if (heading) {
                        section = heading.textContent.trim();
                        break;
                    }
                    parent = parent.parentElement;
                }

                const id = el.id || '';
                index.push({
                    text: text,
                    section: section,
                    id: id,
                    type: el.tagName.toLowerCase(),
                });
            }
        });

        return index;
    }

    function initializeSearch() {
        if (!searchInitialized) {
            searchIndex = buildSearchIndex();
            searchInitialized = true;
        }
        return searchIndex;
    }

    // ============================================================
    // Search Function
    // ============================================================
    function search(query) {
        const index = initializeSearch();
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

        if (terms.length === 0) {
            return [];
        }

        const results = index.filter(function(item) {
            const text = item.text.toLowerCase();
            return terms.every(function(term) {
                return text.includes(term);
            });
        });

        // Score and sort results
        return results.map(function(item) {
            let score = 0;
            const text = item.text.toLowerCase();
            terms.forEach(function(term) {
                const count = (text.match(new RegExp(term, 'g')) || []).length;
                score += count;
                // Boost if term appears in heading
                if (item.type === 'h1' || item.type === 'h2' || item.type === 'h3') {
                    score += 2;
                }
            });
            return { ...item, score: score };
        }).sort(function(a, b) {
            return b.score - a.score;
        });
    }

    // ============================================================
    // Highlight Search Results
    // ============================================================
    function highlightText(element, query) {
        const terms = query.split(/\s+/).filter(Boolean);
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        const nodes = [];
        let node;

        while (node = walker.nextNode()) {
            nodes.push(node);
        }

        nodes.forEach(function(node) {
            let text = node.textContent;
            let modified = false;
            terms.forEach(function(term) {
                const regex = new RegExp(term, 'gi');
                if (regex.test(text)) {
                    text = text.replace(regex, function(match) {
                        modified = true;
                        return `<mark class="search-highlight">${match}</mark>`;
                    });
                }
            });
            if (modified) {
                const span = document.createElement('span');
                span.innerHTML = text;
                node.parentNode.replaceChild(span, node);
            }
        });
    }

    function clearHighlights() {
        document.querySelectorAll('.search-highlight').forEach(function(el) {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
        });
    }

    // ============================================================
    // Search UI
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        const searchModal = document.getElementById('search-modal');
        const searchInput = document.getElementById('search-input');
        const searchResultsContainer = document.getElementById('search-results-container');
        const searchTrigger = document.getElementById('search-trigger');
        const searchClose = document.getElementById('search-close');

        if (!searchModal || !searchInput) return;

        // Open search
        function openSearch() {
            searchModal.classList.remove('hidden');
            searchModal.classList.add('flex');
            setTimeout(function() {
                searchInput.focus();
            }, 100);
            document.body.style.overflow = 'hidden';
            buildSearchIndex();
        }

        // Close search
        function closeSearch() {
            searchModal.classList.add('hidden');
            searchModal.classList.remove('flex');
            document.body.style.overflow = '';
            searchInput.value = '';
            searchResultsContainer.innerHTML = '';
            clearHighlights();
        }

        // Search trigger
        if (searchTrigger) {
            searchTrigger.addEventListener('click', openSearch);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                openSearch();
            }
            if (e.key === 'Escape' && !searchModal.classList.contains('hidden')) {
                closeSearch();
            }
        });

        // Close button
        if (searchClose) {
            searchClose.addEventListener('click', closeSearch);
        }

        // Click outside to close
        searchModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeSearch();
            }
        });

        // Live search
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            searchResultsContainer.innerHTML = '';

            if (query.length < 2) {
                const hint = document.createElement('div');
                hint.className = 'search-hint';
                hint.style.cssText = 'padding: 2rem; text-align: center; color: #94a3b8;';
                hint.textContent = 'Type at least 2 characters to search...';
                searchResultsContainer.appendChild(hint);
                return;
            }

            const results = search(query);

            if (results.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding: 2rem; text-align: center; color: #94a3b8;';
                empty.textContent = 'No results found. Try different keywords.';
                searchResultsContainer.appendChild(empty);
                return;
            }

            // Group by section
            const grouped = {};
            results.forEach(function(item) {
                if (!grouped[item.section]) {
                    grouped[item.section] = [];
                }
                grouped[item.section].push(item);
            });

            Object.keys(grouped).forEach(function(section) {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'search-section';
                sectionDiv.style.cssText = 'margin-bottom: 1rem;';

                const title = document.createElement('div');
                title.style.cssText = 'font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.05em; padding: 0.5rem 0.75rem;';
                title.textContent = section;
                sectionDiv.appendChild(title);

                grouped[section].slice(0, 5).forEach(function(item) {
                    const resultDiv = document.createElement('div');
                    resultDiv.className = 'search-result';
                    resultDiv.style.cssText = `
                        padding: 0.5rem 0.75rem;
                        cursor: pointer;
                        border-radius: 6px;
                        transition: background 0.2s;
                        font-size: 0.9rem;
                    `;
                    resultDiv.addEventListener('mouseenter', function() {
                        this.style.background = 'rgba(37, 99, 235, 0.06)';
                    });
                    resultDiv.addEventListener('mouseleave', function() {
                        this.style.background = 'transparent';
                    });

                    let text = item.text;
                    if (text.length > 100) {
                        text = text.substring(0, 100) + '...';
                    }

                    resultDiv.innerHTML = `
                        <div style="color: #0f172a; dark:text-white;">${text}</div>
                        <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">${item.type}</div>
                    `;

                    resultDiv.addEventListener('click', function() {
                        if (item.id) {
                            const target = document.getElementById(item.id);
                            if (target) {
                                closeSearch();
                                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                highlightText(target, query);
                            }
                        }
                    });

                    sectionDiv.appendChild(resultDiv);
                });

                searchResultsContainer.appendChild(sectionDiv);
            });
        });
    });

    // ============================================================
    // Expose search for debugging
    // ============================================================
    window.flaxonSearch = {
        search: search,
        buildIndex: buildSearchIndex,
        index: function() { return initializeSearch(); }
    };

    console.log('Flaxon search initialized! 🔍');

})();