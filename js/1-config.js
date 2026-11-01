const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const crosshair = document.getElementById('crosshair');
let W = window.innerWidth; let H = window.innerHeight;
const GAME_VERSION = '0.1.5';
const METRIKA_ID = 113796779;

const MINE_RADIUS = 150; const MINE_DAMAGE = 120; const ENEMY_VISION = 300;
const ACID_RADIUS = 50; const ACID_LIFETIME = 5.0; const ACID_DPS = 2; const TOTAL_LEVELS = 15;
const BARREL_EXPLOSION_RADIUS = 100; const BARREL_FIRE_RADIUS = 75; const FIRE_DPS = 3; const FIRE_LIFETIME = 4.0;

const SHOOT_FORCE_THRESHOLD = 0.55;

const SUPPORT_URL = 'https://vk.ru/club242108226'; 
const AD_REWARD_COINS = 50;
const isMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 1024);

const LEVEL_PALETTES = {
    default: { bg: '#1a1a2e', grid: 'rgba(60, 60, 100, 0.5)', wallTop: '#4a4a6a', wallBottom: '#2a2a4a', wallBorder: '#6a6a8a', wallShadow: 'rgba(0,0,0,0.5)' },
    green: { bg: '#0e1e14', grid: 'rgba(50, 120, 70, 0.35)', wallTop: '#2e5a3a', wallBottom: '#1a3a22', wallBorder: '#4a8a5a', wallShadow: 'rgba(0, 20, 0, 0.6)' },
    purple: { bg: '#1c0e26', grid: 'rgba(120, 60, 150, 0.35)', wallTop: '#5a2e7a', wallBottom: '#3a1a52', wallBorder: '#8a5a9a', wallShadow: 'rgba(20, 0, 30, 0.6)' },
    red: { bg: '#200a0e', grid: 'rgba(150, 50, 50, 0.35)', wallTop: '#6a2a2e', wallBottom: '#42181c', wallBorder: '#9a4a4e', wallShadow: 'rgba(30, 0, 0, 0.6)' },
    dark: { bg: '#0a0a14', grid: 'rgba(80, 80, 120, 0.3)', wallTop: '#2a2a40', wallBottom: '#14142a', wallBorder: '#4a4a6a', wallShadow: 'rgba(0, 0, 0, 0.7)' },
    dark_red: { bg: '#140505', grid: 'rgba(100, 40, 40, 0.4)', wallTop: '#4a1a1a', wallBottom: '#2a0a0a', wallBorder: '#6a2a2a', wallShadow: 'rgba(10, 0, 0, 0.7)' },
    crimson: { bg: '#1a0000', grid: 'rgba(150, 20, 20, 0.5)', wallTop: '#6a0000', wallBottom: '#3a0000', wallBorder: '#9a0000', wallShadow: 'rgba(20, 0, 0, 0.8)' }
};
function getPaletteForLevel(level) {
    if (level === 7) return LEVEL_PALETTES.green; 
    if (level === 8 || level === 12) return LEVEL_PALETTES.purple;
    if (level === 9 || level === 13) return LEVEL_PALETTES.red; 
    if (level === 10) return LEVEL_PALETTES.dark;
    if (level === 11 || level === 14) return LEVEL_PALETTES.dark_red;
    if (level === 15) return LEVEL_PALETTES.crimson;
    return LEVEL_PALETTES.default;
}

const WAVE_MODIFIERS = [
    { id: 'bloodlust', icon: '🩸', name: 'КРОВОЖАДНОСТЬ', desc: '+30% урона врагов', color: '#ff0044' },
    { id: 'speed',     icon: '🏃', name: 'СПЕШКА',        desc: '+40% скорости врагов', color: '#ffaa00' },
    { id: 'goldrush',  icon: '💰', name: 'ЗОЛОТАЯ ЛИХОРАДКА', desc: 'x2 монет, но -25% HP', color: '#ffcc00' },
    { id: 'fog',       icon: '🌫', name: 'ТУМАН',         desc: 'Обзор ограничен', color: '#88aaff' },
    { id: 'hell',      icon: '🔥', name: 'АД',            desc: 'Повсюду огонь, патроны бесконечны', color: '#ff4400' }
];

