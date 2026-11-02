class Player {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 18; this.walkPhase = 0; this.recoil = 0;
        this.inventory = []; this.currentWeapon = 'pistol'; this.ownedWeapons = ['pistol']; this.angle = 0;
		this.magAmmo = WEAPONS[this.currentWeapon].magSize; // Патроны в текущей обойме
        this.isReloading = false; // Флаг перезарядки
		this.weaponMags = {
            pistol: WEAPONS.pistol.magSize,
            shotgun: WEAPONS.shotgun.magSize,
            sniper: WEAPONS.sniper.magSize,
            alien_rifle: WEAPONS.alien_rifle.magSize
        };
        this.applyUpgrades(true);
		this.claws = [];
		this.initClaws();
    }
        
		applyUpgrades(fullHeal = false) {
        const u = game.upgrades; 
        
        const tu = game.terminalUpgrades || {};
        
        let extraHp = (tu['extraHp'] || 0) * 10; 
        let extraSpeed = (tu['extraSpeed'] || 0) * 0.05; 
        let extraDamage = (tu['extraDamage'] || 0) * 2; 
        
        if (game.equippedSkin === 'skinBear') {
            extraHp += 50;
            extraSpeed -= 0.05;
        }
        
        this.maxHp = 100 + u.maxhp * 10 + extraHp; 
        this.speed = 3.4 * (1 + u.speed * 0.05 + extraSpeed); 
        this.extraDamage = extraDamage; 
        this.maxAmmo = 300;
        
        if (fullHeal) this.hp = this.maxHp; else this.hp = Math.min(this.hp, this.maxHp);
    }
    
	initClaws() {
        this.claws = [];
        const count = game.equippedImplants.filter(id => id === 'claw').length;
        if (count >= 1) this.claws.push({ side: 1, angle: this.angle || 0, cooldown: 0, shootAnim: 0 });
        if (count >= 2) this.claws.push({ side: -1, angle: this.angle || 0, cooldown: 0, shootAnim: 0 });
    }

        updateClaws(dt) {
        if (!this.claws || !this.claws.length) return;
        const cfg = IMPLANTS_CONFIG.claw;

        for (const claw of this.claws) {
            const sideAngle = this.angle + Math.PI / 2;
            const backAngle = this.angle + Math.PI;
            const baseX = this.x + Math.cos(sideAngle) * claw.side * 15 + Math.cos(backAngle) * 15;
            const baseY = this.y + Math.sin(sideAngle) * claw.side * 15 + Math.sin(backAngle) * 15;

            let target = null, minDist = Infinity;
            
            // 1. Поиск цели с проверкой стен
            for (const e of game.enemies) {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                
                if (d < cfg.range && d < minDist) { 
                    
                    // --- ПРОВЕРКА ЛИНИИ ВИДИМОСТИ ---
                    let canSee = true;
                    const dx = e.x - baseX;
                    const dy = e.y - baseY;
                    const distToEnemy = Math.hypot(dx, dy);
                    const steps = Math.max(10, Math.ceil(distToEnemy / 20));
                    
                    for (let i = 1; i < steps; i++) {
                        const t = i / steps;
                        const cx = baseX + dx * t;
                        const cy = baseY + dy * t;
                        for (const w of game.walls) {
                            if (cx > w.x && cx < w.x + w.w && cy > w.y && cy < w.y + w.h) {
                                canSee = false; // Стена мешает!
                                break;
                            }
                        }
                        if (!canSee) break;
                    }
                    // ---------------------------------

                    if (canSee) {
                        minDist = d; 
                        target = e; 
                    }
                }
            }

            // 2. Поворот ствола
            const targetAngle = target ? Math.atan2(target.y - baseY, target.x - baseX) : this.angle;

            let diff = targetAngle - claw.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            claw.angle += diff * Math.min(1, dt * 10);

            if (claw.damageTimer === undefined) claw.damageTimer = 0;
            claw.isShooting = false;

            // 3. Стрельба и урон
            if (target) {
                const tipDist = 45; 
                const tipX = baseX + Math.cos(claw.angle) * tipDist;
                const tipY = baseY + Math.sin(claw.angle) * tipDist;

                let endX = target.x;
                let endY = target.y;
                
                // Проверка луча (чтобы он не рисовался сквозь стены, если цель резко сместилась)
                const dx = endX - tipX; 
                const dy = endY - tipY; 
                const dist = Math.hypot(dx, dy);
                const steps = Math.ceil(dist / 10);
                let hitWall = false;

                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const cx = tipX + dx * t;
                    const cy = tipY + dy * t;
                    for (const w of game.walls) {
                        if (cx > w.x && cx < w.x + w.w && cy > w.y && cy < w.y + w.h) {
                            endX = cx; endY = cy; hitWall = true; break;
                        }
                    }
                    if (hitWall) break;
                }

                game.clawLasers.push({ x1: tipX, y1: tipY, x2: endX, y2: endY });

                if (!hitWall) {
                    claw.isShooting = true;
                    claw.damageTimer -= dt;
                    
                    if (claw.damageTimer <= 0) {
                        target.hp -= 1; 
                        target.hitFlash = 0.05;
                        spawnDamageNumber(target.x, target.y - target.radius, 1, target.hp <= 0);
                        playHitSound();
                        if (target.hp <= 0) killEnemy(target);
                        claw.damageTimer += 0.05; 
                    }
                }
            }
        }
    }

    drawClaws(c) {
        if (!this.claws || !this.claws.length) return;
        for (const claw of this.claws) {
            const sideAngle = this.angle + Math.PI / 2;
            const backAngle = this.angle + Math.PI;
            const baseX = this.x + Math.cos(sideAngle) * claw.side * 15 + Math.cos(backAngle) * 15;
            const baseY = this.y + Math.sin(sideAngle) * claw.side * 15 + Math.sin(backAngle) * 15;

            const targetAngle = claw.angle;
            const clawLength = 45; 
            const endX = baseX + Math.cos(targetAngle) * clawLength;
            const endY = baseY + Math.sin(targetAngle) * clawLength;

            // Изгиб сустава
            const bendAngle = targetAngle + claw.side * 0.8; 
            const elbowX = baseX + Math.cos(bendAngle) * (clawLength * 0.5);
            const elbowY = baseY + Math.sin(bendAngle) * (clawLength * 0.5);

            c.save();
            
            // Разбиваем руку на 10 сегментов для плавности
            const points = [];
            for (let i = 0; i <= 10; i++) {
                const t = i / 10;
                // Формула квадратичной кривой Безье
                const px = Math.pow(1-t, 2)*baseX + 2*(1-t)*t*elbowX + Math.pow(t, 2)*endX;
                const py = Math.pow(1-t, 2)*baseY + 2*(1-t)*t*elbowY + Math.pow(t, 2)*endY;
                points.push({ x: px, y: py });
            }

            // Отрисовка сегментов руки
            for (let i = 0; i < 10; i++) {
                c.strokeStyle = i % 2 === 0 ? '#555' : '#777';
                c.lineWidth = 9 - (i * 0.4);
                c.lineCap = 'round';
                c.beginPath();
                c.moveTo(points[i].x, points[i].y);
                c.lineTo(points[i+1].x, points[i+1].y);
                c.stroke();

                // Шарниры (соединения)
                c.fillStyle = '#333';
                c.beginPath();
                c.arc(points[i].x, points[i].y, 4.5 - (i*0.2), 0, Math.PI * 2);
                c.fill();
            }

            // Крепление к спине
            c.fillStyle = '#222'; c.strokeStyle = '#444'; c.lineWidth = 2;
            c.beginPath(); c.arc(baseX, baseY, 8, 0, Math.PI * 2); c.fill(); c.stroke();

            // === ЛАЗЕРНЫЙ СТВОЛ ВМЕСТО КЛЕШНИ ===
            c.save();
            c.translate(endX, endY);
            c.rotate(targetAngle);

            // Корпус пушки
            c.fillStyle = '#2a2a2a'; c.strokeStyle = '#111'; c.lineWidth = 2;
            c.beginPath(); c.roundRect(-5, -7, 20, 14, 4); c.fill(); c.stroke();

            // Дуло
            c.fillStyle = '#444';
            c.fillRect(15, -3, 12, 6);

            // Светящееся ядро (светится постоянно, пока бьет)
            const glow = claw.isShooting ? 25 : 5;
            c.fillStyle = '#ff0066'; c.shadowColor = '#ff0066'; c.shadowBlur = glow;
            c.fillRect(25, -2, 4, 4);
            c.shadowBlur = 0;

            c.restore(); // конец ствола
            c.restore(); // конец отрисовки
        }
    }
	
	setWeapon(wid) {
        if (!this.ownedWeapons.includes(wid)) return;
        this.weaponMags[this.currentWeapon] = this.magAmmo; // Сохраняем текущие патроны
        this.currentWeapon = wid;
        this.magAmmo = this.weaponMags[wid] !== undefined ? this.weaponMags[wid] : WEAPONS[wid].magSize; // Загружаем новые
        this.isReloading = false; // Сбрасываем перезарядку при смене
    }
	
	getWeapon() { return WEAPONS[this.currentWeapon]; }
    update(dt) {
        let dx = 0, dy = 0;
        if (isMobile && joystickActive) {
            dx = joystickVector.x; dy = joystickVector.y;
            if (Math.abs(dx) < 0.1) dx = 0; if (Math.abs(dy) < 0.1) dy = 0;
        } else {
            if (game.keys['w'] || game.keys['ц']) dy -= 1; if (game.keys['s'] || game.keys['ы']) dy += 1;
            if (game.keys['a'] || game.keys['ф']) dx -= 1; if (game.keys['d'] || game.keys['в']) dx += 1;
        }
        if (dx !== 0 || dy !== 0) { const len = Math.hypot(dx, dy); if (len > 0) { dx /= len; dy /= len; } this.walkPhase += dt * 12; }
        else this.walkPhase *= 0.85;
        const newX = this.x + dx * this.speed; const newY = this.y + dy * this.speed;
        if (!this.collides(newX, this.y)) this.x = newX;
        if (!this.collides(this.x, newY)) this.y = newY;
        
        if (!(isMobile && typeof shootJoystickActive !== 'undefined' && shootJoystickActive)) {
            const worldMouseX = game.mouseX + game.camX; const worldMouseY = game.mouseY + game.camY;
            this.angle = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);
        }
        if (this.recoil > 0) this.recoil -= dt * 10;
		this.updateClaws(dt);
    }
    collides(x, y) {
        for (const w of game.walls) { if (x + this.radius > w.x && x - this.radius < w.x + w.w && y + this.radius > w.y && y - this.radius < w.y + w.h) return true; }
        return false;
    }
        draw(targetCtx = null) {
        const c = targetCtx || ctx; // Если контекст не передан, рисуем на основном экране
        const bob = Math.sin(this.walkPhase) * 2;
        c.save(); c.translate(this.x, this.y + bob);
        c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(0, this.radius - 2, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2); c.fill();
        c.rotate(this.angle);
        const recoilOffset = this.recoil > 0 ? -this.recoil * 3 : 0; c.translate(recoilOffset, 0);
        
        const legSwing = Math.sin(this.walkPhase) * 5;
        
        let legColor = '#3a5a8a', bodyGrad0 = '#5a8aca', bodyGrad1 = '#2a4a7a', strokeColor = '#1a2a4a';
        
        if (game.equippedSkin === 'skinCyber') {
            legColor = '#00ff88'; bodyGrad0 = '#00ff88'; bodyGrad1 = '#008844'; strokeColor = '#ffffff';
            c.shadowColor = '#00ff88'; c.shadowBlur = 15; 
        } else if (game.equippedSkin === 'skinShadow') {
            legColor = '#222'; bodyGrad0 = '#444'; bodyGrad1 = '#111'; strokeColor = '#888';
        } else if (game.equippedSkin === 'skinBear') {
            legColor = '#5c2e0b'; bodyGrad0 = '#8b4513'; bodyGrad1 = '#5c2e0b'; strokeColor = '#3a1a05';
        } else if (game.equippedSkin === 'skinAlien') {
            legColor = '#4a1a66'; bodyGrad0 = '#8a2be2'; bodyGrad1 = '#4a1a66'; strokeColor = '#2a0a44';
        }

        c.fillStyle = legColor; c.fillRect(-6, -14 + legSwing, 8, 6); c.fillRect(-6, 8 - legSwing, 8, 6);
        const grad = c.createRadialGradient(-4, -4, 2, 0, 0, this.radius);
        grad.addColorStop(0, bodyGrad0); grad.addColorStop(1, bodyGrad1);
        c.fillStyle = grad; c.beginPath(); c.arc(0, 0, this.radius, 0, Math.PI * 2); c.fill();
        c.strokeStyle = strokeColor; c.lineWidth = 2; c.stroke();
        
        c.shadowBlur = 0; 
		
        if (game.equippedSkin === 'skinBear') {
            c.fillStyle = '#5c2e0b';
            c.beginPath(); c.arc(0, -this.radius + 4, 8, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(0, this.radius - 4, 8, 0, Math.PI * 2); c.fill();
        }

        if (game.equippedSkin === 'skinAlien' && game.alienShieldHp > 0) {
            c.save();
            c.strokeStyle = 'rgba(0, 255, 255, 0.8)'; c.fillStyle = 'rgba(0, 255, 255, 0.15)';
            c.lineWidth = 3; c.shadowColor = '#00ffff'; c.shadowBlur = 15;
            c.beginPath(); c.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
            c.fill(); c.stroke(); c.restore();
        }
		        // Отрисовка Энергощита (Имплант)
        if (game.equippedSkin !== 'skinAlien' && game.implantShieldHp > 0) {
            // Ищем, какой именно щит надет
            const activeShield = game.equippedImplants.find(id => id && IMPLANTS_CONFIG[id] && IMPLANTS_CONFIG[id].type === 'shield');
            
            if (activeShield) {
                // Цвет зависит от уровня щита
                let color = '#ffaa00'; // 1 ур (Оранжевый)
                if (activeShield === 'shield_2') color = '#00ff88'; // 2 ур (Зеленый)
                if (activeShield === 'shield_3') color = '#ff00aa'; // 3 ур (Розовый)

                c.save();
                // Полупрозрачная заливка
                c.globalAlpha = 0.15;
                c.fillStyle = color;
                c.beginPath(); c.arc(0, 0, this.radius + 15, 0, Math.PI * 2); c.fill();
                
                // Яркая обводка
                c.globalAlpha = 0.9;
                c.strokeStyle = color; 
                c.lineWidth = 3; 
                c.shadowColor = color; 
                c.shadowBlur = 15;
                c.beginPath(); c.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
                c.stroke(); 
                c.restore();
            }
        }
		
        if (this.currentWeapon === 'shotgun') {
            c.fillStyle = '#333'; c.fillRect(this.radius - 4, -5, 22, 10); c.fillStyle = '#555'; c.fillRect(this.radius + 12, -4, 12, 8);
        } else if (this.currentWeapon === 'sniper') {
            c.fillStyle = '#111'; c.fillRect(this.radius - 4, -3, 32, 6); c.fillStyle = '#333'; c.fillRect(this.radius + 15, -5, 10, 10);
            c.fillStyle = '#444'; c.fillRect(this.radius + 5, -6, 5, 12);
        } else if (this.currentWeapon === 'alien_rifle') {
            c.save();
            c.fillStyle = '#222'; c.fillRect(this.radius - 8, -5, 8, 10);
            c.fillStyle = '#00ffff'; c.shadowColor = '#00ffff'; c.shadowBlur = 10;
            c.fillRect(this.radius - 4, -4, 26, 8);
            c.fillStyle = '#ff0044'; c.shadowColor = '#ff0044'; c.shadowBlur = 15;
            c.beginPath(); c.arc(this.radius + 14, 0, 4, 0, Math.PI * 2); c.fill();
            c.shadowBlur = 0; c.strokeStyle = '#ffffff'; c.lineWidth = 1;
            c.strokeRect(this.radius - 4, -4, 26, 8);
            c.fillStyle = '#00ffff'; c.fillRect(this.radius + 22, -2, 6, 4);
            c.restore();
        } else {
            c.fillStyle = '#222'; c.fillRect(this.radius - 4, -3, 16, 6); c.fillStyle = '#444'; c.fillRect(this.radius + 6, -2, 8, 4);
        }
        
        if (game.equippedSkin === 'skinAlien') {
            c.fillStyle = '#66ff66'; c.beginPath(); c.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#000'; c.beginPath(); c.ellipse(4, -3, 2.5, 4, -0.2, 0, Math.PI * 2); c.ellipse(4, 3, 2.5, 4, 0.2, 0, Math.PI * 2); c.fill();
        } else {
            c.fillStyle = '#ffcc99'; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#000'; c.beginPath(); c.arc(4, -3, 1.5, 0, Math.PI * 2); c.arc(4, 3, 1.5, 0, Math.PI * 2); c.fill();
        }
        
        c.restore();
		this.drawClaws(c);
    }
}

