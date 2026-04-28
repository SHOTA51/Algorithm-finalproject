/**
 * Escape the AI Hunter - Tactical Puzzle Edition (Full Map & Random Spawn)
 */

const GRID_SIZE = 30; // ขยายขนาด Grid ให้เต็มตาขึ้น
const MAX_WALL_BUDGET = 7; 
const OBSTACLE_DENSITY = 0.12; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusOverlay = document.getElementById('status-overlay');
const statusText = document.getElementById('status-text');
const stateValue = document.getElementById('game-state-text');
const wallsLeftEl = document.getElementById('walls-left');

let grid = [];
let aiPos = { r: 0, c: 0 };
let playerPos = { r: 0, c: 0 };
let isSearching = false;
let isGameOver = false;
let wallsPlacedCount = 0;
let finalPath = [];
let searchingNodes = [];
let cellSize = 0;

class Node {
    constructor(r, c) {
        this.r = r; this.c = c;
        this.isWall = false;
        this.isFixedWall = false;
        this.g = Infinity;
        this.h = 0;
        this.f = Infinity;
        this.parent = null;
    }
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    cellSize = canvas.width / GRID_SIZE;
}

function initGrid() {
    resizeCanvas();
    grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        grid[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            grid[r][c] = new Node(r, c);
        }
    }

    // 1. Random Obstacles
    for (let i = 0; i < Math.floor(GRID_SIZE * GRID_SIZE * OBSTACLE_DENSITY); i++) {
        let r = Math.floor(Math.random() * GRID_SIZE);
        let c = Math.floor(Math.random() * GRID_SIZE);
        grid[r][c].isWall = true;
        grid[r][c].isFixedWall = true;
    }

    // 2. Truly Random Spawning (with distance check)
    playerPos = getRandomEmptyPos();
    aiPos = getRandomEmptyPosWithDistance(playerPos, 15);

    // Ensure spawn points are clear
    grid[playerPos.r][playerPos.c].isWall = false;
    grid[playerPos.r][playerPos.c].isFixedWall = false;
    grid[aiPos.r][aiPos.c].isWall = false;
    grid[aiPos.r][aiPos.c].isFixedWall = false;

    // Verify Path Existence
    if (!aiPos || !hasPath(aiPos, playerPos)) {
        initGrid();
        return;
    }

    wallsPlacedCount = 0;
    isGameOver = false;
    isSearching = false;
    finalPath = [];
    searchingNodes = [];
    statusOverlay.classList.add('hidden');
    stateValue.textContent = "BUILDING";
    updateWallUI();
    render();
}

function getRandomEmptyPos() {
    let r, c;
    do {
        r = Math.floor(Math.random() * GRID_SIZE);
        c = Math.floor(Math.random() * GRID_SIZE);
    } while (grid[r][c].isWall);
    return { r, c };
}

function getRandomEmptyPosWithDistance(target, minDist) {
    let r, c, tries = 0;
    do {
        r = Math.floor(Math.random() * GRID_SIZE);
        c = Math.floor(Math.random() * GRID_SIZE);
        tries++;
        if (tries > 200) return null; // Avoid infinite loop
    } while (grid[r][c].isWall || Math.abs(r - target.r) + Math.abs(c - target.c) < minDist);
    return { r, c };
}

function hasPath(start, end) {
    const queue = [start];
    const visited = new Set();
    const key = (p) => `${p.r},${p.c}`;
    visited.add(key(start));
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.r === end.r && curr.c === end.c) return true;
        for (let n of getNeighbors(grid[curr.r][curr.c])) {
            if (!n.isWall && !visited.has(key(n))) {
                visited.add(key(n));
                queue.push({ r: n.r, c: n.c });
            }
        }
    }
    return false;
}

function updateWallUI() {
    wallsLeftEl.textContent = MAX_WALL_BUDGET - wallsPlacedCount;
}

