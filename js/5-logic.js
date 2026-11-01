let joystickActive = false;
let joystickVector = { x: 0, y: 0 };
let shootJoystickActive = false;
let shootJoystickVector = { x: 0, y: 0 };
let shootJoystickTrigger = false; 

let _lastHitSoundTime = 0;

function damagePlayer(amount) {
    let finalDamage = amount;
    if (game.equippedSkin === 'skinAlien' && game.alienShieldHp > 0) {
        const absorbed = amount * 0.5;
        finalDamage = amount * 0.5;
        game.alienShieldHp -= absorbed;
        if (game.alienShieldHp < 0) game.alienShieldHp = 0;
        spawnParticles(game.player.x, game.player.y, '#00ffff', 5);
    }
    game.player.hp -= finalDamage;
    updateHUD();
    if (game.player.hp <= 0) { 
        game.player.hp = 0; 
        updateHUD(); 
        gameOver(); 
    }
}

function playHitSound() {
    const now = performance.now();
    if (now - _lastHitSoundTime < 40) return; 
    _lastHitSoundTime = now;
    if (soundEnabled && hitSound) {
        const s = hitSound.cloneNode();
        s.volume = 0.08; 
        s.play().catch(e => {});
    }
}

const COMBO_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50];

function getComboMultiplier(combo) {
    if (combo >= 25) return 3.0;
    if (combo >= 15) return 2.5;
    if (combo >= 10) return 2.0;
    if (combo >= 5) return 1.5;
    return 1.0;
}

function getComboBonusCoins(combo) {
    if (combo >= 20) return 3;
    if (combo >= 10) return 2;
    if (combo >= 5) return 1;
    return 0;
}

function spawnDamageNumber(x, y, damage, isKill) {
    const spawnY = y - Math.max(10, Math.min(30, (y < 0 ? 20 : 20)));
    game.floatingTexts.push({
        x: x + (Math.random() - 0.5) * 16, y: spawnY,
        vx: (Math.random() - 0.5) * 40, vy: -90 - Math.random() * 40,
        text: isKill ? Math.round(damage) + '!' : String(Math.round(damage)),
        life: 0.9, maxLife: 0.9, color: isKill ? '#ffdd00' : '#ffffff', size: isKill ? 22 : 15
    });
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 4 + 1;
        game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5, maxLife: 0.5, color, size: Math.random() * 3 + 2 });
    }
}

function getSafeSpawnPoint(radius, minDistFromPlayer = 0) {
    let tries = 0;
    while (tries < 200) {
        const x = 100 + Math.random() * (game.mapW - 200);
        const y = 100 + Math.random() * (game.mapH - 200);
        if (minDistFromPlayer > 0 && game.player && Math.hypot(x - game.player.x, y - game.player.y) < minDistFromPlayer) { tries++; continue; }
        let blocked = false;
        for (const w of game.walls) {
            if (x + radius > w.x && x - radius < w.x + w.w && y + radius > w.y && y - radius < w.y + w.h) { blocked = true; break; }
        }
        if (!blocked) return { x, y };
        tries++;
    }
    return { x: game.mapW / 2, y: game.mapH / 2 };
}

function explodeMine(mine) {
    game.explosions.push({ x: mine.x, y: mine.y, life: 0.6, maxLife: 0.6, radius: MINE_RADIUS });
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const e = game.enemies[i]; const d = Math.hypot(e.x - mine.x, e.y - mine.y);
        if (d < MINE_RADIUS + e.radius) {
            const falloff = 1 - Math.min(1, d / MINE_RADIUS); const dmg = MINE_DAMAGE * (0.4 + 0.6 * falloff);
            e.hp -= dmg; e.hitFlash = 0.15; 
            spawnDamageNumber(e.x, e.y - e.radius, dmg, e.hp <= 0);
            if (e.hp <= 0) killEnemy(e);
        }
    }
    const dp = Math.hypot(game.player.x - mine.x, game.player.y - mine.y);
    if (dp < MINE_RADIUS) {
        const falloff = 1 - Math.min(1, dp / MINE_RADIUS); game.player.hp -= 50 * (0.3 + 0.7 * falloff); game.screenShake = 15; updateHUD();
        if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); }
    }
    spawnParticles(mine.x, mine.y, '#ff8800', 40); spawnParticles(mine.x, mine.y, '#ffdd44', 25); spawnParticles(mine.x, mine.y, '#ff0044', 15);
    game.screenShake = 25; playBoomSound('mine'); updateHUD();
}

