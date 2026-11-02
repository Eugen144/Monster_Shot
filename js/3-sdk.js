let vkData = null; 
let sdkReadySent = false;
let soundEnabled = true;
let progressSaveTimer = null;
let nextLevelLock = false;
let lastSavedData = null;
let vkAvailable = false;

let _localSaveOk = false;
let _vkSaveOk = false;
let _saveVersion = 0;

function notifyGameReady() {
    if (sdkReadySent) return;
    sdkReadySent = true;
}

function doSave() {
    if (game.mode === 'survival') return;
	if (game.mode === 'tutorial') return;
	if (game.level === 0 && game.tutorial.active) return; // Не сохраняем прогресс во время туториала
    const data = {
        level: game.level, totalCoins: game.totalCoins, upgrades: game.upgrades,
        ownedWeapons: game.player ? game.player.ownedWeapons.slice() : ['pistol'],
        currentWeapon: game.player ? game.player.currentWeapon : 'pistol',
		weaponHintSeen: game.weaponHintSeen, 
		chipsEarnedThisRun: game.chipsEarnedThisRun
    };
    
    game.savedProgress = data; 
    const dataStr = JSON.stringify(data);

    if (lastSavedData === dataStr && _localSaveOk && _vkSaveOk) return;
    if (lastSavedData === dataStr && !vkAvailable) return;

    const myVersion = ++_saveVersion;
    _localSaveOk = false;
    try {
        localStorage.setItem('monster_shot_save', dataStr);
        _localSaveOk = true;
    } catch (e) {}

    if (vkAvailable && window.vkBridge) {
        _vkSaveOk = false;
        window.vkBridge.send('VKWebAppStorageSet', { key: 'monster_shot_save', value: dataStr })
            .then(() => {
                if (myVersion === _saveVersion) {
                    _vkSaveOk = true;
                    lastSavedData = dataStr;
                }
            })
            .catch(e => console.log('VK Save Error:', e));
    } else {
        if (_localSaveOk) lastSavedData = dataStr;
    }
}

function saveProgress(immediate = false) {
    if (immediate) {
        if (progressSaveTimer) { clearTimeout(progressSaveTimer); progressSaveTimer = null; }
        doSave(); return;
    }
    if (progressSaveTimer) return;
    progressSaveTimer = setTimeout(() => { progressSaveTimer = null; doSave(); }, 2000);
}

function loadProgress() {
    let localData = null;
    try {
        const local = localStorage.getItem('monster_shot_save');
        if (local) {
            const parsed = JSON.parse(local);
            if (parsed.level !== undefined) localData = parsed;
        }
    } catch (e) {}

    const vkPromise = (vkAvailable && window.vkBridge)
        ? window.vkBridge.send('VKWebAppStorageGet', { keys: ['monster_shot_save'] })
            .then(response => {
                if (response.keys && response.keys.length > 0 && response.keys[0].value) {
                    try {
                        const data = JSON.parse(response.keys[0].value);
                        if (data.level !== undefined) return data;
                    } catch (e) {}
                }
                return null;
            })
            .catch(e => { return null; })
        : Promise.resolve(null);

    return vkPromise.then(vkResult => {
        let best = null;
        if (localData && vkResult) {
            const localScore = (localData.level || 0) * 1e9 + (localData.totalCoins || 0);
            const vkScore = (vkResult.level || 0) * 1e9 + (vkResult.totalCoins || 0);
            best = (vkScore >= localScore) ? vkResult : localData;
        } else if (vkResult) {
            best = vkResult;
        } else if (localData) {
            best = localData;
        }

        if (best) {
            const dataStr = JSON.stringify(best);
            lastSavedData = dataStr;
            _localSaveOk = false;
            try { localStorage.setItem('monster_shot_save', dataStr); _localSaveOk = true; } catch (e) {}

            if (best === vkResult) {
                _vkSaveOk = true;
            } else if (vkAvailable && window.vkBridge) {
                _vkSaveOk = false;
                const myVersion = ++_saveVersion;
                window.vkBridge.send('VKWebAppStorageSet', { key: 'monster_shot_save', value: dataStr })
                    .then(() => { if (myVersion === _saveVersion) _vkSaveOk = true; })
                    .catch(e => {});
            } else {
                _vkSaveOk = false;
            }
        }
        return best;
    });
}

function showFullscreenAd(callback) {
    if (!vkAvailable || !window.vkBridge) { if (callback) callback(); return; }
    const wasPlaying = game.state === 'playing';
    if (wasPlaying) {
        game.state = 'ad';
        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
    }
    let called = false;
    const once = () => { if (called) return; called = true; if (callback) callback(); };

    window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
        .then(() => { if (audioCtx && audioCtx.state === 'suspended' && soundEnabled) audioCtx.resume(); once(); })
        .catch(() => { if (audioCtx && audioCtx.state === 'suspended' && soundEnabled) audioCtx.resume(); once(); });
}

