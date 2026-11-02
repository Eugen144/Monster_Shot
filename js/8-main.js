let introTimeouts = [];
let introBeatInterval = null;
function resize() {
    W = window.innerWidth; H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const bgmMenu = document.getElementById('bgm-menu');
const bgmBattle = document.getElementById('bgm-battle');
const bgmSynthwave = document.getElementById('bgm-synthwave');
const bgmDark = document.getElementById('bgm-dark');
const battleTracks = [bgmBattle, bgmSynthwave, bgmDark];
let currentBattleTrackIndex = 0; 

const bgmShop = document.getElementById('bgm-shop');
const bgmBoss = document.getElementById('bgm-boss');
const bgmSurvival = document.getElementById('bgm-survival');
const bgmWin = document.getElementById('bgm-win');
let isBossMusicPlaying = false; 



function fadeAudio(audioEl, targetVolume, duration, callback) {
    if (!audioEl) return;
    if (audioEl.fadeTimer) clearInterval(audioEl.fadeTimer); 
    const startVolume = audioEl.volume; const startTime = performance.now();
    audioEl.fadeTimer = setInterval(() => {
        const now = performance.now(); const elapsed = now - startTime; const progress = Math.min(elapsed / duration, 1);
        audioEl.volume = startVolume + (targetVolume - startVolume) * progress;
        if (progress >= 1) { clearInterval(audioEl.fadeTimer); audioEl.fadeTimer = null; if (callback) callback(); }
    }, 50);
}

const shootSounds = { 
	pistol: new Audio('audio/sounds/pistol.mp3'), 
	shotgun: new Audio('audio/sounds/shotgun.mp3'), 
	sniper: new Audio('audio/sounds/sniper.mp3'),
	alien_rifle: new Audio('audio/sounds/laser.mp3')
};
const mineBoomSound = new Audio('audio/sounds/mine_boom.mp3');
const barrelBoomSound = new Audio('audio/sounds/barrel_boom.mp3');
const hitSound = new Audio('audio/sounds/hit.mp3'); 
const reloadSound = new Audio('audio/sounds/reload.mp3'); // Звук перезарядки
let _lastBoomTime = 0;

function playBoomSound(type) {
    if (!soundEnabled) return;
    const now = performance.now(); if (now - _lastBoomTime < 50) return; _lastBoomTime = now;
    const soundFile = type === 'mine' ? mineBoomSound : barrelBoomSound; if (!soundFile) return;
    const sound = soundFile.cloneNode(); sound.volume = 0.4; sound.play().catch(e => {});
}

function playShootSound(weaponId) {
    if (!soundEnabled || !shootSounds[weaponId]) return;
    const sound = shootSounds[weaponId].cloneNode();
    if (weaponId === 'pistol') sound.volume = 0.55;
    else if (weaponId === 'shotgun') sound.volume = 0.25;
    else if (weaponId === 'sniper') sound.volume = 0.4;
    else sound.volume = 0.15;
    sound.play().catch(e => console.log("Звук выстрела заблокирован:", e));
}

// ===== ФУНКЦИИ МУЗЫКИ =====
function playMenuMusic() { if (!soundEnabled || !bgmMenu) return; if (bgmMenu.paused) { bgmMenu.volume = 0; bgmMenu.play().catch(e => {}); } fadeAudio(bgmMenu, 0.3, 1500); }
function pauseMenuMusic() { if (bgmMenu && !bgmMenu.paused) fadeAudio(bgmMenu, 0, 1000, () => bgmMenu.pause()); }

function pickRandomBattleTrack() {
    let newIndex;
    do { newIndex = Math.floor(Math.random() * battleTracks.length); } while (newIndex === currentBattleTrackIndex && battleTracks.length > 1);
    currentBattleTrackIndex = newIndex;
}

function playBattleMusic() {
    if (!soundEnabled) return;
    const activeTrack = battleTracks[currentBattleTrackIndex];
    battleTracks.forEach(track => { if (track && track !== activeTrack && !track.paused) track.pause(); });
    if (activeTrack) { if (activeTrack.paused) { activeTrack.volume = 0; activeTrack.play().catch(e => {}); } fadeAudio(activeTrack, 0.2, 1500); }
}

function pauseBattleMusic() { battleTracks.forEach(track => { if (track && !track.paused) fadeAudio(track, 0, 1000, () => track.pause()); }); }

function playShopMusic() { if (!soundEnabled || !bgmShop) return; if (bgmShop.paused) { bgmShop.volume = 0; bgmShop.play().catch(e => {}); } fadeAudio(bgmShop, 0.25, 1000); }
function pauseShopMusic() { if (bgmShop && !bgmShop.paused) fadeAudio(bgmShop, 0, 1000, () => bgmShop.pause()); }

function playSurvivalMusic() { if (!soundEnabled || !bgmSurvival) return; if (bgmSurvival.paused) { bgmSurvival.volume = 0; bgmSurvival.play().catch(e => {}); } fadeAudio(bgmSurvival, 0.25, 1500); }
function pauseSurvivalMusic() { if (bgmSurvival && !bgmSurvival.paused) fadeAudio(bgmSurvival, 0, 1000, () => bgmSurvival.pause()); }

function playBossMusic() { if (!soundEnabled || !bgmBoss) return; isBossMusicPlaying = true; if (bgmBoss.paused) { bgmBoss.volume = 0; bgmBoss.play().catch(e => {}); } fadeAudio(bgmBoss, 0.3, 1500); }
function pauseBossMusic() { isBossMusicPlaying = false; if (bgmBoss && !bgmBoss.paused) fadeAudio(bgmBoss, 0, 1000, () => bgmBoss.pause()); }

function playWinMusic() { if (!soundEnabled || !bgmWin) return; bgmWin.currentTime = 0; bgmWin.volume = 0.6; bgmWin.play().catch(e => {}); }
function pauseWinMusic() { if (bgmWin && !bgmWin.paused) { bgmWin.pause(); bgmWin.currentTime = 0; } }

function stopAllMusic() {
    pauseMenuMusic(); pauseBattleMusic(); pauseSurvivalMusic(); pauseBossMusic(); pauseShopMusic(); pauseWinMusic();
    isBossMusicPlaying = false;
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

try {
    const w = localStorage.getItem('monster_shot_survival_wave'); if (w) game.survivalHighWave = parseInt(w) || 0;
    const s = localStorage.getItem('monster_shot_survival_score'); if (s) game.survivalHighScore = parseInt(s) || 0;
} catch(e) {}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
        if (bgmMenu && !bgmMenu.paused) bgmMenu.pause();
        if (bgmBattle && !bgmBattle.paused) bgmBattle.pause();
        if (bgmSynthwave && !bgmSynthwave.paused) bgmSynthwave.pause();
        if (bgmDark && !bgmDark.paused) bgmDark.pause();
        if (bgmShop && !bgmShop.paused) bgmShop.pause();
        if (bgmBoss && !bgmBoss.paused) bgmBoss.pause();
        if (bgmSurvival && !bgmSurvival.paused) bgmSurvival.pause();
        if (bgmWin && !bgmWin.paused) bgmWin.pause();
        if (game.state === 'playing') pauseGame();
    } else { 
        if (audioCtx && audioCtx.state === 'suspended' && soundEnabled) audioCtx.resume(); 
        if (game.state === 'menu') {
            playMenuMusic();
        } else if (game.state === 'playing') {
            if (game.mode === 'survival') {
                playSurvivalMusic();
            } else {
                const bossPresent = game.enemies && game.enemies.some(e => e.isBoss || e.isMegaBoss || e.isGhostBoss || e.isSuperMother);
                if (bossPresent) playBossMusic();
                else playBattleMusic();
            }
        } else if (game.state === 'shop') {
            playShopMusic();
        } else if (game.state === 'levelComplete' || game.state === 'victory') {
            playWinMusic();
        }
    }
});

