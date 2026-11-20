# Hold the Ground

A first-person 3D tower defense on procedural terrain, with Roblox-style blocky characters. Defend your keep in the east, build banks, hire an army, and march on the enemy kingdom in the west.

## Play

Serve the folder (`python3 -m http.server 8000`) and open http://localhost:8000. Needs internet to load Three.js from a CDN.

## Controls

- Arrow keys (or WASD): move. Space: jump.
- Mouse: look (click the view to capture it, or hold right mouse and drag). Q/E also turn.
- Click: sword combo (slash, backhand, overhead slam). Hold click then release: lunge. F: spin attack.
- B: shop menu (pauses the game). Levels button: pick any unlocked level. T: army Defend / Attack.

## Rules

- Six levels, each with its own terrain and biome (valley, woods, desert, snow, volcanic, final). Later levels have more houses, tougher and faster enemies.
- Enemy houses keep producing soldiers. Destroy every house and the castle to win a level. Your gold, sword level and surviving army carry to the next level.
- Banks earn 40 gold/s. Houses ($250) make a free soldier every 20 s (4 per house). Enemies attack banks, houses and walls. Walls get chewed through.
- You respawn at your keep when you die. The game ends only if the keep falls.
- Greek and Norse gods (Zeus, Poseidon, Hades, Athena, Thor, Odin, Loki, Freya) cost $50,000 each.
