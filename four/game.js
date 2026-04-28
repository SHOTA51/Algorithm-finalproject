const { useState, useEffect } = React;

// Constants
const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER1 = 1;
const PLAYER2 = 2;

// Transposition table for caching board evaluations
const transpositionTable = new Map();

// Opening book - perfect opening moves
const openingBook = {
    // Empty board - always play center
    'empty': 3,
    // If opponent plays center, play next to it
    'center_taken': [2, 4],
    // If opponent plays edge, play center
    'edge_taken': 3
};

// Game logic functions
const createBoard = () => {
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
};

const getAvailableRow = (board, col) => {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][col] === EMPTY) {
            return row;
        }
    }
    return -1;
};

const isValidMove = (board, col) => {
    return col >= 0 && col < COLS && board[0][col] === EMPTY;
};

const dropDisc = (board, col, player) => {
    const newBoard = board.map(row => [...row]);
    const row = getAvailableRow(newBoard, col);
    if (row !== -1) {
        newBoard[row][col] = player;
    }
    return newBoard;
};

const checkWin = (board, player) => {
    // Check horizontal
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            if (board[row][col] === player &&
                board[row][col + 1] === player &&
                board[row][col + 2] === player &&
                board[row][col + 3] === player) {
                return [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]];
            }
        }
    }

    // Check vertical
    for (let row = 0; row < ROWS - 3; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] === player &&
                board[row + 1][col] === player &&
                board[row + 2][col] === player &&
                board[row + 3][col] === player) {
                return [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]];
            }
        }
    }

    // Check diagonal (top-left to bottom-right)
    for (let row = 0; row < ROWS - 3; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            if (board[row][col] === player &&
                board[row + 1][col + 1] === player &&
                board[row + 2][col + 2] === player &&
                board[row + 3][col + 3] === player) {
                return [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]];
            }
        }
    }

    // Check diagonal (bottom-left to top-right)
    for (let row = 3; row < ROWS; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            if (board[row][col] === player &&
                board[row - 1][col + 1] === player &&
                board[row - 2][col + 2] === player &&
                board[row - 3][col + 3] === player) {
                return [[row, col], [row - 1, col + 1], [row - 2, col + 2], [row - 3, col + 3]];
            }
        }
    }

    return null;
};

const checkDraw = (board) => {
    return board[0].every(cell => cell !== EMPTY);
};

const getValidMoves = (board) => {
    const moves = [];
    for (let col = 0; col < COLS; col++) {
        if (isValidMove(board, col)) {
            moves.push(col);
        }
    }
    return moves;
};

// Get board hash for transposition table
const getBoardHash = (board) => {
    return board.map(row => row.join('')).join('|');
};

// Count total pieces on board
const countPieces = (board) => {
    let count = 0;
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] !== EMPTY) count++;
        }
    }
    return count;
};

// Check if position creates a threat (3 in a row with empty space)
const detectThreats = (board, player) => {
    const threats = [];
    
    // Check all possible 4-cell windows
    const checkWindow = (cells, positions) => {
        const playerCount = cells.filter(c => c === player).length;
        const emptyCount = cells.filter(c => c === EMPTY).length;
        
        if (playerCount === 3 && emptyCount === 1) {
            const emptyIndex = cells.indexOf(EMPTY);
            threats.push(positions[emptyIndex]);
        }
    };

    // Horizontal threats
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            const cells = [board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]];
            const positions = [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]];
            checkWindow(cells, positions);
        }
    }

    // Vertical threats
    for (let row = 0; row < ROWS - 3; row++) {
        for (let col = 0; col < COLS; col++) {
            const cells = [board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]];
            const positions = [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]];
            checkWindow(cells, positions);
        }
    }

    // Diagonal threats (both directions)
    for (let row = 0; row < ROWS - 3; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            const cells1 = [board[row][col], board[row + 1][col + 1], board[row + 2][col + 2], board[row + 3][col + 3]];
            const positions1 = [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]];
            checkWindow(cells1, positions1);
        }
    }

    for (let row = 3; row < ROWS; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            const cells2 = [board[row][col], board[row - 1][col + 1], board[row - 2][col + 2], board[row - 3][col + 3]];
            const positions2 = [[row, col], [row - 1, col + 1], [row - 2, col + 2], [row - 3, col + 3]];
            checkWindow(cells2, positions2);
        }
    }

    return threats;
};