function explodeBarrel(barrel) {
    game.explosions.push({ x: barrel.x, y: barrel.y, life: 0.6, maxLife: 0.6, radius: BARREL_EXPLOSION_RADIUS });
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const e = game.enemies[i]; const d = Math.hypot(e.x - barrel.x, e.y - barrel.y);
        if (d < BARREL_EXPLOSION_RADIUS + e.radius) {
            const falloff = 1 - Math.min(1, d / BARREL_EXPLOSION_RADIUS); const dmg = 150 * (0.4 + 0.6 * falloff);
            e.hp -= dmg; e.hitFlash = 0.2;
            spawnDamageNumber(e.x, e.y - e.radius, dmg, e.hp <= 0);
            if (e.hp <= 0) killEnemy(e);
        }
    }
    const dp = Math.hypot(game.player.x - barrel.x, game.player.y - barrel.y);
    if (dp < BARREL_EXPLOSION_RADIUS) {
        const falloff = 1 - Math.min(1, dp / BARREL_EXPLOSION_RADIUS); game.player.hp -= 40 * (0.3 + 0.7 * falloff); game.screenShake = 18; updateHUD();
        if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); }
    }
    for (let i = game.barrels.length - 1; i >= 0; i--) {
        const other = game.barrels[i]; const d = Math.hypot(other.x - barrel.x, other.y - barrel.y);
        if (d < BARREL_EXPLOSION_RADIUS) { game.barrels.splice(i, 1); setTimeout(() => explodeBarrel(other), 100); }
    }
    game.fires.push({ x: barrel.x, y: barrel.y, radius: BARREL_FIRE_RADIUS, life: FIRE_LIFETIME, maxLife: FIRE_LIFETIME, damageTimer: 0, phase: Math.random() * Math.PI * 2 });
    spawnParticles(barrel.x, barrel.y, '#ff8800', 50); spawnParticles(barrel.x, barrel.y, '#ffdd44', 30); spawnParticles(barrel.x, barrel.y, '#ff2200', 25);
    game.screenShake = 28; playBoomSound('barrel'); updateHUD();
}

function createAcidPool(x, y) {
    game.acidPools.push({ x, y, radius: ACID_RADIUS, life: ACID_LIFETIME, maxLife: ACID_LIFETIME, playerDamageTimer: 0, phase: Math.random() * Math.PI * 2 });
    spawnParticles(x, y, '#88ff44', 14); playSound(300, 0.15, 'sine');
}

function placeMine(item) {
    const offsets = [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40], [30, 30], [-30, 30], [30, -30], [-30, -30]];
    let placed = false;
    for (const [ox, oy] of offsets) {
        const x = game.player.x + ox; const y = game.player.y + oy; let blocked = false;
        for (const w of game.walls) { if (x + 12 > w.x && x - 12 < w.x + w.w && y + 12 > w.y && y - 12 < w.y + w.h) { blocked = true; break; } }
        if (!blocked) { game.mines.push({ x, y, triggerRadius: 30, armTime: 0.8, phase: Math.random() * Math.PI * 2 }); placed = true; break; }
    }
    if (!placed) return false;
    const idx = game.player.inventory.indexOf(item); 
    if (idx !== -1) game.player.inventory.splice(idx, 1);
    playSound(400, 0.15, 'square'); updateHUD(); saveProgress(); return true;
}

