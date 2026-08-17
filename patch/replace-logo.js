// Aggressive replacement: remove any title-logo draws in the top region and render Flybound only on menu screens.
// This script blocks drawImage/fillText/strokeText in the top area while menuVisible, ensuring the old logo is never visible.

(function(){
  const TOP_REGION_FRAC = 0.42; // top 42% of canvas is considered candidate title area
  const MIN_TITLE_WIDTH_FRAC = 0.16;
  const MIN_TITLE_HEIGHT_FRAC = 0.05;
  const MENU_HIDE_TIMEOUT = 1400; // ms

  let menuVisible = false;
  let lastSeen = 0;
  // enlarged top region box to block layered draws
  let topRegionBox = null; // {x,y,w,h}

  function now(){ return Date.now(); }
  function markSeen(){ menuVisible = true; lastSeen = now(); }
  function maybeHide(){ if(menuVisible && (now() - lastSeen > MENU_HIDE_TIMEOUT)){ menuVisible=false; topRegionBox=null; } }

  function isTitleSrc(src){ if(!src) return false; try{ const s=src.toLowerCase(); return /title|stickman|hook|titlepow2/.test(s);}catch(e){return false;} }
  function isMadboxSrc(src){ if(!src) return false; try{ return /madbox/i.test(src.toLowerCase()); }catch(e){return false;} }

  function rectsIntersect(a,b){ return !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y); }

  function looksLikeTitleDraw(ctx, dx, dy, dw, dh){ try{ const ch=ctx.canvas.height||1, cw=ctx.canvas.width||1; if(typeof dy !== 'number' || typeof dh !== 'number') return false; return dy <= ch * TOP_REGION_FRAC && (dw >= cw * MIN_TITLE_WIDTH_FRAC) && (dh >= ch * MIN_TITLE_HEIGHT_FRAC); }catch(e){return false;} }

  function drawFlybound(ctx, dx, dy, dw, dh){ try{ ctx.save(); const ch=ctx.canvas.height||600, cw=ctx.canvas.width||800; const size=Math.max(Math.min((dh||ch*0.12), cw*0.12), 32); ctx.font = `900 ${Math.round(size)}px "Arial Black", "Impact", sans-serif`; ctx.fillStyle='#FFFFFF'; ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=Math.max(2, Math.round(size*0.06)); ctx.textAlign='center'; ctx.textBaseline='top'; const tx = (typeof dx==='number')? (dx + (dw? dw/2: cw/2)) : cw/2; const ty = (typeof dy==='number')? dy : ch*0.04; ctx.lineWidth = Math.max(4, Math.round(size*0.08)); ctx.strokeStyle='#111'; ctx.strokeText('Flybound', tx, ty); ctx.fillText('Flybound', tx, ty); ctx.restore(); }catch(e){} }

  // originals
  const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  const origFillText = CanvasRenderingContext2D.prototype.fillText;
  const origStrokeText = CanvasRenderingContext2D.prototype.strokeText;

  CanvasRenderingContext2D.prototype.drawImage = function(){
    try{
      const args = Array.from(arguments);
      const img = args[0];

      // If madbox splash by name -> skip and mark menu
      if(img && img.src && isMadboxSrc(img.src)){
        markSeen();
        return;
      }

      // compute dest rect
      let dx=0, dy=0, dw=0, dh=0;
      if(args.length===3){ dx=args[1]; dy=args[2]; dw=(img&&img.width)||0; dh=(img&&img.height)||0; }
      else if(args.length===5){ dx=args[1]; dy=args[2]; dw=args[3]; dh=args[4]; }
      else if(args.length===9){ dx=args[5]; dy=args[6]; dw=args[7]; dh=args[8]; }

      const ch = this.canvas.height||1; const cw = this.canvas.width||1;

      // If already in menuVisible mode: block any draw that intersects topRegionBox (or top fractional area)
      if(menuVisible){
        // ensure topRegionBox exists; if not, set to default top-wide box
        if(!topRegionBox) topRegionBox = {x:0,y:0,w:cw,h:Math.round(ch*TOP_REGION_FRAC)};
        if(rectsIntersect(topRegionBox, {x:dx,y:dy,w:dw,h:dh})){
          // refresh timer
          markSeen();
          // ensure Flybound drawn
          drawFlybound(this, topRegionBox.x, topRegionBox.y, topRegionBox.w, topRegionBox.h);
          return; // skip original
        }
      }

      // If this draw looks like a title by coords/size or src pattern -> capture topRegionBox and replace
      if((img && img.src && isTitleSrc(img.src)) || looksLikeTitleDraw(this, dx, dy, dw, dh)){
        // set large topRegionBox to block layered draws
        const padX = Math.max(10, Math.round((dw||cw*0.6)*0.06));
        const padY = Math.max(6, Math.round((dh||ch*0.2)*0.06));
        topRegionBox = { x: Math.max(0, dx - padX), y: Math.max(0, dy - padY), w: Math.min(cw, (dw||Math.round(cw*0.6)) + padX*2), h: Math.min(ch, (dh||Math.round(ch*0.2)) + padY*2) };
        markSeen();
        drawFlybound(this, topRegionBox.x, topRegionBox.y, topRegionBox.w, topRegionBox.h);
        return; // skip original
      }

    }catch(e){ }
    return origDrawImage.apply(this, arguments);
  };

  function handleCanvasText(ctx, text, x, y){
    try{
      if(!text) return false;
      const txt = String(text||'');
      const ch = ctx.canvas.height||600;
      const top = (typeof y==='number')? (y <= ch * TOP_REGION_FRAC) : false;
      if(/loading/i.test(txt)) return 'hide';
      if(top || menuVisible){ if(/stickman|hook|title/i.test(txt)) return 'flybound'; }
      return false;
    }catch(e){return false;}
  }

  CanvasRenderingContext2D.prototype.fillText = function(text,x,y){
    try{
      const action = handleCanvasText(this, text, x, y);
      if(action==='hide') return;
      if(action==='flybound'){
        markSeen();
        const bw = this.canvas.width||800, bh = this.canvas.height||600;
        if(topRegionBox) drawFlybound(this, topRegionBox.x, topRegionBox.y, topRegionBox.w, topRegionBox.h);
        else drawFlybound(this, x - (bw*0.25), y, bw*0.5, bh*0.12);
        return;
      }
    }catch(e){}
    return origFillText.apply(this, arguments);
  };

  CanvasRenderingContext2D.prototype.strokeText = function(text,x,y){
    try{
      const action = handleCanvasText(this, text, x, y);
      if(action==='hide') return;
      if(action==='flybound'){
        markSeen();
        const bw = this.canvas.width||800, bh = this.canvas.height||600;
        if(topRegionBox) drawFlybound(this, topRegionBox.x, topRegionBox.y, topRegionBox.w, topRegionBox.h);
        else drawFlybound(this, x - (bw*0.25), y, bw*0.5, bh*0.12);
        return;
      }
    }catch(e){}
    return origStrokeText.apply(this, arguments);
  };

  // overlay fallback - visible only when menuVisible
  (function(){
    const style = document.createElement('style');
    style.textContent = `.flybound-logo-overlay{position:absolute;top:6vh;left:50%;transform:translateX(-50%);font-family:'Arial Black','Impact',sans-serif;font-weight:900;color:#fff;text-shadow:0.4vh 0.4vh 0 #222,-0.2vh -0.2vh 0 #fff,0.6vh 0.6vh 6px rgba(0,0,0,0.45);pointer-events:none;z-index:9999;display:none;}`;
    document.head.appendChild(style);
    const div = document.createElement('div'); div.className='flybound-logo-overlay'; div.innerText='Flybound'; document.body.appendChild(div);
    setInterval(function(){ maybeHide(); div.style.display = menuVisible? 'block':'none'; }, 250);
  })();

})();