const WEAPONS = {
    pistol: { id: 'pistol', name: 'Пистолет', icon: '🔫', damage: 20, spread: 0.08, fireRate: 160, bulletSpeed: 14, bulletsPerShot: 1, ammoPerShot: 1, soundFreq: 600, magSize: 10 },
    shotgun: { id: 'shotgun', name: 'Дробовик', icon: '💥', damage: 12, spread: 0.35, fireRate: 550, bulletSpeed: 13, bulletsPerShot: 6, ammoPerShot: 1, soundFreq: 300, magSize: 5 },
    sniper: { id: 'sniper', name: 'Снайперка', icon: '🎯', damage: 60, spread: 0.01, fireRate: 2500, bulletSpeed: 30, bulletsPerShot: 1, ammoPerShot: 1, soundFreq: 200, pierce: true, magSize: 1 },
    alien_rifle: { id: 'alien_rifle', name: 'Лазерная винтовка', icon: '🔫', damage: 25, spread: 0.02, fireRate: 120, bulletSpeed: 18, bulletsPerShot: 1, ammoPerShot: 1, soundFreq: 800, isAlien: true, magSize: 120 }
};

const SHOP_PRICE = 50; const MINE_SELL_PRICE = 10; const SHOTGUN_PRICE = 150; const SNIPER_PRICE = 500;
const SHOP_ITEMS = [
    { id: 'damage', icon: '🔫', name: 'Урон +2', desc: 'Урон пуль увеличивается на 2' },
    { id: 'maxhp',  icon: '❤',  name: 'Здоровье +10', desc: 'Максимум HP увеличивается на 10' },
    { id: 'speed',  icon: '⚡', name: 'Скорость +5%', desc: 'Скорость передвижения +5%' }
];

const ENEMY_TYPES = {
    weak: { hp: 30,  speed: 1.0, damage: 8,  radius: 14, color: '#88cc44', darkColor: '#558822', score: 10,  coins: 1 },
    medium: { hp: 55,  speed: 1.4, damage: 12, radius: 17, color: '#ff8844', darkColor: '#aa5522', score: 25,  coins: 2 },
    strong: { hp: 90,  speed: 1.7, damage: 18, radius: 20, color: '#cc3344', darkColor: '#881122', score: 50,  coins: 3 },
    miniboss: { hp: 200, speed: 1.3, damage: 20, radius: 26, color: '#aa00ff', darkColor: '#6600aa', score: 150, coins: 10 },
    sprinter: { hp: 15,  speed: 3.6, damage: 6,  radius: 11, color: '#44ddff', darkColor: '#0088aa', score: 20,  coins: 2 },
    megaboss: { hp: 2000, speed: 1.0, damage: 35, radius: 60, color: '#ff0088', darkColor: '#880044', score: 2000, coins: 100 },
    boss: { hp: 500, speed: 1.2, damage: 25, radius: 40, color: '#aa00ff', darkColor: '#6600aa', score: 500, coins: 25 },
    square_fast: { hp: 40,  speed: 2.6, damage: 10, radius: 16, color: '#66ddff', darkColor: '#0088cc', score: 30,  coins: 2, isSquare: true },
    square_medium: { hp: 120, speed: 1.8, damage: 16, radius: 20, color: '#ffcc44', darkColor: '#cc8800', score: 60,  coins: 4, isSquare: true },
    square_tank: { hp: 300, speed: 1.0, damage: 24, radius: 26, color: '#aa44ff', darkColor: '#5522aa', score: 120, coins: 8, isSquare: true },
    turret: { hp: 80,  speed: 0,   damage: 0,  radius: 22, color: '#444466', darkColor: '#222244', score: 80,  coins: 5, isTurret: true },
    ghost: { hp: 100, speed: 2.0, damage: 20, radius: 18, color: '#c8c8ff', darkColor: '#6666aa', score: 100, coins: 6 },
    ghost_boss: { hp: 1200, speed: 1.3, damage: 30, radius: 45, color: '#dcdcff', darkColor: '#5555aa', score: 1500, coins: 60 },
    ghost_mother: { hp: 700, speed: 1.1, damage: 20, radius: 30, color: '#aaccff', darkColor: '#444488', score: 500, coins: 30 },
    shield: { hp: 150, speed: 1.2, damage: 15, radius: 18, color: '#888888', darkColor: '#444444', score: 80, coins: 5, isShield: true },
    bomber: { hp: 40, speed: 2.5, damage: 0, radius: 16, color: '#ff4400', darkColor: '#aa0000', score: 60, coins: 4, isBomber: true },
    super_mother: { hp: 5000, speed: 0.6, damage: 25, radius: 70, color: '#ff00aa', darkColor: '#660044', score: 10000, coins: 500 }
};

