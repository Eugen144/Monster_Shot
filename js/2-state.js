const game = {
    state: 'menu', level: 0, totalCoins: 0, score: 0, keys: {}, mouseX: W / 2, mouseY: H / 2,
    mouseDown: false, lastShotTime: 0, walls: [], enemies: [], bullets: [], enemyBullets: [], arrows: [],
    coins: [], healPacks: [], ammoPacks: [], minePacks: [], weaponPacks: [], mines: [], acidPools: [],
    particles: [], explosions: [], barrels: [], fires: [], player: null, screenShake: 0, camX: 0, camY: 0,
    mapW: 0, mapH: 0, palette: LEVEL_PALETTES.default, upgrades: { damage: 0, maxhp: 0, speed: 0 },
    savedProgress: null, weaponHintSeen: false, tutorial: { active: false, step: 0, weaponHintActive: false, waitingFor: null, waitStartPos: null }, rewardAdUsedThisLevel: false, highScore: 0, sniperTrails: [],
    mode: 'campaign', wave: 1, ammoDropTimer: 0,
    xp: 0, xpTarget: 200,
    levelupPicksLeft: 0, levelupAdUsed: false, currentCards: [],
    floatingTexts: [], heartbeatTimer: 0.5,
    waveModifier: null, waveModifierActive: false, goldrushPenalty: 0,
    survivalHighWave: 0, survivalHighScore: 0,
     combo: 0, comboTimer: 0, comboMax: 0, comboFlashTimer: 0, // <--- ЗАПЯТАЯ!
    // НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ ЧИПОВ:
    chips: 0,
	chipsEarnedThisRun: {},
	terminalUnlocks: {},
	equippedSkin: 'default',
	alienShieldHp: 100,
    dailyChips: {
        lastLoginDate: null, // Дата последнего входа
        adsWatchedToday: 0   // Счётчик рекламы за сегодня
    }
};