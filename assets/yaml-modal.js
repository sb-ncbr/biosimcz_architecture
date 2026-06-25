(function () {
    const yamlFiles = window.BioSimYamlFiles || {};

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function splitInlineComment(line) {
        let quote = null;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const prev = i > 0 ? line[i - 1] : '';
            if ((ch === '"' || ch === "'") && prev !== '\\') {
                quote = quote === ch ? null : (quote === null ? ch : quote);
            } else if (ch === '#' && quote === null) {
                return [line.slice(0, i), line.slice(i)];
            }
        }
        return [line, ''];
    }

    function highlightScalar(text) {
        let escaped = escapeHtml(text);
        escaped = escaped.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, '<span class="token yaml-string">"$1"</span>');
        escaped = escaped.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, "<span class='token yaml-string'>'$1'</span>");
        escaped = escaped.replace(/(^|[\s,\[{-])(\d+\.?\d*)(?=[$\s,}\]])/g, '$1<span class="token yaml-number">$2</span>');
        escaped = escaped.replace(/\b(true|false|yes|no|on|off|null)\b|~/gi, '<span class="token yaml-boolean">$&</span>');
        escaped = escaped.replace(/(&amp;[\w_-]+)/g, '<span class="token yaml-anchor">$1</span>');
        escaped = escaped.replace(/(\*[\w_-]+)/g, '<span class="token yaml-alias">$1</span>');
        escaped = escaped.replace(/(![\w!\/]*)/g, '<span class="token yaml-tag">$1</span>');
        return escaped;
    }

    function highlightYaml(code) {
        return code.split('\n').map(function (line) {
            const parts = splitInlineComment(line);
            const body = parts[0];
            const comment = parts[1];
            const keyMatch = body.match(/^(\s*-?\s*)([\w_-]+)(\s*:)(.*)$/);
            let highlightedBody;

            if (keyMatch) {
                highlightedBody =
                    escapeHtml(keyMatch[1]) +
                    '<span class="token yaml-key">' + escapeHtml(keyMatch[2]) + '</span>' +
                    escapeHtml(keyMatch[3]) +
                    highlightScalar(keyMatch[4]);
            } else {
                highlightedBody = highlightScalar(body);
            }

            if (comment) {
                highlightedBody += '<span class="token yaml-comment">' + escapeHtml(comment) + '</span>';
            }
            return highlightedBody;
        }).join('\n');
    }

    function openYamlModal(filePath) {
        const modal = document.getElementById('yamlModal');
        const overlay = document.getElementById('yamlModalOverlay');
        const title = document.getElementById('yamlModalTitle');
        const content = document.getElementById('yamlModalContent');

        if (!modal || !overlay || !title || !content) {
            return;
        }

        title.textContent = filePath.split('/').pop();
        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';

        const yamlText = yamlFiles[filePath];
        if (yamlText) {
            content.innerHTML = highlightYaml(yamlText);
        } else {
            content.innerHTML = '<em>File not found: ' + escapeHtml(filePath) + '</em>';
        }
    }

    function closeYamlModal() {
        const modal = document.getElementById('yamlModal');
        const overlay = document.getElementById('yamlModalOverlay');

        if (modal) {
            modal.style.display = 'none';
        }
        if (overlay) {
            overlay.style.display = 'none';
        }
        document.body.style.overflow = '';
    }

    document.addEventListener('DOMContentLoaded', function () {
        const modal = document.getElementById('yamlModal');
        const overlay = document.getElementById('yamlModalOverlay');
        const closeBtn = document.getElementById('yamlModalClose');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeYamlModal);
        }
        if (overlay) {
            overlay.addEventListener('click', closeYamlModal);
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && modal && modal.style.display === 'block') {
                closeYamlModal();
            }
        });

        document.querySelectorAll('a[href$=".yaml"], a[href$=".yml"]').forEach(function (link) {
            link.dataset.yamlHref = link.getAttribute('href') || '';
            link.classList.add('yaml-link');
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const href = link.dataset.yamlHref || link.getAttribute('href');
                if (href) {
                    openYamlModal(href);
                }
            });
        });

        window.addEventListener('beforeprint', function () {
            document.querySelectorAll('a.yaml-link').forEach(function (link) {
                link.dataset.yamlHref = link.dataset.yamlHref || link.getAttribute('href') || '';
                link.removeAttribute('href');
            });
        });

        window.addEventListener('afterprint', function () {
            document.querySelectorAll('a.yaml-link').forEach(function (link) {
                if (link.dataset.yamlHref) {
                    link.setAttribute('href', link.dataset.yamlHref);
                }
            });
        });
    });
})();