function generateLevel(levelNum) {
    game.walls = []; game.enemies = []; game.bullets = []; game.enemyBullets = []; game.arrows = []; game.coins = []; game.healPacks = []; game.ammoPacks = []; game.minePacks = []; game.weaponPacks = []; game.mines = []; game.acidPools = []; game.particles = []; game.explosions = []; game.barrels = []; game.fires = []; game.sniperTrails = [];
    game.floatingTexts = []; game.heartbeatTimer = 0.5;
    game.combo = 0; game.comboTimer = 0; game.comboMax = 0; game.comboFlashTimer = 0;
    game.rewardAdUsedThisLevel = false; 

    game.palette = getPaletteForLevel(levelNum);
    const mapW = 1600; const mapH = 1200; game.mapW = mapW; game.mapH = mapH;
    const thick = 40;
    game.walls.push({ x: 0, y: 0, w: mapW, h: thick }); game.walls.push({ x: 0, y: mapH - thick, w: mapW, h: thick });
    game.walls.push({ x: 0, y: 0, w: thick, h: mapH }); game.walls.push({ x: mapW - thick, y: 0, w: thick, h: mapH });
    const startX = 120; const startY = 120;
    if (!game.player) game.player = new Player(startX, startY);
    else { game.player.x = startX; game.player.y = startY; game.player.applyUpgrades(false); }

    if (levelNum === 20) {
        game.walls.push({ x: 300, y: 300, w: 100, h: 100 }); game.walls.push({ x: mapW - 400, y: mapH - 400, w: 100, h: 100 });
        game.walls.push({ x: 300, y: mapH - 400, w: 100, h: 100 }); game.walls.push({ x: mapW - 400, y: 300, w: 100, h: 100 });
        game.walls.push({ x: mapW / 2 - 50, y: mapH / 2 - 50, w: 100, h: 100 });
        return; 
    }

    if (levelNum === 0) {
        game.walls.push({ x: 400, y: 100, w: 40, h: 300 }); game.walls.push({ x: 400, y: 400, w: 300, h: 40 });
        game.coins.push({ x: 200, y: 120, phase: 0 }); game.coins.push({ x: 250, y: 150, phase: 0 }); game.coins.push({ x: 300, y: 180, phase: 0 });
        game.minePacks.push({ x: 180, y: 250, phase: 0 }); 
        return;
    }

    const corridors = [];
    if (levelNum <= 6) {
        corridors.push({ x: 300, y: 100, w: 40, h: 400 }, { x: 300, y: 500, w: 500, h: 40 }, { x: 760, y: 300, w: 40, h: 500 }, { x: 200, y: 700, w: 400, h: 40 }, { x: 1000, y: 200, w: 40, h: 600 }, { x: 600, y: 850, w: 700, h: 40 }, { x: 1200, y: 100, w: 40, h: 500 }, { x: 500, y: 200, w: 40, h: 200 });
        if (levelNum >= 2) corridors.push({ x: 900, y: 900, w: 40, h: 250 }, { x: 400, y: 500, w: 40, h: 250 }, { x: 1300, y: 700, w: 200, h: 40 });
        if (levelNum >= 3) corridors.push({ x: 700, y: 100, w: 200, h: 40 }, { x: 400, y: 950, w: 40, h: 200 });
        if (levelNum >= 4) corridors.push({ x: 100, y: 400, w: 150, h: 40 }, { x: 1100, y: 500, w: 200, h: 40 }, { x: 200, y: 1000, w: 40, h: 150 });
    } else {
        corridors.push({ x: 300, y: 300, w: 400, h: 40 }, { x: 300, y: 300, w: 40, h: 300 }, { x: 900, y: 300, w: 400, h: 40 }, { x: 1260, y: 300, w: 40, h: 300 }, { x: 300, y: 750, w: 300, h: 40 }, { x: 560, y: 600, w: 40, h: 150 }, { x: 900, y: 600, w: 300, h: 40 }, { x: 1000, y: 700, w: 40, h: 150 }, { x: 300, y: 900, w: 400, h: 40 }, { x: 300, y: 900, w: 40, h: 200 }, { x: 900, y: 900, w: 400, h: 40 }, { x: 700, y: 480, w: 200, h: 40 }, { x: 700, y: 480, w: 40, h: 120 }, { x: 500, y: 300, w: 40, h: 100 }, { x: 1100, y: 780, w: 40, h: 100 }, { x: 700, y: 200, w: 200, h: 40 });
    }
    game.walls.push(...corridors);

    const spawnEnemy = (type, minDist = 400) => {
        let tries = 0;
        while (tries < 100) {
            const x = thick + 60 + Math.random() * (mapW - thick * 2 - 120); 
            const y = thick + 60 + Math.random() * (mapH - thick * 2 - 120);
            const dist = Math.hypot(x - startX, y - startY); if (dist < minDist) { tries++; continue; }
            let collides = false;
            const r = ENEMY_TYPES[type].radius;
            for (const w of game.walls) { 
                if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) { collides = true; break; } 
            }
            if (!collides) { game.enemies.push(new Enemy(x, y, type)); return; }
            tries++;
        }
    };

    let enemyCounts;
    if (levelNum === 1) enemyCounts = { weak: 6, medium: 4, strong: 2 };
    else if (levelNum === 2) enemyCounts = { weak: 7, medium: 6, strong: 4 };
    else if (levelNum === 3) enemyCounts = { weak: 2, medium: 2, strong: 1 };
    else if (levelNum === 4) enemyCounts = { weak: 3, medium: 3, strong: 2, miniboss: 2 };
    else if (levelNum === 5) enemyCounts = { weak: 4, medium: 4, strong: 3, sprinter: 5, miniboss: 1 };
    else if (levelNum === 6) enemyCounts = { weak: 3, medium: 3, strong: 2, sprinter: 3, miniboss: 2 };
    else if (levelNum === 7) enemyCounts = { square_fast: 6, square_medium: 3, turret: 2 };
    else if (levelNum === 8) enemyCounts = { square_fast: 5, square_medium: 5, square_tank: 2, turret: 3 };
    else if (levelNum === 9) enemyCounts = { square_fast: 6, square_medium: 5, square_tank: 4, turret: 4 };
    else if (levelNum === 10) enemyCounts = { square_fast: 4, square_medium: 4, square_tank: 3, turret: 3, ghost: 4 };
    else if (levelNum === 11) enemyCounts = { ghost_mother: 1, shield: 3, ghost: 5, turret: 4, square_tank: 3 };
    else if (levelNum === 12) enemyCounts = { ghost_mother: 2, ghost: 4, turret: 5, shield: 4 };
    else if (levelNum === 13) enemyCounts = { shield: 7, ghost_mother: 3, bomber: 7 };
    else if (levelNum === 14) enemyCounts = { turret: 12, ghost: 7, bomber: 5, shield: 3 };
    else if (levelNum === 15) enemyCounts = { super_mother: 1 };
    else enemyCounts = { weak: 5, medium: 5, strong: 3 };

    for (const [type, count] of Object.entries(enemyCounts)) { for (let i = 0; i < count; i++) spawnEnemy(type); }

    const spawnBoss = (type, minDistFromPlayer) => {
        let bx = mapW / 2, by = mapH / 2; const cfg = ENEMY_TYPES[type]; const r = cfg.radius + 20; let tries = 0;
        while (tries < 300) {
            const x = thick + r + Math.random() * (mapW - thick * 2 - r * 2); const y = thick + r + Math.random() * (mapH - thick * 2 - r * 2);
            const dist = Math.hypot(x - startX, y - startY); if (dist < minDistFromPlayer) { tries++; continue; }
            let blocked = false;
            for (const w of game.walls) { if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) { blocked = true; break; } }
            if (!blocked) { bx = x; by = y; break; }
            tries++;
        }
        game.enemies.push(new Enemy(bx, by, type));
    };
    if (levelNum === 3) spawnBoss('boss', 500); 
    if (levelNum === 6) spawnBoss('megaboss', 600); 
    if (levelNum === 10) spawnBoss('ghost_boss', 600);

    const coinCount = levelNum === 15 ? 40 : (levelNum === 3 ? 15 : (levelNum === 6 ? 30 : (levelNum >= 7 ? 25 : 20)));
    for (let i = 0; i < coinCount; i++) {
        const spot = getSafeSpawnPoint(12, 100);
        game.coins.push({ x: spot.x, y: spot.y, phase: Math.random() * Math.PI * 2 });
    }

    if (levelNum >= 2) {
        let healCount = 2;
        if (levelNum === 3) healCount = 3; if (levelNum === 4 || levelNum === 5) healCount = 3;
        if (levelNum === 6) healCount = 5; if (levelNum >= 7) healCount = 4; if (levelNum === 10) healCount = 6;
        if (levelNum >= 13) healCount = 6; if (levelNum === 15) healCount = 8;
        for (let i = 0; i < healCount; i++) {
            const spot = getSafeSpawnPoint(15, 150);
            game.healPacks.push({ x: spot.x, y: spot.y, phase: Math.random() * Math.PI * 2 });
        }
    }

    const ammoCount = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < ammoCount; i++) {
        const spot = getSafeSpawnPoint(15, 150);
        game.ammoPacks.push({ x: spot.x, y: spot.y, phase: Math.random() * Math.PI * 2 });
    }

    const mineCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < mineCount; i++) {
        const spot = getSafeSpawnPoint(15, 150);
        game.minePacks.push({ x: spot.x, y: spot.y, phase: Math.random() * Math.PI * 2 });
    }

    if (levelNum >= 8 && levelNum <= 13) {
        let barrelCount = 6 + Math.floor(Math.random() * 3);
        if (levelNum === 11) barrelCount = 5; if (levelNum === 12) barrelCount = 7; if (levelNum === 13) barrelCount = 5;
        for (let i = 0; i < barrelCount; i++) {
            let spot = getSafeSpawnPoint(22, 200); let overlap = false;
            for (const b of game.barrels) { if (Math.hypot(b.x - spot.x, b.y - spot.y) < 80) { overlap = true; break; } }
            if (!overlap) game.barrels.push({ x: spot.x, y: spot.y, radius: 20, phase: Math.random() * Math.PI * 2 });
        }
    }

    if (levelNum === 4 || levelNum === 14) {
        let wid = levelNum === 4 ? 'shotgun' : 'sniper';
        const spot = getSafeSpawnPoint(20, 200);
        game.weaponPacks.push({ x: spot.x, y: spot.y, phase: Math.random() * Math.PI * 2, weaponId: wid });
    }
}