function showRewardedAd(onSuccess, onFail) {
    if (!vkAvailable || !window.vkBridge) { if (onFail) onFail(); return; }
    if (game.rewardAdUsedThisLevel) { alert('Реклама за вознаграждение доступна только 1 раз за уровень!'); if (onFail) onFail(); return; }

    window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward', use_waterfall: true })
        .then((data) => {
            if (data.result) { game.rewardAdUsedThisLevel = true; if (onSuccess) onSuccess(); }
            else { if (onFail) onFail(); }
        })
        .catch((error) => { if (onFail) onFail(); });
}

function showLeaderboard() {
    if (!vkAvailable || !window.vkBridge) { alert('Таблица рекордов доступна только в приложении VK!'); return; }
    window.vkBridge.send('VKWebAppShowLeaderBoardBox', { user_result: game.highScore }).catch(()=>{});
}

function saveHighScore(score) {
    if (score > game.highScore) {
        game.highScore = score;
        try { localStorage.setItem('monster_shot_highscore', score); } catch(e) {}
        if (vkAvailable && window.vkBridge) {
            window.vkBridge.send('VKWebAppStorageSet', { key: 'ms_highscore', value: String(score) }).catch(e => {});
        }
    }
}

function saveSurvivalWave(wave) {
    try { localStorage.setItem('monster_shot_survival_wave', wave); } catch(e) {}
    if (vkAvailable && window.vkBridge) {
        window.vkBridge.send('VKWebAppStorageSet', { key: 'ms_survival_wave', value: String(wave) }).catch(e => {});
    }
}

function saveSurvivalScore(score) {
    try { localStorage.setItem('monster_shot_survival_score', score); } catch(e) {}
    if (vkAvailable && window.vkBridge) {
        window.vkBridge.send('VKWebAppStorageSet', { key: 'ms_survival_score', value: String(score) }).catch(e => {});
    }
}

function loadVKRecords() {
    if (!vkAvailable || !window.vkBridge) return Promise.resolve();
    return window.vkBridge.send('VKWebAppStorageGet', {
        keys: ['ms_highscore', 'ms_survival_wave', 'ms_survival_score']
    }).then(response => {
        if (!response || !response.keys) return;
        response.keys.forEach(item => {
            const val = parseInt(item.value) || 0;
            if (item.key === 'ms_highscore' && val > game.highScore) {
                game.highScore = val; try { localStorage.setItem('monster_shot_highscore', val); } catch(e) {}
            }
            if (item.key === 'ms_survival_wave' && val > game.survivalHighWave) {
                game.survivalHighWave = val; try { localStorage.setItem('monster_shot_survival_wave', val); } catch(e) {}
            }
            if (item.key === 'ms_survival_score' && val > game.survivalHighScore) {
                game.survivalHighScore = val; try { localStorage.setItem('monster_shot_survival_score', val); } catch(e) {}
            }
        });
    }).catch(e => {});
}

function initVKSdk() {
    const hidePreloader = () => {
        const preloader = document.getElementById('preloader');
        if (preloader) { preloader.style.opacity = '0'; setTimeout(() => preloader.style.display = 'none', 300); }
    };

    try { const hs = localStorage.getItem('monster_shot_highscore'); if (hs) game.highScore = parseInt(hs); } catch(e) {}

    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || typeof window.vkBridge === 'undefined') {
        hidePreloader(); return Promise.resolve();
    }

    return window.vkBridge.send('VKWebAppInit')
        .then(() => {
            vkAvailable = true;
            try {
                window.vkBridge.subscribe((e) => {
                    if (e.detail.type === 'VKWebAppViewHide') {
                        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
                        if (game.state === 'playing') pauseGame();
                    }
                    if (e.detail.type === 'VKWebAppViewRestore') {
                        if (audioCtx && audioCtx.state === 'suspended' && soundEnabled) audioCtx.resume();
                    }
                });
            } catch(err) {}
            return window.vkBridge.send('VKWebAppGetUserInfo');
        })
        .then(userInfo => { vkData = userInfo; return loadProgress(); })
        .then(savedData => { game.savedProgress = savedData; return loadVKRecords(); })
        .then(() => { return loadGlobalChips(); }) // <--- ДОБАВИТЬ ЗАГРУЗКУ ЧИПОВ
        .then(() => { hidePreloader(); })
        .catch(err => { vkAvailable = false; hidePreloader(); });
}

function trackEvent(eventName, params = {}) {
    params.version = GAME_VERSION;
    params.mode = game.mode;
    if (game.mode === 'campaign') params.level = game.level;
    if (game.mode === 'survival') params.wave = game.wave;

    if (vkAvailable && window.vkBridge) {
        window.vkBridge.send('VKWebAppTrackEvent', { event_name: eventName, event_params: params }).catch(e => {});
    }
    if (typeof ym !== 'undefined' && typeof METRIKA_ID !== 'undefined') {
        ym(METRIKA_ID, 'reachGoal', eventName, params);
    }
}
// ===== СИСТЕМА ГЛОБАЛЬНОЙ ВАЛЮТЫ (ЧИПЫ) =====

