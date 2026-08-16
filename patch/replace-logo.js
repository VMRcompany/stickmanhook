// Replace Stickman Hook logo with Flybound text by intercepting draws and text.
(function() {
    const TITLE_PATTERNS = [/title/i, /stickman/i, /hook/i, /titlepow2/i];

    function isTitleSrc(src) {
        if (!src) return false;
        try {
            const s = src.toLowerCase();
            return /title/.test(s) || /stickman/.test(s) || /hook/.test(s) || /titlepow2/.test(s);
        } catch (e) { return false; }
    }

    function drawFlybound(ctx, x, y, w, h) {
        try {
            const prevFill = ctx.fillStyle;
            const prevStroke = ctx.strokeStyle;
            const prevShadow = ctx.shadowColor;
            const prevFont = ctx.font;
            ctx.save();
            // style similar to existing logo: bold, white with dark shadow
            const size = Math.max((h|| (ctx.canvas.height * 0.08)), Math.min(ctx.canvas.width * 0.12, 120));
            ctx.font = `bold ${Math.round(size)}px "Arial Black", "Impact", sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 6;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const tx = x + (w ? w/2 : 0);
            const ty = y;
            // stroke for dark outline
            ctx.lineWidth = Math.max(6, Math.round(size * 0.08));
            ctx.strokeStyle = '#222';
            ctx.strokeText('Flybound', tx, ty);
            ctx.fillText('Flybound', tx, ty);
            ctx.restore();
        } catch (e) {}
    }

    // Hook drawImage to intercept when title images are drawn
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function() {
        try {
            const args = Array.from(arguments);
            const img = args[0];
            if (img && img.src && isTitleSrc(img.src)) {
                // Determine destination coords
                // drawImage(img, dx, dy) -> args length 3
                // drawImage(img, dx, dy, dw, dh) -> length 5
                // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) -> length 9 (we ignore source rect)
                let dx = 0, dy = 0, dw = img.width || 200, dh = img.height || 60;
                if (args.length === 3) {
                    dx = args[1]; dy = args[2]; dw = img.width; dh = img.height;
                } else if (args.length === 5) {
                    dx = args[1]; dy = args[2]; dw = args[3]; dh = args[4];
                } else if (args.length === 9) {
                    dx = args[5]; dy = args[6]; dw = args[7]; dh = args[8];
                }
                // Draw Flybound text instead of image
                drawFlybound(this, dx, dy - (dh*0.15), dw, dh*1.2);
                return; // skip original draw
            }
        } catch (e) {
            // if anything fails, fallback to original
        }
        return originalDrawImage.apply(this, arguments);
    };

    // Also intercept fillText so if game writes "Stickman Hook" as text we replace it
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
        try {
            if (typeof text === 'string' && /stickman/i.test(text) && /hook/i.test(text)) {
                return originalFillText.apply(this, ['Flybound', x, y]);
            }
            if (typeof text === 'string' && /stickman|hook/i.test(text)) {
                // partial matches -> replace whole string
                return originalFillText.apply(this, ['Flybound', x, y]);
            }
        } catch (e) {}
        return originalFillText.apply(this, arguments);
    };

    // Fallback overlay if canvas-based interception doesn't catch something
    (function addOverlay() {
        const style = document.createElement('style');
        style.textContent = `
        .flybound-logo-overlay {
            position: absolute;
            top: 6vh;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Arial Black', 'Impact', sans-serif;
            font-size: 7.5vh;
            font-weight: 900;
            color: #FFFFFF;
            text-shadow: 0.4vh 0.4vh 0 #222, -0.2vh -0.2vh 0 #fff, 0.6vh 0.6vh 6px rgba(0,0,0,0.45);
            letter-spacing: 0.3vh;
            pointer-events: none;
            z-index: 9999;
            white-space: nowrap;
        }
        `;
        document.head.appendChild(style);
        let overlay = null;
        function ensureOverlay() {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'flybound-logo-overlay';
                overlay.innerText = 'Flybound';
                document.body.appendChild(overlay);
            }
        }
        function adjustOverlay() {
            if (!overlay) return;
            const w = window.innerWidth;
            const h = window.innerHeight;
            const base = Math.max(Math.min(w / 10, h / 6), 24);
            overlay.style.fontSize = Math.round(base) + 'px';
            overlay.style.top = Math.round(h * 0.06) + 'px';
        }
        window.addEventListener('resize', adjustOverlay);
        const mo = new MutationObserver(function() {
            const canvas = document.querySelector('canvas');
            if (canvas) { ensureOverlay(); adjustOverlay(); overlay.style.display='block'; }
            else if (overlay) overlay.style.display='none';
        });
        mo.observe(document.body, {childList:true, subtree:true});
        window.addEventListener('load', function(){ setTimeout(function(){ const c = document.querySelector('canvas'); if(c){ ensureOverlay(); adjustOverlay(); } }, 250);});
    })();

})();
