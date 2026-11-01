let audioCtx = null;

let _wallGradientCache = {};
let _lastPaletteKey = null;

function playSound(freq, duration, type = 'sine', vol = 0.08) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') return;
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

// ===== ТУТОРИАЛ: подсветка игрока и объектов =====
let _tutorialDarkCanvas = null;
let _tutorialDarkCtx = null;

function drawTutorialSpotlight(step) {
    if (!game.player) return;

    if (!_tutorialDarkCanvas) {
        _tutorialDarkCanvas = document.createElement('canvas');
        _tutorialDarkCtx = _tutorialDarkCanvas.getContext('2d');
    }
    if (_tutorialDarkCanvas.width !== W || _tutorialDarkCanvas.height !== H) {
        _tutorialDarkCanvas.width = W;
        _tutorialDarkCanvas.height = H;
    }

    const octx = _tutorialDarkCtx;
    octx.clearRect(0, 0, W, H);
    octx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    octx.fillRect(0, 0, W, H);
    octx.globalCompositeOperation = 'destination-out';

    const punchHole = (cx, cy, r) => {
        const g = octx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
        g.addColorStop(0, 'rgba(0, 0, 0, 1)');
        g.addColorStop(0.7, 'rgba(0, 0, 0, 1)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        octx.fillStyle = g;
        octx.beginPath();
        octx.arc(cx, cy, r, 0, Math.PI * 2);
        octx.fill();
    };

    const pspx = game.player.x - game.camX;
    const pspy = game.player.y - game.camY;
    punchHole(pspx, pspy, 200);

    if (step.canvasSpotlightEnemies) {
        for (const e of game.enemies) {
            punchHole(e.x - game.camX, e.y - game.camY, Math.max(e.radius * 2, 90));
        }
    }
    if (step.canvasSpotlightMines) {
        for (const mp of game.minePacks) {
            punchHole(mp.x - game.camX, mp.y - game.camY, 100);
        }
    }
    if (step.canvasSpotlightCoins) {
        for (const c of game.coins) {
            punchHole(c.x - game.camX, c.y - game.camY, 45);
        }
    }

    octx.globalCompositeOperation = 'source-over';

    ctx.drawImage(_tutorialDarkCanvas, 0, 0, W, H);

    // Тёплое свечение вокруг игрока
    const glowGrad = ctx.createRadialGradient(pspx, pspy, 0, pspx, pspy, 130);
    glowGrad.addColorStop(0, 'rgba(255, 230, 150, 0.20)');
    glowGrad.addColorStop(0.6, 'rgba(255, 230, 150, 0.06)');
    glowGrad.addColorStop(1, 'rgba(255, 230, 150, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pspx, pspy, 130, 0, Math.PI * 2);
    ctx.fill();
}

function drawCombo() {
    if (game.combo < 2) return;
    if (game.state !== 'playing' && game.state !== 'inventory') return;

    const mult = getComboMultiplier(game.combo);
    const flash = game.comboFlashTimer > 0;

    let color = '#ffffff';
    let accent = '#ffffff';
    if (game.combo >= 25) { color = '#ff0088'; accent = '#ff0088'; }
    else if (game.combo >= 15) { color = '#ff44aa'; accent = '#ff44aa'; }
    else if (game.combo >= 10) { color = '#ffaa00'; accent = '#ffaa00'; }
    else if (game.combo >= 5) { color = '#ffcc00'; accent = '#ffcc00'; }

    const baseX = isMobile ? 70 : 110;
    const baseY = isMobile ? 130 : 180;
    const pulse = 1 + Math.sin(performance.now() / 150) * 0.04;
    const scale = flash ? 1.25 : pulse;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 12px Arial';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('COMBO', 0, -28);

    ctx.font = `bold ${isMobile ? 32 : 38}px Arial`;
    ctx.shadowColor = accent;
    ctx.shadowBlur = flash ? 30 : 15;
    ctx.fillStyle = flash ? '#ffffff' : color;
    ctx.fillText(String(game.combo), 0, 0);

    ctx.font = `bold ${isMobile ? 16 : 18}px Arial`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = flash ? '#ffffff' : accent;
    ctx.fillText(`x${mult.toFixed(1)}`, 0, 26);

    const timerPct = Math.max(0, game.comboTimer / 3.0);
    const barW = isMobile ? 100 : 120;
    const barH = 6;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2 - 1, 42 - 1, barW + 2, barH + 2);
    ctx.fillStyle = timerPct > 0.5 ? accent : (timerPct > 0.2 ? '#ffaa00' : '#ff0044');
    ctx.fillRect(-barW / 2, 42, barW * timerPct, barH);

    ctx.restore();
}

function draw() {
    let camX = game.player ? game.player.x : 400; let camY = game.player ? game.player.y : 300;
    camX -= W / 2; camY -= H / 2;
    if (game.mapW) { camX = Math.max(0, Math.min(game.mapW - W, camX)); camY = Math.max(0, Math.min(game.mapH - H, camY)); if (game.mapW < W) camX = (game.mapW - W) / 2; if (game.mapH < H) camY = (game.mapH - H) / 2; }
    game.camX = camX; game.camY = camY;
    const shakeX = game.screenShake > 0 ? (Math.random() - 0.5) * game.screenShake : 0;
    const shakeY = game.screenShake > 0 ? (Math.random() - 0.5) * game.screenShake : 0;
    const pal = game.palette;
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);

    ctx.save(); ctx.translate(-camX + shakeX, -camY + shakeY);
    ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
    const gridSize = 60; const startGX = Math.floor(camX / gridSize) * gridSize; const startGY = Math.floor(camY / gridSize) * gridSize;
    for (let x = startGX; x < camX + W + gridSize; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, camY); ctx.lineTo(x, camY + H); ctx.stroke(); }
    for (let y = startGY; y < camY + H + gridSize; y += gridSize) { ctx.beginPath(); ctx.moveTo(camX, y); ctx.lineTo(camX + W, y); ctx.stroke(); }

    const palKey = pal.bg;
    if (palKey !== _lastPaletteKey) {
        _wallGradientCache = {};
        _lastPaletteKey = palKey;
    }

    for (const w of game.walls) {
        ctx.fillStyle = pal.wallShadow; ctx.fillRect(w.x + 4, w.y + 4, w.w, w.h);

        let grad = _wallGradientCache[w.h];
        if (!grad) {
            grad = ctx.createLinearGradient(0, 0, 0, w.h);
            grad.addColorStop(0, pal.wallTop);
            grad.addColorStop(1, pal.wallBottom);
            _wallGradientCache[w.h] = grad;
        }
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w.w, w.h);
        ctx.restore();

        ctx.strokeStyle = pal.wallBorder; ctx.lineWidth = 2; ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    for (const p of game.acidPools) {
        const t = p.life / p.maxLife;
        const fadeAlpha = 0.25 + 0.45 * t;
        const r = p.radius * (0.85 + 0.15 * Math.sin(p.phase + performance.now() / 300));

        ctx.globalAlpha = fadeAlpha * 0.5;
        ctx.fillStyle = '#3ccc1e';
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = fadeAlpha * 0.75;
        ctx.fillStyle = '#78ff3c';
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = fadeAlpha;
        ctx.fillStyle = '#b4ff78';
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.3, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 1;

        ctx.fillStyle = `rgba(180, 255, 120, ${fadeAlpha})`;
        for (let i = 0; i < 6; i++) {
            const a = p.phase + i * 1.1;
            const bx = p.x + Math.cos(a) * (r * 0.5);
            const by = p.y + Math.sin(a) * (r * 0.5);
            const br = 3 + Math.sin(p.phase * 3 + i) * 1.5;
            ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
        }
    }

    for (const f of game.fires) {
        const t = f.life / f.maxLife;
        const fadeAlpha = 0.4 + 0.5 * t;
        const r = f.radius * (0.9 + 0.1 * Math.sin(f.phase + performance.now() / 150));

        ctx.globalAlpha = fadeAlpha * 0.5;
        ctx.fillStyle = '#c83200';
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = fadeAlpha * 0.7;
        ctx.fillStyle = '#ff8c1e';
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.65, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = fadeAlpha;
        ctx.fillStyle = '#fff064';
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.35, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 1;

        for (let i = 0; i < 8; i++) {
            const a = f.phase + i * 0.8 + performance.now() / 200;
            const dist = r * 0.5 * (0.7 + 0.3 * Math.sin(f.phase * 3 + i));
            const bx = f.x + Math.cos(a) * dist;
            const by = f.y + Math.sin(a) * dist;
            const br = 4 + Math.sin(f.phase * 4 + i) * 2;

            ctx.globalAlpha = fadeAlpha * 0.7;
            ctx.fillStyle = '#ffb032';
            ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();

            ctx.globalAlpha = fadeAlpha;
            ctx.fillStyle = '#ffe066';
            ctx.beginPath(); ctx.arc(bx, by, br * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    for (const br of game.barrels) {
        ctx.save(); ctx.translate(br.x, br.y);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, br.radius * 0.9, br.radius * 1.1, br.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        const grad = ctx.createLinearGradient(-br.radius, 0, br.radius, 0); grad.addColorStop(0, '#5a3a1a'); grad.addColorStop(0.5, '#8a5a2a'); grad.addColorStop(1, '#5a3a1a');
        ctx.fillStyle = grad; ctx.fillRect(-br.radius, -br.radius, br.radius * 2, br.radius * 2);
        ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(0, -br.radius, br.radius, br.radius * 0.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, br.radius, br.radius, br.radius * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-br.radius, -br.radius * 0.6, br.radius * 2, 4); ctx.fillRect(-br.radius, br.radius * 0.6 - 4, br.radius * 2, 4);
        ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6, -2); ctx.lineTo(2, -2); ctx.lineTo(8, 8); ctx.lineTo(-2, 2); ctx.lineTo(2, 2); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(-br.radius, -br.radius, br.radius * 2, br.radius * 2); ctx.restore();
    }
    for (const m of game.mines) {
        ctx.save(); ctx.translate(m.x, m.y); const pulse = 1 + Math.sin(m.phase) * 0.15;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 12, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = m.armTime > 0 ? '#555' : '#333'; ctx.beginPath(); ctx.arc(0, 0, 12 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = m.armTime > 0 ? '#888' : '#ff8800'; ctx.lineWidth = 3; ctx.stroke();
        if (m.armTime <= 0) { ctx.fillStyle = '#ff0044'; ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 0, 4 + Math.sin(m.phase * 2) * 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; } else { ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }
    for (const c of game.coins) {
        const bounce = Math.sin(c.phase) * 4; const scale = 1 + Math.sin(c.phase) * 0.15;
        ctx.save(); ctx.translate(c.x, c.y + bounce); ctx.scale(scale, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 12, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffee66'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cc9900'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1); ctx.restore();
    }
    for (const h of game.healPacks) {
        const bounce = Math.sin(h.phase) * 3;
        ctx.save(); ctx.translate(h.x, h.y + bounce);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 14, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff2244'; ctx.fillRect(-12, -10, 24, 20); ctx.fillStyle = '#fff'; ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6); ctx.restore();
    }
    for (const a of game.ammoPacks) {
        const bounce = Math.sin(a.phase) * 3;
        ctx.save(); ctx.translate(a.x, a.y + bounce);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 14, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#aacc44'; ctx.fillRect(-12, -10, 24, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AMMO', 0, 1); ctx.restore();
    }
    for (const mp of game.minePacks) {
        const bounce = Math.sin(mp.phase) * 3;
        ctx.save(); ctx.translate(mp.x, mp.y + bounce);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 14, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#ff0044'; ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
    }
    for (const wp of game.weaponPacks) {
        const bounce = Math.sin(wp.phase) * 4;
        ctx.save(); ctx.translate(wp.x, wp.y + bounce);
        ctx.shadowColor = '#44ddff'; ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(68, 221, 255, 0.3)'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (wp.weaponId === 'sniper') {
            ctx.fillStyle = '#111'; ctx.fillRect(-18, -3, 32, 6); ctx.fillStyle = '#333'; ctx.fillRect(10, -5, 10, 10); ctx.fillStyle = '#444'; ctx.fillRect(-5, -6, 5, 12);
        } else {
            ctx.fillStyle = '#333'; ctx.fillRect(-14, -4, 22, 8); ctx.fillStyle = '#555'; ctx.fillRect(8, -3, 8, 6); ctx.fillStyle = '#666'; ctx.fillRect(-8, -8, 6, 4);
        }
        ctx.restore();
    }

    for (const tr of game.sniperTrails) {
        ctx.strokeStyle = `rgba(255, 220, 68, ${tr.life * 5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tr.startX, tr.startY);
        ctx.lineTo(tr.endX, tr.endY);
        ctx.stroke();
    }

    for (const b of game.bullets) {
        if (b.isAlien) {
            // Красная вытянутая пуля
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(Math.atan2(b.vy, b.vx));
            ctx.fillStyle = '#ff0044'; ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 10;
            ctx.fillRect(-8, -2, 16, 4);
            ctx.restore();
        } else {
            ctx.fillStyle = b.isShotgun ? '#ffaa33' : (b.pierce ? '#ff00aa' : '#ffdd44'); 
            ctx.shadowColor = b.isShotgun ? '#ffaa33' : (b.pierce ? '#ff00aa' : '#ffdd44'); 
            ctx.shadowBlur = b.pierce ? 15 : 10;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.isShotgun ? 3 : (b.pierce ? 2 : 4), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
    }
    for (const a of game.arrows) {
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle);
        ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = '#ccccff'; ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(8, 5); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-10, -4); ctx.lineTo(-8, 0); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    for (const b of game.enemyBullets) {
        ctx.save(); ctx.shadowColor = '#88ff44'; ctx.shadowBlur = 15; ctx.fillStyle = '#88ff44';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ccff88'; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const e of game.enemies) e.draw();

    for (const e of game.enemies) {
        if (e.hitFlash > 0) {
            const alpha = Math.min(1, e.hitFlash / 0.1);
            const size = Math.max(6, Math.min(12, e.radius * 0.5));
            const hy = e.y - e.radius - 12;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(e.x - size, hy - size);
            ctx.lineTo(e.x + size, hy + size);
            ctx.moveTo(e.x + size, hy - size);
            ctx.lineTo(e.x - size, hy + size);
            ctx.stroke();
            ctx.restore();
        }
    }

    if (game.player) {
        game.player.draw();
        
        if (game.player.currentWeapon === 'sniper') {
            const timePassed = performance.now() - game.lastShotTime;
            const reloadTime = WEAPONS.sniper.fireRate;
            if (timePassed < reloadTime) {
                const progress = timePassed / reloadTime;
                const angleOffset = -Math.PI / 2;
                const arcRadius = 30;
                
                ctx.save();
                ctx.translate(game.player.x, game.player.y);
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(0, 0, arcRadius, angleOffset, angleOffset + Math.PI * 2);
                ctx.stroke();
                
                ctx.strokeStyle = progress >= 0.99 ? '#00ff88' : '#ffaa00';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, arcRadius, angleOffset, angleOffset + Math.PI * 2 * progress);
                ctx.stroke();
                ctx.restore();
            }
        }
		        // Универсальный индикатор перезарядки для всех видов оружия
        if (game.player.isReloading && game.player.reloadStartTime && game.player.reloadDuration) {
            const timePassed = performance.now() - game.player.reloadStartTime;
            const progress = Math.min(timePassed / game.player.reloadDuration, 1);
            
            const angleOffset = -Math.PI / 2; // Начинаем рисовать сверху
            const arcRadius = 30;
            
            ctx.save();
            ctx.translate(game.player.x, game.player.y);
            
            // Темная подложка (пустой круг)
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, arcRadius, angleOffset, angleOffset + Math.PI * 2);
            ctx.stroke();
            
            // Заполняющийся круг (прогресс)
            ctx.strokeStyle = progress >= 0.99 ? '#00ff88' : '#ffaa00'; // В конце становится зеленым
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, arcRadius, angleOffset, angleOffset + Math.PI * 2 * progress);
            ctx.stroke();
            ctx.restore();
        }
    }

    for (const e of game.enemies) {
        if (e.isSuperMother && e.laserActive) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 170, 0.8)';
            ctx.lineWidth = 24;
            ctx.shadowColor = '#ff00aa';
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            
            let endX = e.x + Math.cos(e.laserAngle) * 2000;
            let endY = e.y + Math.sin(e.laserAngle) * 2000;
            for (let dist = 0; dist < 2000; dist += 20) {
                let checkX = e.x + Math.cos(e.laserAngle) * dist;
                let checkY = e.y + Math.sin(e.laserAngle) * dist;
                let hitWall = false;
                for (const w of game.walls) {
                    if (checkX > w.x && checkX < w.x + w.w && checkY > w.y && checkY < w.y + w.h) { hitWall = true; break; }
                }
                if (hitWall) { endX = checkX; endY = checkY; break; }
            }

            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.restore();
        }
    }

    for (const p of game.particles) { ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;

    for (const ft of game.floatingTexts) {
        const t = Math.max(0, ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = t;
        ctx.font = `bold ${ft.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const ex of game.explosions) {
        const t = 1 - ex.life / ex.maxLife; const r = ex.radius * (0.3 + 0.7 * t); const alpha = 1 - t;
        ctx.globalAlpha = alpha * 0.5; const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, r);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.4, '#ffdd44'); grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();

    // ===== ТУТОРИАЛ: подсветка игрока =====
    if (game.tutorial.active && game.level === 0 && (game.state === 'playing' || game.state === 'inventory')) {
        const step = TUTORIAL_STEPS[game.tutorial.step];
        if (step && step.canvasSpotlight) drawTutorialSpotlight(step);
    }

    if (game.player && game.player.hp < 40) {
        const intensity = 1 - game.player.hp / 40;
        const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H) * 0.3, W/2, H/2, Math.max(W,H) * 0.7);
        grad.addColorStop(0, 'rgba(255,0,0,0)'); grad.addColorStop(1, `rgba(255,0,0,${intensity * 0.5})`); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }

    if (game.mode === 'survival' && game.waveModifier && game.waveModifier.id === 'fog' && game.player) {
        const px = game.player.x - game.camX + shakeX;
        const py = game.player.y - game.camY + shakeY;
        const fogRadius = 260;
        const fogGrad = ctx.createRadialGradient(px, py, fogRadius * 0.35, px, py, fogRadius);
        fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
        fogGrad.addColorStop(0.55, 'rgba(5,5,15,0.55)');
        fogGrad.addColorStop(0.85, 'rgba(0,0,0,0.88)');
        fogGrad.addColorStop(1, 'rgba(0,0,0,0.97)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, W, H);
    }

    drawCombo();

    drawMinimap();
}

function drawMinimap() {
    if (!game.mapW || game.state === 'menu') return;
    const size = isMobile ? 110 : 150; const pad = 15; const mx = W - size - pad; const my = H - size - pad;
    const scale = Math.min(size / game.mapW, size / game.mapH); const realW = game.mapW * scale; const realH = game.mapH * scale;
    const offX = mx + (size - realW) / 2; const offY = my + (size - realH) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mx, my, size, size);
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.strokeRect(mx, my, size, size);
    ctx.fillStyle = 'rgba(100,100,140,0.6)';
    for (const w of game.walls) ctx.fillRect(offX + w.x * scale, offY + w.y * scale, w.w * scale, w.h * scale);
    ctx.fillStyle = '#ffcc00';
    for (const c of game.coins) ctx.fillRect(offX + c.x * scale - 1, offY + c.y * scale - 1, 3, 3);
    ctx.fillStyle = '#aa6622';
    for (const b of game.barrels) ctx.fillRect(offX + b.x * scale - 2, offY + b.y * scale - 2, 4, 4);
    for (const e of game.enemies) {
        if (e.isSuperMother) ctx.fillStyle = '#ff00aa';
        else if (e.isMegaBoss) ctx.fillStyle = '#ff0088'; else if (e.isGhostBoss || e.isGhostMother) ctx.fillStyle = '#dcdcff';
        else if (e.isGhost) ctx.fillStyle = '#8888cc'; else if (e.isMiniBoss || e.isBoss) ctx.fillStyle = '#aa00ff';
        else if (e.isTurret) ctx.fillStyle = '#ccccff'; else if (e.isSquare) ctx.fillStyle = '#ffcc44';
        else if (e.isBomber) ctx.fillStyle = '#ff4400'; else if (e.isShield) ctx.fillStyle = '#888888';
        else if (e.type === 'sprinter') ctx.fillStyle = '#44ddff'; else ctx.fillStyle = '#ff3344';
        
        let esize = 4;
        if (e.isSuperMother) esize = 12;
        else if (e.isMegaBoss || e.isGhostMother) esize = 8;
        else if (e.isMiniBoss || e.isBoss || e.isGhostBoss) esize = 6;
        
        ctx.fillRect(offX + e.x * scale - esize/2, offY + e.y * scale - esize/2, esize, esize);
    }
    ctx.fillStyle = '#ff8800';
    for (const m of game.mines) ctx.fillRect(offX + m.x * scale - 2, offY + m.y * scale - 2, 4, 4);
    ctx.fillStyle = 'rgba(120, 255, 60, 0.7)';
    for (const p of game.acidPools) { ctx.beginPath(); ctx.arc(offX + p.x * scale, offY + p.y * scale, 3, 0, Math.PI * 2); ctx.fill(); }
    if (game.player) { ctx.fillStyle = '#00ff88'; ctx.beginPath(); ctx.arc(offX + game.player.x * scale, offY + game.player.y * scale, 3, 0, Math.PI * 2); ctx.fill(); }
}