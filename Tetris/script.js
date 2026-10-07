const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

const TETROMINOS = [
    { color: 'cyan', shape: [[1, 1, 1, 1]] },
    { color: 'blue', shape: [[1, 1, 1], [0, 0, 1]] },
    { color:  'orange', shape: [[1, 1, 1], [1, 0, 0]] },
    { color: 'yellow', shape: [[1, 1], [1, 1]] },
    { color: 'green', shape: [[0, 1, 1], [1, 1, 0]] },
    { color: 'red', shape: [[1, 1, 0], [0, 1, 1]] },
    { color: 'purple', shape: [[1, 1, 1], [0, 1, 0]] },
];

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let currentTetromino = getRandomTetromino();
let currentPos = { x: 3, y: 0 };
let score = 0;
let interval = 400;
let gameOver = false;
let speedIncreaseInterval = 10000;
let lastSpeedIncrease = Date.now();
let dropTimer = null;

// Sistema DAS/ARR para movimentacao ultrarrapida e lisa
let keysPressed = {};
let keyTimers = {};
const DAS_DELAY = 170; // Tempo parado antes de começar a deslizar (em milissegundos)
const ARR_RATE = 30;   // Velocidade do deslize (quanto menor, mais rápido vai pro lado)

function getRandomTetromino() {
    return TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
}
//Desenhar o bloco
function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
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
    document.getElementById('score').innerText = `Score: ${score}`;
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
        currentTetromino = getRandomTetromino();
        currentPos = { x: Math.floor((COLS - currentTetromino.shape[0].length) / 2), y: 0 };
        if (hasCollision(0, 0)) {
            gameOver = true;
            clearInterval(dropTimer);
            document.getElementById('restartButton').style.display = 'block';
        }
    }
}
//Mover para os lados
function move(offsetX) {
    if (!hasCollision(offsetX, 0)) {
        currentPos.x += offsetX;
    }
}
//Aumentar a velocidade
function increaseSpeed() {
    const now = Date.now();
    if (now - lastSpeedIncrease >= speedIncreaseInterval) {
        lastSpeedIncrease = now;
        interval = Math.max(100, interval - 30);
        clearInterval(dropTimer);
        dropTimer = setInterval(moveDown, interval);
    }
}
//Processa segurar teclas continuamente sem travar
function updateInput() {
    if (gameOver) return;


    if (keysPressed['ArrowLeft']) {
        if (!keyTimers['ArrowLeft']) {
            move(-1);
            keyTimers['ArrowLeft'] = setTimeout(() => {
                keyTimers['ArrowLeft'] = setInterval(() => move(-1), ARR_RATE);
            }, DAS_DELAY);
        }
    }
    if (keysPressed['ArrowRight']) {
        if (!keyTimers['ArrowRight']) {
            move(1);
            keyTimers['ArrowRight'] = setTimeout(() => {
                keyTimers['ArrowRight'] = setInterval(() => move(1), ARR_RATE);
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
    increaseSpeed();
    
    requestAnimationFrame(gameLoop);
}
//Controle e o registro de quando a tecla é clicada
document.addEventListener('keydown', (event) => {
    if (gameOver) return;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); // Impede a pagina web de rolar
    }

    if (event.key === 'ArrowUp') {
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
document.getElementById('restartButton').addEventListener('click', () => {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    currentTetromino = getRandomTetromino();
    currentPos = { x: Math.floor((COLS - currentTetromino.shape[0].length) / 2), y: 0 };
    score = 0;
    interval = 400;
    gameOver = false;
    keysPressed = {};
    Object.values(keyTimers).forEach(t => { clearTimeout(t); clearInterval(t); });
    keyTimers = {};

    document.getElementById('restartButton').style.display = 'none';
    document.getElementById('score').textContent = `Score: ${score}`;
    lastSpeedIncrease = Date.now();
    
    clearInterval(dropTimer);
    dropTimer = setInterval(moveDown, interval);
    gameLoop();
});

//Iniciar o jogo
dropTimer = setInterval(moveDown, interval);
gameLoop();
