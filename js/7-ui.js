function updateChipsUI() {
    const el = document.getElementById('chips-value');
    if (el) el.textContent = game.chips;
}
function updateHUD() {
    if (!game.player) return;
    document.getElementById('hp-value').textContent = Math.max(0, Math.round(game.player.hp));
    const weapon = game.player.getWeapon();
	const mag = game.player.magAmmo !== undefined ? game.player.magAmmo : weapon.magSize;
	if (game.waveModifier && game.waveModifier.id === 'hell') {
    document.getElementById('ammo-value').textContent = '∞';
	} else {
    document.getElementById('ammo-value').textContent = `${mag} / ${game.player.ammo}`;
}
    document.getElementById('coins-value').textContent = game.totalCoins;

    const hpItem = document.getElementById('hp-item');
    if (hpItem) { if (game.player.hp < 30 && game.player.hp > 0) hpItem.classList.add('hp-low'); else hpItem.classList.remove('hp-low'); }

    if (game.mode === 'survival') {
        document.getElementById('level-value').textContent = 'Волна ' + game.wave;
        document.getElementById('hud-xp').style.display = 'flex';
        document.getElementById('xp-value').textContent = `${Math.floor(game.xp)} / ${game.xpTarget}`;
    } else {
        document.getElementById('level-value').textContent = game.level === 0 ? '0 (Обучение)' : game.level;
        document.getElementById('hud-xp').style.display = 'none';
    }
    
    const mineCount = game.player.inventory.filter(i => i.type === 'mine').length;
    document.getElementById('mines-value').textContent = mineCount;
    const weaponEl = document.getElementById('weapon-value');
    if (weaponEl) weaponEl.textContent = game.player.getWeapon().name;
}

function showWaveModifierBanner(mod) {
    const banner = document.getElementById('wave-modifier-banner');
    if (!banner) return;
    document.getElementById('wave-mod-icon').textContent = mod.icon;
    const nameEl = document.getElementById('wave-mod-name');
    nameEl.textContent = mod.name; nameEl.style.color = mod.color;
    document.getElementById('wave-mod-desc').textContent = mod.desc;
    banner.classList.remove('hidden'); banner.style.borderColor = mod.color;
    banner.style.boxShadow = `0 0 25px ${mod.color}, inset 0 0 15px rgba(255,255,255,0.05)`;
}

function hideWaveModifierBanner() {
    const banner = document.getElementById('wave-modifier-banner');
    if (banner) banner.classList.add('hidden');
}

function updatePauseStats() {
    if (!game.player) return;
    const weapon = game.player.getWeapon(); const totalDamage = weapon.damage + game.upgrades.damage * 2 + (game.player.extraDamage || 0);
    document.getElementById('stat-damage').textContent = totalDamage;
    document.getElementById('stat-hp').textContent = game.player.maxHp;
    document.getElementById('stat-speed').textContent = game.player.speed.toFixed(1);
}

function updateSoundButton() {
    const btn = document.getElementById('sound-btn'); if (!btn) return;
    if (soundEnabled) { btn.textContent = '🔊'; btn.classList.remove('muted'); btn.title = 'Выключить звук'; }
    else { btn.textContent = '🔇'; btn.classList.add('muted'); btn.title = 'Включить звук'; }
}

function hideAllOverlays() {
    document.getElementById('menu').classList.add('hidden'); 
    document.getElementById('level-complete').classList.add('hidden');
    document.getElementById('shop').classList.add('hidden'); 
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('victory').classList.add('hidden'); 
    document.getElementById('inventory-panel').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden'); 
    document.getElementById('tutorial-hint').classList.add('hidden');
    document.getElementById('devs-modal').classList.add('hidden');
    document.getElementById('new-game-menu').classList.add('hidden');
    document.getElementById('survival-levelup').classList.add('hidden');
    document.getElementById('survival-records-modal').classList.add('hidden');
	document.getElementById('loading-screen').classList.add('hidden');
    hideTutorialOverlay();
    hideWaveModifierBanner();
}

function startSurvival() {
    notifyGameReady();
    game.state = 'loading'; 
    document.getElementById('loading-screen').classList.remove('hidden');
    
    stopAllMusic();

    setTimeout(() => {
        game.mode = 'survival';
        game.wave = 1; game.level = 0; game.totalCoins = 0;
        game.upgrades = { damage: 0, maxhp: 0, speed: 0 };
        game.score = 0; game.xp = 0; game.xpTarget = 200; game.rewardAdUsedThisLevel = false;
        game.waveModifier = null; game.waveModifierActive = false; game.goldrushPenalty = 0;
        game.floatingTexts = []; game.heartbeatTimer = 0.5;
        game.combo = 0; game.comboTimer = 0; game.comboMax = 0; game.comboFlashTimer = 0;
        game.tutorial.active = false; game.tutorial.waitingFor = null; game.tutorial.waitStartPos = null;
        
        game.player = new Player(120, 120); game.player.ammo = 15; game.player.applyUpgrades(true);
		if (game.terminalUnlocks['alien_rifle'] && !game.player.ownedWeapons.includes('alien_rifle')) {
            game.player.ownedWeapons.push('alien_rifle');
        }
		game.alienShieldHp = 200; // Восстанавливаем щит

        if (game.terminalUnlocks['startShotgun'] && !game.player.ownedWeapons.includes('shotgun')) game.player.ownedWeapons.push('shotgun');
               // Выдача стартовых мин (учитываем уровень прокачки)
        const startMinesCount = game.terminalUpgrades['startMines'] || 0;
        for (let i = 0; i < startMinesCount; i++) {
            game.player.inventory.push({ type: 'mine', name: 'Мина', icon: '💣' });
        }
		
		        // Восстанавливаем энергощит
        const equippedShield = game.equippedImplants.find(id => id && IMPLANTS_CONFIG[id] && IMPLANTS_CONFIG[id].type === 'shield');
        if (equippedShield) {
            game.implantShieldHp = IMPLANTS_CONFIG[equippedShield].maxShieldHp;
        } else {
            game.implantShieldHp = 0;
        }
        
        generateLevel(20); game.enemies = []; spawnSurvivalWave();
        
        hideAllOverlays();
		 if (isMobile) {
            document.getElementById('joystick-container').classList.remove('hidden');
            document.getElementById('shoot-joystick-container').classList.remove('hidden');
            document.getElementById('inv-btn-mobile').classList.remove('hidden');
            document.getElementById('menu-btn-mobile').classList.remove('hidden');
			document.getElementById('implant-btn-mobile').classList.remove('hidden');
        }
        game.state = 'playing';
        game.keys = {}; game.mouseDown = false; joystickActive = false; joystickVector = {x:0, y:0};
        updateHUD(); playSound(700, 0.2, 'sine');
        
        playSurvivalMusic(); 
    }, 1500);
}

