/**
 * Snake 1v1 Battle - Algorithm Discovery
 * SF231 Assignment
 */

// Game Constants
const TILE_COUNT = 30;
const GRID_SIZE = 20; 
const TICK_RATE = 14; 

// Game State
let playerSnake = [];
let botSnake = [];
let foods = [];
let playerDx = 0;
let playerDy = -1;
let nextPlayerDx = 0;
let nextPlayerDy = -1;
let botDx = 0;
let botDy = -1;
let playerScore = 0;
let botScore = 0;
let isGameOver = false;
let gameStarted = false;
let botDifficulty = 'hard';

let isPlayerBoosting = false;
let isBotBoosting = false;
let lastPlayerBoostLossTime = 0;
let lastBotBoostLossTime = 0;
let playerTickCounter = 0;
let botTickCounter = 0;
let gameTimeout;

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.getElementById('player-score');
const botScoreEl = document.getElementById('bot-score');
const gameStatusEl = document.getElementById('game-status');
const difficultySelect = document.getElementById('difficulty');
const algoTag = document.getElementById('algo-tag');
const algoDesc = document.getElementById('algo-desc');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const gameOverOverlay = document.getElementById('game-over');
const winnerAnnouncement = document.getElementById('winner-announcement');
const restartBtn = document.getElementById('restart-btn');

// Initialize Game
function init() {
    canvas.width = TILE_COUNT * GRID_SIZE;
    canvas.height = TILE_COUNT * GRID_SIZE;

    playerSnake = [{ x: 4, y: 15 }, { x: 4, y: 16 }, { x: 4, y: 17 }];
    playerDx = 0; playerDy = -1;
    nextPlayerDx = 0; nextPlayerDy = -1;

    botSnake = [{ x: 25, y: 15 }, { x: 25, y: 16 }, { x: 25, y: 17 }];
    botDx = 0; botDy = -1;

    foods = [];
    generateFood(); 
    playerScore = 0; botScore = 0;
    isGameOver = false;
    difficultySelect.disabled = false; // Unlock difficulty
    botDifficulty = difficultySelect.value;
    updateUI();
    render();
}

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    startScreen.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    difficultySelect.disabled = true; // Lock difficulty
    
    if (gameTimeout) clearTimeout(gameTimeout);
    gameLoop();
}

function gameLoop() {
    if (isGameOver) return;

    playerTickCounter++;
    botTickCounter++;

    let playerMoved = false;
    let botMoved = false;

    if (isPlayerBoosting || playerTickCounter >= 2) {
        playerMoved = true;
        playerTickCounter = 0;
    }

    if (isBotBoosting || botTickCounter >= 2) {
        botMoved = true;
        botTickCounter = 0;
    }

    if (playerMoved || botMoved) {
        processTick(playerMoved, botMoved);
    }

    gameTimeout = setTimeout(gameLoop, 1000 / TICK_RATE);
}

function generateFood() {
    const targetFoodCount = 3;
    while (foods.length < targetFoodCount) {
        const newFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        const isOccupied = playerSnake.some(p => p.x === newFood.x && p.y === newFood.y) || 
                           botSnake.some(p => p.x === newFood.x && p.y === newFood.y) ||
                           foods.some(f => f.x === newFood.x && f.y === newFood.y);
        if (!isOccupied) foods.push(newFood);
    }
}

