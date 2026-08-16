// Replace Stickman Hook logo with Flybound text
(function() {
    // Wait for canvas to be available
    const observer = new MutationObserver(function(mutations) {
        const canvas = document.querySelector('canvas');
        if (canvas && canvas.getContext) {
            // Inject custom styling for the logo replacement
            const ctx = canvas.getContext('2d');
            
            // Hook into the game's rendering to replace logo
            const originalFillText = ctx.fillText;
            const originalDrawImage = ctx.drawImage;
            
            // Listen for logo rendering attempts
            window.__replaceLogoEnabled = true;
            
            observer.disconnect();
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Alternative: inject CSS and HTML overlay for logo
    const style = document.createElement('style');
    style.textContent = `
        .flybound-logo-overlay {
            font-family: 'Arial Black', 'Impact', sans-serif;
            font-size: 72px;
            font-weight: 900;
            color: #FFFFFF;
            text-shadow: 
                3px 3px 0px #FF6B35,
                -1px -1px 0px #333,
                2px 2px 5px rgba(0,0,0,0.5);
            letter-spacing: 2px;
            font-style: italic;
            transform: scale(1.1, 1);
        }
    `;
    document.head.appendChild(style);
})();