function launchGame(level, isNewGame = false) {
    notifyGameReady();
    game.state = 'loading'; 
    document.getElementById('loading-screen').classList.remove('hidden');
    
    stopAllMusic();
    
    setTimeout(() => {
        game.mode = 'campaign'; game.xp = 0;
        let s = game.savedProgress || {};
        try { const local = localStorage.getItem('monster_shot_save'); if (local) s = JSON.parse(local); } catch(e) {}
        let weapons = ['pistol'];
        if (game.player && game.player.ownedWeapons) weapons = game.player.ownedWeapons.slice();
        else if (s.ownedWeapons) weapons = s.ownedWeapons.slice();
        if (!weapons.includes('pistol')) weapons.push('pistol');
        game.level = level;
        
        if (isNewGame || level === 0) { game.totalCoins = 0; game.upgrades = { damage: 0, maxhp: 0, speed: 0 }; }
        else { game.totalCoins = s.totalCoins || 0; game.upgrades = s.upgrades || { damage: 0, maxhp: 0, speed: 0 }; }
        
        game.score = 0; game.weaponHintSeen = s.weaponHintSeen || false;
		game.chipsEarnedThisRun = isNewGame ? {} : (s.chipsEarnedThisRun || {});
        game.tutorial.active = (level === 0); game.tutorial.step = 0; game.tutorial.weaponHintActive = false; game.tutorial.waitingFor = null; game.tutorial.waitStartPos = null;
        game.combo = 0; game.comboTimer = 0; game.comboMax = 0; game.comboFlashTimer = 0;
        
        game.player = new Player(120, 120); game.player.ammo = 15; game.player.ownedWeapons = weapons; 
		game.alienShieldHp = 200;
        if (game.terminalUnlocks['startShotgun'] && !game.player.ownedWeapons.includes('shotgun')) game.player.ownedWeapons.push('shotgun');
                // Выдача стартовых мин (учитываем уровень прокачки)
        const startMinesCount = game.terminalUpgrades['startMines'] || 0;
        for (let i = 0; i < startMinesCount; i++) {
            game.player.inventory.push({ type: 'mine', name: 'Мина', icon: '💣' });
        }
		
		        // Восстанавливаем энергощит
        const equippedShield = game.equippedImplants.find(id => id && IMPLANTS_CONFIG[id] && IMPLANTS_CONFIG[id].type === 'shield');
        if (equippedShield) {
            game.implantShieldHp = IMPLANTS_CONFIG[equippedShield].maxShieldHp;
        } else {
            game.implantShieldHp = 0;
        }

         game.player.setWeapon((s.currentWeapon && weapons.includes(s.currentWeapon)) ? s.currentWeapon : 'pistol'); 
		if (game.terminalUnlocks['alien_rifle'] && !game.player.ownedWeapons.includes('alien_rifle')) {
            game.player.ownedWeapons.push('alien_rifle');
        }
        game.player.applyUpgrades(true);
        
        generateLevel(game.level); 
		hideAllOverlays();
		// Включаем мобильное управление только в игре
        if (isMobile) {
            document.getElementById('joystick-container').classList.remove('hidden');
            document.getElementById('shoot-joystick-container').classList.remove('hidden');
            document.getElementById('inv-btn-mobile').classList.remove('hidden');
            document.getElementById('menu-btn-mobile').classList.remove('hidden');
			document.getElementById('implant-btn-mobile').classList.remove('hidden');
        }
		game.state = 'playing'; 
        game.keys = {}; game.mouseDown = false; joystickActive = false; joystickVector = {x:0, y:0};
        
        updateHUD(); playSound(700, 0.2, 'sine');
		pickRandomBattleTrack(); playBattleMusic(); 

        if (game.level === 0 && game.tutorial.active) startTutorial();
    }, 1500);
}

function pauseGame() {
    if (game.state !== 'playing') return;
    game.state = 'paused'; game.mouseDown = false; game.keys = {}; joystickActive = false; joystickVector = {x:0, y:0}; updatePauseStats();
    document.getElementById('pause').classList.remove('hidden'); playSound(600, 0.1, 'sine'); saveProgress(true);
	
    stopAllMusic();
}

function resumeGame() {
    if (game.state !== 'paused') return;
    game.state = 'playing'; document.getElementById('pause').classList.add('hidden'); playSound(800, 0.1, 'sine');
	if (game.mode === 'survival') {
        playSurvivalMusic();
    } else {
        const bossPresent = game.enemies && game.enemies.some(e => e.isBoss || e.isMegaBoss || e.isGhostBoss || e.isSuperMother);
        if (bossPresent) playBossMusic();
        else playBattleMusic();
    }
}

function togglePause() { if (game.state === 'playing') pauseGame(); else if (game.state === 'paused') resumeGame(); }

function returnToMenu() {
    game.state = 'menu'; game.keys = {}; game.mouseDown = false; saveProgress(true);
    game.enemies = []; game.bullets = []; game.enemyBullets = []; game.arrows = []; game.particles = []; game.coins = [];
    game.healPacks = []; game.ammoPacks = []; game.minePacks = []; game.weaponPacks = []; game.mines = []; game.acidPools = [];
    game.explosions = []; game.barrels = []; game.fires = []; game.walls = []; game.player = null;
    game.floatingTexts = []; game.waveModifier = null; game.waveModifierActive = false; game.goldrushPenalty = 0;
    game.combo = 0; game.comboTimer = 0; game.comboFlashTimer = 0;
    game.tutorial.active = false; game.tutorial.waitingFor = null; game.tutorial.waitStartPos = null;
    hideAllOverlays(); 
	document.getElementById('menu').classList.remove('hidden');
	
    stopAllMusic();
	pauseWinMusic();
	playMenuMusic(); 
	
	
     menuEntities = []; menuPlayer = null;
	// Возвращаем кнопки уровня на место
    document.getElementById('shop-open-btn').style.display = 'inline-block';
    document.getElementById('menu-from-level-btn').classList.remove('btn-primary');
    document.getElementById('menu-from-level-btn').classList.add('btn-secondary');
    
    // Прячем мобильные кнопки при выходе в меню
    if (isMobile) {
        document.getElementById('joystick-container').classList.add('hidden');
        document.getElementById('shoot-joystick-container').classList.add('hidden');
        document.getElementById('inv-btn-mobile').classList.add('hidden');
        document.getElementById('menu-btn-mobile').classList.add('hidden');
        document.getElementById('implant-btn-mobile').classList.add('hidden');
    }
}

function levelComplete() {
    trackEvent('Level_Complete', { coins: game.totalCoins, score: game.score });
    if (game.state !== 'playing') return;
    if (game.mode === 'survival') return;
    
    // Если это туториал, мы не идем в магазин и не увеличиваем уровень
    const isTutorial = (game.level === 0);

    if (isTutorial) {
        game.tutorial.active = false;
        hideTutorialOverlay();
        game.state = 'levelComplete'; game.keys = {}; game.mouseDown = false;
        document.querySelector('#level-complete h1').textContent = 'ОБУЧЕНИЕ ПРОЙДЕНО!';
        document.getElementById('level-stats').innerHTML = 'Теперь ты готов к настоящей охоте!';
        
        // Прячем кнопку магазина и показываем "В меню"
        document.getElementById('shop-open-btn').style.display = 'none';
        document.getElementById('menu-from-level-btn').classList.remove('btn-secondary');
        document.getElementById('menu-from-level-btn').classList.add('btn-primary');
        document.getElementById('level-complete').classList.remove('hidden');
        return;
    }

    // --- Обычное прохождение уровня (кампания) ---
    const levelKey = 'level_' + game.level;
    if (!game.chipsEarnedThisRun[levelKey]) {
        addChips(1, 'level_complete');
        game.chipsEarnedThisRun[levelKey] = true;
    }

    game.state = 'levelComplete'; game.keys = {}; game.mouseDown = false; 
    game.level++; saveProgress(true); 
    
    document.querySelector('#level-complete h1').textContent = 'УРОВЕНЬ ПРОЙДЕН!';
    document.getElementById('level-stats').innerHTML = `Собрано монет: ${game.totalCoins}<br>Очки: ${game.score}`;
    
    // Возвращаем кнопки для обычных уровней
    document.getElementById('shop-open-btn').style.display = 'inline-block';
    document.getElementById('menu-from-level-btn').classList.remove('btn-primary');
    document.getElementById('menu-from-level-btn').classList.add('btn-secondary');
    
    pauseBattleMusic();
    document.getElementById('level-complete').classList.remove('hidden'); 
}