function processTick(movePlayer, moveBot) {
    if (isGameOver) return;

    if (moveBot) aiMove();

    playerDx = nextPlayerDx;
    playerDy = nextPlayerDy;

    const newPlayerHead = { x: playerSnake[0].x + playerDx, y: playerSnake[0].y + playerDy };
    const newBotHead = { x: botSnake[0].x + botDx, y: botSnake[0].y + botDy };

    // Check food BEFORE movement to know if tails will grow
    const playerEats = movePlayer && foods.some(f => f.x === newPlayerHead.x && f.y === newPlayerHead.y);
    const botEats = moveBot && foods.some(f => f.x === newBotHead.x && f.y === newBotHead.y);

    let playerDead = false;
    let botDead = false;

    // 1. Wall Collisions
    if (movePlayer) {
        if (newPlayerHead.x < 0 || newPlayerHead.x >= TILE_COUNT || newPlayerHead.y < 0 || newPlayerHead.y >= TILE_COUNT) {
            playerDead = true;
        }
    }
    if (moveBot) {
        if (newBotHead.x < 0 || newBotHead.x >= TILE_COUNT || newBotHead.y < 0 || newBotHead.y >= TILE_COUNT) {
            botDead = true;
        }
    }

    // 2. Head-on Collision
    if (movePlayer && moveBot && newPlayerHead.x === newBotHead.x && newPlayerHead.y === newBotHead.y) {
        playerDead = true;
        botDead = true;
    }

    // 3. Body Collisions (Account for tail movement)
    if (movePlayer && !playerDead) {
        // Check against own body (excluding current tail if not growing)
        const pCheckLimit = playerEats ? playerSnake.length : playerSnake.length - 1;
        for (let i = 0; i < pCheckLimit; i++) {
            if (newPlayerHead.x === playerSnake[i].x && newPlayerHead.y === playerSnake[i].y) playerDead = true;
        }
        // Check against bot body (excluding its future tail position if it's moving)
        const bCheckLimit = (moveBot && !botEats) ? botSnake.length - 1 : botSnake.length;
        for (let i = 0; i < bCheckLimit; i++) {
            if (newPlayerHead.x === botSnake[i].x && newPlayerHead.y === botSnake[i].y) playerDead = true;
        }
    }

    if (moveBot && !botDead) {
        // Check against own body (excluding current tail if not growing)
        const bCheckLimit = botEats ? botSnake.length : botSnake.length - 1;
        for (let i = 0; i < bCheckLimit; i++) {
            if (newBotHead.x === botSnake[i].x && newBotHead.y === botSnake[i].y) botDead = true;
        }
        // Check against player body (excluding its future tail position if it's moving)
        const pCheckLimit = (movePlayer && !playerEats) ? playerSnake.length - 1 : playerSnake.length;
        for (let i = 0; i < pCheckLimit; i++) {
            if (newBotHead.x === playerSnake[i].x && newBotHead.y === playerSnake[i].y) botDead = true;
        }
    }

    if (playerDead && botDead) { endGame("Draw!"); return; }
    else if (playerDead) { endGame("Bot Wins!"); return; }
    else if (botDead) { endGame("Player Wins!"); return; }

    let updateUIFlag = false;

    if (movePlayer) {
        playerSnake.unshift(newPlayerHead);
        if (playerEats) {
            playerScore += 10;
            const foodIdx = foods.findIndex(f => f.x === newPlayerHead.x && f.y === newPlayerHead.y);
            foods.splice(foodIdx, 1);
            updateUIFlag = true;
        } else {
            playerSnake.pop();
        }

        if (isPlayerBoosting && playerSnake.length > 2) {
            const now = Date.now();
            if (now - lastPlayerBoostLossTime > 300) {
                playerSnake.pop();
                lastPlayerBoostLossTime = now;
            }
        }
    }

    if (moveBot) {
        botSnake.unshift(newBotHead);
        if (botEats) {
            botScore += 10;
            const foodIdx = foods.findIndex(f => f.x === newBotHead.x && f.y === newBotHead.y);
            foods.splice(foodIdx, 1);
            updateUIFlag = true;
        } else {
            botSnake.pop();
        }

        if (isBotBoosting && botSnake.length > 2) {
            const now = Date.now();
            if (now - lastBotBoostLossTime > 300) {
                botSnake.pop();
                lastBotBoostLossTime = now;
            }
        }
    }

    if (updateUIFlag) {
        updateUI();
        generateFood();
    }

    render();
}

function checkSnakeDead(head, ownBody, otherBody) {
    return false;
}

