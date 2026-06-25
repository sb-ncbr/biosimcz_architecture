(function () {
    const overlay = document.getElementById('imgLightboxOverlay');
    const lightbox = document.getElementById('imgLightbox');
    const imgEl = document.getElementById('imgLightboxImg');
    const closeBtn = document.getElementById('imgLightboxClose');

    function open(src, alt) {
        if (!overlay || !lightbox || !imgEl) return;
        imgEl.src = src;
        imgEl.alt = alt || '';
        overlay.style.display = 'block';
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (!overlay || !lightbox || !imgEl) return;
        overlay.style.display = 'none';
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
        imgEl.src = '';
    }

    function init() {
        document.querySelectorAll('.main-content img, .main-content figure img').forEach(function (img) {
            if (img.closest('#imgLightbox')) return;
            img.addEventListener('click', function () {
                open(img.src, img.alt);
            });
        });

        if (overlay) overlay.addEventListener('click', close);
        if (closeBtn) closeBtn.addEventListener('click', close);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && lightbox && lightbox.style.display === 'flex') {
                close();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