function nextLevel() {
    if (nextLevelLock) return; nextLevelLock = true;
    showFullscreenAd(() => {
		game.state = 'loading'; 
        document.getElementById('loading-screen').classList.remove('hidden');
        
        stopAllMusic();

        setTimeout(() => {
            game.tutorial.active = false; 
            game.player.hp = Math.min(game.player.maxHp, game.player.hp + 20);
			if (game.terminalUnlocks['alien_rifle'] && !game.player.ownedWeapons.includes('alien_rifle')) {
                game.player.ownedWeapons.push('alien_rifle');
            }
			game.alienShieldHp = 200; 
			            // Восстанавливаем энергощит
            const equippedShield = game.equippedImplants.find(id => id && IMPLANTS_CONFIG[id] && IMPLANTS_CONFIG[id].type === 'shield');
            if (equippedShield) {
                game.implantShieldHp = IMPLANTS_CONFIG[equippedShield].maxShieldHp;
            } else {
                game.implantShieldHp = 0;
            }
            generateLevel(game.level); 
            hideAllOverlays(); game.state = 'playing'; game.keys = {}; game.mouseDown = false;
            
            updateHUD(); saveProgress(true); nextLevelLock = false;
			
            pickRandomBattleTrack(); 
            playBattleMusic(); 
        }, 1500);
    });
}

function restartLevel() {
    if (game.mode === 'survival') { startSurvival(); return; }
    
    game.state = 'loading'; 
    document.getElementById('loading-screen').classList.remove('hidden');
    pauseWinMusic();
    stopAllMusic();

    setTimeout(() => {
        const savedWeapons = game.player && game.player.ownedWeapons ? game.player.ownedWeapons.slice() : ['pistol'];
        const savedCurrent = game.player && game.player.currentWeapon ? game.player.currentWeapon : 'pistol';
        game.tutorial.active = (game.level === 0); game.tutorial.step = 0; game.tutorial.weaponHintActive = false; game.tutorial.waitingFor = null; game.tutorial.waitStartPos = null;
        game.combo = 0; game.comboTimer = 0; game.comboMax = 0; game.comboFlashTimer = 0;
        game.player = new Player(120, 120); game.player.ownedWeapons = savedWeapons;  game.player.setWeapon(savedCurrent);
		if (game.terminalUnlocks['alien_rifle'] && !game.player.ownedWeapons.includes('alien_rifle')) {
            game.player.ownedWeapons.push('alien_rifle');
        }
        game.player.ammo = 15; game.player.inventory = []; game.player.applyUpgrades(true);
		game.alienShieldHp = 200;
		        // Выдача стартовых мин (учитываем уровень прокачки)
        const startMinesCount = game.terminalUpgrades['startMines'] || 0;
        for (let i = 0; i < startMinesCount; i++) {
            game.player.inventory.push({ type: 'mine', name: 'Мина', icon: '💣' });
        }
        
		// Восстанавливаем энергощит
        const equippedShield = game.equippedImplants.find(id => id && IMPLANTS_CONFIG[id] && IMPLANTS_CONFIG[id].type === 'shield');
        if (equippedShield) {
            game.implantShieldHp = IMPLANTS_CONFIG[equippedShield].maxShieldHp;
        } else {
            game.implantShieldHp = 0;
        }
		
        generateLevel(game.level); hideAllOverlays(); game.state = 'playing'; 
        game.keys = {}; game.mouseDown = false; joystickActive = false; joystickVector = {x:0, y:0};
        
        updateHUD(); saveProgress(true);
        
        if (game.level === 0 && game.tutorial.active) startTutorial();
		
        pickRandomBattleTrack(); playBattleMusic(); 
    }, 1500);
}

function gameOver() {
    trackEvent('Player_Die', { score: game.score, coins: game.totalCoins });
    if (game.state === 'gameOver') return;

    if (game.tutorial.active) { game.tutorial.active = false; hideTutorialOverlay(); }

    game.state = 'gameOver'; game.keys = {}; game.mouseDown = false; joystickActive = false; joystickVector = {x:0, y:0}; saveProgress(true);
    saveHighScore(game.score); hideWaveModifierBanner(); game.combo = 0; game.comboTimer = 0; game.comboFlashTimer = 0;
    
    if (game.mode === 'survival') {
        let isNewWaveRecord = false; let isNewScoreRecord = false;
        if (game.wave > game.survivalHighWave) { game.survivalHighWave = game.wave; isNewWaveRecord = true; saveSurvivalWave(game.survivalHighWave); addChips(5, 'survival_record'); }
		
        if (game.score > game.survivalHighScore) { game.survivalHighScore = game.score; isNewScoreRecord = true; saveSurvivalScore(game.survivalHighScore); }

        let recordMsg = '';
        if (isNewWaveRecord) recordMsg = '<div style="color:#ffcc00;font-weight:bold;margin-top:8px;font-size:20px;">🏆 НОВЫЙ РЕКОРД ВОЛНЫ!</div>';
        else if (isNewScoreRecord) recordMsg = '<div style="color:#ffcc00;font-weight:bold;margin-top:8px;font-size:20px;">🏆 НОВЫЙ РЕКОРД СЧЁТА!</div>';

        const comboLine = game.comboMax >= 5 ? `<div style="color:#ffcc00;margin-top:6px;">🔥 Лучшее комбо: <b>${game.comboMax}</b> (x${getComboMultiplier(game.comboMax).toFixed(1)})</div>` : '';
        document.getElementById('game-over-stats').innerHTML = 
            `Достигнута волна: <b>${game.wave}</b><br>` +
            `Лучший результат: <b style="color:#ffcc00;">волна ${game.survivalHighWave}</b><br>` +
            `Монет собрано: ${game.totalCoins}<br>` +
            `Очки: ${game.score}` + comboLine + recordMsg;
    } else {
        const comboLine = game.comboMax >= 5 ? `<div style="color:#ffcc00;margin-top:6px;">🔥 Лучшее комбо: <b>${game.comboMax}</b> (x${getComboMultiplier(game.comboMax).toFixed(1)})</div>` : '';
        document.getElementById('game-over-stats').innerHTML = `Достигнут уровень: ${game.level}<br>Монет собрано: ${game.totalCoins}<br>Очки: ${game.score}` + comboLine;
    }
    
    document.getElementById('game-over').classList.remove('hidden'); playSound(100, 0.5, 'sawtooth');
	stopAllMusic();
}

function victory() {
    if (game.state === 'victory') return;

    if (typeof battleTracks !== 'undefined') {
        battleTracks.forEach(track => {
            if (track) { track.pause(); track.currentTime = 0; }
        });
    }
    if (typeof bgmBoss !== 'undefined' && bgmBoss) {
        bgmBoss.pause(); bgmBoss.currentTime = 0;
    }
    if (typeof bgmSurvival !== 'undefined' && bgmSurvival) {
        bgmSurvival.pause(); bgmSurvival.currentTime = 0;
    }
    if (typeof bgmMenu !== 'undefined' && bgmMenu) {
        bgmMenu.pause(); bgmMenu.currentTime = 0;
    }

    playWinMusic();

    game.state = 'victory';
    game.keys = {};
    game.mouseDown = false;
    joystickActive = false;
    joystickVector = {x:0, y:0};

    saveHighScore(game.score);
    game.level = 0;
    game.totalCoins = 0;
    game.upgrades = { damage: 0, maxhp: 0, speed: 0 };
    saveProgress(true);
    game.chipsEarnedThisRun = {};

    document.getElementById('victory-stats').innerHTML =
        `Монет собрано: ${game.totalCoins}<br>Очки: ${game.score}`;
    document.getElementById('victory').classList.remove('hidden');

    playSound(1000, 0.3, 'sine');
    setTimeout(() => playSound(1200, 0.3, 'sine'), 200);
    setTimeout(() => playSound(1500, 0.5, 'sine'), 400);
}

function openShop() {
    trackEvent('Shop_Opened');
    if (game.state !== 'levelComplete') return;
	
    stopAllMusic();
    playShopMusic();    
	
    game.state = 'shop'; renderShop();
    document.getElementById('shop').classList.remove('hidden'); document.getElementById('level-complete').classList.add('hidden'); playSound(800, 0.15, 'sine');
}

