/**
 * Snake 1v1 Battle - Algorithm Discovery
 * SF231 Assignment
 */

// Game Constants
const GRID_SIZE = 20;
const TILE_COUNT = 20;
const FIXED_SPEED = 7; // Fixed slower speed for better control

// Game State
let playerSnake = [];
let botSnake = [];
let food = { x: 10, y: 10 };
let playerDx = 0;
let playerDy = -1;
let nextPlayerDx = 0;
let nextPlayerDy = -1;
let botDx = 0;
let botDy = -1;
let playerScore = 0;
let botScore = 0;
let gameLoop;
let isGameOver = false;
let gameStarted = false;
let botDifficulty = 'hard';

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

// Initialize Game (Placement according to red lines in start.jpg)
function init() {
    // Player on the left "red line" (x=3)
    playerSnake = [
        { x: 3, y: 10 },
        { x: 3, y: 11 },
        { x: 3, y: 12 }
    ];
    playerDx = 0;
    playerDy = -1;
    nextPlayerDx = 0;
    nextPlayerDy = -1;

    // Bot on the right "red line" (x=16)
    botSnake = [
        { x: 16, y: 10 },
        { x: 16, y: 11 },
        { x: 16, y: 12 }
    ];
    botDx = 0;
    botDy = -1;

    food = { x: 10, y: 10 };
    playerScore = 0;
    botScore = 0;
    isGameOver = false;
    botDifficulty = difficultySelect.value;
    updateUI();
    render(); // Draw initial state
}

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    startScreen.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(draw, 1000 / FIXED_SPEED);
}

// Generate Food
function generateFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    
    const onSnake = (f) => {
        return playerSnake.some(p => p.x === f.x && p.y === f.y) || 
               botSnake.some(p => p.x === f.x && p.y === f.y);
    };

    if (onSnake(food)) generateFood();
}

// Draw Game
function draw() {
    if (isGameOver) return;

    aiMove();

    playerDx = nextPlayerDx;
    playerDy = nextPlayerDy;

    const newPlayerHead = { x: playerSnake[0].x + playerDx, y: playerSnake[0].y + playerDy };
    const newBotHead = { x: botSnake[0].x + botDx, y: botSnake[0].y + botDy };

    const playerDead = checkSnakeDead(newPlayerHead, playerSnake, botSnake);
    const botDead = checkSnakeDead(newBotHead, botSnake, playerSnake);

    if (playerDead && botDead) {
        endGame("Draw!");
        return;
    } else if (playerDead) {
        endGame("Bot Wins!");
        return;
    } else if (botDead) {
        endGame("Player Wins!");
        return;
    }

    playerSnake.unshift(newPlayerHead);
    botSnake.unshift(newBotHead);

    let foodEaten = false;
    if (newPlayerHead.x === food.x && newPlayerHead.y === food.y) {
        playerScore += 10;
        foodEaten = true;
    } else {
        playerSnake.pop();
    }

    if (newBotHead.x === food.x && newBotHead.y === food.y) {
        botScore += 10;
        foodEaten = true;
    } else {
        botSnake.pop();
    }

    if (foodEaten) {
        updateUI();
        generateFood();
    }

    render();
}

function checkSnakeDead(head, ownBody, otherBody) {
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) return true;
    for (let i = 0; i < ownBody.length; i++) {
        if (head.x === ownBody[i].x && head.y === ownBody[i].y) return true;
    }
    for (let i = 0; i < otherBody.length; i++) {
        if (head.x === otherBody[i].x && head.y === otherBody[i].y) return true;
    }
    return false;
}

// AI Implementation
function aiMove() {
    const head = botSnake[0];
    if (botDifficulty === 'easy') moveEasy();
    else if (botDifficulty === 'medium') moveMedium();
    else moveHard();
}

function moveEasy() {
    const head = botSnake[0];
    const neighbors = getBasicNeighbors(head);
    neighbors.sort((a, b) => heuristic(a, food) - heuristic(b, food));
    const move = neighbors[0];
    botDx = move.x - head.x;
    botDy = move.y - head.y;
    algoTag.textContent = "Greedy Algorithm";
    algoDesc.textContent = "Moving directly towards food with minimal safety checks.";
}