const TUTORIAL_STEPS = [
    { id: 'welcome', title: '👋 ДОБРО ПОЖАЛОВАТЬ', text: 'Это Monster Shot — шутер с видом сверху. Твоя цель: убивать монстров, собирать монеты и становиться сильнее. Сейчас покажу, как всё устроено. Можно пропустить в любой момент.', target: null, mode: 'info' },
    { id: 'hud-hp', title: '❤ ЗДОРОВЬЕ', text: 'Слева сверху — твоё здоровье. Когда оно закончится — ты погибнешь. Восстанавливается аптечками ❤️, которые лежат на карте.', target: '#hp-item', mode: 'info' },
    { id: 'hud-ammo', title: '🔫 ПАТРОНЫ', text: 'Каждый выстрел тратит патроны. Пополняются ящиками AMMO на карте. Когда патроны кончатся — ты не сможешь стрелять.', target: '#ammo-item', mode: 'info' },
    { id: 'hud-weapon', title: '🎯 ОРУЖИЕ', text: 'Текущее оружие в руках. Сменить можно в инвентаре — клавиша E (или кнопка 🎒 на телефоне).', target: '#weapon-item', mode: 'info' },
    { id: 'hud-mines', title: '💣 МИНЫ', text: 'Сколько мин в инвентаре. Мины устанавливаются из инвентаря и взрываются, когда враг подходит близко.', target: '#mines-item', mode: 'info' },
    { id: 'hud-coins', title: '💰 МОНЕТЫ', text: 'Монеты. Собирай их с пола и с убитых врагов. Тратишь в магазине между уровнями на апгрейды и оружие.', target: '#coins-item', mode: 'info' },
    { id: 'hud-level', title: '🎯 УРОВЕНЬ', text: 'Номер уровня кампании. Сейчас у нас обучение.', target: '#level-item', mode: 'info' },
    { id: 'minimap', title: '🗺 МИНИКАРТА', text: 'Карта уровня в правом нижнем углу. Зелёная точка — ты. Красные — враги. Жёлтые — монеты. Очень помогает не заблудиться.', target: 'minimap', mode: 'info' },
    { id: 'move-up', title: '⬆ ИДИ ВВЕРХ', text: 'Нажми <b>W</b>, чтобы идти вверх.', target: 'joystick-move-if-mobile', keyHint: 'W', canvasSpotlight: true, mode: 'wait', waitFor: 'move-up' },
    { id: 'move-down', title: '⬇ ИДИ ВНИЗ', text: 'Нажми <b>S</b>, чтобы идти вниз.', target: 'joystick-move-if-mobile', keyHint: 'S', canvasSpotlight: true, mode: 'wait', waitFor: 'move-down' },
    { id: 'move-left', title: '⬅ ИДИ ВЛЕВО', text: 'Нажми <b>A</b>, чтобы идти влево.', target: 'joystick-move-if-mobile', keyHint: 'A', canvasSpotlight: true, mode: 'wait', waitFor: 'move-left' },
    { id: 'move-right', title: '➡ ИДИ ВПРАВО', text: 'Нажми <b>D</b>, чтобы идти вправо.', target: 'joystick-move-if-mobile', keyHint: 'D', canvasSpotlight: true, mode: 'wait', waitFor: 'move-right' },
    { id: 'shoot', title: '💥 СТРЕЛЬБА', text: isMobile ? 'Зажми <b>правый джойстик</b> (справа внизу), чтобы стрелять.' : 'Зажми <b>ЛКМ</b>, чтобы стрелять.', target: 'joystick-shoot-if-mobile', canvasSpotlight: true, mode: 'wait', waitFor: 'shoot' },
    { id: 'reload', title: '🔄 ПЕРЕЗАРЯДКА', text: isMobile ? 'Патроны в обойме закончились! Нажми на круг перезарядки или подожди.' : 'Патроны в обойме закончились! Нажми <b>R</b>, чтобы перезарядиться.', target: null, mode: 'wait', waitFor: 'reload' },
	{ id: 'mine', title: '💣 ПОДБЕРИ МИНУ', text: 'Подойди к пакету с миной <b>💣</b> (подсвечен вместе с тобой) и подбери его.', canvasSpotlight: true, canvasSpotlightMines: true, mode: 'wait', waitFor: 'mine' },
    { id: 'inventory', title: '🎒 ИНВЕНТАРЬ', text: isMobile ? 'Нажми кнопку <b>🎒</b> (справа внизу), чтобы открыть инвентарь.' : 'Нажми <b>E</b>, чтобы открыть инвентарь.', target: isMobile ? '#inv-btn-mobile' : null, keyHint: isMobile ? null : 'E', mode: 'wait', waitFor: 'inventory' },
    { id: 'select-mine', title: '💣 ВЫБЕРИ МИНУ', text: 'Нажми на <b>мину</b> в инвентаре, чтобы установить её перед собой.', target: '#inventory-items', mode: 'wait', waitFor: 'place_mine' },
    { id: 'kill', title: '👹 УБЕЙ МОНСТРА', text: 'Монстр подсвечен. Целься мышью (или правым джойстиком) и стреляй, пока он не умрёт.', canvasSpotlight: true, canvasSpotlightEnemies: true, mode: 'wait', waitFor: 'kill' }
];