function renderShop() {
    document.getElementById('shop-coins-value').textContent = game.totalCoins;
    const container = document.getElementById('shop-items'); container.innerHTML = '';
    
    SHOP_ITEMS.forEach(item => {
        const el = document.createElement('div'); el.className = 'shop-item';
        const canAfford = game.totalCoins >= SHOP_PRICE; const currentLevel = game.upgrades[item.id];
        let priceHtml = `<span class="shop-price">💰 ${SHOP_PRICE}</span>`;
        
        if (!canAfford && !game.rewardAdUsedThisLevel) { priceHtml = `<span class="ad-btn" id="ad-btn-${item.id}">📺 Смотреть</span>`; } 
        else if (!canAfford) { el.classList.add('disabled'); }

        el.innerHTML = `
            <span class="shop-icon">${item.icon}</span>
            <div class="shop-info"><span class="shop-name">${item.name}</span><span class="shop-desc">${item.desc} (куплено: ${currentLevel})</span></div>
            ${priceHtml}
        `;

        if (canAfford) { el.addEventListener('click', () => buyUpgrade(item.id)); } 
        else if (!game.rewardAdUsedThisLevel) {
            const adBtn = el.querySelector(`#ad-btn-${item.id}`);
            if (adBtn) { adBtn.addEventListener('click', (e) => { e.stopPropagation(); useAdForUpgrade(item.id); }); }
        }
        container.appendChild(el);
    });

    if (game.level >= 4) {
        const hasShotgun = game.player.ownedWeapons.includes('shotgun');
        const el = document.createElement('div'); el.className = 'shop-item';
        if (hasShotgun) { el.classList.add('maxed'); el.innerHTML = `<span class="shop-icon">💥</span><div class="shop-info"><span class="shop-name">Дробовик</span><span class="shop-desc">Уже куплено</span></div><span class="shop-price">✔</span>`; } 
        else {
            if (game.totalCoins < SHOTGUN_PRICE) el.classList.add('disabled');
            el.innerHTML = `<span class="shop-icon">💥</span><div class="shop-info"><span class="shop-name">Дробовик</span><span class="shop-desc">Мощное оружие для ближнего боя</span></div><span class="shop-price">💰 ${SHOTGUN_PRICE}</span>`;
            if (game.totalCoins >= SHOTGUN_PRICE) { el.addEventListener('click', () => { game.totalCoins -= SHOTGUN_PRICE; game.player.ownedWeapons.push('shotgun'); game.player.ownedWeapons.push('shotgun'); game.player.setWeapon('shotgun'); playSound(1000, 0.2, 'sine'); updateHUD(); saveProgress(true); renderShop(); }); }
        }
        container.appendChild(el);
    }

    if (game.level >= 15) {
        const hasSniper = game.player.ownedWeapons.includes('sniper');
        const el = document.createElement('div'); el.className = 'shop-item';
        if (hasSniper) { el.classList.add('maxed'); el.innerHTML = `<span class="shop-icon">🎯</span><div class="shop-info"><span class="shop-name">Снайперка</span><span class="shop-desc">Уже куплено</span></div><span class="shop-price">✔</span>`; } 
        else {
            if (game.totalCoins < SNIPER_PRICE) el.classList.add('disabled');
            el.innerHTML = `<span class="shop-icon">🎯</span><div class="shop-info"><span class="shop-name">Снайперка</span><span class="shop-desc">Огромный урон, пробивает насквозь</span></div><span class="shop-price">💰 ${SNIPER_PRICE}</span>`;
            if (game.totalCoins >= SNIPER_PRICE) { el.addEventListener('click', () => { game.totalCoins -= SNIPER_PRICE; game.player.ownedWeapons.push('sniper'); game.player.ownedWeapons.push('sniper'); game.player.setWeapon('sniper'); playSound(1000, 0.2, 'sine'); updateHUD(); saveProgress(true); renderShop(); }); }
        }
        container.appendChild(el);
    }

    const mineCount = game.player.inventory.filter(i => i.type === 'mine').length;
    const sellEl = document.createElement('div'); sellEl.className = 'shop-item sell';
    if (mineCount === 0) { sellEl.classList.add('disabled'); sellEl.innerHTML = `<span class="shop-icon">💣</span><div class="shop-info"><span class="shop-name">Продать мину</span><span class="shop-desc">У вас нет мин для продажи</span></div><span class="shop-price">+💰 ${MINE_SELL_PRICE}</span>`; } 
    else { sellEl.innerHTML = `<span class="shop-icon">💣</span><div class="shop-info"><span class="shop-name">Продать мину</span><span class="shop-desc">У вас мин: ${mineCount}. Кликните, чтобы продать одну</span></div><span class="shop-price">+💰 ${MINE_SELL_PRICE}</span>`; sellEl.addEventListener('click', () => sellMine()); }
    container.appendChild(sellEl);
}

function useAdForUpgrade(id) {
    if (game.rewardAdUsedThisLevel) return;
    showRewardedAd(
        () => {
            trackEvent('Ad_Watched', { context: 'shop_upgrade', item: id });
            game.upgrades[id]++; game.player.applyUpgrades(false); if (id === 'maxhp') game.player.hp += 10;
            playSound(1000, 0.15, 'sine'); updateHUD(); renderShop(); saveProgress(true);
        },
        () => { alert('Реклама недоступна или была закрыта.'); }
    );
}

function buyUpgrade(id) {
    trackEvent('Shop_Buy', { item: id, price: SHOP_PRICE });
    if (game.totalCoins < SHOP_PRICE) return; if (!(id in game.upgrades)) return;
    game.totalCoins -= SHOP_PRICE; game.upgrades[id]++; game.player.applyUpgrades(false); if (id === 'maxhp') game.player.hp += 10;
    playSound(1000, 0.15, 'sine'); updateHUD(); renderShop(); saveProgress(true);
}

function sellMine() {
    const idx = game.player.inventory.findIndex(i => i.type === 'mine'); if (idx === -1) return;
    game.player.inventory.splice(idx, 1); game.totalCoins += MINE_SELL_PRICE;
    playSound(900, 0.15, 'sine'); updateHUD(); renderShop(); saveProgress(true);
}

function openInventory() { if (game.state !== 'playing') return; game.state = 'inventory'; game.mouseDown = false; joystickActive = false; joystickVector = {x:0, y:0}; renderInventory(); document.getElementById('inventory-panel').classList.remove('hidden'); }
function closeInventory() { if (game.state !== 'inventory') return; game.state = 'playing'; document.getElementById('inventory-panel').classList.add('hidden'); }
function toggleInventory() { if (game.state === 'playing') openInventory(); else if (game.state === 'inventory') closeInventory(); }

function renderInventory() {
    const container = document.getElementById('inventory-items'); const displayItems = [];
    game.player.ownedWeapons.forEach(wid => { const w = WEAPONS[wid]; displayItems.push({ type: 'weapon', weaponId: wid, name: w.name + (game.player.currentWeapon === wid ? ' (в руках)' : ''), icon: w.icon }); });
    const mineCount = game.player.inventory.filter(i => i.type === 'mine').length;
    if (mineCount > 0) displayItems.push({ type: 'mine_stack', name: `Мина`, count: mineCount, icon: '💣' });
    if (displayItems.length === 0) { container.innerHTML = '<div class="inv-empty">Пусто</div>'; return; }
    
    container.innerHTML = '';
    displayItems.forEach((item) => {
        const el = document.createElement('div'); el.className = 'inv-item';
        if (item.type === 'weapon' && game.player.currentWeapon === item.weaponId) el.classList.add('active');
        
        let actionText = ''; 
        if (item.type === 'weapon') actionText = game.player.currentWeapon === item.weaponId ? 'Выбрано' : 'Взять'; 
        else if (item.type === 'mine_stack') actionText = `Установить (х${item.count})`;
        
        el.innerHTML = `<span class="item-icon">${item.icon || '📦'}</span><span class="item-name">${item.name} ${item.count ? '(x' + item.count + ')' : ''}</span><span class="item-action">${actionText}</span>`;
        
        el.addEventListener('click', () => {
			if (item.type === 'weapon') {
				game.player.setWeapon(item.weaponId);
				playSound(500, 0.1, 'square');
				updateHUD();
				renderInventory();
			} else if (item.type === 'mine_stack') {
				const mineItem = game.player.inventory.find(i => i.type === 'mine');
				if (mineItem && placeMine(mineItem)) {
					if (game.player.inventory.filter(i => i.type === 'mine').length > 0) {
						renderInventory();
					} else {
						closeInventory();
					}
				} else {
					playSound(180, 0.15, 'square');
				}
			}
		});
        
		container.appendChild(el);
    });
}