function applyWaveModifierToEnemy(e) {
    if (!game.waveModifier) return;
    if (game.waveModifier.id === 'bloodlust') { e.damage = Math.floor(e.damage * 1.3); e.meleeDamage = Math.floor(e.meleeDamage * 1.3); }
    if (game.waveModifier.id === 'speed') { e.speed *= 1.4; }
}

function pickWaveModifier() {
    if (game.wave % 5 !== 0 || game.wave === 0) return null;
    return WAVE_MODIFIERS[Math.floor(Math.random() * WAVE_MODIFIERS.length)];
}

function spawnSurvivalWave() {
    const wave = game.wave;
    const count = 3 + wave * 2;

    game.waveModifier = pickWaveModifier();
    game.waveModifierActive = !!game.waveModifier;

    let allowedTypes = ['weak', 'medium'];
    if (wave >= 3) allowedTypes.push('strong', 'sprinter');
    if (wave >= 5) allowedTypes.push('miniboss', 'square_fast');
    if (wave >= 8) allowedTypes.push('square_medium', 'shield', 'bomber');
    if (wave >= 12) allowedTypes.push('square_tank', 'ghost');
    if (wave >= 15) allowedTypes.push('megaboss', 'ghost_boss');

    for (let i = 0; i < count; i++) {
        let type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        const spot = getSafeSpawnPoint(ENEMY_TYPES[type].radius, 300);
        const e = new Enemy(spot.x, spot.y, type);
        applyWaveModifierToEnemy(e);
        game.enemies.push(e);
    }

    if (game.waveModifier && game.waveModifier.id === 'hell') {
        for (let i = 0; i < 4; i++) {
            const spot = getSafeSpawnPoint(60, 200);
            game.fires.push({ x: spot.x, y: spot.y, radius: 80, life: 30, maxLife: 30, damageTimer: 0, phase: Math.random() * Math.PI * 2 });
        }
    }

    game.goldrushPenalty = 0;
    if (game.waveModifier && game.waveModifier.id === 'goldrush' && game.player) {
        game.goldrushPenalty = Math.floor(game.player.maxHp * 0.25);
        game.player.hp = Math.max(1, game.player.hp - game.goldrushPenalty);
    }

    if (wave % 5 === 0) { for (let i = 0; i < 3; i++) { const spot = getSafeSpawnPoint(15, 100); game.healPacks.push({ x: spot.x, y: spot.y, phase: 0 }); } }
    if (wave % 3 === 0) { for (let i = 0; i < 4; i++) { const spot = getSafeSpawnPoint(15, 100); game.ammoPacks.push({ x: spot.x, y: spot.y, phase: 0 }); } }
    if (wave % 2 === 0) { const spot = getSafeSpawnPoint(15, 100); game.minePacks.push({ x: spot.x, y: spot.y, phase: 0 }); }

    if (game.waveModifier) showWaveModifierBanner(game.waveModifier);

    const hintEl = document.getElementById('tutorial-hint');
    hintEl.classList.remove('hidden');
    hintEl.innerHTML = `<b>ВОЛНА ${wave}</b>`;
    setTimeout(() => { if (hintEl.innerHTML.includes('ВОЛНА')) hintEl.classList.add('hidden'); }, 2000);
    
    playSound(800, 0.3, 'sine');
    updateHUD();
}