class Enemy {
    constructor(x, y, type) {
        const cfg = ENEMY_TYPES[type];
		this.stunTimer = 0;
        this.x = x; this.y = y; this.type = type; this.hp = cfg.hp; this.maxHp = cfg.hp; this.speed = cfg.speed; this.damage = cfg.damage;
        this.radius = cfg.radius; this.color = cfg.color; this.darkColor = cfg.darkColor; this.score = cfg.score; this.coins = cfg.coins;
        this.isSquare = !!cfg.isSquare; this.isTurret = !!cfg.isTurret; this.isShield = !!cfg.isShield; this.isBomber = !!cfg.isBomber;
        this.angle = 0; this.walkPhase = Math.random() * Math.PI * 2;
        this.attackCooldown = 0; this.bossMeleeCooldown = 0; this.hitFlash = 0; this.state = 'wander';
        this.wanderAngle = Math.random() * Math.PI * 2; this.wanderTimer = 1 + Math.random() * 2;
        
        this.isBoss = type === 'boss'; this.isMiniBoss = type === 'miniboss'; this.isMegaBoss = type === 'megaboss';
        this.isGhost = (type === 'ghost' || type === 'ghost_boss' || type === 'ghost_mother'); 
        this.isGhostBoss = type === 'ghost_boss';
        this.isGhostMother = type === 'ghost_mother';
        this.isSuperMother = type === 'super_mother';
        
        this.canShootAcid = this.isBoss || this.isMiniBoss || this.isMegaBoss;
        
        if (this.isMegaBoss || this.isBoss || this.isGhostBoss || this.isSuperMother) this.vision = 99999;
        else if (this.isMiniBoss || this.isGhostMother) this.vision = 600; 
        else if (this.isTurret) this.vision = 700; 
        else this.vision = ENEMY_VISION;

        this.acidCooldown = 2; if (this.isMiniBoss) this.acidInterval = 2.2; else if (this.isMegaBoss) this.acidInterval = 1.5; else this.acidInterval = 2.5;
        if (this.isMegaBoss) this.meleeDamage = 60; else if (this.isBoss) this.meleeDamage = 50; else if (this.isMiniBoss) this.meleeDamage = 30; else if (this.isGhostBoss || this.isGhostMother) this.meleeDamage = 20; else if (this.isSuperMother) this.meleeDamage = 25; else this.meleeDamage = 0;
        if (this.isMegaBoss) this.stopDistance = 240; else if (this.isBoss) this.stopDistance = 180; else if (this.isMiniBoss) this.stopDistance = 220; else if (this.isGhostBoss || this.isGhostMother) this.stopDistance = 260; else if (this.isSuperMother) this.stopDistance = 300; else this.stopDistance = 0;
        
        this.arrowCooldown = 1.5 + Math.random(); this.arrowInterval = 1.8;
        this.spawnCooldown = 3;
        this.laserCooldown = 5;
        this.laserTimer = 0;
        this.laserActive = false;
        this.laserAngle = 0;
    }

