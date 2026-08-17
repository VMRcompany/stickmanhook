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

    function isMadboxSrc(src) {
        if (!src) return false;
        try { return /madbox/i.test(src.toLowerCase()); } catch(e) { return false; }
    }

    function drawFlybound(ctx, x, y, w, h) {
        try {
            ctx.save();
            const size = Math.max((h || (ctx.canvas.height * 0.08)), Math.min(ctx.canvas.width * 0.12, 120));
            ctx.font = `bold ${Math.round(size)}px "Arial Black", "Impact", sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 6;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const tx = x + (w ? w/2 : 0);
            const ty = y;
            ctx.lineWidth = Math.max(6, Math.round(size * 0.08));
            ctx.strokeStyle = '#222';
            // Draw outline + fill
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
            if (img && img.src) {
                // If this is Madbox splash, skip drawing it entirely
                if (isMadboxSrc(img.src)) {
                    return; // do not draw Madbox startup splash
                }
                // If this looks like a title image, draw Flybound text instead
                if (isTitleSrc(img.src)) {
                    let dx = 0, dy = 0, dw = img.width || 200, dh = img.height || 60;
                    if (args.length === 3) {
                        dx = args[1]; dy = args[2]; dw = img.width; dh = img.height;
                    } else if (args.length === 5) {
                        dx = args[1]; dy = args[2]; dw = args[3]; dh = args[4];
                    } else if (args.length === 9) {
                        dx = args[5]; dy = args[6]; dw = args[7]; dh = args[8];
                    }
                    drawFlybound(this, dx, dy - (dh*0.15), dw, dh*1.2);
                    return; // skip original draw
                }
            }
        } catch (e) {
            // fallthrough to original
        }
        return originalDrawImage.apply(this, arguments);
    };

    // Intercept fillText and strokeText to replace titles and hide loading text
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;

    function shouldReplaceText(text) {
        if (!text || typeof text !== 'string') return false;
        const t = text.trim();
        if (!t) return false;
        if (/loading/i.test(t)) return 'hide';
        if (/stickman/i.test(t) || /hook/i.test(t) || /title/i.test(t)) return 'flybound';
        return false;
    }

    CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
        try {
            const action = shouldReplaceText(text);
            if (action === 'hide') return; // do not render loading text
            if (action === 'flybound') {
                return originalFillText.apply(this, ['Flybound', x, y]);
            }
        } catch (e) {}
        return originalFillText.apply(this, arguments);
    };

    CanvasRenderingContext2D.prototype.strokeText = function(text, x, y) {
        try {
            const action = shouldReplaceText(text);
            if (action === 'hide') return; // do not render loading
            if (action === 'flybound') {
                return originalStrokeText.apply(this, ['Flybound', x, y]);
            }
        } catch (e) {}
        return originalStrokeText.apply(this, arguments);
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
        window.addEventListener('load', function(){ setTimeout(function(){ const c = document.querySelector('canvas'); if(c){ ensureOverlay(); adjustOverlay(); } }, 50);});
    })();

})();
