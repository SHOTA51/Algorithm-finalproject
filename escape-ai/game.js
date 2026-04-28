/**
 * Escape the AI Hunter - Tactical Puzzle Edition (Full Map & Random Spawn)
 */

const GRID_SIZE = 30; // ขยายขนาด Grid ให้เต็มตาขึ้น
let maxWallBudget = 7; 
const OBSTACLE_DENSITY = 0.12; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusOverlay = document.getElementById('status-overlay');
const statusText = document.getElementById('status-text');
const stateValue = document.getElementById('game-state-text');
const wallsLeftEl = document.getElementById('walls-left');
const startBtn = document.getElementById('start-btn');
const retryBtn = document.getElementById('retry-btn');
const nextBtn = document.getElementById('next-btn');

let grid = [];
let initialAiPos = { r: 0, c: 0 };
let initialPlayerPos = { r: 0, c: 0 };
let initialFixedWalls = []; // Store coordinates of fixed walls
let isSearching = false;
let isGameOver = false;
let wallsPlacedCount = 0;
let finalPath = [];
let searchingNodes = new Set();
let cellWidth = 0;
let cellHeight = 0;

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
    cellWidth = canvas.width / GRID_SIZE;
    cellHeight = canvas.height / GRID_SIZE;
}

function initGrid() {
    resizeCanvas();
    grid = [];
    initialFixedWalls = [];
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
        initialFixedWalls.push({r, c});
    }

    // 2. Truly Random Spawning (with distance check)
    playerPos = getRandomEmptyPos();
    aiPos = getRandomEmptyPosWithDistance(playerPos, 15);

    // Ensure spawn points are clear and handle potential null aiPos
    if (!aiPos) {
        initGrid();
        return;
    }

    grid[playerPos.r][playerPos.c].isWall = false;
    grid[playerPos.r][playerPos.c].isFixedWall = false;
    grid[aiPos.r][aiPos.c].isWall = false;
    grid[aiPos.r][aiPos.c].isFixedWall = false;

    // Verify Initial Path Existence
    if (!hasPath(aiPos, playerPos)) {
        initGrid();
        return;
    }

    // Save initial state for retry
    initialPlayerPos = { ...playerPos };
    initialAiPos = { ...aiPos };

    // Randomize Wall Budget (6 to 10)
    const dist = getDistance(playerPos, aiPos);
    const baseBudget = dist > 25 ? 7 : 6;
    maxWallBudget = Math.floor(Math.random() * 4) + baseBudget; 

    // Winnability Check: Ensure the Min-Cut (minimum nodes to block) is <= maxWallBudget
    if (!isLevelWinnable(aiPos, playerPos, maxWallBudget)) {
        console.log("Level unwinnable, regenerating...");
        initGrid();
        return;
    }

    resetGameState();
}

/**
 * Uses BFS to find the minimum number of nodes required to disconnect AI from Player.
 * If this number > budget, the level is "unwinnable" for a standard player.
 */
function isLevelWinnable(start, end, budget) {
    const startNode = grid[start.r][start.c];
    const endNode = grid[end.r][end.c];
    
    // Simple Min-Cut approximation for grid:
    // We check how many independent paths exist.
    // If the "bottleneck" width of the map is greater than the budget, it's unwinnable.
    
    let tempGrid = grid.map(row => row.map(node => ({ ...node })));
    let pathsFound = 0;
    
    // We try to find 'budget + 1' paths. 
    // If we find them, and each path requires a unique node to be blocked,
    // and we run out of budget, it's too hard.
    while (pathsFound <= budget) {
        let path = findAnyPath(start, end, tempGrid);
        if (!path) return true; // Disconnected! Definitely winnable.
        
        pathsFound++;
        if (pathsFound > budget) return false; // Too many paths to block
        
        // "Block" this path by turning a node on it into a wall for the next search
        // We pick a node that isn't the start or end
        let blockNode = path.find(n => 
            !(n.r === start.r && n.c === start.c) && 
            !(n.r === end.r && n.c === end.c)
        );
        if (blockNode) {
            tempGrid[blockNode.r][blockNode.c].isWall = true;
        } else {
            break;
        }
    }
    
    return true;
}

function findAnyPath(start, end, customGrid) {
    let queue = [[start]];
    let visited = new Set();
    visited.add(`${start.r},${start.c}`);
    
    while (queue.length > 0) {
        let path = queue.shift();
        let curr = path[path.length - 1];
        
        if (curr.r === end.r && curr.c === end.c) return path;
        
        const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        for (let [dr, dc] of dirs) {
            let nr = curr.r + dr, nc = curr.c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                let neighbor = customGrid[nr][nc];
                if (!neighbor.isWall && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    queue.push([...path, { r: nr, c: nc }]);
                }
            }
        }
    }
    return null;
}