function useInventoryItem(index) {
    if (game.state !== 'inventory') return; const item = game.player.inventory[index]; if (!item) return;
    if (item.type === 'mine') { 
        const ok = placeMine(item); 
        if (ok) { playSound(400, 0.15, 'square'); if (game.player.inventory.filter(i => i.type === 'mine').length > 0) renderInventory(); else closeInventory(); } 
        else { playSound(180, 0.15, 'square'); }
    }
}

function triggerSurvivalLevelUp() {
    game.state = 'survival_levelup'; game.levelupPicksLeft = 1; game.levelupAdUsed = false; game.rewardAdUsedThisLevel = false;
    const pool = [
        { id: 'damage', icon: '🔫', name: 'Урон +2', desc: 'Увеличить урон пуль' },
        { id: 'speed', icon: '⚡', name: 'Скорость +5%', desc: 'Быстрее передвигаться' },
        { id: 'maxhp', icon: '❤', name: 'Здоровье +10', desc: 'Увеличить макс. HP' },
        { id: 'heal', icon: '💊', name: 'Лечение', desc: 'Восстановить 50 HP' },
        { id: 'ammo', icon: '📦', name: 'Патроны', desc: 'Полный боезапас' }
    ];
    if (!game.player.ownedWeapons.includes('shotgun')) pool.push({ id: 'shotgun', icon: '💥', name: 'Дробовик', desc: 'Мощное оружие' });
    if (!game.player.ownedWeapons.includes('sniper')) pool.push({ id: 'sniper', icon: '🎯', name: 'Снайперка', desc: 'Пробивает насквозь' });
    game.currentCards = []; const available = [...pool];
    for (let i = 0; i < 3; i++) { if (available.length === 0) break; const idx = Math.floor(Math.random() * available.length); game.currentCards.push(available.splice(idx, 1)[0]); }
    renderLevelUpCards(); document.getElementById('survival-levelup').classList.remove('hidden');
    document.getElementById('levelup-ad-btn').style.display = 'inline-block'; document.getElementById('levelup-ad-btn').disabled = false;
    playSound(1000, 0.3, 'sine');
}

function renderLevelUpCards() {
    const container = document.getElementById('levelup-cards'); container.innerHTML = '';
    game.currentCards.forEach((card) => {
        const el = document.createElement('div'); el.className = 'levelup-card';
        if (game.levelupPicksLeft === 0) el.classList.add('disabled');
        el.innerHTML = `<span class="card-icon">${card.icon}</span><span class="card-name">${card.name}</span><span class="card-desc">${card.desc}</span>`;
        el.addEventListener('click', () => {
            if (game.levelupPicksLeft <= 0) return;
            document.querySelectorAll('.levelup-card').forEach(c => c.classList.add('disabled'));
            applyCard(card.id); game.levelupPicksLeft--;
            if (game.levelupPicksLeft === 0 || game.levelupAdUsed) document.getElementById('levelup-ad-btn').style.display = 'none';
        });
        container.appendChild(el);
    });
}

function applyCard(id) {
    if (id === 'damage') game.upgrades.damage++;
    else if (id === 'speed') game.upgrades.speed++;
    else if (id === 'maxhp') game.upgrades.maxhp++;
    else if (id === 'heal') game.player.hp = Math.min(game.player.maxHp, game.player.hp + 50);
    else if (id === 'ammo') game.player.ammo = game.player.maxAmmo;
    else if (id === 'shotgun') game.player.ownedWeapons.push('shotgun');
    else if (id === 'sniper') game.player.ownedWeapons.push('sniper');
    game.player.applyUpgrades(false); if (id === 'maxhp') game.player.hp += 10;
    playSound(1000, 0.15, 'sine'); updateHUD();
}

function showSurvivalRecords() {
    document.getElementById('rec-wave').textContent = game.survivalHighWave;
    document.getElementById('rec-score').textContent = game.survivalHighScore;
    document.getElementById('survival-records-modal').classList.remove('hidden');
    playSound(800, 0.15, 'sine');
}

function showSurvivalLeaderboard() {
    if (!vkAvailable || !window.vkBridge) { alert('Таблица рекордов доступна только в приложении VK!'); return; }
    window.vkBridge.send('VKWebAppShowLeaderBoardBox', { user_result: game.survivalHighWave }).catch(e => {});
}

let _tutOverlay, _tutDark, _tutSpotlight, _tutPointer, _tutBox;
let _tutTitle, _tutText, _tutNextBtn, _tutSkipBtn, _tutKeyHint;

function initTutorialUI() {
    _tutOverlay = document.getElementById('tutorial-overlay'); _tutDark = document.getElementById('tutorial-dark');
    _tutSpotlight = document.getElementById('tutorial-spotlight'); _tutPointer = document.getElementById('tutorial-pointer');
    _tutBox = document.getElementById('tutorial-box'); _tutTitle = document.getElementById('tutorial-step-title');
    _tutText = document.getElementById('tutorial-step-text'); _tutNextBtn = document.getElementById('tutorial-next-btn');
    _tutSkipBtn = document.getElementById('tutorial-skip-btn'); _tutKeyHint = document.getElementById('tutorial-keyhint');
    if (_tutNextBtn) _tutNextBtn.addEventListener('click', onTutorialNextClick);
    if (_tutSkipBtn) _tutSkipBtn.addEventListener('click', onTutorialSkipClick);
}

function startTutorial() {
    if (!_tutOverlay) initTutorialUI();
    game.tutorial.active = true; game.tutorial.step = 0; game.tutorial.waitingFor = null; game.tutorial.waitStartPos = null;
    showTutorialStep(0);
}

