(function () {
    const DEFAULT_MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';

    let activeSvg = null;
    let activeViewBox = null;
    let initialViewBox = null;
    let dragState = null;

    function findMermaidCodeBlocks() {
        return Array.from(document.querySelectorAll([
            'pre > code.language-mermaid',
            'pre > code.mermaid',
            'pre > code.sourceCode.mermaid',
            'pre.language-mermaid > code',
            'pre.mermaid > code',
            'pre.sourceCode.mermaid > code'
        ].join(',')));
    }

    function replaceCodeBlock(code) {
        const pre = code.closest('pre');
        if (!pre) {
            return null;
        }

        const diagram = document.createElement('div');
        diagram.className = 'mermaid';
        diagram.textContent = code.textContent.trim();

        const wrapper = pre.parentElement;
        if (wrapper && wrapper.classList.contains('sourceCode') && wrapper.children.length === 1) {
            wrapper.replaceWith(diagram);
        } else {
            pre.replaceWith(diagram);
        }

        return diagram;
    }

    function loadMermaid() {
        if (window.mermaid) {
            return Promise.resolve(window.mermaid);
        }

        return new Promise(function (resolve, reject) {
            const script = document.createElement('script');
            script.src = window.BioSimMermaidUrl || DEFAULT_MERMAID_URL;
            script.async = true;
            script.onload = function () {
                if (window.mermaid) {
                    resolve(window.mermaid);
                } else {
                    reject(new Error('Mermaid library loaded but window.mermaid is unavailable'));
                }
            };
            script.onerror = function () {
                reject(new Error('Could not load Mermaid library from ' + script.src));
            };
            document.head.appendChild(script);
        });
    }

    function showMermaidError(diagrams, error) {
        diagrams.forEach(function (diagram) {
            diagram.classList.add('mermaid-error');
            const source = diagram.textContent;
            diagram.textContent = 'Mermaid rendering failed: ' + error.message + '\n\n' + source;
        });
    }

    function getSvgViewBox(svg) {
        try {
            const bbox = svg.getBBox();
            if (bbox && bbox.width > 0 && bbox.height > 0) {
                const padding = Math.max(bbox.width, bbox.height) * 0.08;
                return [
                    bbox.x - padding,
                    bbox.y - padding,
                    bbox.width + padding * 2,
                    bbox.height + padding * 2
                ];
            }
        } catch (error) {
            // Fall back to Mermaid's declared viewBox below. getBBox can fail for
            // detached or browser-restricted SVG content.
        }

        const existing = svg.getAttribute('viewBox');
        if (existing) {
            const values = existing.split(/[ ,]+/).map(Number).filter(Number.isFinite);
            if (values.length === 4 && values[2] > 0 && values[3] > 0) {
                return values;
            }
        }

        const width = parseFloat(svg.getAttribute('width')) || svg.clientWidth || 800;
        const height = parseFloat(svg.getAttribute('height')) || svg.clientHeight || 600;
        return [0, 0, width, height];
    }

    function setSvgViewBox(svg, viewBox) {
        svg.setAttribute('viewBox', viewBox.join(' '));
    }

    function zoomSvg(factor, centerX, centerY) {
        if (!activeSvg || !activeViewBox) {
            return;
        }

        const rect = activeSvg.getBoundingClientRect();
        const relativeX = centerX === undefined ? 0.5 : (centerX - rect.left) / rect.width;
        const relativeY = centerY === undefined ? 0.5 : (centerY - rect.top) / rect.height;
        const nextWidth = activeViewBox[2] / factor;
        const nextHeight = activeViewBox[3] / factor;
        const minScale = 0.05;
        const maxScale = 20;
        const initialWidth = initialViewBox ? initialViewBox[2] : activeViewBox[2];

        if (nextWidth > initialWidth / minScale || nextWidth < initialWidth / maxScale) {
            return;
        }

        activeViewBox[0] += (activeViewBox[2] - nextWidth) * relativeX;
        activeViewBox[1] += (activeViewBox[3] - nextHeight) * relativeY;
        activeViewBox[2] = nextWidth;
        activeViewBox[3] = nextHeight;
        setSvgViewBox(activeSvg, activeViewBox);
    }

    function resetZoom() {
        if (!activeSvg || !initialViewBox) {
            return;
        }
        activeViewBox = initialViewBox.slice();
        setSvgViewBox(activeSvg, activeViewBox);
    }

    function closeDiagramModal() {
        const modal = document.getElementById('diagramModal');
        const overlay = document.getElementById('diagramModalOverlay');
        const viewport = document.getElementById('diagramModalViewport');

        if (modal) {
            modal.style.display = 'none';
        }
        if (overlay) {
            overlay.style.display = 'none';
        }
        if (viewport) {
            viewport.replaceChildren();
        }
        document.body.style.overflow = '';
        activeSvg = null;
        activeViewBox = null;
        initialViewBox = null;
        dragState = null;
    }

    function attachSvgPanZoom(svg) {
        svg.addEventListener('wheel', function (event) {
            event.preventDefault();
            zoomSvg(event.deltaY < 0 ? 1.2 : 1 / 1.2, event.clientX, event.clientY);
        }, { passive: false });

        svg.addEventListener('pointerdown', function (event) {
            if (!activeViewBox) {
                return;
            }
            svg.setPointerCapture(event.pointerId);
            svg.classList.add('is-panning');
            dragState = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                viewBox: activeViewBox.slice()
            };
        });

        svg.addEventListener('pointermove', function (event) {
            if (!dragState || dragState.pointerId !== event.pointerId || !activeViewBox) {
                return;
            }
            const rect = svg.getBoundingClientRect();
            const dx = (event.clientX - dragState.x) * dragState.viewBox[2] / rect.width;
            const dy = (event.clientY - dragState.y) * dragState.viewBox[3] / rect.height;
            activeViewBox[0] = dragState.viewBox[0] - dx;
            activeViewBox[1] = dragState.viewBox[1] - dy;
            setSvgViewBox(svg, activeViewBox);
        });

        svg.addEventListener('pointerup', function (event) {
            if (dragState && dragState.pointerId === event.pointerId) {
                svg.classList.remove('is-panning');
                dragState = null;
            }
        });

        svg.addEventListener('pointercancel', function () {
            svg.classList.remove('is-panning');
            dragState = null;
        });
    }

    function openDiagramModal(diagram) {
        const sourceSvg = diagram.querySelector('svg');
        const modal = document.getElementById('diagramModal');
        const overlay = document.getElementById('diagramModalOverlay');
        const viewport = document.getElementById('diagramModalViewport');
        const title = document.getElementById('diagramModalTitle');

        if (!sourceSvg || !modal || !overlay || !viewport || !title) {
            return;
        }

        const svg = sourceSvg.cloneNode(true);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.removeAttribute('style');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.classList.add('diagram-modal-svg');

        initialViewBox = getSvgViewBox(sourceSvg);
        activeViewBox = initialViewBox.slice();
        setSvgViewBox(svg, activeViewBox);

        viewport.replaceChildren(svg);
        title.textContent = diagram.getAttribute('data-diagram-title') || 'Diagram';

        activeSvg = svg;
        attachSvgPanZoom(svg);

        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function makeDiagramsInteractive(diagrams) {
        diagrams.forEach(function (diagram, index) {
            if (!diagram.querySelector('svg')) {
                return;
            }
            diagram.classList.add('mermaid-clickable');
            diagram.setAttribute('role', 'button');
            diagram.setAttribute('tabindex', '0');
            diagram.setAttribute('title', 'Open diagram viewer');
            diagram.setAttribute('data-diagram-title', 'Diagram ' + (index + 1));

            diagram.addEventListener('click', function () {
                openDiagramModal(diagram);
            });
            diagram.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDiagramModal(diagram);
                }
            });
        });
    }

    function wireDiagramModalControls() {
        const overlay = document.getElementById('diagramModalOverlay');
        const close = document.getElementById('diagramModalClose');
        const zoomIn = document.getElementById('diagramZoomIn');
        const zoomOut = document.getElementById('diagramZoomOut');
        const reset = document.getElementById('diagramZoomReset');

        if (overlay) {
            overlay.addEventListener('click', closeDiagramModal);
        }
        if (close) {
            close.addEventListener('click', closeDiagramModal);
        }
        if (zoomIn) {
            zoomIn.addEventListener('click', function () { zoomSvg(1.25); });
        }
        if (zoomOut) {
            zoomOut.addEventListener('click', function () { zoomSvg(1 / 1.25); });
        }
        if (reset) {
            reset.addEventListener('click', resetZoom);
        }

        document.addEventListener('keydown', function (event) {
            const modal = document.getElementById('diagramModal');
            if (event.key === 'Escape' && modal && modal.style.display === 'block') {
                closeDiagramModal();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        wireDiagramModalControls();

        const diagrams = findMermaidCodeBlocks().map(replaceCodeBlock).filter(Boolean);
        if (diagrams.length === 0) {
            return;
        }

        loadMermaid()
            .then(function (mermaid) {
                mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: 'strict',
                    theme: 'base',
                    themeVariables: {
                        primaryColor: '#cfe89a',
                        primaryTextColor: '#2f3a1f',
                        primaryBorderColor: '#a6cc63',
                        lineColor: '#8fa77a',
                        secondaryColor: '#fff4b8',
                        secondaryTextColor: '#4a4a2a',
                        secondaryBorderColor: '#d8c96c',
                        tertiaryColor: '#f7f7f7',
                        tertiaryTextColor: '#333333',
                        tertiaryBorderColor: '#cfd8dc',
                        background: '#ffffff',
                        mainBkg: '#cfe89a',
                        secondBkg: '#fff4b8',
                        tertiaryBkg: '#f7f7f7',
                        noteBkgColor: '#fff4b8',
                        noteTextColor: '#4a4a2a',
                        noteBorderColor: '#d8c96c',
                        signalColor: '#8fa77a',
                        actorBkg: '#cfe89a',
                        actorBorder: '#a6cc63',
                        actorTextColor: '#2f3a1f',
                        noteBkgColor2: '#fff4b8',
                        noteTextColor2: '#4a4a2a',
                        noteBorderColor2: '#d8c96c',
                        taskBkgColor: '#cfe89a',
                        taskTextColor: '#2f3a1f',
                        taskBorderColor: '#a6cc63',
                        gridColor: '#e7e7e7'
                    },
                    flowchart: {
                        curve: 'basis'
                    }
                });
                return mermaid.run({ nodes: diagrams });
            })
            .then(function () {
                makeDiagramsInteractive(diagrams);
            })
            .catch(function (error) {
                showMermaidError(diagrams, error);
            });
    });
})();