window.addEventListener('blur', () => { if (audioCtx && audioCtx.state === 'running') audioCtx.suspend(); });
window.addEventListener('focus', () => { if (audioCtx && audioCtx.state === 'suspended' && soundEnabled) audioCtx.resume(); });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => { if (e.target && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); });

function resumeAudioOnGesture() {
    if (audioCtx && audioCtx.state === 'suspended' && soundEnabled) audioCtx.resume().catch(() => {});
    if (game.state === 'menu') playMenuMusic();
}
window.addEventListener('click', resumeAudioOnGesture);
window.addEventListener('touchstart', resumeAudioOnGesture, { passive: true });
window.addEventListener('keydown', resumeAudioOnGesture);

function setupMobileControls() {
    if (!isMobile) return;
    const elJoy = document.getElementById('joystick-container'); const elShoot = document.getElementById('shoot-joystick-container'); const elInv = document.getElementById('inv-btn-mobile');
    // if (elJoy) elJoy.classList.remove('hidden'); if (elShoot) elShoot.classList.remove('hidden'); if (elInv) elInv.classList.remove('hidden');

    const shootJoystickContainer = document.getElementById('shoot-joystick-container');
    const shootJoystickBase = document.getElementById('shoot-joystick-base'); const shootJoystickStick = document.getElementById('shoot-joystick-stick');

    if (shootJoystickContainer && shootJoystickBase) {
        let shootTouchId = null;
        const handleShootMove = (touch) => {
            const rect = shootJoystickBase.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2;
            let dx = touch.clientX - centerX; let dy = touch.clientY - centerY; const dist = Math.hypot(dx, dy); const maxDist = rect.width / 2 - 28;
            const force = Math.min(dist / maxDist, 1.0); const isShooting = force > SHOOT_FORCE_THRESHOLD;
            if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
            if (shootJoystickStick) {
                shootJoystickStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                if (isShooting) { shootJoystickStick.style.background = 'rgba(255, 255, 255, 0.95)'; shootJoystickStick.style.boxShadow = '0 0 30px #fff, 0 0 15px #ff0044'; } 
                else { shootJoystickStick.style.background = 'rgba(255, 0, 68, 0.9)'; shootJoystickStick.style.boxShadow = '0 0 20px #ff0044'; }
            }
            shootJoystickVector.x = dx / maxDist; shootJoystickVector.y = dy / maxDist;
            if (game.player && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                game.player.angle = Math.atan2(dy, dx); const screenPlayerX = game.player.x - game.camX; const screenPlayerY = game.player.y - game.camY;
                crosshair.style.left = (screenPlayerX + Math.cos(game.player.angle) * 100) + 'px'; crosshair.style.top = (screenPlayerY + Math.sin(game.player.angle) * 100) + 'px';
            }
            if (isShooting) { shootJoystickTrigger = true; if (game.state === 'playing') shoot(); } else { shootJoystickTrigger = false; }
        };
        shootJoystickContainer.addEventListener('touchstart', (e) => { e.preventDefault(); const touch = e.changedTouches[0]; shootTouchId = touch.identifier; shootJoystickActive = true; shootJoystickTrigger = false; game.mouseDown = false; handleShootMove(touch); }, { passive: false });
        shootJoystickContainer.addEventListener('touchmove', (e) => { e.preventDefault(); if (!shootJoystickActive) return; for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === shootTouchId) { handleShootMove(e.changedTouches[i]); break; } } }, { passive: false });
        const endShootJoystick = (e) => {
            e.preventDefault(); shootJoystickActive = false; shootJoystickTrigger = false; shootJoystickVector = { x: 0, y: 0 }; game.mouseDown = false;
            if (shootJoystickStick) { shootJoystickStick.style.transform = 'translate(-50%, -50%)'; shootJoystickStick.style.background = 'rgba(255, 0, 68, 0.9)'; shootJoystickStick.style.boxShadow = '0 0 20px #ff0044'; }
            if (game.player) { game.mouseX = (game.player.x - game.camX) + Math.cos(game.player.angle) * 100; game.mouseY = (game.player.y - game.camY) + Math.sin(game.player.angle) * 100; }
            shootTouchId = null;
        };
        shootJoystickContainer.addEventListener('touchend', endShootJoystick, { passive: false }); shootJoystickContainer.addEventListener('touchcancel', endShootJoystick, { passive: false });
    }

    const joystickContainer = document.getElementById('joystick-container'); const joystickBase = document.getElementById('joystick-base'); const joystickStick = document.getElementById('joystick-stick');
    if (joystickContainer && joystickBase) {
        let touchId = null;
        joystickContainer.addEventListener('touchstart', (e) => { e.preventDefault(); const touch = e.changedTouches[0]; touchId = touch.identifier; joystickActive = true; handleJoystickMove(touch); }, { passive: false });
        joystickContainer.addEventListener('touchmove', (e) => { e.preventDefault(); if (!joystickActive) return; for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === touchId) { handleJoystickMove(e.changedTouches[i]); break; } } }, { passive: false });
        const endJoystick = (e) => { e.preventDefault(); joystickActive = false; joystickVector = { x: 0, y: 0 }; if (joystickStick) joystickStick.style.transform = 'translate(-50%, -50%)'; touchId = null; };
        joystickContainer.addEventListener('touchend', endJoystick, { passive: false }); joystickContainer.addEventListener('touchcancel', endJoystick, { passive: false });
        function handleJoystickMove(touch) {
            const rect = joystickBase.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2;
            let dx = touch.clientX - centerX; let dy = touch.clientY - centerY; const dist = Math.hypot(dx, dy); const maxDist = rect.width / 2 - 28;
            if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
            joystickStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            joystickVector.x = dx / maxDist; joystickVector.y = dy / maxDist;
        }
    }


    const invBtn = document.getElementById('inv-btn-mobile'); 
	if (invBtn) invBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleInventory(); }, { passive: false });
	const impBtn = document.getElementById('implant-btn-mobile');
    if (impBtn) impBtn.addEventListener('touchstart', (e) => { e.preventDefault(); useImplantAbility(); }, { passive: false });
    const menuBtn = document.getElementById('menu-btn-mobile'); 
	if (menuBtn) menuBtn.addEventListener('touchstart', (e) => { e.preventDefault(); togglePause(); }, { passive: false });
	

    canvas.addEventListener('touchstart', (e) => {
        if (game.state !== 'playing') return; const touch = e.touches[0]; if (!touch) return;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target === canvas) { game.mouseX = touch.clientX; game.mouseY = touch.clientY; crosshair.style.left = touch.clientX + 'px'; crosshair.style.top = touch.clientY + 'px'; }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
        if (game.state !== 'playing') return; const touch = e.touches[0]; if (!touch) return;
        game.mouseX = touch.clientX; game.mouseY = touch.clientY; crosshair.style.left = touch.clientX + 'px'; crosshair.style.top = touch.clientY + 'px';
    }, { passive: true });
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase(); 
    if (e.repeat) { game.keys[key] = true; return; }

    // --- НОВЫЙ КОД: ПРОПУСК ЗАСТАВКИ НА ESC ---
    if (key === 'escape' || key === 'esc') {
        const splash = document.getElementById('splash-screen');
        // Если заставка видна и еще не начала исчезать
        if (splash && splash.style.display !== 'none' && !splash.classList.contains('fade-out')) {
            skipIntro();
            e.preventDefault();
            return; // Выходим, чтобы не срабатывали другие действия
        }
    }
    // ------------------------------------------

    if (e.key === 'Escape' || key === 'esc' || key === 'p' || key === 'з') { 
        e.preventDefault(); 
        if (game.state === 'inventory') closeInventory(); 
        else togglePause(); 
        return; 
    }
	
	if ((key === 'r' || key === 'к') && (game.state === 'playing' || game.state === 'inventory')) {
        e.preventDefault();
        
        // Если мы в туториале на шаге перезарядки:
        if (game.tutorial.active && TUTORIAL_STEPS[game.tutorial.step].id === 'reload') {
            advanceTutorialStep(); // <--- Просто листаем туториал дальше
        }
        
        startReload(); // И запускаем саму перезарядку (если есть патроны)
        return;
    }
	if ((key === 'q' || key === 'й') && game.state === 'playing') {
        e.preventDefault();
        useImplantAbility();
        return;
    }
    
    game.keys[key] = true;
    
    if ((key === 'e' || key === 'у') && (game.state === 'playing' || game.state === 'inventory')) { 
        e.preventDefault(); 
        toggleInventory(); 
    }
});
window.addEventListener('keyup', (e) => { game.keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('mousemove', (e) => { game.mouseX = e.clientX; game.mouseY = e.clientY; crosshair.style.left = e.clientX + 'px'; crosshair.style.top = e.clientY + 'px'; });
canvas.addEventListener('mousedown', (e) => { if (e.button === 0 && game.state === 'playing') { game.mouseDown = true; shoot(); } });
canvas.addEventListener('mouseup', () => { game.mouseDown = false; });

setInterval(() => {
    if (game.state !== 'playing') return;
    const shooting = game.mouseDown || (isMobile && shootJoystickActive && shootJoystickTrigger);
    if (shooting) shoot();
}, 50);

document.getElementById('btn-continue').addEventListener('click', () => {
    let s = game.savedProgress || {};
    try { const local = localStorage.getItem('monster_shot_save'); if (local) s = JSON.parse(local); } catch(e) {}
    let lvl = s.level !== undefined ? Number(s.level) : 0;
    if (lvl === 0 && (s.totalCoins > 0 || (s.ownedWeapons && s.ownedWeapons.length > 1))) lvl = 1;
    launchGame(lvl, false);
});
document.getElementById('btn-new-game').addEventListener('click', () => { document.getElementById('menu').classList.add('hidden'); document.getElementById('new-game-menu').classList.remove('hidden'); });
document.getElementById('btn-campaign').addEventListener('click', () => { launchGame(1, true); });
document.getElementById('btn-survival').addEventListener('click', () => { startSurvival(); });
document.getElementById('btn-back-to-menu').addEventListener('click', () => { document.getElementById('new-game-menu').classList.add('hidden'); document.getElementById('menu').classList.remove('hidden'); });
document.getElementById('btn-tutorial').addEventListener('click', () => {
    game.mode = 'tutorial'; // Новый режим
    launchGame(0, true);
});
document.getElementById('btn-leaderboard').addEventListener('click', showLeaderboard);
document.getElementById('btn-survival-records').addEventListener('click', showSurvivalRecords);
document.getElementById('btn-close-records').addEventListener('click', () => { document.getElementById('survival-records-modal').classList.add('hidden'); });
document.getElementById('btn-survival-leaderboard').addEventListener('click', showSurvivalLeaderboard);
document.getElementById('btn-support').addEventListener('click', () => {
    if (vkAvailable && window.vkBridge) window.vkBridge.send('VKWebAppJoinGroup', { group_id: 242108226 }).catch(() => { window.open(SUPPORT_URL, '_blank'); });
    else window.open(SUPPORT_URL, '_blank');
});
document.getElementById('btn-devs').addEventListener('click', () => { document.getElementById('devs-modal').classList.remove('hidden'); });
document.getElementById('btn-close-devs').addEventListener('click', () => { document.getElementById('devs-modal').classList.add('hidden'); });
// Кнопки Кабинета
document.getElementById('btn-cabinet').addEventListener('click', openCabinet);
document.getElementById('btn-close-cabinet').addEventListener('click', closeCabinet);
document.getElementById('cabinet-tab-skins').addEventListener('click', () => switchCabinetTab('skins'));
document.getElementById('cabinet-tab-implants').addEventListener('click', () => switchCabinetTab('implants'));


// ===== НОВЫЕ ОБРАБОТЧИКИ КНОПОК =====
// Кнопка закрытия окна ежедневного бонуса
document.getElementById('btn-claim-daily').addEventListener('click', () => {
    document.getElementById('daily-bonus-modal').classList.add('hidden');
    playSound(800, 0.1, 'sine');
});

// Кнопки Терминала
document.getElementById('btn-open-terminal').addEventListener('click', openTerminal);
document.getElementById('btn-close-terminal').addEventListener('click', closeTerminal);

// Кнопки вкладок (Разблокировки, Кастомизация, Импланты)
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTerminalTab(btn.getAttribute('data-tab')));
});

