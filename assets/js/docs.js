/** Documentation reading tools and one native sidebar on every page. */
(function () {
    'use strict';
    function ready(callback) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, {once: true});
        else callback();
    }
    function bindNavigation() {
        const sidebar = document.querySelector('#docs-sidebar .doc-sidebar');
        if (!sidebar || sidebar.dataset.bound) return;
        sidebar.dataset.bound = 'true';
        const toggle = sidebar.querySelector('#docs-menu-toggle');
        const filter = sidebar.querySelector('#docs-nav-filter');
        const groups = Array.from(sidebar.querySelectorAll('.docs-nav-group'));
        let activeGroup = null;
        sidebar.querySelectorAll('a').forEach(function (link) {
            const current = window.location.pathname.replace(/\/index\.html$/, '/');
            const destination = new URL(link.href).pathname.replace(/\/index\.html$/, '/');
            if (current === destination) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
                activeGroup = link.closest('details');
                if (activeGroup) activeGroup.open = true;
            }
        });
        if (!activeGroup && groups[0]) groups[0].open = true;
        function close() {
            sidebar.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
        toggle.addEventListener('click', function () {
            const open = sidebar.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', String(open));
        });
        sidebar.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') { close(); toggle.focus(); }
        });
        filter.addEventListener('input', function () {
            const query = filter.value.toLocaleLowerCase().trim();
            let matches = 0;
            groups.forEach(function (group) {
                let count = 0;
                group.querySelectorAll('li').forEach(function (item) {
                    item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
                    if (!item.hidden) count++;
                });
                group.hidden = count === 0;
                group.open = query ? count > 0 : group === activeGroup || (!activeGroup && group === groups[0]);
                matches += count;
            });
            sidebar.querySelector('#docs-nav-empty').hidden = matches > 0;
        });
    }
    ready(function () {
        const content = document.querySelector('.doc-content');
        if (!content) return;
        const headings = content.querySelectorAll('h2, h3');
        const ids = new Set(Array.from(document.querySelectorAll('[id]'), node => node.id));
        const toc = document.createElement('details');
        toc.className = 'doc-toc';
        const summary = document.createElement('summary'); summary.textContent = 'On this page'; toc.append(summary);
        const list = document.createElement('ul');
        headings.forEach(function (heading) {
            if (!heading.id) {
                const base = heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
                let id = base, count = 2;
                while (ids.has(id)) id = base + '-' + count++;
                heading.id = id; ids.add(id);
            }
            const item = document.createElement('li');
            if (heading.tagName === 'H3') item.className = 'toc-subheading';
            const link = document.createElement('a'); link.href = '#' + heading.id; link.textContent = heading.textContent;
            item.append(link); list.append(item);
        });
        if (headings.length) {
            toc.append(list);
            const h1 = content.querySelector('h1');
            if (h1) h1.insertAdjacentElement('afterend', toc);
        }
        content.querySelectorAll('pre').forEach(function (pre) {
            if (pre.closest('.doc-code')) return;
            const code = pre.querySelector('code') || pre;
            const wrapper = document.createElement('div'); wrapper.className = 'doc-code';
            const toolbar = document.createElement('div'); toolbar.className = 'doc-code-toolbar';
            const label = document.createElement('span');
            const language = (code.className.match(/language-([\w-]+)/) || [])[1];
            label.textContent = language || 'Code';
            const button = document.createElement('button'); button.type = 'button'; button.className = 'copy-btn';
            button.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code');
            button.setAttribute('aria-live', 'polite');
            toolbar.append(label, button); pre.before(wrapper); wrapper.append(toolbar, pre);
            button.addEventListener('click', async function () {
                try {
                    await navigator.clipboard.writeText(code.textContent);
                    button.textContent = 'Copied';
                } catch (_) {
                    button.textContent = 'Select code';
                    const selection = window.getSelection(); const range = document.createRange();
                    range.selectNodeContents(code); selection.removeAllRanges(); selection.addRange(range);
                }
                setTimeout(() => {button.textContent = 'Copy';}, 2000);
            });
        });
        // Tables scroll within their own boundary, including at desktop widths.
        content.querySelectorAll('table').forEach(function (table) {
            const wrapper = document.createElement('div'); wrapper.className = 'doc-table';
            wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', 'Scrollable table');
            table.before(wrapper); wrapper.append(table);
        });
        bindNavigation();
    });
    document.addEventListener('flaxon:shell-ready', bindNavigation);
}());
