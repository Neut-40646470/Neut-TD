const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // Get the drawing context on the canvas
let gameInterval = null; // Holds the game loop interval for control
let enemies = []; // Stores all enemy objects
let turrets = []; // Stores all turret objects
let visualEffects = []; // Holds visual effects like explosions or gunfire
let currentPath = []; // Stores the path the enemies follow
let lastMousePosition = { x: 0, y: 0 }; // Keeps track of the mouse position
let spawnCounter = 0; // Controls the timing of enemy spawns
const spawnInterval = 100; // Time between spawns
let currentWave = 1; // Current enemy wave
let waveInProgress = false; // Indicates if a wave is currently active
let lastWavePrepared = 0; // The last wave that was prepared
let enemyPool = []; // Pool of pre-created enemy objects for reuse
var waveLock = false; // Prevents wave operations from overlapping
const spriteScale = 1.8; // Scale at which enemy sprites are drawn
const frameWidth = 48; // Width of each frame in the enemy sprite sheet
const frameHeight = 30; // Height of each frame in the enemy sprite sheet
const gridSize = 50; // Size of the grid used in the level editor

const enemiesData = {
    'basic': {
        spriteSheet: new Image(),
        frameCount: 7,
        frameIndex: 0,
        animationStartTime: Date.now()
    },
    'fast': {
        spriteSheet: new Image(),
        frameCount: 7,
        frameIndex: 0,
        animationStartTime: Date.now()
    },
    'strong': {
        spriteSheet: new Image(),
        frameCount: 7,
        frameIndex: 0,
        animationStartTime: Date.now()
    }
}; // Definitions of different enemy types

let levelEditorMode = false; // Indicates if the level editor is active
let currentMapData = []; // Temporary storage for new map path points

// Toggles the level editor mode on and off
function toggleLevelEditorMode() {
    levelEditorMode = !levelEditorMode;
    if (levelEditorMode) {
        console.log("Level editor mode activated. Click on the canvas to create path points.");
        currentMapData = [];
        canvas.addEventListener('click', addPathPoint);
    } else {
        console.log("Level editor mode deactivated.");
        canvas.removeEventListener('click', addPathPoint);
        saveMapData();
        loadMaps();
    }
}

// Adds a path point at the clicked position on the canvas
function addPathPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    currentMapData.push({ x: snappedX, y: snappedY });
    currentPath = [...currentMapData];
    console.log(`Path point added at (${snappedX}, ${snappedY}).`);
    render();
}

// Saves the current map data to local storage
function saveMapData() {
    const mapName = prompt("Enter a name for the map:");
    if (mapName) {
        defs.maps[mapName] = currentMapData;
        console.log(`Map "${mapName}" data:`, currentMapData);
        const jsonData = JSON.stringify(currentMapData);
        localStorage.setItem(mapName, jsonData);
        console.log(`Map "${mapName}" saved.`);
    } else {
        console.log("Map not saved. No name provided.");
    }
}

// Loads and displays a list of saved maps
function loadMaps() {
    const savedMaps = Object.keys(localStorage);
    const savedMapsList = document.getElementById('saved-maps');
    savedMapsList.innerHTML = '';

    savedMaps.forEach(mapName => {
        const listItem = document.createElement('li');
        listItem.textContent = mapName;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function(event) {
            event.stopPropagation();
            deleteMap(mapName);
            loadMaps();
        });

        listItem.appendChild(deleteButton);

        listItem.addEventListener('click', function() {
            startGame(mapName);
        });

        savedMapsList.appendChild(listItem);
    });
}

// Deletes a saved map
function deleteMap(mapName) {
    if (confirm(`Are you sure you want to delete the map "${mapName}"?`)) {
        localStorage.removeItem(mapName);
        console.log(`Map "${mapName}" deleted.`);
    }
}

// Updates the mouse position and triggers a render if level editor mode is active
document.getElementById('gameCanvas').addEventListener('mousemove', function(event) {
    lastMousePosition.x = event.clientX - this.getBoundingClientRect().left;
    lastMousePosition.y = event.clientY - this.getBoundingClientRect().top;
    if (levelEditorMode) {
        render();
    }
});

// Main game loop
function gameLoop() {
    if (!game.paused) {
        const deltaTime = calculateDeltaTime();
        update(deltaTime);
    }
    render();
    requestAnimationFrame(gameLoop);
}

