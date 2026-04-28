// Game State
const game = {
    bigBoard: Array(9).fill(null),
    subBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
    currentPlayer: 'X',
    activeBoard: null,
    gameMode: 'pvp',
    difficulty: 'medium',
    gameOver: false
};

// DOM Elements
const bigBoardEl = document.getElementById('big-board');
const playerTurnEl = document.getElementById('player-turn');
const boardInfoEl = document.getElementById('board-info');
const gameOverEl = document.getElementById('game-over');
const winnerTextEl = document.getElementById('winner-text');
const resetBtn = document.getElementById('reset-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const pvpBtn = document.getElementById('pvp-btn');
const pvcBtn = document.getElementById('pvc-btn');
const difficultySelect = document.getElementById('difficulty');
const difficultySelection = document.querySelector('.difficulty-selection');
const starterSelect = document.getElementById('starter');
const starterSelection = document.querySelector('.starter-selection');

// Initialize Game
function initGame() {
    game.bigBoard = Array(9).fill(null);
    game.subBoards = Array(9).fill(null).map(() => Array(9).fill(null));
    // Determine starting player based on mode and starter selection
    if (game.gameMode === 'pvc') {
        let starter = starterSelect ? starterSelect.value : 'player';
        if (starter === 'random') {
            starter = Math.random() < 0.5 ? 'player' : 'ai';
        }
        game.currentPlayer = starter === 'ai' ? 'O' : 'X';
    } else {
        game.currentPlayer = 'X';
    }
    game.activeBoard = null;
    game.gameOver = false;
    renderBoard();
    updateUI();

    // If AI should start, make its move
    if (game.gameMode === 'pvc' && game.currentPlayer === 'O' && !game.gameOver) {
        setTimeout(makeAIMove, 500);
    }
}

// Render Board
function renderBoard() {
    bigBoardEl.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const subBoardEl = document.createElement('div');
        subBoardEl.className = 'sub-board';
        subBoardEl.dataset.board = i;
        
        if (game.bigBoard[i]) {
            subBoardEl.classList.add('won');
            subBoardEl.dataset.winner = game.bigBoard[i];
        }
        
        if (game.activeBoard === null || game.activeBoard === i) {
            if (!game.bigBoard[i]) {
                subBoardEl.classList.add('active');
            }
        }
        
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('button');
            cell.className = 'cell';
            cell.dataset.board = i;
            cell.dataset.cell = j;
            
            const value = game.subBoards[i][j];
            if (value) {
                cell.textContent = value;
                cell.classList.add(value.toLowerCase());
                cell.disabled = true;
            } else if (game.bigBoard[i] || game.gameOver) {
                cell.disabled = true;
            } else if (game.activeBoard !== null && game.activeBoard !== i) {
                cell.disabled = true;
            } else {
                cell.addEventListener('click', handleCellClick);
            }
            
            subBoardEl.appendChild(cell);
        }
        
        bigBoardEl.appendChild(subBoardEl);
    }
}

// Handle Cell Click
function handleCellClick(e) {
    const boardIndex = parseInt(e.target.dataset.board);
    const cellIndex = parseInt(e.target.dataset.cell);
    
    makeMove(boardIndex, cellIndex);
}

// Make Move
function makeMove(boardIndex, cellIndex) {
    if (game.gameOver || game.subBoards[boardIndex][cellIndex]) return;
    if (game.activeBoard !== null && game.activeBoard !== boardIndex) return;
    
    game.subBoards[boardIndex][cellIndex] = game.currentPlayer;
    
    const subWinner = checkWinner(game.subBoards[boardIndex]);
    if (subWinner) {
        game.bigBoard[boardIndex] = subWinner;
        
        const bigWinner = checkWinner(game.bigBoard);
        if (bigWinner) {
            endGame(bigWinner);
            return;
        }
    }
    
    // Check for draw
    if (game.bigBoard.every(cell => cell !== null)) {
        endGame('Draw');
        return;
    }
    
    if (game.bigBoard[cellIndex] || isBoardFull(game.subBoards[cellIndex])) {
        game.activeBoard = null;
    } else {
        game.activeBoard = cellIndex;
    }
    
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
    
    renderBoard();
    updateUI();
    
    if (game.gameMode === 'pvc' && game.currentPlayer === 'O' && !game.gameOver) {
        setTimeout(makeAIMove, 500);
    }
}