document.getElementById('shop-open-btn').addEventListener('click', openShop);
document.getElementById('shop-next-btn').addEventListener('click', nextLevel);
document.getElementById('menu-from-level-btn').addEventListener('click', returnToMenu);
document.getElementById('restart-btn').addEventListener('click', restartLevel);
document.getElementById('menu-from-gameover-btn').addEventListener('click', returnToMenu);
document.getElementById('victory-restart-btn').addEventListener('click', () => launchGame(1, true));
document.getElementById('menu-from-victory-btn').addEventListener('click', returnToMenu);
document.getElementById('pause-resume-btn').addEventListener('click', resumeGame);
document.getElementById('pause-restart-btn').addEventListener('click', () => { document.getElementById('pause').classList.add('hidden'); restartLevel(); });
document.getElementById('pause-menu-btn').addEventListener('click', () => { document.getElementById('pause').classList.add('hidden'); returnToMenu(); });

document.getElementById('sound-btn').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    updateSoundButton();
    if (soundEnabled) {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        playSound(800, 0.1, 'sine');
        if (game.state === 'menu') {
            playMenuMusic();
        } else if (game.state === 'playing' || game.state === 'inventory' || game.state === 'survival_levelup') {
            if (game.mode === 'survival') {
                playSurvivalMusic();
            } else {
                const bossPresent = game.enemies && game.enemies.some(e => e.isBoss || e.isMegaBoss || e.isGhostBoss || e.isSuperMother);
                if (bossPresent) playBossMusic();
                else playBattleMusic();
            }
        } else if (game.state === 'shop') {
            playShopMusic();
        } else if (game.state === 'levelComplete' || game.state === 'victory') {
            playWinMusic();
        }
    } else {
        stopAllMusic();
    }
    try { localStorage.setItem('soundEnabled', soundEnabled ? '1' : '0'); } catch (e) {}
});

