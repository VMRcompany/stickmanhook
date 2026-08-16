// Try to prevent/clear eternal LOADING screen.
// - call SDK's gameLoadingFinished if available
// - hide any DOM nodes with innerText "loading"
// - as a last resort, remove elements with classes/ids that contain 'loading'

(function() {
    function tryFinishLoading() {
        try {
            if (window.PokiSDK && typeof window.PokiSDK.gameLoadingFinished === 'function') {
                try { window.PokiSDK.gameLoadingFinished(); } catch(e){}
            }
            if (window.PokiSDK && typeof window.PokiSDK.gameLoadingProgress === 'function') {
                try { window.PokiSDK.gameLoadingProgress(100); } catch(e){}
            }
        } catch(e) {}

        // Hide any DOM elements with "loading" text (case-insensitive)
        document.querySelectorAll('body *').forEach(function(el) {
            try {
                if (el.children.length === 0 && el.innerText && /loading/i.test(el.innerText.trim())) {
                    el.style.display = 'none';
                }
            } catch(e){}
        });

        // Remove or hide elements whose id/class includes 'loading'
        document.querySelectorAll('[id*="loading" i],[class*="loading" i]').forEach(function(el){
            try { el.style.display = 'none'; } catch(e){}
        });

        // Also clear any timers that might be posting progress to parent (best-effort)
        try {
            if (typeof window.pokiCancelProgressInterval !== 'undefined') {
                clearInterval(window.pokiCancelProgressInterval);
                window.pokiCancelProgressInterval = undefined;
            }
        } catch(e){}
    }

    // Run shortly after scripts load, and again after 2s to cover delayed cases
    window.addEventListener('load', function() {
        setTimeout(tryFinishLoading, 300);
        setTimeout(tryFinishLoading, 2000);
    });

    // Also expose manual trigger (useful for debugging in console)
    window.__forceFinishGameLoading = tryFinishLoading;
})();