// AI Move
function makeAIMove() {
    let move;
    
    switch (game.difficulty) {
        case 'easy':
            move = getRandomMove();
            break;
        case 'medium':
            move = getMediumMove();
            break;
        case 'hard':
            move = getHardMove();
            break;
        case 'impossible':
            move = getImpossibleMove();
            break;
    }
    
    if (move) {
        makeMove(move.board, move.cell);
    }
}

// Easy AI - Random
function getRandomMove() {
    const availableMoves = getAvailableMoves();
    if (availableMoves.length === 0) return null;
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

// Medium AI - Win/Block Logic
function getMediumMove() {
    const availableMoves = getAvailableMoves();
    if (availableMoves.length === 0) return null;
    
    for (const move of availableMoves) {
        if (canWinSubBoard(move.board, move.cell, 'O')) {
            return move;
        }
    }
    
    for (const move of availableMoves) {
        if (canWinSubBoard(move.board, move.cell, 'X')) {
            return move;
        }
    }
    
    const centerMoves = availableMoves.filter(m => m.cell === 4);
    if (centerMoves.length > 0) {
        return centerMoves[Math.floor(Math.random() * centerMoves.length)];
    }
    
    const cornerMoves = availableMoves.filter(m => [0, 2, 6, 8].includes(m.cell));
    if (cornerMoves.length > 0) {
        return cornerMoves[Math.floor(Math.random() * cornerMoves.length)];
    }
    
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

// Hard AI - Minimax
function getHardMove() {
    const availableMoves = getAvailableMoves();
    if (availableMoves.length === 0) return null;
    
    let bestScore = -Infinity;
    let bestMove = null;
    
    for (const move of availableMoves) {
        const score = evaluateMove(move);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove || availableMoves[0];
}

function evaluateMove(move) {
    let score = 0;
    
    if (canWinSubBoard(move.board, move.cell, 'O')) {
        score += 50;
        if (canWinBigBoard(move.board, 'O')) {
            score += 100;
        }
    }
    
    if (canWinSubBoard(move.board, move.cell, 'X')) {
        score += 40;
    }
    
    if (move.cell === 4) score += 5;
    if ([0, 2, 6, 8].includes(move.cell)) score += 3;
    
    if (game.activeBoard === null) {
        if (move.board === 4) score += 10;
        if ([0, 2, 6, 8].includes(move.board)) score += 5;
    }
    
    return score + Math.random() * 2;
}

function canWinSubBoard(boardIndex, cellIndex, player) {
    const tempBoard = [...game.subBoards[boardIndex]];
    tempBoard[cellIndex] = player;
    return checkWinner(tempBoard) === player;
}

function canWinBigBoard(boardIndex, player) {
    const tempBigBoard = [...game.bigBoard];
    tempBigBoard[boardIndex] = player;
    return checkWinner(tempBigBoard) === player;
}

// Impossible AI - Full Minimax with Deep Search
function getImpossibleMove() {
    const availableMoves = getAvailableMoves();
    if (availableMoves.length === 0) return null;
    
    // First move optimization - always take center if available
    if (game.bigBoard.every(cell => cell === null) && 
        game.subBoards.every(board => board.every(cell => cell === null))) {
        if (availableMoves.some(m => m.board === 4 && m.cell === 4)) {
            return { board: 4, cell: 4 };
        }
    }
    
    let bestScore = -Infinity;
    let bestMove = null;
    
    // Use minimax for critical moves
    for (const move of availableMoves) {
        const score = minimaxEvaluate(move, 3); // Depth 3 for deep analysis
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove || availableMoves[0];
}

function minimaxEvaluate(move, depth) {
    // Simulate the move
    const originalBoard = JSON.parse(JSON.stringify(game.subBoards));
    const originalBigBoard = [...game.bigBoard];
    const originalActiveBoard = game.activeBoard;
    
    // Make the move
    game.subBoards[move.board][move.cell] = 'O';
    
    // Check if this wins a sub-board
    const subWinner = checkWinner(game.subBoards[move.board]);
    if (subWinner === 'O') {
        game.bigBoard[move.board] = 'O';
        
        // Check if this wins the game
        if (checkWinner(game.bigBoard) === 'O') {
            // Restore state
            game.subBoards = originalBoard;
            game.bigBoard = originalBigBoard;
            game.activeBoard = originalActiveBoard;
            return 100000; // Instant win
        }
    }
    
    // Update active board
    if (game.bigBoard[move.cell] || isBoardFull(game.subBoards[move.cell])) {
        game.activeBoard = null;
    } else {
        game.activeBoard = move.cell;
    }
    
    // Evaluate position
    let score = evaluateImpossibleMove(move);
    
    // Add minimax lookahead if depth > 0
    if (depth > 0) {
        const opponentMoves = getAvailableMovesForPlayer('X');
        let worstOpponentScore = Infinity;
        
        for (const oppMove of opponentMoves.slice(0, 5)) { // Limit to top 5 moves for performance
            const oppScore = simulateOpponentMove(oppMove, depth - 1);
            worstOpponentScore = Math.min(worstOpponentScore, oppScore);
        }
        
        score -= worstOpponentScore * 0.5; // Factor in opponent's best response
    }
    
    // Restore state
    game.subBoards = originalBoard;
    game.bigBoard = originalBigBoard;
    game.activeBoard = originalActiveBoard;
    
    return score;
}

function simulateOpponentMove(move, depth) {
    const originalBoard = JSON.parse(JSON.stringify(game.subBoards));
    const originalBigBoard = [...game.bigBoard];
    const originalActiveBoard = game.activeBoard;
    
    game.subBoards[move.board][move.cell] = 'X';
    
    const subWinner = checkWinner(game.subBoards[move.board]);
    if (subWinner === 'X') {
        game.bigBoard[move.board] = 'X';
        
        if (checkWinner(game.bigBoard) === 'X') {
            game.subBoards = originalBoard;
            game.bigBoard = originalBigBoard;
            game.activeBoard = originalActiveBoard;
            return -100000;
        }
    }
    
    if (game.bigBoard[move.cell] || isBoardFull(game.subBoards[move.cell])) {
        game.activeBoard = null;
    } else {
        game.activeBoard = move.cell;
    }
    
    let score = -evaluatePositionForPlayer('X', move);
    
    if (depth > 0) {
        const aiMoves = getAvailableMovesForPlayer('O');
        let bestAiScore = -Infinity;
        
        for (const aiMove of aiMoves.slice(0, 3)) {
            const aiScore = minimaxEvaluate(aiMove, depth - 1);
            bestAiScore = Math.max(bestAiScore, aiScore);
        }
        
        score += bestAiScore * 0.3;
    }
    
    game.subBoards = originalBoard;
    game.bigBoard = originalBigBoard;
    game.activeBoard = originalActiveBoard;
    
    return score;
}

function getAvailableMovesForPlayer(player) {
    const moves = [];
    const boards = game.activeBoard !== null ? [game.activeBoard] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
    
    for (const boardIndex of boards) {
        if (game.bigBoard[boardIndex]) continue;
        
        for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
            if (!game.subBoards[boardIndex][cellIndex]) {
                moves.push({ board: boardIndex, cell: cellIndex });
            }
        }
    }
    
    return moves;
}

function evaluatePositionForPlayer(player, move) {
    let score = 0;
    
    if (canWinSubBoard(move.board, move.cell, player)) {
        score += 300;
        if (canWinBigBoard(move.board, player)) {
            score += 500;
        }
    }
    
    if (move.cell === 4) score += 20;
    if ([0, 2, 6, 8].includes(move.cell)) score += 15;
    
    score += countWinningOpportunities(move.board, move.cell, player) * 40;
    
    return score;
}

function evaluateImpossibleMove(move) {
    let score = 0;
    
    // Priority 1: Win Big Board immediately
    if (canWinSubBoard(move.board, move.cell, 'O')) {
        if (canWinBigBoard(move.board, 'O')) {
            return 50000; // Instant win
        }
        score += 1000; // Win sub-board
        
        // Bonus for winning strategic boards
        if (move.board === 4) score += 300;
        if ([0, 2, 6, 8].includes(move.board)) score += 200;
    }
    
    // Priority 2: Block opponent from winning Big Board
    if (canWinSubBoard(move.board, move.cell, 'X')) {
        if (canWinBigBoard(move.board, 'X')) {
            return 45000; // Must block
        }
        score += 900; // Block sub-board win
    }
    
    // Priority 3: Create double threat on Big Board
    const bigBoardThreats = countBigBoardThreats(move.board, 'O');
    score += bigBoardThreats * 400;
    
    // Priority 4: Block opponent's Big Board threats
    const opponentBigBoardThreats = countBigBoardThreats(move.board, 'X');
    score += opponentBigBoardThreats * 350;
    
    // Priority 5: Strategic positioning on Big Board
    const bigBoardStrategicValue = getBigBoardStrategicValue(move.board);
    score += bigBoardStrategicValue * 100;
    
    // Priority 6: Control center boards
    if (move.board === 4 && !game.bigBoard[4]) score += 200;
    if ([0, 2, 6, 8].includes(move.board) && !game.bigBoard[move.board]) score += 120;
    
    // Priority 7: Cell positioning within sub-board
    if (move.cell === 4) score += 50;
    if ([0, 2, 6, 8].includes(move.cell)) score += 35;
    if ([1, 3, 5, 7].includes(move.cell)) score += 15;
    
    // Priority 8: Create multiple winning opportunities
    score += countWinningOpportunities(move.board, move.cell, 'O') * 150;
    
    // Priority 9: Block opponent's opportunities
    score += countWinningOpportunities(move.board, move.cell, 'X') * 130;
    
    // Priority 10: Control where opponent goes next
    const nextBoardValue = evaluateNextBoardControl(move.cell);
    score += nextBoardValue;
    
    // Priority 11: Avoid sending opponent to advantageous boards
    if (!game.bigBoard[move.cell] && !isBoardFull(game.subBoards[move.cell])) {
        const opponentAdvantage = getOpponentAdvantageOnBoard(move.cell);
        score -= opponentAdvantage * 80;
        
        // Extra penalty for sending to center or corners
        if (move.cell === 4) score -= 100;
        if ([0, 2, 6, 8].includes(move.cell)) score -= 60;
    } else {
        // Bonus for giving opponent free choice (if we're winning)
        const ourBigBoardAdvantage = countBigBoardAdvantage('O');
        if (ourBigBoardAdvantage > 0) score += 50;
    }
    
    // Priority 12: Fork opportunities (multiple ways to win)
    score += countForkOpportunities(move.board, 'O') * 120;
    
    // Priority 13: Block opponent forks
    score += countForkOpportunities(move.board, 'X') * 100;
    
    // Priority 14: Tempo advantage (force opponent into bad positions)
    score += evaluateTempoAdvantage(move) * 70;
    
    return score;
}

function countBigBoardThreats(boardIndex, player) {
    if (game.bigBoard[boardIndex]) return 0;
    
    const tempBoard = [...game.bigBoard];
    tempBoard[boardIndex] = player;
    
    let threats = 0;
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        const positions = [tempBoard[a], tempBoard[b], tempBoard[c]];
        const playerCount = positions.filter(p => p === player).length;
        const emptyCount = positions.filter(p => p === null).length;
        
        if (playerCount === 2 && emptyCount === 1) threats += 2;
        if (playerCount === 1 && emptyCount === 2) threats += 1;
    }
    
    return threats;
}

function countBigBoardAdvantage(player) {
    const opponent = player === 'O' ? 'X' : 'O';
    let advantage = 0;
    
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        const positions = [game.bigBoard[a], game.bigBoard[b], game.bigBoard[c]];
        const playerCount = positions.filter(p => p === player).length;
        const opponentCount = positions.filter(p => p === opponent).length;
        
        if (playerCount > 0 && opponentCount === 0) advantage += playerCount;
        if (opponentCount > 0 && playerCount === 0) advantage -= opponentCount;
    }
    
    return advantage;
}

function evaluateTempoAdvantage(move) {
    let tempo = 0;
    
    // If we send opponent to a board we already won or is full, that's good
    if (game.bigBoard[move.cell] || isBoardFull(game.subBoards[move.cell])) {
        tempo += 3;
    }
    
    // If we send opponent to a board where they have few options
    if (!game.bigBoard[move.cell]) {
        const emptyCount = game.subBoards[move.cell].filter(c => c === null).length;
        if (emptyCount <= 3) tempo += 2;
        if (emptyCount <= 1) tempo += 3;
    }
    
    return tempo;
}

function getBigBoardStrategicValue(boardIndex) {
    const tempBoard = [...game.bigBoard];
    if (tempBoard[boardIndex]) return 0;
    
    tempBoard[boardIndex] = 'O';
    
    let value = 0;
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        const positions = [tempBoard[a], tempBoard[b], tempBoard[c]];
        const oCount = positions.filter(p => p === 'O').length;
        const xCount = positions.filter(p => p === 'X').length;
        
        if (oCount === 2 && xCount === 0) value += 5; // Two in a row
        if (oCount === 1 && xCount === 0) value += 2; // One in a row
        if (xCount === 2 && oCount === 0) value += 4; // Block opponent
    }
    
    return value;
}