document.getElementById('levelup-continue-btn').addEventListener('click', () => {
    document.getElementById('survival-levelup').classList.add('hidden');
    game.state = 'playing'; game.keys = {}; game.mouseDown = false; joystickActive = false; joystickVector = {x:0, y:0}; shootJoystickActive = false; shootJoystickTrigger = false; shootJoystickVector = {x:0, y:0};
});
document.getElementById('levelup-ad-btn').addEventListener('click', () => {
    showRewardedAd(
        () => {
            trackEvent('Ad_Watched', { context: 'survival_levelup' });
            game.levelupAdUsed = true; game.levelupPicksLeft = 1; renderLevelUpCards();
            document.getElementById('levelup-ad-btn').style.display = 'none';
        },
        () => { alert('Реклама недоступна или закрыта.'); }
    );
});

try { const saved = localStorage.getItem('soundEnabled'); if (saved === '0') soundEnabled = false; } catch (e) {}
updateSoundButton();

const versionEl = document.getElementById('game-version'); if (versionEl) versionEl.textContent = GAME_VERSION;
const devsVersionEl = document.getElementById('devs-version'); if (devsVersionEl) devsVersionEl.textContent = GAME_VERSION;

let lastTime = performance.now();
let menuEntities = [];
let menuPlayer = null;
let menuBullets = [];
let hudVisible = false;