const TERMINAL_ITEMS = [
    { id: 'startShotgun', category: 'unlocks', icon: '💥', name: 'Стартовый дробовик', desc: 'Начинать каждый забег с дробовиком', price: 20 },
    { id: 'startMines', category: 'unlocks', icon: '💣', name: 'Стартовые мины', desc: 'Начинать с 3 минами в инвентаре', price: 30 },
    { id: 'extraHp', category: 'unlocks', icon: '❤️', name: '+10 Макс. HP', desc: 'Увеличивает здоровье навсегда', price: 50 },
    { id: 'extraSpeed', category: 'unlocks', icon: '⚡', name: '+5% Скорость', desc: 'Увеличивает скорость навсегда', price: 50 },
    
    { id: 'skinCyber', category: 'skins', icon: '🧑‍💻', name: 'Кибер-стрелок', desc: 'Яркий костюм. Бонус: +5% к скорости стрельбы', price: 80 },
    { id: 'skinShadow', category: 'skins', icon: '🥷', name: 'Тень', desc: 'Скрытный костюм. Бонус: враги видят вас в 2 раза хуже', price: 100 },
    { id: 'skinBear', category: 'skins', icon: '🐻', name: 'Медведь', desc: '-5% скорость, +50 HP, +10% скорость стрельбы', price: 150 },
    { id: 'skinAlien', category: 'skins', icon: '👽', name: 'Инопланетянин', desc: 'Щит на 200 HP, поглощает 50% урона. Отталкивает спринтеров', price: 250 },
    { id: 'alien_rifle', category: 'unlocks', icon: '🔫', name: 'Лазерная винтовка', desc: 'Красные лазеры, 25 урона, высокая скорострельность', price: 150 },
    { id: 'combo_alien', category: 'unlocks', icon: '🎁', name: 'Комбо: Пришелец', desc: 'Скин Инопланетянин + Лазерная винтовка', price: 300, originalPrice: 400, isCombo: true },
    
    { id: 'implant1', category: 'implants', icon: '🧬', name: 'Регенерация', desc: 'В разработке', price: 999 },
    { id: 'implant2', category: 'implants', icon: '🧬', name: 'Крит. урон', desc: 'В разработке', price: 999 }
	
];