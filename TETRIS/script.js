const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('nextPieceCanvas');
const nextPieceCtx = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameContainer = document.querySelector('.game-container');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const restartButton = document.getElementById('restartButton');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 36;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextPieceCanvas.width = 56;
nextPieceCanvas.height = 56;

const TETROMINOS = [
    { color: '#00d9ff', shape: [[1, 1, 1, 1]] },
    { color: '#2962ff', shape: [[1, 1, 1], [0, 0, 1]] },
    { color: '#ff8a00', shape: [[1, 1, 1], [1, 0, 0]] },
    { color: '#ffd600', shape: [[1, 1], [1, 1]] },
    { color: '#00d084', shape: [[0, 1, 1], [1, 1, 0]] },
    { color: '#ff3b5c', shape: [[1, 1, 0], [0, 1, 1]] },
    { color: '#b24bff', shape: [[1, 1, 1], [0, 1, 0]] },
];

const BLOCK_DETAILS = {
    '#00d9ff': { color: '#007f99', shape: 'square' },
    '#2962ff': { color: '#123b9e', shape: 'triangle' },
    '#ff8a00': { color: '#a84f00', shape: 'circle' },
    '#ffd600': { color: '#917400', shape: 'star' },
    '#00d084': { color: '#007a4d', shape: 'hexagon' },
    '#ff3b5c': { color: '#a51e38', shape: 'plus' },
    '#b24bff': { color: '#6921a8', shape: 'diamond' },
};

const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let board = createBoard();
let currentTetromino = getRandomTetromino();
let nextTetromino = getRandomTetromino();
let currentPos = { x: 3, y: 0 };
let score = 0;
let highScore = Number(localStorage.getItem('tetrisHighScore')) || 0;
let interval = 400;
let totalLines = 0;
let speedLevel = 0;
const LINES_PER_SPEED_UP = 5;
const SPEED_STEP = 15;
const MIN_DROP_INTERVAL = 250;
let gameOver = false;
let dropTimer = null;
let hardDropTimer = null;
let isHardDropping = false;

// Sistema DAS/ARR para movimentacao ultrarrapida e lisa
let keysPressed = {};
let keyTimers = {};
const DAS_DELAY = 170; // Tempo parado antes de começar a deslizar (em milissegundos)
const ARR_RATE = 30;   // Velocidade do deslize (quanto menor, mais rápido vai pro lado)
const HORIZONTAL_KEYS = [['ArrowLeft', -1], ['ArrowRight', 1]];
highScoreElement.textContent = `Maior pontuação: ${highScore}`;