function initMenuScene() {
    menuEntities = []; menuBullets = []; menuPlayer = new Player(W / 2, H / 2);
    const types = ['weak', 'sprinter', 'ghost', 'square_fast', 'medium'];
    for (let i = 0; i < 4; i++) {
        let type = types[Math.floor(Math.random() * types.length)];
        let e = new Enemy(Math.random() * W, Math.random() * H, type);
        e.menuVX = (Math.random() - 0.5) * 200; e.menuVY = (Math.random() - 0.5) * 200; e.menuShootTimer = 999; 
        menuEntities.push(e);
    }
    let boss = new Enemy(Math.random() * W, Math.random() * H, 'boss');
    boss.menuVX = (Math.random() - 0.5) * 80; boss.menuVY = (Math.random() - 0.5) * 80; boss.menuShootTimer = 2.0; 
    menuEntities.push(boss);
    if (menuEntities.length > 0) menuPlayer.menuTarget = menuEntities.find(e => e.type !== 'boss') || menuEntities[0];
}

function updateMenuScene(dt) {
    for (let mob of menuEntities) {
        mob.x += mob.menuVX * dt; mob.y += mob.menuVY * dt;
        if (mob.x < -mob.radius) mob.x = W + mob.radius; if (mob.x > W + mob.radius) mob.x = -mob.radius;
        if (mob.y < -mob.radius) mob.y = H + mob.radius; if (mob.y > H + mob.radius) mob.y = -mob.radius;
        mob.angle = Math.atan2(mob.menuVY, mob.menuVX); mob.walkPhase += dt * 10;
        if (mob.type === 'boss' || mob.type === 'miniboss') {
            mob.menuShootTimer -= dt;
            if (mob.menuShootTimer <= 0) {
                mob.menuShootTimer = 1.5 + Math.random() * 1.5; let angle = Math.random() * Math.PI * 2; 
                menuBullets.push({ x: mob.x, y: mob.y, vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200, radius: 8, life: 4.0 });
            }
        }
    }
    for (let i = menuBullets.length - 1; i >= 0; i--) {
        let b = menuBullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) menuBullets.splice(i, 1);
    }
    if (menuPlayer && menuPlayer.menuTarget && menuEntities.includes(menuPlayer.menuTarget)) {
        let dx = menuPlayer.menuTarget.x - menuPlayer.x; let dy = menuPlayer.menuTarget.y - menuPlayer.y; let dist = Math.hypot(dx, dy);
        menuPlayer.angle = Math.atan2(dy, dx); menuPlayer.walkPhase += dt * 15;
        if (dist > 80) { menuPlayer.x += (dx / dist) * 300 * dt; menuPlayer.y += (dy / dist) * 300 * dt; } 
        else { if (Math.random() < 0.1) spawnParticles(menuPlayer.x + Math.cos(menuPlayer.angle) * 30, menuPlayer.y + Math.sin(menuPlayer.angle) * 30, '#ffdd44', 2); }
        if (menuPlayer.x < -menuPlayer.radius) menuPlayer.x = W + menuPlayer.radius; if (menuPlayer.x > W + menuPlayer.radius) menuPlayer.x = -menuPlayer.radius;
        if (menuPlayer.y < -menuPlayer.radius) menuPlayer.y = H + menuPlayer.radius; if (menuPlayer.y > H + menuPlayer.radius) menuPlayer.y = -menuPlayer.radius;
    }
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt;
        if (p.life <= 0) game.particles.splice(i, 1);
    }
}