// Order moves for better alpha-beta pruning (check best moves first)
const orderMoves = (board, moves, player) => {
    const centerCol = Math.floor(COLS / 2);
    const opponent = player === PLAYER1 ? PLAYER2 : PLAYER1;
    
    return moves.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        
        // Prioritize center columns
        scoreA -= Math.abs(a - centerCol);
        scoreB -= Math.abs(b - centerCol);
        
        // Prioritize winning moves
        const testBoardA = dropDisc(board, a, player);
        const testBoardB = dropDisc(board, b, player);
        
        if (checkWin(testBoardA, player)) scoreA += 10000;
        if (checkWin(testBoardB, player)) scoreB += 10000;
        
        // Prioritize blocking moves
        const blockBoardA = dropDisc(board, a, opponent);
        const blockBoardB = dropDisc(board, b, opponent);
        
        if (checkWin(blockBoardA, opponent)) scoreA += 5000;
        if (checkWin(blockBoardB, opponent)) scoreB += 5000;
        
        return scoreB - scoreA;
    });
};

// AI Evaluation function - ULTIMATE UNBEATABLE VERSION
const evaluateBoard = (board, player) => {
    let score = 0;
    const opponent = player === PLAYER1 ? PLAYER2 : PLAYER1;

    // Check for immediate win/loss
    if (checkWin(board, player)) return 10000000;
    if (checkWin(board, opponent)) return -10000000;

    // Center column preference (very strong)
    const centerCol = Math.floor(COLS / 2);
    for (let row = 0; row < ROWS; row++) {
        if (board[row][centerCol] === player) score += 8;
        if (board[row][centerCol] === opponent) score -= 6;
    }

    // Evaluate all possible windows of 4
    const evaluateWindow = (window) => {
        let windowScore = 0;
        const playerCount = window.filter(cell => cell === player).length;
        const opponentCount = window.filter(cell => cell === opponent).length;
        const emptyCount = window.filter(cell => cell === EMPTY).length;

        // AI winning positions
        if (playerCount === 4) windowScore += 1000000;
        else if (playerCount === 3 && emptyCount === 1) windowScore += 500;
        else if (playerCount === 2 && emptyCount === 2) windowScore += 50;
        else if (playerCount === 1 && emptyCount === 3) windowScore += 5;

        // Opponent threats - CRITICAL TO BLOCK
        if (opponentCount === 4) windowScore -= 1000000;
        if (opponentCount === 3 && emptyCount === 1) windowScore -= 50000;
        if (opponentCount === 2 && emptyCount === 2) windowScore -= 500;
        if (opponentCount === 1 && emptyCount === 3) windowScore -= 10;

        return windowScore;
    };

    // Check all windows
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            const window = [board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]];
            score += evaluateWindow(window);
        }
    }

    for (let row = 0; row < ROWS - 3; row++) {
        for (let col = 0; col < COLS; col++) {
            const window = [board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]];
            score += evaluateWindow(window);
        }
    }

    for (let row = 0; row < ROWS - 3; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            const window = [board[row][col], board[row + 1][col + 1], board[row + 2][col + 2], board[row + 3][col + 3]];
            score += evaluateWindow(window);
        }
    }

    for (let row = 3; row < ROWS; row++) {
        for (let col = 0; col < COLS - 3; col++) {
            const window = [board[row][col], board[row - 1][col + 1], board[row - 2][col + 2], board[row - 3][col + 3]];
            score += evaluateWindow(window);
        }
    }

    // CRITICAL: Detect and heavily penalize moves that give opponent winning opportunities
    const validMoves = getValidMoves(board);
    for (const col of validMoves) {
        const testBoard = dropDisc(board, col, player);
        const rowAbove = getAvailableRow(testBoard, col);
        
        if (rowAbove >= 0) {
            const opponentTestBoard = dropDisc(testBoard, col, opponent);
            if (checkWin(opponentTestBoard, opponent)) {
                score -= 100000; // Massive penalty
            }
        }
        
        // Check if this move creates multiple threats
        const myThreats = detectThreats(testBoard, player);
        score += myThreats.length * 1000;
        
        const opponentThreats = detectThreats(testBoard, opponent);
        score -= opponentThreats.length * 2000;
    }

    // Bonus for controlling bottom rows
    for (let col = 0; col < COLS; col++) {
        if (board[ROWS - 1][col] === player) score += 4;
        if (board[ROWS - 2][col] === player) score += 2;
    }

    return score;
};