function loadGlobalChips() {
    // 1. ГЛАВНЫЙ ИСТОЧНИК — СЕРВЕР (База данных)
    if (vkData && vkData.id) {
        return fetch(`http://mshot-pay.byethost7.com/get_balance.php?user_id=${vkData.id}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ok') {
                    game.chips = data.chips;
                    game.equippedSkin = data.skin;
                    updateChipsUI();
                    
                    try { localStorage.setItem('ms_global_chips', game.chips); } catch(e){}
                    try { localStorage.setItem('ms_equipped_skin', game.equippedSkin); } catch(e){}
                    console.log('✅ Баланс загружен с сервера:', game.chips);
                }
            })
            .catch(e => {
                console.log('❌ Ошибка сервера, используем кэш');
                try {
                    const localChips = localStorage.getItem('ms_global_chips');
                    if (localChips) game.chips = parseInt(localChips) || 0;
                    const localSkin = localStorage.getItem('ms_equipped_skin'); 
                    if (localSkin) game.equippedSkin = localSkin; 
                } catch (e) {}
            });
    }
    
    // 2. Если ВК нет (локальный запуск), берем всё из кэша
    try {
        const localChips = localStorage.getItem('ms_global_chips');
        if (localChips) game.chips = parseInt(localChips) || 0;
        
        const localUnlocks = localStorage.getItem('ms_terminal_unlocks'); 
        if (localUnlocks) game.terminalUnlocks = JSON.parse(localUnlocks); 
        
        const localSkin = localStorage.getItem('ms_equipped_skin'); 
        if (localSkin) game.equippedSkin = localSkin; 
        
        const localDaily = localStorage.getItem('ms_daily_chips');
        if (localDaily) game.dailyChips = JSON.parse(localDaily);
        
        // Загружаем купленные улучшения
        const localUpgrades = localStorage.getItem('ms_terminal_upgrades');
        if (localUpgrades) game.terminalUpgrades = JSON.parse(localUpgrades);

        // Загружаем сумку имплантов
        const localImplants = localStorage.getItem('ms_implants_bag');
        if (localImplants) game.implantsBag = JSON.parse(localImplants);
		
		 // Загружаем надетые импланты
        const localEquipped = localStorage.getItem('ms_equipped_implants'); // <--- ДОБАВИТЬ
        if (localEquipped) game.equippedImplants = JSON.parse(localEquipped); // <--- ДОБАВИТЬ
    } catch (e) {}

    return Promise.resolve();
}
function saveGlobalChips() {
    // Сохраняем только локально как резервную копию. 
    // Сервер сохраняет сам через update_chips.php!
    try { localStorage.setItem('ms_global_chips', game.chips); } catch(e) {}
    try { localStorage.setItem('ms_daily_chips', JSON.stringify(game.dailyChips)); } catch(e) {}
    try { localStorage.setItem('ms_terminal_unlocks', JSON.stringify(game.terminalUnlocks)); } catch(e) {} 
    try { localStorage.setItem('ms_equipped_skin', game.equippedSkin); } catch(e) {}
	try { localStorage.setItem('ms_terminal_upgrades', JSON.stringify(game.terminalUpgrades)); } catch(e) {} 
    try { localStorage.setItem('ms_implants_bag', JSON.stringify(game.implantsBag)); } catch(e) {}
	try { localStorage.setItem('ms_equipped_implants', JSON.stringify(game.equippedImplants)); } catch(e) {}
}

function addChips(amount, reason = 'unknown') {
    if (amount === 0) return; 
    
    game.chips += amount;
    updateChipsUI(); 
    trackEvent('Chips_Earned', { amount: amount, reason: reason, total: game.chips });
    
    if (vkData && vkData.id) {
        const formData = new FormData();
        formData.append('user_id', vkData.id);
        formData.append('amount', amount);
        
        fetch('http://mshot-pay.byethost7.com/update_chips.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.result) {
                console.log('✅ Сервер начислил чипы');
                saveGlobalChips();
            }
        })
        .catch(e => console.log('❌ Ошибка синхронизации', e));
    } else {
        saveGlobalChips();
    }
}

function checkDailyLogin() {
    const today = new Date().toISOString().split('T')[0]; // Формат YYYY-MM-DD
    
    if (game.dailyChips.lastLoginDate !== today) {
        game.dailyChips.lastLoginDate = today;
        game.dailyChips.adsWatchedToday = 0; // Сбрасываем счетчик рекламы
        addChips(1, 'daily_login');
        saveGlobalChips();
		return true;
    }
	 return false;
}