function drawMenuScene() {
    ctx.strokeStyle = 'rgba(60, 60, 100, 0.2)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let b of menuBullets) { ctx.save(); ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 15; ctx.fillStyle = '#aa00ff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    for (let mob of menuEntities) mob.draw();
    if (menuPlayer) menuPlayer.draw();
    for (const p of game.particles) { ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
}



function playIntro() {
    const splash = document.getElementById('splash-screen'); const royal = document.getElementById('splash-royal'); const title = document.getElementById('splash-title'); const flash = document.getElementById('splash-flash');
    
    // Очищаем старые таймеры, если они были
    introTimeouts.forEach(clearTimeout);
    introTimeouts = [];
    if (introBeatInterval) clearInterval(introBeatInterval);

    introTimeouts.push(setTimeout(() => { royal.classList.add('show'); playSound(200, 1.0, 'sine', 0.05); }, 500));
    introTimeouts.push(setTimeout(() => { royal.classList.remove('show'); }, 3000));
    
    introTimeouts.push(setTimeout(() => {
        flash.classList.add('active');
        splash.classList.add('shake');
        
        if (soundEnabled) {
            const explosionSound = new Audio('audio/sounds/explosion.mp3');
            explosionSound.volume = 0.5;
            explosionSound.play().catch(e => {});
        }

        royal.style.display = 'none';
        title.classList.remove('hidden');
        title.classList.add('show');

        introTimeouts.push(setTimeout(() => {
            splash.classList.remove('shake');
            flash.classList.remove('active'); 
        }, 600));
    }, 4300));
    
    introTimeouts.push(setTimeout(() => {
        title.classList.add('pulse');
        let beatCount = 0;
        introBeatInterval = setInterval(() => { playSound(80, 0.15, 'sine', 0.15); beatCount++; if (beatCount >= 4) clearInterval(introBeatInterval); }, 650);
    }, 5000));
    
    introTimeouts.push(setTimeout(() => { 
        splash.classList.add('fade-out'); 
        introTimeouts.push(setTimeout(() => splash.style.display = 'none', 1000)); 
    }, 8500));
}

function skipIntro() {
    introTimeouts.forEach(clearTimeout);
    introTimeouts = [];
    if (introBeatInterval) clearInterval(introBeatInterval);
    
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.style.display = 'none', 500);
    }
}