// Minimax with Alpha-Beta Pruning + Transposition Table + Move Ordering
const minimax = (board, depth, alpha, beta, maximizingPlayer, player) => {
    // Check transposition table
    const boardHash = getBoardHash(board);
    const cached = transpositionTable.get(boardHash + depth + maximizingPlayer);
    if (cached) return cached;

    const validMoves = getValidMoves(board);
    const opponent = player === PLAYER1 ? PLAYER2 : PLAYER1;
    
    const isTerminal = checkWin(board, PLAYER1) || checkWin(board, PLAYER2) || validMoves.length === 0;

    if (depth === 0 || isTerminal) {
        if (isTerminal) {
            if (checkWin(board, player)) return [null, 100000000];
            if (checkWin(board, opponent)) return [null, -100000000];
            return [null, 0];
        }
        const evalScore = evaluateBoard(board, player);
        return [null, evalScore];
    }

    // Order moves for better pruning
    const orderedMoves = orderMoves(board, validMoves, maximizingPlayer ? player : opponent);

    if (maximizingPlayer) {
        let value = -Infinity;
        let bestCol = orderedMoves[0];
        
        for (const col of orderedMoves) {
            const newBoard = dropDisc(board, col, player);
            const newScore = minimax(newBoard, depth - 1, alpha, beta, false, player)[1];
            
            if (newScore > value) {
                value = newScore;
                bestCol = col;
            }
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break; // Beta cutoff
        }
        
        const result = [bestCol, value];
        transpositionTable.set(boardHash + depth + maximizingPlayer, result);
        return result;
    } else {
        let value = Infinity;
        let bestCol = orderedMoves[0];
        
        for (const col of orderedMoves) {
            const newBoard = dropDisc(board, col, opponent);
            const newScore = minimax(newBoard, depth - 1, alpha, beta, true, player)[1];
            
            if (newScore < value) {
                value = newScore;
                bestCol = col;
            }
            beta = Math.min(beta, value);
            if (alpha >= beta) break; // Alpha cutoff
        }
        
        const result = [bestCol, value];
        transpositionTable.set(boardHash + depth + maximizingPlayer, result);
        return result;
    }
};

// AI move function - ULTIMATE UNBEATABLE VERSION
const getAIMove = (board, difficulty) => {
    const validMoves = getValidMoves(board);
    const pieceCount = countPieces(board);
    
    if (difficulty === 'easy') {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    } else if (difficulty === 'medium') {
        return minimax(board, 4, -Infinity, Infinity, true, PLAYER2)[0];
    } else {
        // ULTIMATE HARD MODE - 150% UNBEATABLE
        
        // Opening book - perfect first moves
        if (pieceCount === 0) {
            return 3; // Always start center
        }
        
        if (pieceCount === 1) {
            // If opponent played center, play next to it
            if (board[ROWS - 1][3] === PLAYER1) {
                return Math.random() < 0.5 ? 2 : 4;
            }
            // Otherwise play center
            return 3;
        }
        
        if (pieceCount <= 4) {
            // Early game - prefer center columns
            const centerMoves = validMoves.filter(col => col >= 2 && col <= 4);
            if (centerMoves.length > 0) {
                // Check if any center move wins
                for (const col of centerMoves) {
                    const testBoard = dropDisc(board, col, PLAYER2);
                    if (checkWin(testBoard, PLAYER2)) return col;
                }
                // Check if need to block
                for (const col of centerMoves) {
                    const testBoard = dropDisc(board, col, PLAYER1);
                    if (checkWin(testBoard, PLAYER1)) return col;
                }
            }
        }
        
        // Check for immediate winning move
        for (const col of validMoves) {
            const testBoard = dropDisc(board, col, PLAYER2);
            if (checkWin(testBoard, PLAYER2)) {
                return col;
            }
        }

        // Check for CRITICAL blocking (opponent can win next turn)
        for (const col of validMoves) {
            const testBoard = dropDisc(board, col, PLAYER1);
            if (checkWin(testBoard, PLAYER1)) {
                return col;
            }
        }
        
        // Check for double threats (opponent has 2 ways to win)
        const opponentThreats = detectThreats(board, PLAYER1);
        if (opponentThreats.length >= 2) {
            // Try to create our own threat to force opponent to defend
            for (const col of validMoves) {
                const testBoard = dropDisc(board, col, PLAYER2);
                const myThreats = detectThreats(testBoard, PLAYER2);
                if (myThreats.length > 0) {
                    // Make sure this doesn't give opponent a win
                    const rowAbove = getAvailableRow(testBoard, col);
                    if (rowAbove >= 0) {
                        const opponentTest = dropDisc(testBoard, col, PLAYER1);
                        if (!checkWin(opponentTest, PLAYER1)) {
                            return col;
                        }
                    } else {
                        return col;
                    }
                }
            }
        }

        // Avoid moves that give opponent winning opportunity above
        const safeMoves = validMoves.filter(col => {
            const testBoard = dropDisc(board, col, PLAYER2);
            const rowAbove = getAvailableRow(testBoard, col);
            if (rowAbove >= 0) {
                const opponentBoard = dropDisc(testBoard, col, PLAYER1);
                return !checkWin(opponentBoard, PLAYER1);
            }
            return true;
        });

        const movesToConsider = safeMoves.length > 0 ? safeMoves : validMoves;

        // Use iterative deepening with very deep search
        let depth = 10; // Start with depth 10
        
        // Adjust depth based on game state
        if (pieceCount < 10) {
            depth = 11; // Early game - think deeper
        } else if (validMoves.length <= 4) {
            depth = 13; // Few options - think very deep
        } else if (validMoves.length <= 2) {
            depth = 15; // Very few options - maximum depth
        }

        // Clear old cache entries if too large
        if (transpositionTable.size > 100000) {
            transpositionTable.clear();
        }

        return minimax(board, depth, -Infinity, Infinity, true, PLAYER2)[0];
    }
};