// AI Implementation
function aiMove() {
    const head = botSnake[0];
    const playerHead = playerSnake[0];
    
    // Find closest food
    let foodTarget = foods[0];
    let minDist = Infinity;
    foods.forEach(f => {
        const d = heuristic(head, f);
        if (d < minDist) { minDist = d; foodTarget = f; }
    });

    const distToPlayer = heuristic(head, playerHead);
    
    // Boost Decision
    if (botDifficulty === 'easy') {
        isBotBoosting = false;
    } else if (botDifficulty === 'medium') {
        isBotBoosting = (minDist < 3 && botSnake.length > 6);
    } else if (botDifficulty === 'hard') {
        isBotBoosting = (minDist < 5 || (distToPlayer < 6 && botSnake.length > playerSnake.length)) && botSnake.length > 5;
    } else { // Impossible
        isBotBoosting = (minDist < 8 || distToPlayer < 10) && botSnake.length > 4;
    }

    if (isBotBoosting && lastBotBoostLossTime === 0) lastBotBoostLossTime = Date.now();

    if (botDifficulty === 'easy') {
        moveEasy(foodTarget);
    } else if (botDifficulty === 'medium') {
        moveMedium(foodTarget);
    } else if (botDifficulty === 'hard') {
        // Predictive target
        const playerTarget = {
            x: (playerHead.x + playerDx * 2 + TILE_COUNT) % TILE_COUNT,
            y: (playerHead.y + playerDy * 2 + TILE_COUNT) % TILE_COUNT
        };
        const target = distToPlayer < 8 ? playerTarget : foodTarget;
        moveHard(target);
    } else { // Impossible
        // Aggressive interception
        const playerTarget = {
            x: (playerHead.x + playerDx * 3 + TILE_COUNT) % TILE_COUNT,
            y: (playerHead.y + playerDy * 3 + TILE_COUNT) % TILE_COUNT
        };
        const target = distToPlayer < 12 ? playerTarget : foodTarget;
        moveImpossible(target);
    }
}

function moveEasy(target) {
    const head = botSnake[0];
    const neighbors = getBasicNeighbors(head);
    // Easy doesn't check for walls/body strictly, just moves toward target
    neighbors.sort((a, b) => heuristic(a, target) - heuristic(b, target));
    const move = neighbors[0];
    botDx = move.x - head.x;
    botDy = move.y - head.y;
    algoTag.textContent = "Greedy Algorithm";
    algoDesc.textContent = "Basic movement toward the nearest food source.";
}

function moveMedium(target) {
    const head = botSnake[0];
    const safeNeighbors = getSafeNeighbors(head, botSnake, playerSnake);
    if (safeNeighbors.length > 0) {
        safeNeighbors.sort((a, b) => heuristic(a, target) - heuristic(b, target));
        const move = safeNeighbors[0];
        botDx = move.x - head.x;
        botDy = move.y - head.y;
    }
    algoTag.textContent = "Tactical Avoidance";
    algoDesc.textContent = "Checking for immediate collisions while pursuing food.";
}

function moveHard(target) {
    const start = botSnake[0];
    const path = findPath(start, target, botSnake, playerSnake);
    if (path && path.length > 1) {
        const nextStep = path[1];
        botDx = nextStep.x - start.x;
        botDy = nextStep.y - start.y;
    } else {
        const move = getSafeMove(botSnake, playerSnake);
        if (move) { 
            botDx = move.x - start.x; 
            botDy = move.y - start.y; 
        }
    }
    algoTag.textContent = "A* Hunter Search";
    algoDesc.textContent = "Calculating efficient paths to intercept the player or food.";
}

function moveImpossible(target) {
    const start = botSnake[0];
    // Impossible uses a "deeper" lookahead by avoiding spaces that would lead to dead ends
    const path = findPath(start, target, botSnake, playerSnake);
    if (path && path.length > 1) {
        const nextStep = path[1];
        botDx = nextStep.x - start.x;
        botDy = nextStep.y - start.y;
    } else {
        const move = getSafeMove(botSnake, playerSnake);
        if (move) { 
            botDx = move.x - start.x; 
            botDy = move.y - start.y; 
        }
    }
    algoTag.textContent = "Lethal Predation";
    algoDesc.textContent = "Executing near-perfect interception vectors. Escape is unlikely.";
}