function countWinningOpportunities(boardIndex, cellIndex, player) {
    const tempBoard = [...game.subBoards[boardIndex]];
    tempBoard[cellIndex] = player;
    
    let opportunities = 0;
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        const positions = [tempBoard[a], tempBoard[b], tempBoard[c]];
        const playerCount = positions.filter(p => p === player).length;
        const emptyCount = positions.filter(p => p === null).length;
        
        if (playerCount === 2 && emptyCount === 1) opportunities += 2;
        if (playerCount === 1 && emptyCount === 2) opportunities += 1;
    }
    
    return opportunities;
}

function evaluateNextBoardControl(cellIndex) {
    if (game.bigBoard[cellIndex] || isBoardFull(game.subBoards[cellIndex])) {
        return 50; // Opponent can choose any board
    }
    
    // Evaluate how good/bad the next board is for opponent
    const nextBoardThreat = getOpponentAdvantageOnBoard(cellIndex);
    
    if (nextBoardThreat < 2) return 30; // Safe board
    if (nextBoardThreat < 4) return 10; // Moderate threat
    return -20; // Dangerous board
}

function getOpponentAdvantageOnBoard(boardIndex) {
    if (game.bigBoard[boardIndex]) return 0;
    
    const board = game.subBoards[boardIndex];
    let advantage = 0;
    
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        const positions = [board[a], board[b], board[c]];
        const xCount = positions.filter(p => p === 'X').length;
        const emptyCount = positions.filter(p => p === null).length;
        
        if (xCount === 2 && emptyCount === 1) advantage += 3;
        if (xCount === 1 && emptyCount === 2) advantage += 1;
    }
    
    return advantage;
}