// React Components
const Cell = ({ value, onClick, isWinning, disabled }) => {
    return (
        <div className={`cell ${disabled ? 'disabled' : ''}`} onClick={onClick}>
            {value !== EMPTY && (
                <div className={`disc player${value} ${isWinning ? 'winning' : ''}`}></div>
            )}
        </div>
    );
};

const Board = ({ board, onCellClick, winningCells, gameOver }) => {
    const isWinningCell = (row, col) => {
        return winningCells && winningCells.some(([r, c]) => r === row && c === col);
    };

    return (
        <div className="board-container">
            <div className="board">
                {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="board-row">
                        {row.map((cell, colIndex) => (
                            <Cell
                                key={colIndex}
                                value={cell}
                                onClick={() => onCellClick(colIndex)}
                                isWinning={isWinningCell(rowIndex, colIndex)}
                                disabled={gameOver}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const Game = () => {
    const [board, setBoard] = useState(createBoard());
    const [currentPlayer, setCurrentPlayer] = useState(PLAYER1);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [winningCells, setWinningCells] = useState(null);
    const [gameMode, setGameMode] = useState('pvp'); // 'pvp' or 'ai'
    const [difficulty, setDifficulty] = useState('medium');
    const [starter, setStarter] = useState('player'); // 'player' or 'ai'
    const [history, setHistory] = useState([]);
    const [isAIThinking, setIsAIThinking] = useState(false);

    useEffect(() => {
        if (gameMode === 'ai' && currentPlayer === PLAYER2 && !gameOver && !isAIThinking) {
            setIsAIThinking(true);
            // Longer delay for hard mode to show it's "thinking"
            const delay = difficulty === 'hard' ? 800 : 500;
            setTimeout(() => {
                const aiMove = getAIMove(board, difficulty);
                if (aiMove !== null) {
                    handleMove(aiMove);
                }
                setIsAIThinking(false);
            }, delay);
        }
    }, [currentPlayer, gameMode, gameOver, board]);

    const handleMove = (col) => {
        if (gameOver || !isValidMove(board, col) || isAIThinking) return;

        const newBoard = dropDisc(board, col, currentPlayer);
        setHistory([...history, { board, player: currentPlayer }]);
        setBoard(newBoard);

        const winCells = checkWin(newBoard, currentPlayer);
        if (winCells) {
            setWinningCells(winCells);
            setWinner(currentPlayer);
            setGameOver(true);
        } else if (checkDraw(newBoard)) {
            setGameOver(true);
        } else {
            setCurrentPlayer(currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1);
        }
    };

    const handleRestart = () => {
        setBoard(createBoard());
        // Set starter based on mode and starter selection
        setCurrentPlayer(gameMode === 'ai' && starter === 'ai' ? PLAYER2 : PLAYER1);
        setGameOver(false);
        setWinner(null);
        setWinningCells(null);
        setHistory([]);
        setIsAIThinking(false);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        
        const lastState = history[history.length - 1];
        setBoard(lastState.board);
        setCurrentPlayer(lastState.player);
        setHistory(history.slice(0, -1));
        setGameOver(false);
        setWinner(null);
        setWinningCells(null);
    };

    const handleModeChange = (mode) => {
        // Change mode and restart the game with appropriate starter
        setGameMode(mode);
        setBoard(createBoard());
        setGameOver(false);
        setWinner(null);
        setWinningCells(null);
        setHistory([]);
        setIsAIThinking(false);
        setCurrentPlayer(mode === 'ai' && starter === 'ai' ? PLAYER2 : PLAYER1);
    };

    const getStatusMessage = () => {
        if (winner) {
            return winner === PLAYER1 ? '🎉 ผู้เล่น 1 (แดง) ชนะ!' : '🎉 ผู้เล่น 2 (เหลือง) ชนะ!';
        }
        if (gameOver) {
            return '🤝 เสมอกัน!';
        }
        if (isAIThinking) {
            return '🤖 AI กำลังคิด...';
        }
        if (gameMode === 'ai') {
            return currentPlayer === PLAYER1 ? '🔴 ตาของคุณ' : '🤖 ตาของ AI';
        }
        return currentPlayer === PLAYER1 ? '🔴 ตาผู้เล่น 1 (แดง)' : '🟡 ตาผู้เล่น 2 (เหลือง)';
    };

    const getStatusClass = () => {
        if (winner) return 'winner';
        if (gameOver) return 'draw';
        return `player${currentPlayer}`;
    };

    return (
        <div className="game-container">
            <div className="game-header">
                <h1>🎮 เกมเรียง 4</h1>
                <div className="game-mode">
                    <button 
                        className={`mode-btn ${gameMode === 'pvp' ? 'active' : ''}`}
                        onClick={() => handleModeChange('pvp')}
                    >
                        👥 2 ผู้เล่น
                    </button>
                    <button 
                        className={`mode-btn ${gameMode === 'ai' ? 'active' : ''}`}
                        onClick={() => handleModeChange('ai')}
                    >
                        🤖 เล่นกับ AI
                    </button>
                </div>
                {gameMode === 'ai' && (
                    <div className="difficulty-selector">
                        <button 
                            className={`difficulty-btn ${difficulty === 'easy' ? 'active' : ''}`}
                            onClick={() => setDifficulty('easy')}
                        >
                            😊 ง่าย
                        </button>
                        <button 
                            className={`difficulty-btn ${difficulty === 'medium' ? 'active' : ''}`}
                            onClick={() => setDifficulty('medium')}
                        >
                            😐 ปานกลาง
                        </button>
                        <button 
                            className={`difficulty-btn ${difficulty === 'hard' ? 'active' : ''}`}
                            onClick={() => setDifficulty('hard')}
                        >
                            💀 โหดมาก (ชนะไม่ได้)
                        </button>
                    </div>
                )}
                {gameMode === 'ai' && (
                    <div className="starter-selector">
                        <span className="starter-label">เริ่มก่อน:</span>
                        <div className="starter-toggle" role="tablist" aria-label="เลือกผู้เริ่มเกม">
                            <button
                                className={`starter-btn ${starter === 'player' ? 'active' : ''}`}
                                onClick={() => { setStarter('player'); handleRestart(); }}
                                aria-pressed={starter === 'player'}
                            >
                                👤 คุณ
                            </button>
                            <button
                                className={`starter-btn ${starter === 'ai' ? 'active' : ''}`}
                                onClick={() => { setStarter('ai'); handleRestart(); }}
                                aria-pressed={starter === 'ai'}
                            >
                                🤖 AI
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`game-status ${getStatusClass()}`}>
                {getStatusMessage()}
            </div>

            <Board 
                board={board} 
                onCellClick={handleMove}
                winningCells={winningCells}
                gameOver={gameOver}
            />

            <div className="game-controls">
                <button className="control-btn restart-btn" onClick={handleRestart}>
                    🔄 เริ่มใหม่
                </button>
                <button 
                    className="control-btn undo-btn" 
                    onClick={handleUndo}
                    disabled={history.length === 0 || isAIThinking}
                >
                    ↩️ ย้อนกลับ
                </button>
            </div>
        </div>
    );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Game />);