async function startAiHunter() {
    if (isSearching || isGameOver) return;
    isSearching = true;
    stateValue.textContent = "HUNTING...";
    let openSet = [];
    let closedSet = new Set();
    searchingNodes = [];
    
    for(let r=0; r<GRID_SIZE; r++) {
        for(let c=0; c<GRID_SIZE; c++) {
            grid[r][c].g = Infinity;
            grid[r][c].f = Infinity;
            grid[r][c].parent = null;
        }
    }

    const startNode = grid[aiPos.r][aiPos.c];
    const endNode = grid[playerPos.r][playerPos.c];
    startNode.g = 0;
    startNode.h = getDistance(startNode, endNode);
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        let current = openSet.shift();
        if (current === endNode) {
            reconstructPath(current);
            animateHunter();
            return;
        }
        closedSet.add(`${current.r},${current.c}`);
        searchingNodes.push(current);

        for (let neighbor of getNeighbors(current)) {
            if (neighbor.isWall || closedSet.has(`${neighbor.r},${neighbor.c}`)) continue;
            let tentativeG = current.g + 1;
            if (tentativeG < neighbor.g) {
                neighbor.parent = current;
                neighbor.g = tentativeG;
                neighbor.h = getDistance(neighbor, endNode);
                neighbor.f = neighbor.g + neighbor.h;
                if (!openSet.includes(neighbor)) openSet.push(neighbor);
            }
        }
        if (searchingNodes.length % 10 === 0) {
            render();
            await new Promise(r => setTimeout(r, 1));
        }
    }
    isSearching = false;
    isGameOver = true;
    statusText.textContent = "SAFE! AI TRAPPED";
    statusOverlay.classList.remove('hidden');
    stateValue.textContent = "TRAPPED";
    render();
}

function reconstructPath(node) {
    finalPath = [];
    let temp = node;
    while (temp) { finalPath.push(temp); temp = temp.parent; }
    finalPath.reverse();
}

async function animateHunter() {
    isSearching = false;
    for (let step of finalPath) {
        aiPos = { r: step.r, c: step.c };
        render();
        await new Promise(r => setTimeout(r, 70));
        if (aiPos.r === playerPos.r && aiPos.c === playerPos.c) {
            isGameOver = true;
            statusText.textContent = "CAUGHT! GAME OVER";
            statusOverlay.classList.remove('hidden');
            stateValue.textContent = "DEFEATED";
            return;
        }
    }
}

function getDistance(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function getNeighbors(node) {
    const res = [];
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for (let [dr, dc] of dirs) {
        let nr = node.r + dr, nc = node.c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) res.push(grid[nr][nc]);
    }
    return res;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const node = grid[r][c];
            let color = "#1e1e1e";
            if (node.isFixedWall) color = "#334155"; // สีเข้มสำหรับกำแพงสุ่มในแมพ
            else if (node.isWall) color = "#cbd5e1"; // สีสว่างสำหรับกำแพงที่ผู้เล่นวาง
            
            if (searchingNodes.includes(node)) color = "rgba(168, 85, 247, 0.15)";
            ctx.fillStyle = color;
            ctx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
        }
    }
    if (finalPath.length > 0) {
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
        ctx.beginPath();
        finalPath.forEach((step, i) => {
            const x = step.c * cellSize + cellSize/2;
            const y = step.r * cellSize + cellSize/2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
    
    // AI Hunter
    ctx.shadowBlur = 10; ctx.shadowColor = "#ef4444";
    ctx.fillStyle = "#ef4444"; 
    ctx.fillRect(aiPos.c * cellSize + 2, aiPos.r * cellSize + 2, cellSize - 4, cellSize - 4);
    
    // Player
    ctx.shadowColor = "#22c55e";
    ctx.fillStyle = "#22c55e"; 
    ctx.fillRect(playerPos.c * cellSize + 2, playerPos.r * cellSize + 2, cellSize - 4, cellSize - 4);
    ctx.shadowBlur = 0;
}

canvas.addEventListener('mousedown', (e) => {
    if (isSearching || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / (canvas.clientWidth / GRID_SIZE));
    const r = Math.floor((e.clientY - rect.top) / (canvas.clientHeight / GRID_SIZE));
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        let node = grid[r][c];
        
        // Check for Safe Zone around Player (3x3 area)
        const isNearPlayer = Math.abs(r - playerPos.r) <= 1 && Math.abs(c - playerPos.c) <= 1;
        // Check for Safe Zone around Hunter (3x3 area)
        const isNearHunter = Math.abs(r - aiPos.r) <= 1 && Math.abs(c - aiPos.c) <= 1;

        if (node.isFixedWall || (r === aiPos.r && c === aiPos.c) || isNearPlayer || isNearHunter) return;

        if (e.button === 0 && !node.isWall) {
            if (wallsPlacedCount < MAX_WALL_BUDGET) { node.isWall = true; wallsPlacedCount++; }
        } else if (e.button === 2 && node.isWall) {
            node.isWall = false; wallsPlacedCount--;
        }
        updateWallUI(); render();
    }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') startAiHunter();
    if (e.code === 'KeyR') initGrid();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    render();
});

initGrid();