function resetGameState() {
    wallsPlacedCount = 0;
    isGameOver = false;
    isSearching = false;
    finalPath = [];
    searchingNodes = new Set();
    playerPos = { ...initialPlayerPos };
    aiPos = { ...initialAiPos };
    
    // Reset grid walls (keep only fixed ones)
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!grid[r][c].isFixedWall) {
                grid[r][c].isWall = false;
            }
        }
    }

    statusOverlay.classList.add('hidden');
    stateValue.textContent = "BUILDING";
    startBtn.disabled = false;
    updateWallUI();
    render();
}

function retryLevel() {
    resetGameState();
}

function nextLevel() {
    initGrid();
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
    wallsLeftEl.textContent = maxWallBudget - wallsPlacedCount;
}

async function startAiHunter() {
    if (isSearching || isGameOver) return;
    isSearching = true;
    startBtn.disabled = true;
    stateValue.textContent = "HUNTING...";
    let openSet = [];
    let closedSet = new Set();
    searchingNodes = new Set();
    
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
        searchingNodes.add(current);

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
        if (searchingNodes.size % 10 === 0) {
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
            let color = "#050507"; // Deep black-gray floor
            if (node.isFixedWall) color = "#1e293b"; // Neutral slate for fixed obstacles
            else if (node.isWall) color = "#00e5ff"; // High-contrast cyan for player walls
            
            ctx.fillStyle = color;
            if (node.isWall && !node.isFixedWall) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00e5ff";
            }
            
            if (searchingNodes.has(node)) {
                color = "rgba(0, 229, 255, 0.1)";
                ctx.shadowBlur = 0;
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth - 1, cellHeight - 1);
            ctx.shadowBlur = 0;

            // Highlight restricted zones around player and hunter
            if (!isSearching && !isGameOver) {
                const isNearPlayer = Math.abs(r - playerPos.r) <= 1 && Math.abs(c - playerPos.c) <= 1;
                const isNearHunter = Math.abs(r - aiPos.r) <= 1 && Math.abs(c - aiPos.c) <= 1;

                if (isNearPlayer) {
                    ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
                    ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth - 1, cellHeight - 1);
                } else if (isNearHunter) {
                    ctx.fillStyle = "rgba(244, 63, 94, 0.08)";
                    ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth - 1, cellHeight - 1);
                }
            }
        }
    }
    if (finalPath.length > 0) {
        ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 3;
        ctx.shadowBlur = 10; ctx.shadowColor = "#00e5ff";
        ctx.beginPath();
        finalPath.forEach((step, i) => {
            const x = step.c * cellWidth + cellWidth/2;
            const y = step.r * cellHeight + cellHeight/2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    // AI Hunter
    ctx.shadowBlur = 20; ctx.shadowColor = "#f43f5e";
    ctx.fillStyle = "#f43f5e"; 
    ctx.fillRect(aiPos.c * cellWidth + 2, aiPos.r * cellHeight + 2, cellWidth - 4, cellHeight - 4);
    
    // Player
    ctx.shadowColor = "#10b981";
    ctx.fillStyle = "#10b981"; 
    ctx.fillRect(playerPos.c * cellWidth + 2, playerPos.r * cellHeight + 2, cellWidth - 4, cellHeight - 4);
    ctx.shadowBlur = 0;
}

canvas.addEventListener('mousedown', (e) => {
    if (isSearching || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / (rect.width / GRID_SIZE));
    const r = Math.floor((e.clientY - rect.top) / (rect.height / GRID_SIZE));
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        let node = grid[r][c];
        
        // Check for Safe Zone around Player (3x3 area)
        const isNearPlayer = Math.abs(r - playerPos.r) <= 1 && Math.abs(c - playerPos.c) <= 1;
        // Check for Safe Zone around Hunter (3x3 area)
        const isNearHunter = Math.abs(r - aiPos.r) <= 1 && Math.abs(c - aiPos.c) <= 1;

        if (node.isFixedWall || (r === aiPos.r && c === aiPos.c) || isNearPlayer || isNearHunter) return;

        if (e.button === 0 && !node.isWall) {
            if (wallsPlacedCount < maxWallBudget) { node.isWall = true; wallsPlacedCount++; }
        } else if (e.button === 2 && node.isWall) {
            node.isWall = false; wallsPlacedCount--;
        }
        updateWallUI(); render();
    }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

startBtn.addEventListener('click', startAiHunter);
retryBtn.addEventListener('click', retryLevel);
nextBtn.addEventListener('click', nextLevel);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') startAiHunter();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    render();
});

initGrid();