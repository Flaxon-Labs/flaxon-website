/** Safe full-text search across the complete generated documentation index. */
(function () {
    'use strict';
    let initialized = false;
    const siteUrl = path => window.flaxonSiteUrl ? window.flaxonSiteUrl(path) : path;
    async function initialize() {
        const container = document.getElementById('search-modal-container');
        const trigger = document.getElementById('search-trigger');
        if (!container || !trigger || initialized) return;
        initialized = true;
        try {
            const response = await fetch(siteUrl('/components/search-modal.html'));
            if (!response.ok) throw new Error('Search dialog could not load');
            container.innerHTML = await response.text();
            const dialog = container.querySelector('dialog');
            const input = container.querySelector('#search-input');
            const results = container.querySelector('#search-results-container');
            let pages = null;
            let loading = null;
            function hint(message) {
                results.replaceChildren(); const text = document.createElement('p');
                text.className = 'search-hint'; text.textContent = message; results.append(text);
            }
            async function loadIndex() {
                if (!loading) loading = fetch(siteUrl('/data/search-index.json')).then(response => {
                    if (!response.ok) throw new Error('Search index could not load');
                    return response.json();
                }).then(index => {pages = index.pages;});
                return loading;
            }
            async function search() {
                const query = input.value.trim().toLocaleLowerCase();
                if (query.length < 2) {hint('Type at least two characters to search.'); return;}
                try {await loadIndex();} catch (_) {hint('Search is unavailable. Use the documentation directory.'); return;}
                if (input.value.trim().toLocaleLowerCase() !== query) return;
                const terms = query.split(/\s+/);
                const matches = pages.filter(page => terms.every(term => (page.title + ' ' + page.section + ' ' + page.content).toLocaleLowerCase().includes(term)));
                matches.sort((a, b) => Number(b.title.toLocaleLowerCase().includes(query)) - Number(a.title.toLocaleLowerCase().includes(query)));
                results.replaceChildren();
                if (!matches.length) {hint('No matching pages. Try another search.'); return;}
                matches.slice(0, 30).forEach(page => {
                    const link = document.createElement('a'); link.className = 'search-result'; link.href = siteUrl(page.url);
                    const title = document.createElement('strong'); title.textContent = page.title;
                    const section = document.createElement('span'); section.textContent = page.section;
                    const excerpt = document.createElement('p'); excerpt.textContent = page.content.slice(0, 180) + '…';
                    link.append(title, section, excerpt); results.append(link);
                });
            }
            function open() {
                if (!dialog.open) dialog.showModal();
                input.focus(); loadIndex().catch(() => {});
            }
            function close() {dialog.close(); input.value = ''; hint('Type at least two characters to search.'); trigger.focus();}
            trigger.addEventListener('click', open);
            container.querySelector('#search-close').addEventListener('click', close);
            input.addEventListener('input', search);
            dialog.addEventListener('click', event => {if (event.target === dialog) close();});
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && dialog.open) {
                    event.preventDefault(); close();
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                    event.preventDefault(); if (dialog.open) close(); else open();
                }
            });
        } catch (error) {
            initialized = false;
            trigger.addEventListener('click', () => {window.location.href = siteUrl('/docs.html');}, {once: true});
            console.error(error);
        }
    }
    document.addEventListener('flaxon:header-ready', initialize);
    if (document.getElementById('search-trigger')) initialize();
}());