// Helpers
function getBasicNeighbors(pos) {
    return [{x: pos.x+1, y: pos.y}, {x: pos.x-1, y: pos.y}, {x: pos.x, y: pos.y+1}, {x: pos.x, y: pos.y-1}];
}

function getSafeNeighbors(pos, ownBody, otherBody) {
    const isBot = (ownBody === botSnake);
    return getBasicNeighbors(pos).filter(n => {
        if (n.x < 0 || n.x >= TILE_COUNT || n.y < 0 || n.y >= TILE_COUNT) return false;
        
        // If we eat, our tail stays. If not, it moves.
        const willEat = foods.some(f => f.x === n.x && f.y === n.y);
        const ownLimit = willEat ? ownBody.length : ownBody.length - 1;
        for (let i = 0; i < ownLimit; i++) {
            if (n.x === ownBody[i].x && n.y === ownBody[i].y) return false;
        }

        // Avoid player head prediction
        if (isBot && botDifficulty !== 'easy') {
            const playerHead = playerSnake[0];
            const distToPlayerHead = Math.abs(n.x - playerHead.x) + Math.abs(n.y - playerHead.y);
            if (distToPlayerHead === 0) return false;
            if (botDifficulty === 'impossible' && distToPlayerHead === 1) return false;
        }

        for (let i = 0; i < otherBody.length; i++) {
            if (n.x === otherBody[i].x && n.y === otherBody[i].y) return false;
        }
        
        return true;
    });
}

function findPath(start, goal, ownBody, otherBody) {
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    const posKey = (p) => `${p.x},${p.y}`;
    gScore.set(posKey(start), 0);
    fScore.set(posKey(start), heuristic(start, goal));
    while (openSet.length > 0) {
        let current = openSet.reduce((min, p) => (fScore.get(posKey(p)) < fScore.get(posKey(min)) ? p : min), openSet[0]);
        if (current.x === goal.x && current.y === goal.y) return reconstructPath(cameFrom, current);
        openSet.splice(openSet.indexOf(current), 1);
        for (let neighbor of getSafeNeighbors(current, ownBody, otherBody)) {
            const tentativeG = gScore.get(posKey(current)) + 1;
            if (!gScore.has(posKey(neighbor)) || tentativeG < gScore.get(posKey(neighbor))) {
                cameFrom.set(posKey(neighbor), current);
                gScore.set(posKey(neighbor), tentativeG);
                fScore.set(posKey(neighbor), tentativeG + heuristic(neighbor, goal));
                if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) openSet.push(neighbor);
            }
        }
    }
    return null;
}