// Calculates time since last frame
function calculateDeltaTime() {
    let now = performance.now();
    let deltaTime = (now - previousTime) / 1000;
    previousTime = now;
    return deltaTime;
}

// Draws visual effects like gunfire
function drawEffects() {
    const currentTime = Date.now();
    visualEffects.forEach((effect, index) => {
        if (currentTime - effect.startTime < effect.duration) {
            if (effect.type === 'shoot') {
                ctx.beginPath();
                ctx.moveTo(effect.startX, effect.startY);
                ctx.lineTo(effect.endX, effect.endY);
                ctx.strokeStyle = effect.color;
                ctx.stroke();
            }
        } else {
            visualEffects.splice(index, 1);
        }
    });
}

// Calculates enemy numbers based on the wave number
function getDynamicWaveConfig(waveNumber) {
    let config = {};
    config.basic = 5 + Math.floor(waveNumber * 1.5);
    if (waveNumber >= 3) config.fast = 2 + Math.floor((waveNumber - 2) * 1.2);
    if (waveNumber >= 5) config.strong = 1 + Math.floor((waveNumber - 4) / 2);
    return config;
}

// Prepares the next wave of enemies
function prepareWave(waveNumber) {
    if (waveInProgress || waveLock || lastWavePrepared >= waveNumber) {
        console.log(`Skipping preparation for wave ${waveNumber}. In progress: ${waveInProgress}, Wave lock: ${waveLock}, Last prepared: ${lastWavePrepared}`);
        return;
    }
    waveLock = true;
    console.log(`Preparing wave: ${waveNumber}`);
    const waveEnemies = getDynamicWaveConfig(waveNumber);
    let totalEnemies = Object.values(waveEnemies).reduce((sum, num) => sum + num, 0);
    let enemiesSpawned = 0;

    Object.keys(waveEnemies).forEach(type => {
        for (let i = 0; i < waveEnemies[type]; i++) {
            setTimeout(() => {
                if (!game.paused) {
                    spawnEnemy(type, currentMap);
                    enemiesSpawned++;
                    if (enemiesSpawned === totalEnemies) {
                        console.log(`All enemies for wave ${waveNumber} spawned.`);
                        waveInProgress = true;
                        lastWavePrepared = waveNumber;
                        if (enemies.length === 0) {
                            currentWave++;
                            checkAndPrepareNextWave();
                        }
                    }
                }
            }, i * 1000);
        }
    });
    waveLock = false;
}

// Checks if the next wave should be prepared
function checkAndPrepareNextWave() {
    if (!waveInProgress && !waveLock && enemies.length === 0 && lastWavePrepared < currentWave) {
        console.log(`Transitioning to next wave: ${currentWave}`);
        prepareWave(currentWave);
    } else {
        console.log(`Cannot transition to next wave. Wave in progress: ${waveInProgress}, Wave lock: ${waveLock}, Enemies left: ${enemies.length}, Last Wave Prepared: ${lastWavePrepared}, Current Wave: ${currentWave}`);
    }
}

// Draws the current map
function drawMap() {
    if (currentPath.length === 0) {
        console.error("No map data available to draw.");
        return;
    }

    ctx.beginPath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.moveTo(currentPath[0].x, currentPath[0].y);

    currentPath.forEach(point => {
        ctx.lineTo(point.x, point.y);
    });

    ctx.stroke();
}

// Main update function
function update(deltaTime) {
    moveEnemies(deltaTime);
    game.turrets.forEach(turret => {
        if (turret) shootEnemies(turret, deltaTime);
    });

    checkAndPrepareNextWave();
    updateUI();
}

// Function to handle shooting mechanics for turrets
function shootEnemies(turret, deltaTime) {
    if (!turret) {
        console.error("Attempted to operate on an undefined turret.");
        return;
    }

    if (turret.timeSinceLastShot === undefined) {
        turret.timeSinceLastShot = 0;
    }

    turret.timeSinceLastShot += deltaTime;

    if (turret.timeSinceLastShot >= 1 / turret.rate) {
        const target = findClosestEnemy(turret);
        if (target) {
            turret.timeSinceLastShot = 0;
            turretShootEffect(turret, target);
            target.health -= turret.damage;
            if (target.health <= 0) {
                const index = enemies.indexOf(target);
                if (index > -1) {
                    enemies.splice(index, 1);
                    game.cash += target.reward;
                    updateUI();
                }
            }
        }
    }
}

