// assets/js/docs.js
/**
 * Flaxon Website - Documentation JavaScript
 * Interactive features for the documentation pages
 */

(function() {
    'use strict';

    // ============================================================
    // Table of Contents Generation
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        const content = document.querySelector('.doc-content');
        const tocContainer = document.querySelector('.doc-toc');

        if (content && tocContainer) {
            const headings = content.querySelectorAll('h2, h3');
            if (headings.length > 0) {
                const tocList = document.createElement('ul');
                let currentH2 = null;
                let currentList = tocList;

                headings.forEach(function(heading) {
                    const level = heading.tagName.toLowerCase();
                    const id = heading.id || heading.textContent.toLowerCase().replace(/\s+/g, '-');

                    if (!heading.id) {
                        heading.id = id;
                    }

                    const link = document.createElement('a');
                    link.href = '#' + id;
                    link.textContent = heading.textContent;

                    const item = document.createElement('li');
                    item.appendChild(link);

                    if (level === 'h2') {
                        currentList = tocList;
                        currentList.appendChild(item);
                        currentH2 = item;
                    } else if (level === 'h3' && currentH2) {
                        let subList = currentH2.querySelector('ul');
                        if (!subList) {
                            subList = document.createElement('ul');
                            currentH2.appendChild(subList);
                        }
                        const subItem = document.createElement('li');
                        subItem.appendChild(link);
                        subList.appendChild(subItem);
                    } else {
                        currentList.appendChild(item);
                    }
                });

                tocContainer.appendChild(tocList);
            }
        }
    });

    // ============================================================
    // Sidebar Active State Based on Scroll
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        const sidebarLinks = document.querySelectorAll('.doc-sidebar a');
        const sections = document.querySelectorAll('.doc-content h1, .doc-content h2');

        if (sidebarLinks.length > 0 && sections.length > 0) {
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        sidebarLinks.forEach(function(link) {
                            link.classList.remove('active');
                            if (link.getAttribute('href') === '#' + id) {
                                link.classList.add('active');
                            }
                        });
                    }
                });
            }, {
                threshold: 0.3,
            });

            sections.forEach(function(section) {
                observer.observe(section);
            });
        }
    });

    // ============================================================
    // Search Functionality (Simple Client-Side)
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        const searchInput = document.getElementById('docs-search');
        const searchResults = document.getElementById('search-results');

        if (searchInput && searchResults) {
            const searchData = [];

            // Collect all content sections
            document.querySelectorAll('.doc-content h1, .doc-content h2, .doc-content p').forEach(function(el) {
                const text = el.textContent.trim();
                if (text && text.length > 10) {
                    searchData.push({
                        text: text,
                        type: el.tagName.toLowerCase(),
                        section: el.closest('h1, h2, h3')?.textContent || 'Documentation',
                    });
                }
            });

            searchInput.addEventListener('input', function() {
                const query = this.value.toLowerCase().trim();
                searchResults.innerHTML = '';

                if (query.length < 2) {
                    searchResults.style.display = 'none';
                    return;
                }

                const results = searchData.filter(function(item) {
                    return item.text.toLowerCase().includes(query);
                });

                if (results.length > 0) {
                    searchResults.style.display = 'block';
                    results.slice(0, 10).forEach(function(item) {
                        const div = document.createElement('div');
                        div.className = 'search-result-item';
                        div.style.cssText = `
                            padding: 8px 12px;
                            border-bottom: 1px solid #e2e8f0;
                            cursor: pointer;
                            font-size: 0.9rem;
                            transition: background 0.2s;
                        `;
                        div.innerHTML = `
                            <span style="color: #64748b; font-size: 0.75rem;">${item.type}</span>
                            <span style="margin-left: 8px;">${item.text.substring(0, 60)}${item.text.length > 60 ? '...' : ''}</span>
                        `;
                        div.addEventListener('mouseenter', function() {
                            this.style.background = '#f1f5f9';
                        });
                        div.addEventListener('mouseleave', function() {
                            this.style.background = 'transparent';
                        });
                        searchResults.appendChild(div);
                    });
                } else {
                    searchResults.style.display = 'block';
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 12px; color: #94a3b8; font-size: 0.9rem;';
                    div.textContent = 'No results found';
                    searchResults.appendChild(div);
                }
            });

            // Close results on click outside
            document.addEventListener('click', function(e) {
                if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.style.display = 'none';
                }
            });
        }
    });

    // ============================================================
    // Code Block Language Detection
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.code-block pre code').forEach(function(code) {
            const className = code.className;
            const lang = className.replace('language-', '');
            if (lang && lang !== 'plaintext') {
                const parent = code.closest('.code-block');
                if (parent) {
                    const label = document.createElement('span');
                    label.className = 'code-language';
                    label.textContent = lang.toUpperCase();
                    label.style.cssText = `
                        position: absolute;
                        top: 8px;
                        left: 12px;
                        font-size: 0.6rem;
                        color: #475569;
                        background: rgba(255,255,255,0.06);
                        padding: 2px 8px;
                        border-radius: 4px;
                        font-weight: 600;
                        letter-spacing: 0.05em;
                    `;
                    parent.style.position = 'relative';
                    parent.appendChild(label);
                }
            }
        });
    });

    // ============================================================
    // Breadcrumb Navigation Update
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            let html = '<a href="/">Home</a>';

            if (pathParts.length > 0) {
                let currentPath = '';
                pathParts.forEach(function(part, index) {
                    currentPath += '/' + part;
                    const isLast = index === pathParts.length - 1;
                    const label = part.replace(/-/g, ' ').replace(/.html$/, '').replace(/.md$/, '');
                    if (isLast) {
                        html += ` / <span class="text-slate-500">${label}</span>`;
                    } else {
                        html += ` / <a href="${currentPath}">${label}</a>`;
                    }
                });
            }

            breadcrumb.innerHTML = html;
        }
    });

    console.log('Flaxon documentation features initialized! 📚');

})();