    update(dt) {
        const dx = game.player.x - this.x; const dy = game.player.y - this.y; const dist = Math.hypot(dx, dy);
		
		 // Если враг оглушен, он не двигается и не атакует
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            if (this.hitFlash > 0) this.hitFlash -= dt;
            return; // Выходим из update, пропуская всю логику ИИ
        }
		
		
		
        if (this.isBomber) {
            this.angle = Math.atan2(dy, dx);
            this.walkPhase += dt * 10;
            if (dist > 5) {
                const nx = dx / dist * this.speed; const ny = dy / dist * this.speed;
                if (!this.collides(this.x + nx, this.y)) this.x += nx;
                if (!this.collides(this.x, this.y + ny)) this.y += ny;
            }
            if (dist < this.radius + game.player.radius + 10) {
                this.hp = 0;
                explodeBomber(this);
            }
            return;
        }

        if (this.isTurret) {
            this.angle = Math.atan2(dy, dx); 
            
            let currentVision = this.vision; 
            if (game.equippedSkin === 'skinShadow') currentVision *= 0.5; // <--- Тень снижает зрение турели
            
            const canSee = dist < currentVision && this.hasLineOfSight(game.player.x, game.player.y);
            if (canSee) { this.arrowCooldown -= dt; if (this.arrowCooldown <= 0) { this.shootArrow(); this.arrowCooldown = this.arrowInterval + Math.random() * 0.3; } }
            if (this.hitFlash > 0) this.hitFlash -= dt; return;
        }