function heuristic(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function reconstructPath(cameFrom, current) {
    const path = [current];
    const posKey = (p) => `${p.x},${p.y}`;
    while (cameFrom.has(posKey(current))) { current = cameFrom.get(posKey(current)); path.unshift(current); }
    return path;
}

function getSafeMove(ownBody, otherBody) {
    const head = ownBody[0];
    let neighbors = getSafeNeighbors(head, ownBody, otherBody);
    
    if (neighbors.length === 0) return null;

    // Explicitly block 180-degree turns into neck
    if (ownBody.length > 1) {
        neighbors = neighbors.filter(n => n.x !== ownBody[1].x || n.y !== ownBody[1].y);
    }
    
    if (neighbors.length === 0) return null;

    return neighbors.reduce((best, n) => {
        const space = countFreeSpace(n, ownBody, otherBody);
        return space > best.space ? { move: n, space } : best;
    }, { move: neighbors[0], space: -1 }).move;
}

function countFreeSpace(start, ownBody, otherBody) {
    const visited = new Set();
    const queue = [start];
    const posKey = (p) => `${p.x},${p.y}`;
    visited.add(posKey(start));
    let count = 0;
    const maxScan = botDifficulty === 'impossible' ? 250 : 150;
    
    while (queue.length > 0 && count < maxScan) {
        const curr = queue.shift();
        count++;
        // Use conservative neighbors for flood fill calculation
        const neighbors = getBasicNeighbors(curr).filter(n => {
            if (n.x < 0 || n.x >= TILE_COUNT || n.y < 0 || n.y >= TILE_COUNT) return false;
            return !ownBody.some(p => p.x === n.x && p.y === n.y) && 
                   !otherBody.some(p => p.x === n.x && p.y === n.y);
        });
        for (let n of neighbors) {
            if (!visited.has(posKey(n))) { visited.add(posKey(n)); queue.push(n); }
        }
    }
    return count;
}

// UI and Render
function updateUI() {
    playerScoreEl.textContent = playerScore.toString().padStart(3, '0');
    botScoreEl.textContent = botScore.toString().padStart(3, '0');
}

function render() {
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(canvas.width, i * GRID_SIZE); ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 15; ctx.shadowColor = '#f43f5e';
    foods.forEach(f => {
        ctx.fillRect(f.x * GRID_SIZE + 2, f.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    });
    ctx.shadowBlur = 0;

    // Player Snake
    playerSnake.forEach((p, i) => {
        if (i === 0) {
            ctx.fillStyle = '#60a5fa';
            ctx.shadowBlur = isPlayerBoosting ? 15 : 0;
            ctx.shadowColor = '#60a5fa';
        } else {
            ctx.fillStyle = '#3b82f6';
            ctx.shadowBlur = 0;
        }
        if (isPlayerBoosting && i > 0) ctx.fillStyle = '#60a5fa';
        ctx.fillRect(p.x * GRID_SIZE + 1, p.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    ctx.shadowBlur = 0;

    // Bot Snake
    botSnake.forEach((p, i) => {
        if (i === 0) {
            ctx.fillStyle = '#e4e4e7';
            ctx.shadowBlur = isBotBoosting ? 15 : 0;
            ctx.shadowColor = '#e4e4e7';
        } else {
            ctx.fillStyle = '#a1a1aa';
            ctx.shadowBlur = 0;
        }
        if (isBotBoosting && i > 0) ctx.fillStyle = '#e4e4e7';
        ctx.fillRect(p.x * GRID_SIZE + 1, p.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    ctx.shadowBlur = 0;
}

function endGame(winner) {
    isGameOver = true;
    gameStarted = false;
    clearTimeout(gameTimeout);
    difficultySelect.disabled = false; // Unlock difficulty
    gameStatusEl.textContent = winner;
    winnerAnnouncement.textContent = winner;
    gameOverOverlay.classList.remove('hidden');
}

// Input Handling
window.addEventListener('keydown', e => {
    if (!gameStarted) {
        if (e.key === 'Enter' || e.key === ' ') {
            if (isGameOver) {
                init();
            }
            startGame();
        }
    }
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === ' ' && gameStarted && !isGameOver) {
        if (!isPlayerBoosting) {
            isPlayerBoosting = true;
            lastPlayerBoostLossTime = Date.now();
        }
    }

    if (gameStarted && !isGameOver) {
        switch(e.key) {
            case 'ArrowUp': case 'w': case 'W': if (playerDy !== 1) { nextPlayerDx = 0; nextPlayerDy = -1; } break;
            case 'ArrowDown': case 's': case 'S': if (playerDy !== -1) { nextPlayerDx = 0; nextPlayerDy = 1; } break;
            case 'ArrowLeft': case 'a': case 'A': if (playerDx !== 1) { nextPlayerDx = -1; nextPlayerDy = 0; } break;
            case 'ArrowRight': case 'd': case 'D': if (playerDx !== -1) { nextPlayerDx = 1; nextPlayerDy = 0; } break;
        }
    }
});

window.addEventListener('keyup', e => {
    if (e.key === ' ') {
        isPlayerBoosting = false;
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    init();
    startGame();
});
difficultySelect.addEventListener('change', () => { 
    botDifficulty = difficultySelect.value;
    difficultySelect.blur();
});

init();