function getRandomTetromino() {
    const { color, shape } = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
    return { color, shape: shape.map(row => [...row]) };
}
//Desenhar o bloco
function drawBlock(x, y, color, targetCtx = ctx, blockSize = BLOCK_SIZE) {
    targetCtx.fillStyle = color;
    targetCtx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    targetCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    targetCtx.fillRect(x * blockSize + 2, y * blockSize + 2, blockSize - 4, blockSize - 4);
    const detail = BLOCK_DETAILS[color];
    targetCtx.fillStyle = detail.color;
    targetCtx.beginPath();
    const centerX = x * blockSize + blockSize / 2;
    const centerY = y * blockSize + blockSize / 2;
    if (detail.shape === 'circle') {
        targetCtx.arc(centerX, centerY, blockSize * 0.2, 0, Math.PI * 2);
    } else if (detail.shape === 'triangle') {
        targetCtx.moveTo(centerX, centerY - blockSize * 0.22);
        targetCtx.lineTo(centerX + blockSize * 0.22, centerY + blockSize * 0.2);
        targetCtx.lineTo(centerX - blockSize * 0.22, centerY + blockSize * 0.2);
    } else if (detail.shape === 'square') {
        targetCtx.rect(centerX - blockSize * 0.17, centerY - blockSize * 0.17, blockSize * 0.34, blockSize * 0.34);
    } else if (detail.shape === 'diamond') {
        targetCtx.moveTo(centerX, centerY - blockSize * 0.22);
        targetCtx.lineTo(centerX + blockSize * 0.22, centerY);
        targetCtx.lineTo(centerX, centerY + blockSize * 0.22);
        targetCtx.lineTo(centerX - blockSize * 0.22, centerY);
    } else if (detail.shape === 'hexagon') {
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = centerX + Math.cos(angle) * blockSize * 0.22;
            const py = centerY + Math.sin(angle) * blockSize * 0.22;
            if (i === 0) targetCtx.moveTo(px, py);
            else targetCtx.lineTo(px, py);
        }
    } else if (detail.shape === 'plus') {
        targetCtx.rect(centerX - blockSize * 0.08, centerY - blockSize * 0.22, blockSize * 0.16, blockSize * 0.44);
        targetCtx.rect(centerX - blockSize * 0.22, centerY - blockSize * 0.08, blockSize * 0.44, blockSize * 0.16);
    } else {
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const radius = blockSize * (i % 2 === 0 ? 0.22 : 0.11);
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius;
            if (i === 0) targetCtx.moveTo(px, py);
            else targetCtx.lineTo(px, py);
        }
    }
    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    targetCtx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
}
function drawNextPiece() {
    const blockSize = 14;
    const { shape, color } = nextTetromino;
    const offsetX = (nextPieceCanvas.width / blockSize - shape[0].length) / 2;
    const offsetY = (nextPieceCanvas.height / blockSize - shape.length) / 2;
    nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    shape.forEach((row, y) => row.forEach((cell, x) => {
        if (cell) drawBlock(offsetX + x, offsetY + y, color, nextPieceCtx, blockSize);
    }));
}
//Desenhar o tabuleiro
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            }
        }
    }
}
//Desenhar a peca atual
function drawTetromino() {
    drawghostpiece();

    const shape = currentTetromino.shape;
    const color = currentTetromino.color;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                drawBlock(currentPos.x + x, currentPos.y + y, color);
            }
        }
    }
}
//Desenhar a peca fantasma
function drawghostpiece() {
    let ghostY = currentPos.y;
    while (!hasCollision(0, ghostY - currentPos.y + 1)) {
        ghostY++;
    }
    const shape = currentTetromino.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
                ctx.strokeRect((currentPos.x + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
}
//VERIFICA A COLISAO
function hasCollision(xOffset, yOffset, customShape = null) {
    const shape = customShape || currentTetromino.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                let targetX = currentPos.x + x + xOffset;
                let targetY = currentPos.y + y + yOffset;

                if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
                    return true;
                }
                if (targetY >= 0 && board[targetY][targetX]) {
                    return true;
                }
            }
        }
    }
    return false;
}
//Consolidar a peca no tabuleiro
function mergeTetromino() {
    const shape = currentTetromino.shape;
    const color = currentTetromino.color;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                if (currentPos.y + y >= 0) {
                    board[currentPos.y + y][currentPos.x + x] = color;
                }
            }
        }
    }
}
//Remover linhas cheias
function removeRows() {
    let linesRemoved = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesRemoved++;
            y++;
        }
    }
    score += linesRemoved * 100;
    scoreElement.textContent = `Pontos: ${score}`;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetrisHighScore', highScore);
        highScoreElement.textContent = `Maior pontuação: ${highScore}`;
    }
    increaseSpeed(linesRemoved);
}
//Rotacionar a peca
function rotateTetromino() {
    const shape = currentTetromino.shape;
    const r = shape.length;
    const c = shape[0].length;
    
    // Cria uma nova matriz com as dimensoes invertidas de forma correta
    let newShape = Array.from({ length: c }, () => Array(r).fill(0));
    for (let y = 0; y < r; y++) {
        for (let x = 0; x < c; x++) {
            newShape[x][r - 1 - y] = shape[y][x];
        }
    }

    // Tenta rotacionar aplicando Wall Kick (empurrao se bater na parede)
    const oldShape = currentTetromino.shape;
    currentTetromino.shape = newShape;
    
    // Testa offsets para o lado para nao prender a peca na parede ao girar
    for (const offset of [0, -1, 1, -2, 2]) {
        if (!hasCollision(offset, 0)) {
            currentPos.x += offset;
            return; 
        }
    }
    
    // Se colidir de qualquer jeito, cancela a rotacao
    currentTetromino.shape = oldShape;
}
//Mover para baixo
function moveDown() {
    if (!hasCollision(0, 1)) {
        currentPos.y++;
    } else {
        mergeTetromino();
        removeRows();
        currentTetromino = nextTetromino;
        nextTetromino = getRandomTetromino();
        drawNextPiece();
        currentPos = { x: Math.floor((COLS - currentTetromino.shape[0].length) / 2), y: 0 };
        if (hasCollision(0, 0)) {
            gameOver = true;
            clearInterval(dropTimer);
            gameContainer.classList.add('game-over');
            gameOverOverlay.style.display = 'flex';
        }
    }
}
// Descer a peça direto até a posição mais baixa possível
function hardDrop() {
    if (isHardDropping) return;

    clearInterval(dropTimer);
    isHardDropping = true;
    hardDropTimer = setInterval(() => {
        if (hasCollision(0, 1)) {
            clearInterval(hardDropTimer);
            hardDropTimer = null;
            moveDown();
            isHardDropping = false;
            if (!gameOver) dropTimer = setInterval(moveDown, interval);
            return;
        }

        currentPos.y++;
    }, 14);
}
//Mover para os lados
function move(offsetX) {
    if (!hasCollision(offsetX, 0)) {
        currentPos.x += offsetX;
    }
}
//Aumentar a velocidade
function increaseSpeed(linesRemoved) {
    totalLines += linesRemoved;
    const newSpeedLevel = Math.floor(totalLines / LINES_PER_SPEED_UP);

    if (newSpeedLevel > speedLevel) {
        speedLevel = newSpeedLevel;
        interval = Math.max(MIN_DROP_INTERVAL, interval - SPEED_STEP);
        if (!isHardDropping) {
            clearInterval(dropTimer);
            dropTimer = setInterval(moveDown, interval);
        }
    }
}
//Processa segurar teclas continuamente sem travar
function updateInput() {
    if (gameOver || isHardDropping) return;


    for (const [key, offset] of HORIZONTAL_KEYS) {
        if (keysPressed[key] && !keyTimers[key]) {
            move(offset);
            keyTimers[key] = setTimeout(() => {
                keyTimers[key] = setInterval(() => move(offset), ARR_RATE);
            }, DAS_DELAY);
        }
    }
    if (keysPressed['ArrowDown']) {
        if (!keyTimers['ArrowDown']) {
            moveDown();
            keyTimers['ArrowDown'] = setInterval(moveDown, 50);
        }
    }
}
//Loop principal do jogo
function gameLoop() {
    if (gameOver) return;

    updateInput();
    drawBoard();
    drawTetromino();
    
    requestAnimationFrame(gameLoop);
}
//Controle e o registro de quando a tecla é clicada
document.addEventListener('keydown', (event) => {
    if (gameOver) return;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || event.code === 'Space') {
        event.preventDefault(); // Impede a pagina web de rolar
    }
    if (isHardDropping) return;

    if (event.code === 'Space') {
        hardDrop();
    } else if (event.key === 'ArrowUp') {
        rotateTetromino();
    } else {
        keysPressed[event.key] = true;
    }
});
//Indentifica quando aperta e quado solta a peça
document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
    if (keyTimers[event.key]) {
        clearTimeout(keyTimers[event.key]);
        clearInterval(keyTimers[event.key]);
        delete keyTimers[event.key];
    }
});
//Reiniciar o jogo
restartButton.addEventListener('click', () => {
    clearInterval(hardDropTimer);
    hardDropTimer = null;
    isHardDropping = false;
    gameOverOverlay.style.display = 'none';
    gameContainer.classList.remove('game-over');
    board = createBoard();
    currentTetromino = getRandomTetromino();
    nextTetromino = getRandomTetromino();
    drawNextPiece();
    currentPos = { x: Math.floor((COLS - currentTetromino.shape[0].length) / 2), y: 0 };
    score = 0;
    interval = 400;
    totalLines = 0;
    speedLevel = 0;
    gameOver = false;
    keysPressed = {};
    Object.values(keyTimers).forEach(t => { clearTimeout(t); clearInterval(t); });
    keyTimers = {};

    scoreElement.textContent = `Pontos: ${score}`;
    clearInterval(dropTimer);
    dropTimer = setInterval(moveDown, interval);
    gameLoop();
});

//Iniciar o jogo
drawNextPiece();
dropTimer = setInterval(moveDown, interval);
gameLoop();