        if (this.isSuperMother) {
            this.angle = Math.atan2(dy, dx); this.walkPhase += dt * 5;
            
            this.spawnCooldown -= dt;
            if (this.spawnCooldown <= 0) {
                for (let i = 0; i < 5; i++) {
                    if (game.enemies.filter(e => e.type === 'sprinter' && e.superMother === this).length < 15) {
                        let ex = this.x; let ey = this.y; let tries = 0;
                        const r = ENEMY_TYPES['sprinter'].radius + 5;
                        while (tries < 20) {
                            const angle = Math.random() * Math.PI * 2;
                            const distOffset = 60 + Math.random() * 60;
                            const tx = this.x + Math.cos(angle) * distOffset;
                            const ty = this.y + Math.sin(angle) * distOffset;
                            let blocked = false;
                            for (const w of game.walls) {
                                if (tx + r > w.x && tx - r < w.x + w.w && ty + r > w.y && ty - r < w.y + w.h) { blocked = true; break; }
                            }
                            if (!blocked) { ex = tx; ey = ty; break; }
                            tries++;
                        }
                        let sprinter = new Enemy(ex, ey, 'sprinter');
                        sprinter.superMother = this;
                        game.enemies.push(sprinter);
                        spawnParticles(ex, ey, '#ff00aa', 10);
                    }
                }
                this.spawnCooldown = 10;
            }

            if (this.laserActive) {
                this.laserTimer -= dt;
                this.laserAngle = Math.atan2(dy, dx); 
                const distToLine = Math.abs((game.player.y - this.y) * Math.cos(this.laserAngle) - (game.player.x - this.x) * Math.sin(this.laserAngle));
                if (distToLine < 30 && dist < 800) {
                    if (this.hasLineOfSight(game.player.x, game.player.y)) {
                        game.player.hp -= 15 * dt;
                        if (Math.random() < 0.2) spawnParticles(game.player.x, game.player.y, '#ff00aa', 2);
                        updateHUD();
                        if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); }
                    }
                }
                if (this.laserTimer <= 0) { this.laserActive = false; this.laserCooldown = 5; }
            } else {
                this.laserCooldown -= dt;
                if (this.laserCooldown <= 0 && dist < 700) {
                    this.laserActive = true; this.laserTimer = 3; playSound(100, 1.0, 'sawtooth', 0.2);
                }
            }

            const stopDist = this.radius + game.player.radius + this.stopDistance;
            if (dist > stopDist) {
                const nx = dx / dist * this.speed; const ny = dy / dist * this.speed;
                if (!this.collides(this.x + nx, this.y)) this.x += nx;
                if (!this.collides(this.x, this.y + ny)) this.y += ny;
            }
            if (this.hitFlash > 0) this.hitFlash -= dt;
            return;
        }

        if (this.isGhostMother) {
            this.angle = Math.atan2(dy, dx); this.walkPhase += dt * 5;
            this.spawnCooldown -= dt;
            if (this.spawnCooldown <= 0) {
                if (game.enemies.filter(e => e.type === 'ghost' && e.ghostMother === this).length < 3) {
                    let ex = this.x; let ey = this.y; let tries = 0;
                    const r = ENEMY_TYPES['ghost'].radius + 5;
                    while (tries < 20) {
                        const angle = Math.random() * Math.PI * 2;
                        const distOffset = 40 + Math.random() * 40;
                        const tx = this.x + Math.cos(angle) * distOffset;
                        const ty = this.y + Math.sin(angle) * distOffset;
                        let blocked = false;
                        for (const w of game.walls) {
                            if (tx + r > w.x && tx - r < w.x + w.w && ty + r > w.y && ty - r < w.y + w.h) { blocked = true; break; }
                        }
                        if (!blocked) { ex = tx; ey = ty; break; }
                        tries++;
                    }
                    let g = new Enemy(ex, ey, 'ghost');
                    g.ghostMother = this;
                    game.enemies.push(g);
                    spawnParticles(ex, ey, '#aaccff', 10);
                }
                this.spawnCooldown = 4;
            }
            
            if (dist > this.radius + game.player.radius + 20) {
                const nx = dx / dist * this.speed; const ny = dy / dist * this.speed;
                if (!this.collides(this.x + nx, this.y)) this.x += nx;
                if (!this.collides(this.x, this.y + ny)) this.y += ny;
            } else {
                if (this.attackCooldown <= 0) {
                    game.player.hp -= this.damage; this.attackCooldown = 1.0; game.screenShake = 8;
                    spawnParticles(game.player.x, game.player.y, '#aaccff', 10); playSound(200, 0.1, 'square'); updateHUD();
                    if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); }
                }
            }
            if (this.attackCooldown > 0) this.attackCooldown -= dt;
            if (this.hitFlash > 0) this.hitFlash -= dt;
            return;
        }

            let currentVision = this.vision;
        if (game.equippedSkin === 'skinShadow') currentVision *= 0.5; // <--- Тень снижает зрение обычных мобов
        let canSee = (this.isMegaBoss || this.isBoss || this.isGhostBoss) ? true : (dist < currentVision && this.hasLineOfSight(game.player.x, game.player.y));
        
		if (canSee) this.state = 'chase'; else if (this.state === 'chase') this.state = 'wander';
        if (this.state === 'chase') {
            this.angle = Math.atan2(dy, dx); this.walkPhase += dt * 8;
            if (this.canShootAcid) { this.acidCooldown -= dt; if (this.acidCooldown <= 0 && dist < 900) { this.shootAcid(); this.acidCooldown = this.acidInterval + Math.random() * 0.5; } }
            const stopDist = this.canShootAcid ? this.radius + game.player.radius + this.stopDistance : this.radius + game.player.radius - 5;
            if (dist > stopDist) {
                const nx = dx / dist * this.speed; const ny = dy / dist * this.speed;
                if (!this.collides(this.x + nx, this.y)) this.x += nx;
                if (!this.collides(this.x, this.y + ny)) this.y += ny;
            } else if (this.meleeDamage > 0 && dist <= this.radius + game.player.radius + 5) {
                if (this.bossMeleeCooldown <= 0) {
                    game.player.hp -= this.meleeDamage; this.bossMeleeCooldown = this.isMegaBoss ? 0.8 : 1.0; game.screenShake = this.isMegaBoss ? 20 : 14;
                    spawnParticles(game.player.x, game.player.y, this.color, 14); spawnParticles(game.player.x, game.player.y, '#ff0044', 10); playSound(140, 0.2, 'sawtooth'); updateHUD();
                    if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); }
                }
                        } else if (!this.canShootAcid && dist <= this.radius + game.player.radius - 5) {
                if (this.attackCooldown <= 0) {
                    
                    // --- НОВЫЙ КОД: ЩИТ ИНОПЛАНЕТЯНИНА ---
                    if (game.equippedSkin === 'skinAlien' && game.alienShieldHp > 0) {
                        
                        // Отталкиваем спринтера (если это он)
                        if (this.type === 'sprinter') {
                            const pushAngle = Math.atan2(this.y - game.player.y, this.x - game.player.x);
                            this.x += Math.cos(pushAngle) * 50; // Отлетает на 50px
                            this.y += Math.sin(pushAngle) * 50;
                            spawnParticles(this.x, this.y, '#00ffff', 10); // Голубые искры при отскоке
                        }
                        
                        // Тратим прочность щита (вместо чистого урона)
                        game.alienShieldHp -= this.damage;
                        if (game.alienShieldHp < 0) game.alienShieldHp = 0;
                        
                        // Наносим игроку только 50% урона (вторая половина ушла в щит)
                        game.player.hp -= (this.damage * 0.5);
                        game.screenShake = 5;
                        this.attackCooldown = 0.5; // Пауза после удара
                        
                        playSound(400, 0.1, 'sine');
                        updateHUD();
                        if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); }
                        
                    } else {
                        // --- ОБЫЧНЫЙ УРОН (если щита нет) ---
                        game.player.hp -= this.damage; 
                        this.attackCooldown = 0.15; 
                        game.screenShake = 8;
                        spawnParticles(game.player.x, game.player.y, '#ff0044', 8); 
                        playSound(200, 0.1, 'square'); 
                        updateHUD();
                        if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); }
                    }
                    // ---------------------------------------

                }
            }
        } else {
            this.wanderTimer -= dt; if (this.wanderTimer <= 0) { this.wanderAngle = Math.random() * Math.PI * 2; this.wanderTimer = 1.5 + Math.random() * 2.5; }
            const nx = Math.cos(this.wanderAngle) * this.speed * 0.6; const ny = Math.sin(this.wanderAngle) * this.speed * 0.6;
            const blockedX = this.collides(this.x + nx, this.y); const blockedY = this.collides(this.x, this.y + ny);
            if (blockedX || blockedY) {
                this.wanderAngle = Math.random() * Math.PI * 2; this.wanderTimer = 0.5 + Math.random();
                const perpAngle = this.wanderAngle + Math.PI / 2; const px = Math.cos(perpAngle) * this.speed * 0.7; const py = Math.sin(perpAngle) * this.speed * 0.7;
                if (!this.collides(this.x + px, this.y)) this.x += px; if (!this.collides(this.x, this.y + py)) this.y += py;
            } else { this.x += nx; this.y += ny; this.walkPhase += dt * 5; }
            const targetAngle = this.wanderAngle; let diff = targetAngle - this.angle;
            while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
            this.angle += diff * Math.min(1, dt * 5);
        }
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.bossMeleeCooldown > 0) this.bossMeleeCooldown -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    shootArrow() {
        const angle = this.angle + (Math.random() - 0.5) * 0.05;
        game.arrows.push({ x: this.x + Math.cos(angle) * (this.radius + 6), y: this.y + Math.sin(angle) * (this.radius + 6), vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9, life: 2.5, angle: angle, damage: 12 });
        playSound(400, 0.1, 'square', 0.06); spawnParticles(this.x + Math.cos(angle) * 20, this.y + Math.sin(angle) * 20, '#ccccff', 5);
    }

    shootAcid() {
        const shotCount = this.isMegaBoss ? 3 : 1; const spreadTotal = this.isMegaBoss ? 0.5 : 0;
        for (let s = 0; s < shotCount; s++) {
            const offset = shotCount > 1 ? (s - (shotCount - 1) / 2) * (spreadTotal / (shotCount - 1)) : 0;
            const angle = this.angle + offset + (Math.random() - 0.5) * 0.15;
            game.enemyBullets.push({ x: this.x + Math.cos(this.angle) * (this.radius + 5), y: this.y + Math.sin(this.angle) * (this.radius + 5), vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, life: 2.0, radius: 10 });
        }
        playSound(180, 0.2, 'sawtooth', 0.1); spawnParticles(this.x, this.y, '#88ff44', 6);
    }

    hasLineOfSight(tx, ty) {
        const dist = Math.hypot(tx - this.x, ty - this.y);
        const steps = Math.max(15, Math.ceil(dist / 20));
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = this.x + (tx - this.x) * t;
            const y = this.y + (ty - this.y) * t;
            for (const w of game.walls) {
                if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return false;
            }
        }
        return true;
    }

    collides(x, y) {
        for (const w of game.walls) { if (x + this.radius > w.x && x - this.radius < w.x + w.w && y + this.radius > w.y && y - this.radius < w.y + w.h) return true; }
        return false;
    }

    drawSquare() {
        const legPhase = Math.sin(this.walkPhase) * 6;
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, this.radius + 6, this.radius * 1.1, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(this.angle);
        ctx.fillStyle = this.darkColor; ctx.fillRect(-6, -this.radius - 2 - legPhase * 0.5, 5, 10); ctx.fillRect(-6, this.radius - 8 + legPhase * 0.5, 5, 10);
        const s = this.radius * 1.6; const flash = this.hitFlash > 0;
        ctx.shadowColor = flash ? '#ffffff' : this.color; ctx.shadowBlur = flash ? 20 : 8;
        const grad = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2); grad.addColorStop(0, flash ? '#ffffff' : this.color); grad.addColorStop(1, flash ? '#ffaaaa' : this.darkColor);
        ctx.fillStyle = grad;
        const half = s / 2; const r = 4;
        ctx.beginPath(); ctx.moveTo(-half + r, -half); ctx.lineTo(half - r, -half); ctx.quadraticCurveTo(half, -half, half, -half + r); ctx.lineTo(half, half - r); ctx.quadraticCurveTo(half, half, half - r, half); ctx.lineTo(-half + r, half); ctx.quadraticCurveTo(-half, half, -half, half - r); ctx.lineTo(-half, -half + r); ctx.quadraticCurveTo(-half, -half, -half + r, -half); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ff0000'; ctx.fillRect(half * 0.35, -half * 0.4, 5, 5); ctx.fillRect(half * 0.35, half * 0.4 - 5, 5, 5);
        ctx.restore();
    }

    drawTurret() {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, this.radius, this.radius * 1.2, this.radius * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(this.angle);
        ctx.fillStyle = '#2a2a44'; ctx.beginPath(); ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#555577'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : '#666688'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.radius - 4, 0, Math.PI * 2); ctx.stroke();
        const flash = this.hitFlash > 0; const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius - 6);
        grad.addColorStop(0, flash ? '#ffffff' : '#8a8aac'); grad.addColorStop(1, flash ? '#ffaaaa' : '#3a3a5a');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, this.radius - 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff2244'; ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#666'; ctx.fillRect(this.radius - 4, -4, 20, 8); ctx.fillStyle = '#888'; ctx.fillRect(this.radius + 12, -2, 10, 4);
        ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.moveTo(this.radius + 22, -3); ctx.lineTo(this.radius + 22, 3); ctx.lineTo(this.radius + 28, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    drawGhost() {
        ctx.save(); const bobG = Math.sin(this.walkPhase) * 3; ctx.translate(this.x, this.y + bobG);
        ctx.fillStyle = 'rgba(100, 100, 200, 0.3)'; ctx.beginPath(); ctx.ellipse(0, this.radius, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        const flash = this.hitFlash > 0; const grad = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 2, 0, 0, this.radius * 1.2);
        grad.addColorStop(0, flash ? '#ffffff' : (this.isGhostBoss ? '#ffffff' : '#e0e0ff')); grad.addColorStop(0.6, flash ? '#ffaaaa' : this.color); grad.addColorStop(1, 'rgba(80, 80, 160, 0.3)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, this.radius, Math.PI, 0);
        const waveCount = this.isGhostBoss ? 6 : 4; const waveSize = this.radius * 2 / waveCount;
        for (let i = 0; i < waveCount; i++) {
            const x1 = this.radius - i * waveSize; const x2 = x1 - waveSize / 2; const x3 = x1 - waveSize;
            const waveY = this.radius + Math.sin(this.walkPhase * 3 + i) * 4; ctx.quadraticCurveTo(x2, waveY + 6, x3, waveY);
        }
        ctx.closePath(); ctx.fill();
        const eyeSize = this.isGhostBoss ? 5 : 3; const eyeOffset = this.isGhostBoss ? 8 : 5;
        ctx.fillStyle = '#000066'; ctx.beginPath(); ctx.arc(-eyeOffset, -4, eyeSize, 0, Math.PI * 2); ctx.arc(eyeOffset, -4, eyeSize, 0, Math.PI * 2); ctx.fill();
        const pupilSize = this.isGhostBoss ? 2.5 : 1.5; ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(-eyeOffset, -4, pupilSize, 0, Math.PI * 2); ctx.arc(eyeOffset, -4, pupilSize, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.restore();
    }

    draw() {
        if (this.isGhost && !this.isGhostBoss && !this.isGhostMother && this.state !== 'chase') {
            ctx.save(); ctx.globalAlpha = 0.15 + Math.sin(performance.now() / 300) * 0.05;
            ctx.fillStyle = '#c8c8ff'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return;
        }
        
        if (this.isGhostMother) {
            ctx.save(); const bobG = Math.sin(this.walkPhase) * 3; ctx.translate(this.x, this.y + bobG);
            ctx.fillStyle = 'rgba(100, 100, 200, 0.3)'; ctx.beginPath(); ctx.ellipse(0, this.radius, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            const flash = this.hitFlash > 0; const grad = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 2, 0, 0, this.radius * 1.2);
            grad.addColorStop(0, flash ? '#ffffff' : '#e0e0ff'); grad.addColorStop(0.6, flash ? '#ffaaaa' : this.color); grad.addColorStop(1, 'rgba(80, 80, 160, 0.3)');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, this.radius, Math.PI, 0);
            const waveCount = 6; const waveSize = this.radius * 2 / waveCount;
            for (let i = 0; i < waveCount; i++) {
                const x1 = this.radius - i * waveSize; const x2 = x1 - waveSize / 2; const x3 = x1 - waveSize;
                const waveY = this.radius + Math.sin(this.walkPhase * 3 + i) * 4; ctx.quadraticCurveTo(x2, waveY + 6, x3, waveY);
            }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#000066'; ctx.beginPath(); ctx.arc(-8, -4, 5, 0, Math.PI * 2); ctx.arc(8, -4, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(-8, -4, 2.5, 0, Math.PI * 2); ctx.arc(8, -4, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            ctx.restore();
            if (this.hp < this.maxHp) {
                const w = this.radius * 2; const h = 6; const bx = this.x - this.radius; const by = this.y - this.radius - 20;
                ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, h); ctx.fillStyle = '#aaccff'; ctx.fillRect(bx, by, w * (this.hp / this.maxHp), h);
            }
            return;
        }

        if (this.isSuperMother) {
            ctx.save(); ctx.translate(this.x, this.y);
            const flash = this.hitFlash > 0; 
            const grad = ctx.createRadialGradient(-20, -20, 5, 0, 0, this.radius);
            grad.addColorStop(0, flash ? '#ffffff' : '#ff44aa'); grad.addColorStop(1, flash ? '#ffaaaa' : '#660044');
            ctx.fillStyle = grad;
            ctx.beginPath();
            for(let i=0; i<8; i++){
                const angle = (i/8)*Math.PI*2 + performance.now()/2000;
                const r = this.radius + Math.sin(performance.now()/200 + i)*10;
                ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
            }
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#ff00aa'; ctx.lineWidth = 4; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            if (this.hp < this.maxHp) {
                const w = this.radius * 2; const h = 12; const bx = this.x - this.radius; const by = this.y - this.radius - 30;
                ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, h); ctx.fillStyle = '#ff00aa'; ctx.fillRect(bx, by, w * (this.hp / this.maxHp), h);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, w, h);
            }
            return;
        }

        if (this.isShield) {
            ctx.save(); ctx.translate(this.x, this.y);
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, this.radius, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.rotate(this.angle);
            const flash = this.hitFlash > 0;
            const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, this.radius);
            grad.addColorStop(0, flash ? '#ffffff' : this.color); grad.addColorStop(1, this.darkColor);
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#aaa'; ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 10, -Math.PI/2, Math.PI/2); ctx.lineTo(this.radius + 10, 0); ctx.stroke();
            ctx.fillStyle = 'rgba(200,200,200,0.5)'; ctx.beginPath(); ctx.arc(0, 0, this.radius + 10, -Math.PI/2, Math.PI/2); ctx.fill();
            ctx.restore();
            if (this.hp < this.maxHp) {
                const w = this.radius * 2; const h = 4; const bx = this.x - this.radius; const by = this.y - this.radius - 16;
                ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, h); ctx.fillStyle = this.color; ctx.fillRect(bx, by, w * (this.hp / this.maxHp), h);
            }
            return;
        }

        if (this.isBomber) {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, this.radius, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            const blink = Math.sin(performance.now() / 100) > 0 ? '#ff4400' : '#880000';
            const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, this.radius);
            grad.addColorStop(0, blink); grad.addColorStop(1, '#440000');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -5, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(this.radius - 5, -2, 8, 4);
            ctx.restore();
            return;
        }

        if (this.isGhost) {
            ctx.save(); ctx.globalAlpha = this.isGhostBoss ? 0.85 : 0.7; this.drawGhost(); ctx.restore();
            if (this.hp < this.maxHp) {
                const w = this.radius * 2; const h = this.isGhostBoss ? 8 : 4; const bx = this.x - this.radius; const by = this.y - this.radius - (this.isGhostBoss ? 20 : 14);
                ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, h); ctx.fillStyle = '#dcdcff'; ctx.fillRect(bx, by, w * (this.hp / this.maxHp), h);
                if (this.isGhostBoss) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, w, h); }
            }
            ctx.fillStyle = '#ff0044'; ctx.beginPath(); ctx.arc(this.x, this.y - this.radius - (this.isGhostBoss ? 26 : 20), 3, 0, Math.PI * 2); ctx.fill(); return;
        }

        if (this.isTurret) {
            this.drawTurret();
            if (this.hp < this.maxHp) {
                const w = this.radius * 2; const h = 4; const bx = this.x - this.radius; const by = this.y - this.radius - 14;
                ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, h); ctx.fillStyle = '#ffcc44'; ctx.fillRect(bx, by, w * (this.hp / this.maxHp), h);
            }
            return;
        }

        if (this.isSquare) {
            this.drawSquare();
            if (this.hp < this.maxHp) {
                const w = this.radius * 2; const h = 4; const bx = this.x - this.radius; const by = this.y - this.radius - 16;
                ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, h); ctx.fillStyle = this.color; ctx.fillRect(bx, by, w * (this.hp / this.maxHp), h);
            }
            if (this.state === 'chase') { ctx.fillStyle = '#ff0044'; ctx.beginPath(); ctx.arc(this.x, this.y - this.radius - 22, 3, 0, Math.PI * 2); ctx.fill(); }
            return;
        }

        const bob = Math.sin(this.walkPhase) * 3;
        ctx.save(); ctx.translate(this.x, this.y + bob);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, this.radius, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(this.angle);
        const tailSwing = Math.sin(this.walkPhase * 1.5) * 4;
        ctx.fillStyle = this.darkColor; ctx.beginPath(); ctx.ellipse(-this.radius, tailSwing, this.radius * 0.6, 5, 0, 0, Math.PI * 2); ctx.fill();
        const flash = this.hitFlash > 0; const grad = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 2, 0, 0, this.radius);
        grad.addColorStop(0, flash ? '#ffffff' : this.color); grad.addColorStop(1, flash ? '#ffaaaa' : this.darkColor);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ff0000'; const eyeSize = this.isMegaBoss ? 5 : 3;
        ctx.beginPath(); ctx.arc(this.radius * 0.4, -this.radius * 0.3, eyeSize, 0, Math.PI * 2); ctx.arc(this.radius * 0.4, this.radius * 0.3, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(this.radius * 0.3, 0); ctx.lineTo(this.radius * 0.7, -3); ctx.lineTo(this.radius * 0.7, 3); ctx.closePath(); ctx.fill();
		ctx.restore();
        if (this.state === 'chase' && !this.canShootAcid) { ctx.fillStyle = '#ff0044'; ctx.beginPath(); ctx.arc(this.x, this.y - this.radius - 8, 3, 0, Math.PI * 2); ctx.fill(); }
        if (this.hp < this.maxHp) {
            const w = this.radius * 2; const h = this.isMegaBoss ? 8 : 4; const bx = this.x - this.radius; const by = this.y - this.radius - (this.isMegaBoss ? 20 : 12);
            ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, h); let barColor = '#ff3344'; if (this.isMegaBoss) barColor = '#ff0088'; else if (this.isMiniBoss || this.isBoss) barColor = '#aa00ff';
            ctx.fillStyle = barColor; ctx.fillRect(bx, by, w * (this.hp / this.maxHp), h);
            if (this.isMegaBoss) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, w, h); }
        }
		        // Индикатор оглушения
        if (this.stunTimer > 0) {
            ctx.save();
            ctx.translate(this.x, this.y - this.radius - 15);
            const time = performance.now() / 200;
            for (let i = 0; i < 3; i++) {
                const angle = time + (i * Math.PI * 2 / 3);
                const sx = Math.cos(angle) * 15;
                const sy = Math.sin(angle) * 5;
                ctx.fillStyle = '#ffdd00';
                ctx.font = 'bold 14px Arial';
                ctx.fillText('💫', sx - 7, sy);
            }
            ctx.restore();
        }
		
    }
}

function explodeBomber(enemy) {
    game.explosions.push({ x: enemy.x, y: enemy.y, life: 0.5, maxLife: 0.5, radius: 80 });
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const e = game.enemies[i];
        if (e === enemy) continue;
        const d = Math.hypot(e.x - enemy.x, e.y - enemy.y);
        if (d < 80 + e.radius) {
            e.hp -= 100; e.hitFlash = 0.2; if (e.hp <= 0) killEnemy(e);
        }
    }
    const dp = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
    if (dp < 80) {
        game.player.hp -= 30; game.screenShake = 15; updateHUD();
        if (game.player.hp <= 0) { game.player.hp = 0; updateHUD(); gameOver(); }
    }
    spawnParticles(enemy.x, enemy.y, '#ff4400', 30);
    playSound(80, 0.5, 'sawtooth');
    killEnemy(enemy);
}