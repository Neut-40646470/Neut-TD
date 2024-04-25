var defs = {
    maps: {
        Stair: [
            { x: 0, y: 100 },
            { x: 150, y: 100 },
            { x: 150, y: 200 },
            { x: 300, y: 200 },
            { x: 300, y: 300 },
            { x: 450, y: 300 },
            { x: 450, y: 400 },
            { x: 600, y: 400 },
            { x: 600, y: 500 },
            { x: 750, y: 500 }
        ],
        SnakingLine: [
            { x: 0, y: 200 },
            { x: 100, y: 200 },
            { x: 100, y: 300 },
            { x: 200, y: 300 },
            { x: 200, y: 100 },
            { x: 300, y: 100 },
            { x: 300, y: 400 },
            { x: 400, y: 400 },
            { x: 400, y: 0 },
            { x: 500, y: 0 },
            { x: 500, y: 500 },
            { x: 600, y: 500 },
            { x: 600, y: 200 },
            { x: 700, y: 200 },
            { x: 700, y: 450 },
            { x: 800, y: 450 }
        ]
        // you can add additional maps as necessary
    },
    turrets: {
        basic: {
            cost: 50,
            range: 100,
            rate: 2,
            damage: 25,
            upgrades: {
                range: { level1: 150, level2: 200, level3: 250 },
                rate: { level1: 1.5, level2: 2, level3: 2.5 },
                damage: { level1: 25, level2: 30, level3: 35 }
            }
        },
        sniper: {
            cost: 100,
            range: 200,
            rate: 25,
            damage: 50,
            upgrades: {
                range: { level1: 250, level2: 300, level3: 350 },
                rate: { level1: 2.5, level2: 3, level3: 3.5 },
                damage: { level1: 60, level2: 70, level3: 80 }
            }
        }
    },
    enemies: {
        basic: { health: 100, speed: 1, reward: 20 },
        fast: { health: 50, speed: 2, reward: 30 },
        strong: { health: 400, speed: 0.5, reward: 60 }
    }
}