function moveMedium() {
    const head = botSnake[0];
    const safeNeighbors = getSafeNeighbors(head, botSnake, playerSnake);
    if (safeNeighbors.length > 0) {
        safeNeighbors.sort((a, b) => heuristic(a, food) - heuristic(b, food));
        const move = safeNeighbors[0];
        botDx = move.x - head.x;
        botDy = move.y - head.y;
    }
    algoTag.textContent = "Heuristic Avoidance";
    algoDesc.textContent = "Prioritizing survival while moving toward food.";
}

function moveHard() {
    const start = botSnake[0];
    const path = findPath(start, food, botSnake, playerSnake);
    if (path && path.length > 1) {
        const nextStep = path[1];
        botDx = nextStep.x - start.x;
        botDy = nextStep.y - start.y;
        algoTag.textContent = "A* Pathfinding";
        algoDesc.textContent = "Finding the optimal path to food while avoiding both snakes.";
    } else {
        const move = getSafeMove(botSnake, playerSnake);
        if (move) {
            botDx = move.x - start.x;
            botDy = move.y - start.y;
        }
        algoTag.textContent = "Survival BFS";
        algoDesc.textContent = "Optimal path blocked. Moving to largest available space.";
    }
}

// Helpers
function getBasicNeighbors(pos) {
    return [{x: pos.x+1, y: pos.y}, {x: pos.x-1, y: pos.y}, {x: pos.x, y: pos.y+1}, {x: pos.x, y: pos.y-1}];
}

function getSafeNeighbors(pos, ownBody, otherBody) {
    return getBasicNeighbors(pos).filter(n => {
        if (n.x < 0 || n.x >= TILE_COUNT || n.y < 0 || n.y >= TILE_COUNT) return false;
        if (ownBody.some(p => p.x === n.x && p.y === n.y)) return false;
        if (otherBody.some(p => p.x === n.x && p.y === n.y)) return false;
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
    const neighbors = getSafeNeighbors(head, ownBody, otherBody);
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
    while (queue.length > 0 && count < 100) {
        const curr = queue.shift();
        count++;
        for (let n of getSafeNeighbors(curr, ownBody, otherBody)) {
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
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(canvas.width, i * GRID_SIZE); ctx.stroke();
    }

    ctx.fillStyle = '#fb7185';
    ctx.shadowBlur = 10; ctx.shadowColor = '#fb7185';
    ctx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    ctx.shadowBlur = 0;

    playerSnake.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#38bdf8' : '#0ea5e9';
        ctx.fillRect(p.x * GRID_SIZE + 1, p.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    botSnake.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#f59e0b' : '#fbbf24';
        ctx.fillRect(p.x * GRID_SIZE + 1, p.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
}

function endGame(winner) {
    isGameOver = true;
    gameStarted = false;
    clearInterval(gameLoop);
    gameStatusEl.textContent = winner;
    winnerAnnouncement.textContent = winner;
    gameOverOverlay.classList.remove('hidden');
}

// Input Handling
window.addEventListener('keydown', e => {
    if (!gameStarted && (e.key === 'Enter' || e.key === ' ')) startGame();
    
    // Prevent default browser behavior (scrolling, selecting) for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    switch(e.key) {
        case 'ArrowUp': case 'w': case 'W': if (playerDy !== 1) { nextPlayerDx = 0; nextPlayerDy = -1; } break;
        case 'ArrowDown': case 's': case 'S': if (playerDy !== -1) { nextPlayerDx = 0; nextPlayerDy = 1; } break;
        case 'ArrowLeft': case 'a': case 'A': if (playerDx !== 1) { nextPlayerDx = -1; nextPlayerDy = 0; } break;
        case 'ArrowRight': case 'd': case 'D': if (playerDx !== -1) { nextPlayerDx = 1; nextPlayerDy = 0; } break;
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    init();
    startGame();
});
difficultySelect.addEventListener('change', () => { 
    botDifficulty = difficultySelect.value;
    difficultySelect.blur(); // Remove focus so arrow keys don't change difficulty
});

init();