// Function to find the closest enemy to a turret
function findClosestEnemy(turret) {
    let closest = null;
    let minDist = Infinity;
    enemies.forEach(enemy => {
        const dx = enemy.x - turret.x;
        const dy = enemy.y - turret.y;
        const dist = Math.sqrt(dx ** 2 + dy ** 2);
        if (dist < turret.range && dist < minDist) {
            closest = enemy;
            minDist = dist;
        }
    });
    return closest;
}

// Adds a visual effect when a turret shoots
function turretShootEffect(turret, target) {

    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);

    visualEffects.push({
        type: 'shoot',
        startX: turret.x,
        startY: turret.y,
        endX: target.x,
        endY: target.y,
        color: randomColor,
        startTime: Date.now(),
        duration: 100 // Effect duration in milliseconds
    });
}

// Spawns an enemy on the map
function spawnEnemy(type, mapName) {
    let enemy = getEnemy();  // Reuse an enemy object or create a new one if the pool is empty
    const map = defs.maps[mapName];
    const enemyDef = defs.enemies[type];
    if (!map || !enemyDef) {
        console.error("Cannot spawn enemy:", type);
        return;
    }
    const start = map[0];
    enemy.type = type;
    enemy.x = start.x;
    enemy.y = start.y;
    enemy.health = enemyDef.health;
    enemy.speed = enemyDef.speed;
    enemy.reward = enemyDef.reward;
    enemy.pathIndex = 0;
    enemy.mapName = mapName;
    enemies.push(enemy);
}

// Retrieves an enemy object from the pool or creates a new one
function getEnemy() {
    return enemyPool.pop() || {};
}

// Returns an enemy to the pool
function releaseEnemy(enemy) {
    enemyPool.push(enemy);
}

// Handles enemy movement
function moveEnemies() {
    let allEnemiesCleared = true;

    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        if (enemy.health > 0) {
            allEnemiesCleared = false;
            const map = defs.maps[enemy.mapName];
            if (enemy.pathIndex < map.length - 1) {
                const currentPoint = map[enemy.pathIndex];
                const nextPoint = map[enemy.pathIndex + 1];
                const dx = nextPoint.x - currentPoint.x;
                const dy = nextPoint.y - currentPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;

                enemy.x += normalizedDx * enemy.speed;
                enemy.y += normalizedDy * enemy.speed;

                if (Math.hypot(enemy.x - nextPoint.x, enemy.y - nextPoint.y) < enemy.speed) {
                    enemy.pathIndex++;
                }
            } else {
                enemy.health = 0;
            }
        }

        if (enemy.health <= 0) {
            console.log(`Removing enemy at index ${i}, Type: ${enemy.type}, Remaining Health: ${enemy.health}`);
            releaseEnemy(enemies.splice(i, 1)[0]);
            console.log(`Enemy at index ${i} removed. ${enemies.length} remaining.`);
        }
    }

    if (allEnemiesCleared && enemies.length === 0 && waveInProgress) {
        waveInProgress = false;
        console.log(`All enemies cleared for wave. Wave ${currentWave} complete. Checking for next wave...`);
        currentWave++;
        checkAndPrepareNextWave();
    }
}


// Draws the path preview in the level editor
function drawPathPreview() {
    ctx.beginPath();
    ctx.strokeStyle = '#fff';  // White path for visibility
    ctx.lineWidth = 2;  // Set line width for the path

    // Draw the current path preview
    if (currentMapData.length > 1) {
        ctx.moveTo(currentMapData[0].x, currentMapData[0].y); // Start at the first point
        for (let i = 1; i < currentMapData.length; i++) {
            ctx.lineTo(currentMapData[i].x, currentMapData[i].y); // Connect subsequent points
        }
    }

    // Draw line to the mouse cursor to preview the next point
    if (lastMousePosition.x && lastMousePosition.y) {
        ctx.lineTo(lastMousePosition.x, lastMousePosition.y);
    }

    ctx.stroke();
}

// Toggles the game pause state
function togglePause() {
    game.paused = !game.paused;
    document.querySelector('button[onclick="togglePause()"]').textContent = game.paused ? 'Resume' : 'Pause';
}

var selectedTurretType = null;

// Handles the purchase of turrets
function buyTurret(turretType) {
    var turretData = defs.turrets[turretType];
    if (game.cash >= turretData.cost) {
        game.cash -= turretData.cost;
        selectedTurretType = turretType;  // Set the selected turret type for placement
        updateUI();
        console.log(turretType + ' turret purchased, ready to place.');
    } else {
        console.log('Not enough cash to buy ' + turretType);
    }
}