function countForkOpportunities(boardIndex, player) {
    const board = game.subBoards[boardIndex];
    let forks = 0;
    
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            const tempBoard = [...board];
            tempBoard[i] = player;
            
            const opportunities = countWinningOpportunitiesFromBoard(tempBoard, player);
            if (opportunities >= 2) forks++;
        }
    }
    
    return forks;
}

function countWinningOpportunitiesFromBoard(board, player) {
    let opportunities = 0;
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        const positions = [board[a], board[b], board[c]];
        const playerCount = positions.filter(p => p === player).length;
        const emptyCount = positions.filter(p => p === null).length;
        
        if (playerCount === 2 && emptyCount === 1) opportunities++;
    }
    
    return opportunities;
}

// Get Available Moves
function getAvailableMoves() {
    const moves = [];
    const boards = game.activeBoard !== null ? [game.activeBoard] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
    
    for (const boardIndex of boards) {
        if (game.bigBoard[boardIndex]) continue;
        
        for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
            if (!game.subBoards[boardIndex][cellIndex]) {
                moves.push({ board: boardIndex, cell: cellIndex });
            }
        }
    }
    
    return moves;
}

// Check Winner
function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    return null;
}

// Check if Board is Full
function isBoardFull(board) {
    return board.every(cell => cell !== null);
}