function shoot() {
    if (game.state !== 'playing') return;
    const weapon = game.player.getWeapon(); 
    const now = performance.now();

    // Если идет перезарядка — стрелять нельзя
    if (game.player.isReloading) return;

    let currentFireRate = weapon.fireRate;
    if (game.equippedSkin === 'skinBear') currentFireRate *= 0.9;
    if (game.equippedSkin === 'skinCyber') currentFireRate *= 0.95;

    if (now - game.lastShotTime < currentFireRate) return;

    // Проверка на пустую обойму
    if (game.player.magAmmo < weapon.ammoPerShot) {
        startReload();
        return;
    }

    const infiniteAmmo = game.waveModifier && game.waveModifier.id === 'hell';
    
    

    game.lastShotTime = now; 
    
        game.lastShotTime = now; 
    
    // Тратим патроны ТОЛЬКО из обоймы!
    if (!infiniteAmmo) {
        game.player.magAmmo -= weapon.ammoPerShot;
    }

    game.player.recoil = weapon.id === 'sniper' ? 6 : 3;
    const totalDamage = weapon.damage + game.upgrades.damage * 2;
    
    for (let i = 0; i < weapon.bulletsPerShot; i++) {
        const angle = game.player.angle + (Math.random() - 0.5) * weapon.spread;
        game.bullets.push({ 
            x: game.player.x + Math.cos(game.player.angle) * 25, 
            y: game.player.y + Math.sin(game.player.angle) * 25, 
            vx: Math.cos(angle) * weapon.bulletSpeed, 
            vy: Math.sin(angle) * weapon.bulletSpeed, 
            life: weapon.id === 'shotgun' ? 0.5 : (weapon.id === 'sniper' ? 2.0 : 1.5), 
            damage: totalDamage, 
            isShotgun: weapon.id === 'shotgun', 
            pierce: !!weapon.pierce, 
            hitEnemies: [],
            isAlien: !!weapon.isAlien
        });
    }
    
    game.screenShake = weapon.id === 'shotgun' ? 8 : (weapon.id === 'sniper' ? 10 : 3);
    spawnParticles(game.player.x + Math.cos(game.player.angle) * 30, game.player.y + Math.sin(game.player.angle) * 30, '#ffdd44', weapon.id === 'shotgun' ? 8 : 3);
    playShootSound(weapon.id);
    updateHUD();
}

function startReload() {
    if (game.player.isReloading) return;
    const weapon = game.player.getWeapon();
    if (game.player.magAmmo >= weapon.magSize) return; // Обойма полная
    if (game.player.ammo <= 0) return; // Нет патронов в запасе

    game.player.isReloading = true;
    game.player.reloadStartTime = performance.now(); // <--- Запоминаем время начала
    game.player.reloadDuration = 1000; // <--- 1000 мс = 1 секунда (должно совпадать с setTimeout ниже)
	// Проигрываем звук перезарядки
    if (soundEnabled && typeof reloadSound !== 'undefined') {
        reloadSound.currentTime = 0; // Сбрасываем, чтобы можно было стрелять очередями
        reloadSound.volume = 0.4;
        reloadSound.play().catch(e => {});
    }

    setTimeout(() => {
        if (!game.player) return;
        const need = weapon.magSize - game.player.magAmmo;
        const canGive = Math.min(need, game.player.ammo);
        game.player.magAmmo += canGive;
        game.player.ammo -= canGive;
        game.player.isReloading = false;
        playSound(600, 0.15, 'square'); // Звук окончания перезарядки
        updateHUD();
    }, 1000); // 1 секунда перезарядки для всех
}