// Handles turret placement on the canvas
document.getElementById('gameCanvas').addEventListener('click', function(event) {
    if (selectedTurretType && !game.paused) {
        var x = event.clientX - this.offsetLeft;
        var y = event.clientY - this.offsetTop;
        // Assume you have a function to validate if the turret can be placed at the given x, y
        if (isValidPlacement(x, y)) {
            placeTurret(selectedTurretType, x, y);
            selectedTurretType = null;  // Reset after placing
        }
    }
});

// Places a turret at the specified position
function placeTurret(type, x, y) {
    const turretData = defs.turrets[type];
    if (!turretData || isNaN(x) || isNaN(y)) {
        console.error("Failed to place turret due to invalid data", type, x, y, turretData);
        return; // Early exit if data is invalid
    }

    const turret = {
        type: type,
        x: x,
        y: y,
        range: turretData.range,
        rate: turretData.rate,
        damage: turretData.damage, // New property for turret damage
        lastShotTime: Date.now(),
    };
    game.turrets.push(turret);
    console.log(`Placed ${type} turret at (${x}, ${y})`);
    render();
}

// Updates the UI components
function updateUI() {
    // Update cash display
    document.getElementById('cash-display').textContent = 'Cash: $' + game.cash;

    // Update wave display
    document.getElementById('wave-display').textContent = 'Wave: ' + currentWave;

    // Show control panel
    document.getElementById('control-panel').style.display = 'block';

    // Get the upgrade panel element
    let upgradePanel = document.getElementById('upgrade-panel');

    // Clear upgrade options before updating
    upgradePanel.innerHTML = '';

    // Show upgrade panel only if a turret is selected
    if (game.currentTurret) {
        // Show upgrade panel
        upgradePanel.style.display = 'block';

        // Populate upgrade options
        for (let i = 0; i < game.currentTurret.upgrades.length; i++) {
            let upgrade = game.currentTurret.upgrades[i];
            let upgradeButton = document.createElement('button');
            upgradeButton.textContent = upgrade.name + ' ($' + upgrade.cost + ')';
            upgradeButton.onclick = function() {
                if (game.cash >= upgrade.cost) {
                    game.cash -= upgrade.cost;
                    game.currentTurret.upgrade(upgrade);
                    updateUI(); // Update UI after upgrading
                } else {
                    alert('Not enough cash!');
                }
            };
            upgradePanel.appendChild(upgradeButton);
        }
    } else {
        // Hide upgrade panel if no turret is selected
        upgradePanel.style.display = 'none';
    }
}

// Draws turrets on the canvas
function drawTurrets() {
    game.turrets.forEach((turret, index) => {
        ctx.beginPath();
        if (turret.type === 'sniper') {
            ctx.fillStyle = 'green';  // Color for sniper turret
        } else {
            ctx.fillStyle = 'blue';  // Color for basic turret
        }
        ctx.arc(turret.x, turret.y, 15, 0, 2 * Math.PI);  // Draw turret with radius 15
        ctx.fill();
    });
}

// Setup event listener for turret clicks
document.getElementById('gameCanvas').addEventListener('click', function(event) {
    game.turrets.forEach((turret, index) => {
        const rect = this.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const dx = x - turret.x;
        const dy = y - turret.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        
        // Check if the click is within the bounds of the turret
        if (distance <= 15) { // Assuming turret radius is 15 just for testing
            // Turret clicked, handle turret click event here
            console.log(`Turret ${index + 1} clicked`);
            displayUpgradeMenu(turret);
        }
    });
});

// Displays upgrade options for the clicked turret
function displayUpgradeMenu(turret) {
   
}

// Creates a click listener for each turret
function createTurretClickListener(turret, index) {
    return function(event) {
        const rect = this.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check if the click is within the bounds of the turret
        const dx = x - turret.x;
        const dy = y - turret.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        if (distance <= 15) { // Assuming turret radius is 15
            // Turret clicked, handle turret click event here
            console.log(`Turret ${index + 1} clicked`);
            // Implement your logic for turret click event here
        }
    };
}

// Pre-loads enemy sprites
Object.keys(enemiesData).forEach(type => {
    enemiesData[type].spriteSheet.src = `sprites/${type}.png`;
});


