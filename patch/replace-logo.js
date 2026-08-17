// Replace Stickman Hook logo with Flybound text only on the menu screens.
// Strategy:
// - Intercept CanvasRenderingContext2D.drawImage / fillText / strokeText
// - Detect title draws by destination coordinates (top area of canvas) and by filename patterns
// - When a title draw is detected, SKIP the original draw and render "Flybound" instead
// - Track `menuVisible` state so the replacement only occurs on the menu/title screens (not during gameplay)

(function() {
    // Tunable thresholds (fraction of canvas)
    const TITLE_TOP_THRESHOLD = 0.30;    // y <= 30% of canvas height -> considered top/title area
    const MIN_TITLE_WIDTH_FRAC = 0.20;    // width >= 20% of canvas width
    const MIN_TITLE_HEIGHT_FRAC = 0.06;   // height >= 6% of canvas height

    function looksLikeTitleDraw(ctx, dx, dy, dw, dh) {
        try {
            const ch = ctx.canvas.height || 1;
            const cw = ctx.canvas.width || 1;
            if (typeof dy !== 'number' || typeof dh !== 'number') return false;
            // If destination Y is near the top and size is reasonable for a title image
            return dy <= ch * TITLE_TOP_THRESHOLD && dw >= cw * MIN_TITLE_WIDTH_FRAC && dh >= ch * MIN_TITLE_HEIGHT_FRAC;
        } catch (e) {
            return false;
        }
    }

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

    function drawFlybound(ctx, dx, dy, dw, dh) {
        try {
            ctx.save();
            // Compute font size relative to destination height if available, otherwise canvas
            const ch = ctx.canvas.height || 600;
            const cw = ctx.canvas.width || 800;
            const size = Math.max(Math.min((dh || ch * 0.12), cw * 0.12), 28);
            ctx.font = `900 ${Math.round(size)}px "Arial Black", "Impact", sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = Math.max(2, Math.round(size * 0.06));
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const tx = dx + (dw ? dw/2 : (cw/2));
            const ty = dy;
            ctx.lineWidth = Math.max(4, Math.round(size * 0.08));
            ctx.strokeStyle = '#111';
            ctx.strokeText('Flybound', tx, ty);
            ctx.fillText('Flybound', tx, ty);
            ctx.restore();
        } catch (e) {}
    }

    // track whether we're currently showing a menu title; used to avoid replacing text in gameplay
    let menuVisible = false;
    let menuVisibleLastSeenAt = 0;
    const MENU_HIDE_TIMEOUT = 1500; // ms after last title draw consider menu hidden

    function markMenuSeen() {
        menuVisible = true;
        menuVisibleLastSeenAt = Date.now();
    }

    function maybeHideMenu() {
        if (menuVisible && (Date.now() - menuVisibleLastSeenAt > MENU_HIDE_TIMEOUT)) {
            menuVisible = false;
        }
    }

    // --- drawImage interception ---
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function() {
        try {
            const args = Array.from(arguments);
            const img = args[0];
            // If image source indicates Madbox splash, skip drawing it entirely
            if (img && img.src && isMadboxSrc(img.src)) {
                // treat as menu presence so overlay can appear if needed, but don't draw
                markMenuSeen();
                return;
            }

            // Extract destination coordinates/dimensions regardless of overload
            let dx = 0, dy = 0, dw = 0, dh = 0;
            if (args.length === 3) {
                dx = args[1]; dy = args[2]; dw = img && img.width || 0; dh = img && img.height || 0;
            } else if (args.length === 5) {
                dx = args[1]; dy = args[2]; dw = args[3]; dh = args[4];
            } else if (args.length === 9) {
                // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
                dx = args[5]; dy = args[6]; dw = args[7]; dh = args[8];
            }

            // If the destination rectangle is near the top and looks like title -> replace
            if (looksLikeTitleDraw(this, dx, dy, dw, dh) || (img && img.src && isTitleSrc(img.src))) {
                // Only show Flybound on menu screens; mark that we saw a title draw
                markMenuSeen();
                // Draw Flybound in the same area and skip the original draw
                drawFlybound(this, dx, dy, dw, dh);
                return; // do not call original drawImage
            }

            // If not title/madbox, proceed normally
        } catch (e) {
            // on error, fallback to original draw
        }
        return originalDrawImage.apply(this, arguments);
    };

    // --- text interception (fillText/strokeText) ---
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;

    function shouldHandleCanvasText(text, y, ctx) {
        // If we're in menuVisible state or text is drawn near top, consider it a title/loading text
        try {
            const ch = ctx.canvas.height || 600;
            const top = (typeof y === 'number') ? (y <= ch * TITLE_TOP_THRESHOLD) : false;
            if (/loading/i.test(String(text))) return 'hide';
            if (top || menuVisible) {
                if (/stickman|hook|title/i.test(String(text))) return 'flybound';
            }
            return false;
        } catch (e) { return false; }
    }

    CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
        try {
            const action = shouldHandleCanvasText(text, y, this);
            if (action === 'hide') return; // do not render loading text
            if (action === 'flybound') {
                // mark menu and draw Flybound instead
                markMenuSeen();
                drawFlybound(this, x - (this.canvas.width * 0.25), y, this.canvas.width * 0.5, this.canvas.height * 0.12);
                return;
            }
        } catch (e) {}
        return originalFillText.apply(this, arguments);
    };

    CanvasRenderingContext2D.prototype.strokeText = function(text, x, y) {
        try {
            const action = shouldHandleCanvasText(text, y, this);
            if (action === 'hide') return;
            if (action === 'flybound') {
                markMenuSeen();
                drawFlybound(this, x - (this.canvas.width * 0.25), y, this.canvas.width * 0.5, this.canvas.height * 0.12);
                return;
            }
        } catch (e) {}
        return originalStrokeText.apply(this, arguments);
    };

    // --- lightweight overlay only as a fallback, and only while menuVisible ---
    (function overlayManager() {
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
            display: none;
        }
        `;
        document.head.appendChild(style);
        const overlay = document.createElement('div');
        overlay.className = 'flybound-logo-overlay';
        overlay.innerText = 'Flybound';
        document.body.appendChild(overlay);

        function updateOverlayVisibility() {
            maybeHideMenu();
            if (menuVisible) {
                overlay.style.display = 'block';
            } else {
                overlay.style.display = 'none';
            }
        }

        // periodically check menuVisible and adjust overlay
        setInterval(updateOverlayVisibility, 300);

    })();

})();