function killEnemy(e) {
    const isMajorBoss = e.isBoss || e.isMegaBoss || e.isGhostBoss || e.isSuperMother;
    if (isMajorBoss) {
        trackEvent('Boss_Killed', { boss_type: e.type });
        const bossKey = 'boss_' + game.level; // Создаем уникальный ключ (например, 'boss_3')
        
        // Если мы еще не получали чипы за этого босса в этом прохождении
        if (!game.chipsEarnedThisRun[bossKey]) {
            addChips(3, 'boss_kill');
            game.chipsEarnedThisRun[bossKey] = true; // Запоминаем, что получили
            saveProgress(true); // Сразу сохраняем, чтобы нельзя было перезагрузить страницу и нафармить
        }
    }
	
    const idx = game.enemies.indexOf(e); if (idx !== -1) game.enemies.splice(idx, 1);

    game.combo++; game.comboTimer = 3.0;
    if (game.combo > game.comboMax) game.comboMax = game.combo;

    if (COMBO_MILESTONES.includes(game.combo)) {
        game.comboFlashTimer = 0.8;
        playSound(1200, 0.15, 'sine');
        setTimeout(() => playSound(1600, 0.15, 'sine'), 80);
        if (game.player) spawnParticles(game.player.x, game.player.y, '#ffcc00', 20);
    }

    const comboMult = getComboMultiplier(game.combo);
    game.score += Math.floor(e.score * comboMult);

    const isGoldrush = game.waveModifier && game.waveModifier.id === 'goldrush';
    const baseCoins = isGoldrush ? e.coins * 2 : e.coins;
    const coinReward = baseCoins + getComboBonusCoins(game.combo);
    game.totalCoins += coinReward;

    if (game.mode === 'survival') {
        game.xp += e.score;
        if (game.xp >= game.xpTarget) {
            game.xp -= game.xpTarget;
            game.xpTarget = Math.floor(game.xpTarget * 1.5);
            triggerSurvivalLevelUp();
        }
    }

    spawnParticles(e.x, e.y, e.color, e.isMegaBoss || e.isGhostBoss || e.isSuperMother ? 60 : (e.isMiniBoss || e.isBoss ? 35 : 20));
    playSound(150, 0.2, 'sawtooth');
    for (let i = 0; i < coinReward; i++) { 
        game.coins.push({ x: e.x + (Math.random() - 0.5) * (e.isMegaBoss || e.isGhostBoss || e.isSuperMother ? 150 : 40), y: e.y + (Math.random() - 0.5) * (e.isMegaBoss || e.isGhostBoss || e.isSuperMother ? 150 : 40), phase: 0 }); 
    }
    updateHUD();
}

function updateTutorial() {
    if (game.mode === 'survival') return;
    const hintEl = document.getElementById('tutorial-hint');

    if (game.level > 0 && game.player && game.player.ownedWeapons.length > 1 && !game.weaponHintSeen) {
        if (!game.tutorial.weaponHintActive) game.tutorial.weaponHintActive = true;
        hintEl.classList.remove('hidden');
        if (game.state === 'inventory') hintEl.innerHTML = 'Выбери <b>оружие</b> в списке';
        else hintEl.innerHTML = 'У тебя новое оружие! Нажми <b>E</b>';
        return;
    }

    if (game.level === 0 && game.tutorial.active) {
        hintEl.classList.add('hidden');
        if (game.state === 'playing' || game.state === 'inventory') tickTutorial();
        return;
    }
    hintEl.classList.add('hidden');
}