const upgradeOptions = {
    range: { cost: 50, maxLevel: 3 },
    rate: { cost: 100, maxLevel: 3 },
    damage: { cost: 150, maxLevel: 3 }
};

// Upgrades a turret's properties
function upgradeTurret(turret, upgradeType) {
    const upgradeOption = upgradeOptions[upgradeType];
    if (!upgradeOption) {
        console.error("Invalid upgrade type:", upgradeType);
        return;
    }

    const currentLevel = turret.upgrades[upgradeType];
    const maxLevel = upgradeOption.maxLevel;

    if (currentLevel < maxLevel && game.cash >= upgradeOption.cost) {
        // Deduct the cost of the upgrade from the player's cash
        game.cash -= upgradeOption.cost;

        // Apply the upgrade
        turret.upgrades[upgradeType]++;

        // Update turret properties based on the upgrade
        switch (upgradeType) {
            case 'range':
                turret.range += 50; // Example: Increase range by 50 units
                break;
            case 'rate':
                turret.rate += 0.5; // Example: Increase rate of fire by 0.5 shots per second
                break;
            case 'damage':
                turret.damage += 10; // Example: Increase damage by 10 units
                break;
            default:
                console.error("Invalid upgrade type:", upgradeType);
        }

        console.log(`Turret upgraded: ${upgradeType}`);
        updateUI(); // Update UI to reflect changes
    } else {
        console.log("Upgrade not possible. Insufficient funds or reached maximum level.");
    }
}

// Displays upgrade options for the selected turret
function showUpgradeOptions(turret) {
    const upgradePanel = document.getElementById('upgrade-panel');
    upgradePanel.innerHTML = ''; // Clear previous upgrade options

    // Iterate over upgrade options and create buttons for each option
    Object.keys(upgradeOptions).forEach(upgradeType => {
        const option = upgradeOptions[upgradeType];
        if (turret.upgrades[upgradeType] < option.maxLevel && game.cash >= option.cost) {
            const upgradeButton = document.createElement('button');
            upgradeButton.textContent = `Upgrade ${upgradeType} (${option.cost} cash)`;
            upgradeButton.addEventListener('click', function() {
                upgradeTurret(turret, upgradeType);
            });
            upgradePanel.appendChild(upgradeButton);
        }
    });
}

// Displays turret information and upgrade options
function displayTurretInfoAndOptions(turret) {
    const turretInfoPanel = document.getElementById('turret-info');
    turretInfoPanel.innerHTML = `
        <p>Turret Type: ${turret.type}</p>
        <p>Damage: ${turret.damage}</p>
        <p>Range: ${turret.range}</p>
        <p>Rate of Fire: ${turret.rate}</p>
    `;
    
    showUpgradeOptions(turret);
}

// Adds click listeners to turret representations in the UI
function addTowerClickListeners() {
    const towerElements = document.querySelectorAll('.tower');

    towerElements.forEach(towerElement => {
        towerElement.addEventListener('click', function(event) {
            // Retrieve the turret object corresponding to the clicked tower
            const turretIndex = parseInt(towerElement.dataset.index);
            const selectedTurret = game.turrets[turretIndex];

            // Calculate the position of the turret relative to the canvas
            const canvasRect = canvas.getBoundingClientRect();
            const turretX = selectedTurret.x - canvasRect.left;
            const turretY = selectedTurret.y - canvasRect.top;

            // Display upgrade panel for the selected turret
            showUpgradePanel(turretX, turretY);
            showUpgradeOptions(selectedTurret);
            displayTurretInfoAndOptions(selectedTurret);
        });
    });
}

// Draws enemies on the canvas based on their sprite sheets
function drawEnemies() {
    enemies.forEach(enemy => {
        const enemyData = enemiesData[enemy.type];
        const spriteX = enemyData.frameIndex * frameWidth;
        ctx.drawImage(
            enemyData.spriteSheet,
            spriteX, 0, frameWidth, frameHeight, // Source rectangle
            enemy.x - frameWidth / 2 * spriteScale, enemy.y - frameHeight / 2 * spriteScale, // Destination position
            frameWidth * spriteScale, frameHeight * spriteScale // Destination size
        );
        updateEnemyAnimation(enemyData); // Update enemy animation frame
    });
}

// Updates the animation frame of an enemy
function updateEnemyAnimation(enemyData) {
    if (Date.now() - enemyData.animationStartTime > 110) { // Change animation frame every 100 milliseconds
        enemyData.frameIndex = (enemyData.frameIndex + 1) % enemyData.frameCount; // Increment frame index
        enemyData.animationStartTime = Date.now(); // Reset animation start time
    }
}