function showTutorialStep(index) {
    if (!game.tutorial.active) return; if (index >= TUTORIAL_STEPS.length) { endTutorial(); return; }
    const step = TUTORIAL_STEPS[index];
    if (index > 0 && game.tutorial.step !== index) trackEvent('Tutorial_Step', { step_id: step.id });
    game.tutorial.step = index; game.tutorial.waitingFor = step.waitFor || null;
    if (_tutTitle) _tutTitle.textContent = step.title; if (_tutText) _tutText.innerHTML = step.text;
    if (_tutKeyHint) { if (step.keyHint) { _tutKeyHint.textContent = step.keyHint; _tutKeyHint.classList.remove('hidden'); } else _tutKeyHint.classList.add('hidden'); }
    if (step.mode === 'info') {
        if (_tutNextBtn) { _tutNextBtn.style.display = 'inline-block'; _tutNextBtn.textContent = (index === TUTORIAL_STEPS.length - 1) ? 'В БОЙ' : 'ДАЛЕЕ'; }
        game.state = 'tutorial'; game.mouseDown = false; game.keys = {};
    } else {
        if (_tutNextBtn) _tutNextBtn.style.display = 'none'; if (game.state === 'tutorial') game.state = 'playing';
    }
    if (step.waitFor && step.waitFor.indexOf('move-') === 0 && game.player) game.tutorial.waitStartPos = { x: game.player.x, y: game.player.y };
    else game.tutorial.waitStartPos = null;

    if (step.id === 'kill' && game.enemies.length === 0 && game.player) {
        const offsets = [[150, 0], [-150, 0], [0, 150], [0, -150], [120, 120], [-120, 120], [120, -120], [-120, -120]];
        let spawned = false;
        for (const [ox, oy] of offsets) {
            const x = game.player.x + ox; const y = game.player.y + oy;
            if (x < 60 || x > game.mapW - 60 || y < 60 || y > game.mapH - 60) continue;
            let blocked = false;
            for (const w of game.walls) { if (x + 20 > w.x && x - 20 < w.x + w.w && y + 20 > w.y && y - 20 < w.y + w.h) { blocked = true; break; } }
            if (!blocked) { game.enemies.push(new Enemy(x, y, 'weak')); spawned = true; break; }
        }
        if (!spawned) game.enemies.push(new Enemy(500, 250, 'weak'));
    }
    if (_tutSkipBtn) _tutSkipBtn.style.display = 'inline-block'; if (_tutOverlay) _tutOverlay.classList.remove('hidden');
    updateTutorialSpotlight(step); updateTutorialPointer(step);
}

function updateTutorialSpotlight(step) {
    if (!_tutSpotlight || !_tutDark) return;
    const rect = getTutorialTargetRect(step ? step.target : null); const hasCanvas = step && step.canvasSpotlight;
    if (hasCanvas) _tutDark.classList.add('hidden');
    else if (!rect) { _tutDark.classList.remove('hidden'); _tutSpotlight.style.display = 'none'; return; } 
    else _tutDark.classList.add('hidden');
    if (rect) { _tutSpotlight.style.display = 'block'; _tutSpotlight.style.left = (rect.left - 6) + 'px'; _tutSpotlight.style.top = (rect.top - 6) + 'px'; _tutSpotlight.style.width = (rect.width + 12) + 'px'; _tutSpotlight.style.height = (rect.height + 12) + 'px'; } 
    else _tutSpotlight.style.display = 'none';
}

function updateTutorialPointer(step) {
    if (!_tutPointer) return;
    if (!step || !step.arrowDir || !step.target) { _tutPointer.style.display = 'none'; return; }
    const rect = getTutorialTargetRect(step.target); if (!rect) { _tutPointer.style.display = 'none'; return; }
    _tutPointer.style.display = 'block'; _tutPointer.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    if (step.arrowDir === 'up') { _tutPointer.style.top = (rect.top + rect.height + 15) + 'px'; _tutPointer.textContent = '▲'; _tutPointer.style.animation = 'tutorial-arrow-bounce-up 1s ease-in-out infinite'; } 
    else if (step.arrowDir === 'down') { _tutPointer.style.top = (rect.top - 50) + 'px'; _tutPointer.textContent = '▼'; _tutPointer.style.animation = 'tutorial-arrow-bounce-down 1s ease-in-out infinite'; }
}