function update(dt) {
    updateTutorial();
    if (game.state !== 'playing') return;
    game.player.update(dt);

    if (game.player.hp < 30 && game.player.hp > 0) {
        game.heartbeatTimer -= dt;
        if (game.heartbeatTimer <= 0) {
            playSound(60, 0.12, 'sine', 0.12);
            const intensity = 1 - game.player.hp / 30;
            game.heartbeatTimer = 0.9 - intensity * 0.5;
        }
    } else game.heartbeatTimer = 0.5;

    game.ammoDropTimer -= dt;
    if (game.ammoDropTimer <= 0) {
        game.ammoDropTimer = 30;
        if (game.ammoPacks.length < 5) {
            const spot = getSafeSpawnPoint(15, 0);
            game.ammoPacks.push({ x: spot.x, y: spot.y, phase: 0 });
            playSound(1000, 0.2, 'sine', 0.05);
        }
    }

    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const b = game.bullets[i]; b.x += b.vx; b.y += b.vy; b.life -= dt;
        if (b.pierce) {
            game.sniperTrails.push({ startX: b.x - b.vx, startY: b.y - b.vy, endX: b.x, endY: b.y, life: 0.2 });
            if (game.sniperTrails.length > 50) game.sniperTrails.shift();
        }
        let hit = false;
        for (const w of game.walls) { if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) { hit = true; spawnParticles(b.x, b.y, '#ffdd44', 4); break; } }
        if (!hit) { for (let j = game.barrels.length - 1; j >= 0; j--) { const br = game.barrels[j]; if (Math.hypot(b.x - br.x, b.y - br.y) < br.radius) { hit = true; game.barrels.splice(j, 1); explodeBarrel(br); break; } } }
        if (!hit) { 
            for (const e of game.enemies) { 
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius) {
                    if (e.isShield) {
                        const angleToBullet = Math.atan2(b.y - e.y, b.x - e.x); let diff = angleToBullet - e.angle;
                        while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
                        if (Math.abs(diff) < Math.PI / 2) { spawnParticles(b.x, b.y, '#cccccc', 6); playSound(500, 0.05, 'square'); hit = true; break; }
                    }
                    if (!b.hitEnemies.includes(e)) {
                        const dmg = b.damage; e.hp -= dmg; e.hitFlash = 0.1; spawnParticles(b.x, b.y, e.color, 6); 
                        const isKill = e.hp <= 0; spawnDamageNumber(e.x, e.y - e.radius, dmg, isKill); playHitSound();
                        if (isKill) killEnemy(e);
                        if (!b.pierce) { hit = true; break; } else b.hitEnemies.push(e);
                    }
                } 
            } 
        }
        if (hit || b.life <= 0) game.bullets.splice(i, 1);
    }

    for (let i = game.sniperTrails.length - 1; i >= 0; i--) { game.sniperTrails[i].life -= dt; if (game.sniperTrails[i].life <= 0) game.sniperTrails.splice(i, 1); }

    for (let i = game.arrows.length - 1; i >= 0; i--) {
        const a = game.arrows[i]; a.x += a.vx; a.y += a.vy; a.life -= dt; let hit = false;
        for (const w of game.walls) { if (a.x > w.x && a.x < w.x + w.w && a.y > w.y && a.y < w.y + w.h) { hit = true; spawnParticles(a.x, a.y, '#ccccff', 5); break; } }
        if (!hit) { const d = Math.hypot(a.x - game.player.x, a.y - game.player.y); if (d < game.player.radius + 4) { hit = true; game.player.hp -= a.damage; game.screenShake = 6; spawnParticles(a.x, a.y, '#ff4444', 10); playSound(200, 0.1, 'square'); updateHUD(); if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); } } }
        if (hit || a.life <= 0) game.arrows.splice(i, 1);
    }
    
    for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
        const b = game.enemyBullets[i]; b.x += b.vx; b.y += b.vy; b.life -= dt; let hit = false;
        for (const w of game.walls) { if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) { hit = true; createAcidPool(b.x, b.y); break; } }
        if (!hit) { const d = Math.hypot(b.x - game.player.x, b.y - game.player.y); if (d < game.player.radius + b.radius) { hit = true; game.player.hp -= 8; game.screenShake = 6; spawnParticles(b.x, b.y, '#88ff44', 10); playSound(140, 0.15, 'square'); updateHUD(); if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); } createAcidPool(b.x, b.y); } }
        if (!hit && b.life <= 0) { hit = true; createAcidPool(b.x, b.y); }
        if (hit) game.enemyBullets.splice(i, 1);
    }
    
    for (let i = game.acidPools.length - 1; i >= 0; i--) {
        const p = game.acidPools[i]; p.life -= dt;
        if (p.life > 0) { const d = Math.hypot(game.player.x - p.x, game.player.y - p.y); if (d < p.radius + game.player.radius * 0.5) { p.playerDamageTimer -= dt; if (p.playerDamageTimer <= 0) { game.player.hp -= ACID_DPS; p.playerDamageTimer = 1.0; spawnParticles(game.player.x, game.player.y, '#88ff44', 4); updateHUD(); if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); } } } else p.playerDamageTimer = 0; }
        if (p.life <= 0) game.acidPools.splice(i, 1);
    }
    
    for (let i = game.fires.length - 1; i >= 0; i--) {
        const f = game.fires[i]; f.life -= dt;
        if (f.life > 0) {
            const d = Math.hypot(game.player.x - f.x, game.player.y - f.y);
            if (d < f.radius + game.player.radius * 0.5) { f.damageTimer -= dt; if (f.damageTimer <= 0) { game.player.hp -= FIRE_DPS; f.damageTimer = 1.0; spawnParticles(game.player.x, game.player.y, '#ff6600', 5); updateHUD(); if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); } } } else f.damageTimer = 0;
            for (let j = game.enemies.length - 1; j >= 0; j--) { const e = game.enemies[j]; const de = Math.hypot(e.x - f.x, e.y - f.y); if (de < f.radius + e.radius * 0.5) { e.hp -= FIRE_DPS * dt * 2; if (e.hp <= 0) killEnemy(e); } }
        }
        if (f.life <= 0) game.fires.splice(i, 1);
    }

    for (const e of game.enemies) e._updatedThisFrame = false;
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const e = game.enemies[i];
        if (e && !e._updatedThisFrame) { e._updatedThisFrame = true; e.update(dt); }
    }

    if (game.comboTimer > 0) { game.comboTimer -= dt; if (game.comboTimer <= 0) { if (game.combo >= 5) playSound(280, 0.2, 'sawtooth', 0.06); game.combo = 0; game.comboTimer = 0; } }
    if (game.comboFlashTimer > 0) game.comboFlashTimer -= dt;

    for (let i = game.particles.length - 1; i >= 0; i--) { const p = game.particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; if (p.life <= 0) game.particles.splice(i, 1); }
    for (let i = game.floatingTexts.length - 1; i >= 0; i--) { const ft = game.floatingTexts[i]; ft.x += ft.vx * dt; ft.y += ft.vy * dt; ft.vy += 250 * dt; ft.life -= dt; if (ft.life <= 0) game.floatingTexts.splice(i, 1); }
    for (let i = game.explosions.length - 1; i >= 0; i--) { const ex = game.explosions[i]; ex.life -= dt; if (ex.life <= 0) game.explosions.splice(i, 1); }
    for (let i = game.mines.length - 1; i >= 0; i--) { const m = game.mines[i]; m.phase += dt * 5; if (m.armTime > 0) { m.armTime -= dt; continue; } let triggered = false; for (const e of game.enemies) { const d = Math.hypot(e.x - m.x, e.y - m.y); if (d < m.triggerRadius + e.radius) { triggered = true; break; } } if (triggered) { game.mines.splice(i, 1); explodeMine(m); } }
    for (let i = game.coins.length - 1; i >= 0; i--) { const c = game.coins[i]; c.phase += dt * 4; if (Math.hypot(c.x - game.player.x, c.y - game.player.y) < game.player.radius + 15) { game.coins.splice(i, 1); game.totalCoins++; game.score += 5; playSound(900, 0.1, 'sine'); spawnParticles(c.x, c.y, '#ffcc00', 8); updateHUD(); } }
    for (let i = game.healPacks.length - 1; i >= 0; i--) { const h = game.healPacks[i]; h.phase += dt * 3; if (Math.hypot(h.x - game.player.x, h.y - game.player.y) < game.player.radius + 15) { game.healPacks.splice(i, 1); game.player.hp = Math.min(game.player.maxHp, game.player.hp + 40); playSound(800, 0.15, 'sine'); spawnParticles(h.x, h.y, '#ff4466', 10); updateHUD(); } }
    for (let i = game.ammoPacks.length - 1; i >= 0; i--) { const a = game.ammoPacks[i]; a.phase += dt * 3; if (Math.hypot(a.x - game.player.x, a.y - game.player.y) < game.player.radius + 15) { game.ammoPacks.splice(i, 1); game.player.ammo = Math.min(game.player.maxAmmo, game.player.ammo + 20); playSound(500, 0.1, 'square'); spawnParticles(a.x, a.y, '#ffdd44', 8); updateHUD(); } }
    for (let i = game.minePacks.length - 1; i >= 0; i--) { const mp = game.minePacks[i]; mp.phase += dt * 3; if (Math.hypot(mp.x - game.player.x, mp.y - game.player.y) < game.player.radius + 15) { game.minePacks.splice(i, 1); game.player.inventory.push({ type: 'mine', name: 'Мина', icon: '💣' }); playSound(600, 0.15, 'triangle'); spawnParticles(mp.x, mp.y, '#ff8800', 10); updateHUD(); saveProgress(); } }
    for (let i = game.weaponPacks.length - 1; i >= 0; i--) { const wp = game.weaponPacks[i]; wp.phase += dt * 3; if (Math.hypot(wp.x - game.player.x, wp.y - game.player.y) < game.player.radius + 20) { game.weaponPacks.splice(i, 1); if (!game.player.ownedWeapons.includes(wp.weaponId)) game.player.ownedWeapons.push(wp.weaponId); playSound(700, 0.2, 'sine'); spawnParticles(wp.x, wp.y, '#44ddff', 15); updateHUD(); saveProgress(true); } }
    
    if (game.enemies.length === 0) {
        if (game.mode === 'survival') {
            if (game.goldrushPenalty > 0 && game.player) { game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.goldrushPenalty); game.goldrushPenalty = 0; }
            game.wave++; game.score += 100; game.waveModifier = null; game.waveModifierActive = false; hideWaveModifierBanner(); spawnSurvivalWave();
        } else if (game.tutorial.active && game.level === 0) {
            // Туториал сам завершит
        } else {
            levelComplete();
        }
    }
    
    if (game.screenShake > 0) game.screenShake -= dt * 30;
	
    // МУЗЫКА БОССА
    if (game.mode === 'campaign' && game.state === 'playing') {
        const bossPresent = game.enemies.some(e => e.isBoss || e.isMegaBoss || e.isGhostBoss || e.isSuperMother);
        
        if (bossPresent && !isBossMusicPlaying) {
            pauseBattleMusic();
            playBossMusic();
        } else if (!bossPresent && isBossMusicPlaying) {
            pauseBossMusic();
            playBattleMusic();
        }
    }
}