function initReadyScreen() {
    const readyScreen = document.getElementById('ready-screen'); const btnGreen = document.getElementById('btn-ready-green'); const btnRed = document.getElementById('btn-ready-red');
    const startGameIntro = () => {
        readyScreen.classList.add('fade-out'); playMenuMusic();
        setTimeout(() => { readyScreen.style.display = 'none'; playIntro(); }, 500);
    };
    if (btnGreen) btnGreen.addEventListener('click', startGameIntro); if (btnRed) btnRed.addEventListener('click', startGameIntro);
}

initReadyScreen();
document.getElementById('btn-skip-intro').addEventListener('click', skipIntro);

function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05); lastTime = now;
	const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (game.state === 'playing' || game.state === 'inventory') update(dt);
    if (game.state === 'menu') {
        if (hudVisible) { document.getElementById('hud').style.display = 'none'; hudVisible = false; }
        if (menuEntities.length === 0) initMenuScene();
        ctx.fillStyle = (game.palette && game.palette.bg) ? game.palette.bg : '#1a1a2e'; ctx.fillRect(0, 0, W, H);
        updateMenuScene(dt); drawMenuScene();
    } else if (game.state === 'loading') {
        if (hudVisible) { document.getElementById('hud').style.display = 'none'; hudVisible = false; }
        ctx.fillStyle = (game.palette && game.palette.bg) ? game.palette.bg : '#1a1a2e'; ctx.fillRect(0, 0, W, H);
    } else {
        if (!hudVisible) { document.getElementById('hud').style.display = 'flex'; hudVisible = true; }
        draw();
    }
    requestAnimationFrame(loop);
}

initTutorialUI();

initVKSdk()
    .catch(err => console.warn('VK SDK init error:', err))
    .finally(() => {
        setupMobileControls();
        if (checkDailyLogin()) {
            setTimeout(() => {
                document.getElementById('daily-bonus-modal').classList.remove('hidden');
            }, 500);
        }
        updateChipsUI();
        requestAnimationFrame(loop);
		
    });