function getTutorialTargetRect(target) {
    if (!target) return null;
    if (target === 'joystick-move-if-mobile') { if (!isMobile) return null; target = 'joystick-move'; }
    if (target === 'joystick-shoot-if-mobile') { if (!isMobile) return null; target = 'joystick-shoot'; }
    if (target === 'minimap') { const size = isMobile ? 110 : 150; const pad = 15; return { left: W - size - pad, top: H - size - pad, width: size, height: size }; }
    if (target === 'joystick-move') { const el = document.getElementById('joystick-container'); if (!el || el.classList.contains('hidden')) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
    if (target === 'joystick-shoot') { const el = document.getElementById('shoot-joystick-container'); if (!el || el.classList.contains('hidden')) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
    const el = document.querySelector(target); if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function tickTutorial() {
    if (!game.tutorial.active) return; const step = TUTORIAL_STEPS[game.tutorial.step]; if (!step) return;
    if (step.mode === 'wait') { updateTutorialSpotlight(step); updateTutorialPointer(step); checkTutorialWait(step); }
}

function checkTutorialWait(step) {
    const w = step.waitFor; let satisfied = false;
    if (w === 'move-up') { const sp = game.tutorial.waitStartPos; satisfied = sp && game.player.y < sp.y - 15; } 
    else if (w === 'move-down') { const sp = game.tutorial.waitStartPos; satisfied = sp && game.player.y > sp.y + 15; } 
    else if (w === 'move-left') { const sp = game.tutorial.waitStartPos; satisfied = sp && game.player.x < sp.x - 15; } 
    else if (w === 'move-right') { const sp = game.tutorial.waitStartPos; satisfied = sp && game.player.x > sp.x + 15; } 
    else if (w === 'shoot') { satisfied = game.mouseDown || (typeof shootJoystickActive !== 'undefined' && shootJoystickActive); }
    else if (w === 'reload') { 
        satisfied = game.player.lastShotTime > 0 && !game.player.isReloading; 
    }
	else if (w === 'mine') { satisfied = game.player && game.player.inventory.some(i => i.type === 'mine'); } 
    else if (w === 'inventory') { satisfied = game.state === 'inventory'; } 
    else if (w === 'place_mine') { satisfied = game.mines.length > 0 && game.state !== 'inventory'; } 
    else if (w === 'kill') { satisfied = game.enemies.length === 0; }
    if (satisfied) advanceTutorialStep();
}

function advanceTutorialStep() { const next = game.tutorial.step + 1; if (next >= TUTORIAL_STEPS.length) endTutorial(); else showTutorialStep(next); }
function onTutorialNextClick() { const step = TUTORIAL_STEPS[game.tutorial.step]; if (!step || step.mode !== 'info') return; advanceTutorialStep(); }
function onTutorialSkipClick() {
    trackEvent('Tutorial_Skipped', { step: game.tutorial.step });
    if (game.level === 0 && game.enemies.length === 0) { const spot = getSafeSpawnPoint(20, 100); game.enemies.push(new Enemy(spot.x, spot.y, 'weak')); }
    endTutorial();
}
function endTutorial() { game.tutorial.active = false; game.tutorial.waitingFor = null; game.tutorial.waitStartPos = null; hideTutorialOverlay(); if (game.state === 'tutorial') game.state = 'playing'; }
function hideTutorialOverlay() { if (_tutOverlay) _tutOverlay.classList.add('hidden'); if (_tutSpotlight) _tutSpotlight.style.display = 'none'; if (_tutPointer) _tutPointer.style.display = 'none'; if (_tutKeyHint) _tutKeyHint.classList.add('hidden'); }

let currentTerminalTab = 'upgrades';

function openTerminal() {
    document.getElementById('terminal-modal').classList.remove('hidden');
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('terminal-chips-value').textContent = game.chips;
    switchTerminalTab('upgrades');
    playSound(800, 0.1, 'sine');
}

function closeTerminal() {
    document.getElementById('terminal-modal').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    updateChipsUI();
}

function switchTerminalTab(tabId) {
    currentTerminalTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderTerminalItems();
}

function renderTerminalItems() {
    const container = document.getElementById('terminal-items');
    container.innerHTML = '';
	    if (currentTerminalTab === 'purchase') {
        container.innerHTML = `
            <div style="grid-column: 1/-1; display: flex; flex-direction: column; gap: 15px;">
                <div class="terminal-item">
                    <div class="item-header">
                        <img src="icon/chip.png" style="height: 32px;" onerror="this.style.display='none'">
                        <span class="item-title">50 Чипов</span>
                    </div>
                    <div class="item-price"><span>15 Голосов</span> <button class="buy-btn" style="background: #ffcc00; color: #000;" onclick="buyChipsWithVotes('chips_50', 50, 15)">КУПИТЬ</button></div>
                </div>
                <div class="terminal-item">
                    <div class="item-header">
                        <img src="icon/chip3.png" style="height: 32px;" onerror="this.style.display='none'">
                        <span class="item-title">200 Чипов</span>
                    </div>
                    <div class="item-price"><span>50 Голосов</span> <button class="buy-btn" style="background: #ffcc00; color: #000;" onclick="buyChipsWithVotes('chips_200', 200, 50)">КУПИТЬ</button></div>
                </div>
                <div class="terminal-item">
                    <div class="item-header">
                        <img src="icon/chip5.png" style="height: 32px;" onerror="this.style.display='none'">
                        <span class="item-title">500 Чипов</span>
                    </div>
                    <div class="item-price"><span>100 Голосов</span> <button class="buy-btn" style="background: #ffcc00; color: #000;" onclick="buyChipsWithVotes('chips_500', 500, 100)">КУПИТЬ</button></div>
                </div>
            </div>
        `;
        return;
    }
    
    const items = TERMINAL_ITEMS.filter(i => i.category === currentTerminalTab);
    
    

    items.forEach(item => {
        let isOwned = game.terminalUnlocks[item.id];
        let currentLevel = 0;
        
        // Если это улучшение, оно не "куплено" навсегда, а имеет уровень
        if (item.category === 'upgrades') {
            isOwned = false;
            currentLevel = game.terminalUpgrades[item.id] || 0;
        }
        
		// Если это имплант, проверяем, есть ли он в сумке ИЛИ надет на игрока
        if (item.category === 'implants') {
			if (item.id === 'claw') {
				const clawCount = game.implantsBag.filter(c => c === 'claw').length
                        + game.equippedImplants.filter(c => c === 'claw').length;
				isOwned = clawCount >= 2;
			} else {
				isOwned = game.implantsBag.includes(item.id) || game.equippedImplants.includes(item.id);
			}
		}
        const isEquipped = game.equippedSkin === item.id;
        const canAfford = game.chips >= item.price;
        
        const el = document.createElement('div');
        el.className = 'terminal-item' + (isOwned ? ' owned' : '');
        
                let btnHtml = '';
        if (item.category === 'upgrades') {
            btnHtml = `<button class="buy-btn" ${!canAfford ? 'disabled' : ''} data-id="${item.id}">КУПИТЬ</button>`;
        } else if (!isOwned) {
            btnHtml = `<button class="buy-btn" ${!canAfford ? 'disabled' : ''} data-id="${item.id}">КУПИТЬ</button>`;
        } else if (item.category === 'skins' && !isEquipped) {
            btnHtml = `<button class="equip-btn" data-id="${item.id}" style="background: #44ddff; color: #000; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer;">НАДЕТЬ</button>`;
        } else if (item.category === 'skins' && isEquipped) {
            btnHtml = `<button class="buy-btn" disabled style="background: #00ff88; color: #000;">НАДЕТО</button>`;
        } else if (item.category === 'implants' && isOwned) {
            btnHtml = `<button class="buy-btn" disabled style="background: #00ff88; color: #000;">КУПЛЕНО</button>`;
        }

        let priceHtml = '';
        if (item.isCombo) {
            priceHtml = `<span style="text-decoration: line-through; color: #888; font-size: 14px;">${item.originalPrice}</span> <span style="color: #00ff88; margin-left: 5px;">${item.price}</span>`;
        } else {
            priceHtml = `<img src="icon/chip.png" style="height: 16px; vertical-align: middle;" onerror="this.style.display='none'"> ${item.price}`;
        }
        
        if (item.category === 'upgrades' && currentLevel > 0) {
            priceHtml += ` <span style="color:#aaa; font-size:12px;">(Ур. ${currentLevel})</span>`;
        }

        // Собираем карточку товара
        el.innerHTML = `
            <div class="item-header">
                <span class="item-icon">${item.icon}</span>
                <span class="item-title">${item.name}</span>
            </div>
            <div class="item-desc">${item.desc}</div>
            <div class="item-price">
                <span>${priceHtml}</span>
                ${btnHtml}
            </div>
        `;
        
        if (!isOwned && canAfford) {
            el.querySelector('.buy-btn').addEventListener('click', () => buyTerminalItem(item.id, item.price));
        } else if (item.category === 'skins' && !isEquipped && isOwned) {
            el.querySelector('.equip-btn').addEventListener('click', () => equipSkin(item.id));
        }
        
        container.appendChild(el);
    });
}

function buyTerminalItem(id, price) {
    const item = TERMINAL_ITEMS.find(i => i.id === id);
    if (!item) return;

    // Запрещаем покупать дважды только скины, оружие и импланты.
    // Улучшения (upgrades) можно покупать бесконечно!
    if (item.category !== 'upgrades' && game.terminalUnlocks[id]) return;
    
    if (game.chips < price) return;
	
	if (id === 'claw') {
        const clawCount = game.implantsBag.filter(c => c === 'claw').length
                        + game.equippedImplants.filter(c => c === 'claw').length;
        if (clawCount >= 2) {
            alert('Максимум 2 боевые клешни!');
            return;
        }
    }
    
    const btn = document.querySelector(`.buy-btn[data-id="${id}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    if (vkData && vkData.id) {
        const formData = new FormData();
        formData.append('user_id', vkData.id);
        formData.append('amount', -price);
        
        const item = TERMINAL_ITEMS.find(i => i.id === id);
        if (item && item.category === 'skins') {
            formData.append('skin', id);
        }

        fetch('http://mshot-pay.byethost7.com/update_chips.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.result) {
                game.chips -= price;
				if (item.category !== 'upgrades' && item.id !== 'claw') {
					game.terminalUnlocks[id] = true;
				}

                
                // ==========================================
                // ВЫДАЧА ОРУЖИЯ И СКИНОВ
                // ==========================================
                if (id === 'alien_rifle' || id === 'startShotgun') {
                    if (game.player && !game.player.ownedWeapons.includes(id)) {
                        game.player.ownedWeapons.push(id);
                    }
                } else if (id === 'combo_alien') {
                    game.terminalUnlocks['skinAlien'] = true;
                    game.terminalUnlocks['alien_rifle'] = true;
                    if (game.player && !game.player.ownedWeapons.includes('alien_rifle')) {
                        game.player.ownedWeapons.push('alien_rifle');
                    }
                    game.equippedSkin = 'skinAlien'; 
				} else if (item && item.category === 'implants') {
					if (id === 'claw') {
						game.implantsBag.push(id);           // клешней можно несколько
					} else if (!game.implantsBag.includes(id)) {
						game.implantsBag.push(id);
					}
                } else if (item && item.category === 'upgrades') {
                    // Увеличиваем уровень улучшения
                    game.terminalUpgrades[id] = (game.terminalUpgrades[id] || 0) + 1;
                    if (game.player) game.player.applyUpgrades(false); // Применяем статы
                }

                saveGlobalChips();
                updateChipsUI();
                document.getElementById('terminal-chips-value').textContent = game.chips;
                renderTerminalItems();
                playSound(1200, 0.2, 'sine');
				
            } else {
                alert('Ошибка сервера при покупке!');
                renderTerminalItems();
            }
        })
        .catch(e => {
            alert('Нет связи с сервером.');
            renderTerminalItems(); 
        });
    } else {
        // Локальный тест (без ВК)
        game.chips -= price;
        if (id !== 'claw') game.terminalUnlocks[id] = true;

        // ==========================================
        // ВЫДАЧА ОРУЖИЯ И СКИНОВ (для локального теста)
        // ==========================================
         const item = TERMINAL_ITEMS.find(i => i.id === id);
        
        if (id === 'alien_rifle' || id === 'startShotgun') {
            if (game.player && !game.player.ownedWeapons.includes(id)) {
                game.player.ownedWeapons.push(id);
            }
        } else if (id === 'combo_alien') {
            game.terminalUnlocks['skinAlien'] = true;
            game.terminalUnlocks['alien_rifle'] = true;
            if (game.player && !game.player.ownedWeapons.includes('alien_rifle')) {
                game.player.ownedWeapons.push('alien_rifle');
            }
            game.equippedSkin = 'skinAlien';
        } else if (item && item.category === 'implants') {
			if (id === 'claw') {
				game.implantsBag.push(id);           // клешней можно несколько
			} else if (!game.implantsBag.includes(id)) {
				game.implantsBag.push(id);
			}
        } else if (item && item.category === 'upgrades') {
            game.terminalUpgrades[id] = (game.terminalUpgrades[id] || 0) + 1;
            if (game.player) game.player.applyUpgrades(false);
        }
    }
}

function equipSkin(skinId) {
    if (vkData && vkData.id) {
        const formData = new FormData();
        formData.append('user_id', vkData.id);
        formData.append('skin', skinId);
        
        fetch('http://mshot-pay.byethost7.com/update_chips.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.result) {
                game.equippedSkin = skinId;
                saveGlobalChips();
                renderTerminalItems();
                playSound(800, 0.15, 'sine');
            }
        })
        .catch(e => console.log('Ошибка сохранения скина', e));
    } else {
        game.equippedSkin = skinId;
        saveGlobalChips();
        renderTerminalItems();
        playSound(800, 0.15, 'sine');
    }
}

function buyChipsWithVotes(packId, chipAmount, priceInVotes) {
    if (!vkAvailable || !window.vkBridge) {
        alert('Покупка доступна только в приложении ВКонтакте!');
        return;
    }

    window.vkBridge.send('VKWebAppShowOrderBox', {
        type: 'item',
        item: packId,         
        title: chipAmount + ' Чипов', 
        price: priceInVotes   
    })
    .then((data) => {
        if (data.status) {
            loadGlobalChips();
            alert(`Успешно куплено ${chipAmount} чипов!`);
            if (document.getElementById('terminal-chips-value')) {
                document.getElementById('terminal-chips-value').textContent = game.chips;
            }
            renderTerminalItems();
        } else {
            console.log('Покупка отменена');
        }
    })
    .catch((error) => {
        console.error('Ошибка оплаты:', error);
        alert('Не удалось открыть окно оплаты. Попробуйте позже.');
    });
}
// ===== ЛОГИКА КАБИНЕТА =====
function openCabinet() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('cabinet-modal').classList.remove('hidden');
    switchCabinetTab('skins');
}

function closeCabinet() {
    document.getElementById('cabinet-modal').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
}

function switchCabinetTab(tab) {
    document.getElementById('cabinet-tab-skins').classList.toggle('active', tab === 'skins');
    document.getElementById('cabinet-tab-implants').classList.toggle('active', tab === 'implants');
    
    if (tab === 'skins') {
        document.getElementById('cabinet-content-skins').classList.remove('hidden');
        document.getElementById('cabinet-content-implants').classList.add('hidden');
        renderCabinetSkins();
        drawSkinPreview();
    } else {
        document.getElementById('cabinet-content-skins').classList.add('hidden');
        document.getElementById('cabinet-content-implants').classList.remove('hidden');
        renderCabinetImplants();
    }
}

function renderCabinetSkins() {
    const list = document.getElementById('skins-list');
    list.innerHTML = '';
    
    // 1. Базовый скин
    const allSkins = [{ id: 'default', name: 'Новичок', icon: '🧑' }];
    
    // 2. Добавляем купленные скины
    TERMINAL_ITEMS.forEach(item => {
        if (item.category === 'skins' && game.terminalUnlocks[item.id]) {
            allSkins.push({ id: item.id, name: item.name, icon: item.icon });
        }
    });

    allSkins.forEach(skin => {
        const el = document.createElement('div');
        el.className = 'skin-item' + (game.equippedSkin === skin.id ? ' active' : '');
        el.innerHTML = `<span class="skin-icon">${skin.icon}</span><span class="skin-name">${skin.name}</span>`;
        
                el.addEventListener('click', () => {
            if (skin.id === 'skinAlien') {
                const hasShield = game.equippedImplants.some(id => id && IMPLANTS_CONFIG[id] && IMPLANTS_CONFIG[id].type === 'shield');
                if (hasShield) {
                    alert('Сначала снимите энергощит из слотов имплантов!');
                    return; 
                }
            }
            game.equippedSkin = skin.id;
            saveGlobalChips(); 
            renderCabinetSkins(); 
            drawSkinPreview(); 
            playSound(600, 0.1, 'sine');
        });
        
        list.appendChild(el);
    });
}
function drawSkinPreview() {
    const previewCanvas = document.getElementById('skin-preview');
    if (!previewCanvas) return;
    const pctx = previewCanvas.getContext('2d');
    pctx.clearRect(0, 0, 200, 200);
    
    const oldPlayer = game.player;
    const fakePlayer = new Player(100, 100); // Центр холста 200x200
    fakePlayer.angle = -Math.PI / 2; // Смотрит вверх
    
    fakePlayer.draw(pctx); // Передаем контекст превью!
    
    game.player = oldPlayer;
}

function renderCabinetImplants() {
    // 1. Рендер сумки
    const bag = document.getElementById('implants-bag');
    bag.innerHTML = '';
    
    if (game.implantsBag.length === 0) {
        bag.innerHTML = '<span style="color:#666;">Сумка пуста</span>';
    } else {
        game.implantsBag.forEach(impId => {
            const cfg = IMPLANTS_CONFIG[impId];
			
            const el = document.createElement('div');
            el.className = 'skin-item';
            el.innerHTML = `<span class="skin-icon">${cfg.icon}</span><span class="skin-name">${cfg.name}</span>`;
            
            // Клик по импланту в сумке = надеть в первый свободный слот
            el.addEventListener('click', () => {
				const cfg = IMPLANTS_CONFIG[impId];
					if (cfg.type === 'shield' && game.equippedSkin === 'skinAlien') {
						alert('Сначала снимите скин Инопланетянина! У него уже есть встроенный щит.');
						return;
					}
					if (impId === 'claw') {
						const equippedClaws = game.equippedImplants.filter(c => c === 'claw').length;
						if (equippedClaws >= 2) {
							alert('Максимум 2 клешни на игроке!');
							return;
						}
					}
				const emptySlot = game.equippedImplants.indexOf(null);
					if (emptySlot !== -1) {
						game.equippedImplants[emptySlot] = impId;
						game.implantsBag.splice(game.implantsBag.indexOf(impId), 1);
						 if (game.player) game.player.initClaws();
						renderCabinetImplants();
						playSound(800, 0.1, 'sine');
					} else {
						playSound(200, 0.1, 'square');
					}
				});
            bag.appendChild(el);
        });
    }
    
    // 2. Рендер слотов
    for (let i = 0; i < 3; i++) {
        const slotEl = document.getElementById('slot-' + i);
        const impId = game.equippedImplants[i];
        
        if (impId) {
            const cfg = IMPLANTS_CONFIG[impId];
            slotEl.className = 'implant-slot filled';
            slotEl.innerHTML = cfg.icon;
            
            // Клик по слоту = снять имплант
            slotEl.onclick = () => {
                const cfg = IMPLANTS_CONFIG[impId];
                if (cfg.type === 'shield') game.implantShieldHp = 0;
                
                game.equippedImplants[i] = null;
                game.implantsBag.push(impId);
                
				if (game.player) game.player.initClaws();
                saveGlobalChips(); // <--- ВАЖНО! Сохраняем
                renderCabinetImplants();
                playSound(400, 0.1, 'sine');
            };
        } else {
            slotEl.className = 'implant-slot';
            slotEl.innerHTML = (i + 1);
            slotEl.onclick = null;
        }
    }
}