// Update UI
function updateUI() {
    playerTurnEl.textContent = game.currentPlayer;

    if (game.activeBoard === null) {
        boardInfoEl.textContent = 'Select any board to start';
    } else {
        boardInfoEl.textContent = `Must play in board #${game.activeBoard + 1}`;
    }
}

// End Game
function endGame(winner) {
    game.gameOver = true;
    if (winner === 'Draw') {
        winnerTextEl.textContent = '🤝 Draw Game!';
    } else {
        winnerTextEl.textContent = `🎉 Player ${winner} Wins!`;
    }
    gameOverEl.style.display = 'flex';
}
// Event Listeners
resetBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', () => {
    gameOverEl.style.display = 'none';
    initGame();
});

pvpBtn.addEventListener('click', () => {
    game.gameMode = 'pvp';
    pvpBtn.classList.add('active');
    pvcBtn.classList.remove('active');
    difficultySelection.style.display = 'none';
    if (starterSelection) starterSelection.style.display = 'none';
    initGame();
});

pvcBtn.addEventListener('click', () => {
    game.gameMode = 'pvc';
    pvcBtn.classList.add('active');
    pvpBtn.classList.remove('active');
    difficultySelection.style.display = 'block';
    if (starterSelection) starterSelection.style.display = 'block';
    initGame();
});

difficultySelect.addEventListener('change', (e) => {
    game.difficulty = e.target.value;
    initGame();
});

if (starterSelect) {
    starterSelect.addEventListener('change', () => {
        initGame();
    });
}

// Start Game
initGame();