// Handles clicks on the game canvas to place turrets
document.getElementById('gameCanvas').addEventListener('click', function(event) {
    if (selectedTurretType) {
        var rect = this.getBoundingClientRect();
        var x = event.clientX - rect.left; // Correct for canvas position
        var y = event.clientY - rect.top;
        console.log('Click coordinates:', x, y);
        if (isValidPlacement(x, y)) {
            placeTurret(selectedTurretType, x, y);
            selectedTurretType = null;  // Reset selection after placing
        }
    }
});
var previousTime = performance.now();
var game = {
    cash: 100, // Starting cash, adjust as needed for game balance
    paused: false,
    turrets: [], // Array to store placed turrets
    // Additional game properties...
};

// Starts a new game with the specified map
function startGame(mapName) {
    console.log(`Starting game with map: ${mapName}`);
    game.paused = false;
    game.cash = 100;
    game.turrets = [];
    enemies = [];
    currentWave = 1;
    waveInProgress = false;
    lastWavePrepared = 0;

    document.getElementById('control-panel').style.display = 'block'; // Ensure the control panel is visible
    updateUI();  // Update UI elements like cash and wave number display
    clearInterval(gameInterval);
    currentMap = mapName;
    initGame();
    setTimeout(() => {
        prepareWave(currentWave);  // Delay the start of the first wave
    }, 1000);
    gameInterval = requestAnimationFrame(gameLoop);
}

// Initializes game settings
function initGame() {
    enemies = []; // Clear previous game enemies
    turrets = []; // Clear previous game turrets
    spawnCounter = 0; // Reset the spawn counter
    loadMap(currentMap);  // Ensure the map is loaded with settings
}

// Draws a preview of turret placement on the canvas
function drawTurretPlacementPreview() {
    var x = lastMousePosition.x;
    var y = lastMousePosition.y;
    ctx.beginPath();
    ctx.arc(x, y, defs.turrets[selectedTurretType].range, 0, 2 * Math.PI);
    ctx.strokeStyle = isValidPlacement(x, y) ? 'green' : 'red';
    ctx.stroke();
}

// Updates the mouse position on mouse movement and triggers rendering if a turret is selected
document.getElementById('gameCanvas').addEventListener('mousemove', function(event) {
    lastMousePosition.x = event.clientX - this.getBoundingClientRect().left;
    lastMousePosition.y = event.clientY - this.getBoundingClientRect().top;
    if (selectedTurretType) {
        render();
    }
});


// Validates turret placement
function isValidPlacement(x, y) {
    // Check distance from other turrets first
    for (let turret of turrets) {
        let dx = turret.x - x;
        let dy = turret.y - y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 50) {
            console.log('Placement too close to another turret.');
            return false;
        }
    }

    // Check if placement is on the path
    for (let i = 0; i < currentPath.length - 1; i++) {
        const start = currentPath[i];
        const end = currentPath[i + 1];
        if (isPointNearLine(x, y, start.x, start.y, end.x, end.y, 30)) {
            console.log('Cannot place turret directly on the path.');
            return false;
        }
    }

    return true; // Valid if not close to turrets and not on the path
}

// Main rendering function
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (levelEditorMode) {
        drawPathPreview();
    } else {
        drawMap();
        drawEnemies();
        drawTurrets();
        drawEffects(); // Make sure effects are drawn after all static elements
        if (selectedTurretType) {
            drawTurretPlacementPreview();
        }
        // Add tower click event listeners after drawing turrets
    } 
}

// Checks if a point is near a line within a given tolerance
function isPointNearLine(px, py, x1, y1, x2, y2, tolerance) {
    let L2 = ((x2 - x1) ** 2 + (y2 - y1) ** 2);
    if (L2 == 0) return false;
    let r = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / L2;
    if (r < 0 || r > 1) return false;
    let s = ((y1 - py) * (x2 - x1) - (x1 - px) * (y2 - y1)) / L2;
    return Math.abs(s) * Math.sqrt(L2) < tolerance;
}


// Loads a map and sets it as the current path
function loadMap(mapName) {
    // Assuming you define what happens when a map loads:
    currentPath = defs.maps[mapName]; // Example of setting the current path
    if (!currentPath) {
        console.error("Map data not found for: " + mapName);
    }
}
