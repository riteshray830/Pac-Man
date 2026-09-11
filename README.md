# ⚡ PAC-MAN: INFINITE NEON ⚡

A modern, high-polish procedural remake of the iconic arcade classic with **infinite random levels**, vibrant **Neo-Retro Synthwave** aesthetics, **intelligent ghost personalities**, and **100% synthesized Web Audio soundscapes**.

---

## 🌟 Key Features

### 1. Procedural Level Design
- **Every level is procedurally generated** with strict **bilateral mirror symmetry** preserving the authentic arcade balance.
- **Cycle / Loop Enforcing**: Eliminates frustrating dead ends so Pac-Man and ghosts can continuously loop and maneuver.
- **Guaranteed Connectivity**: 100% flood-fill validation ensures every pellet and energizer is reachable.
- **Classic Ghost Pen & Warp Tunnels**: Features the standard central ghost house with a one-way gate and wrap-around lateral screen warp tunnels.

### 2. Intelligent Ghost Personalities
Faithful to Toru Iwatani's original arcade design:
- 🔴 **Blinky ("Shadow" / Red)**: Aggressive direct chaser. Targets Pac-Man's exact coordinates and enters **Cruise Elroy** speed boosts when remaining dots drop low.
- 🌸 **Pinky ("Speedy" / Pink)**: Ambusher. Anticipates Pac-Man's trajectory, targeting 4 tiles ahead of Pac-Man's movement direction.
- 🔷 **Inky ("Bashful" / Cyan)**: Tactical flanker. Executes a pincer maneuver based on the vector between Blinky and Pac-Man.
- 🔶 **Clyde ("Pokey" / Orange)**: Chases Pac-Man when farther than 8 tiles away; retreats toward his home corner when Pac-Man approaches.

### 3. Dynamic Wave & Mode System
- **Scatter & Chase Cycles**: Timed transitions between Scatter and Chase modes.
- **Energizer Frightened Mode**: Eating a cyan power pellet turns ghosts vulnerable (flashing white when timer expires).
- **Multiplier Combo Chain**: Consecutive ghost captures reward **200 ➔ 400 ➔ 800 ➔ 1600** points!
- **Eaten State**: Floating disembodied eyes race back to the ghost house to re-spawn.

### 4. Visual "Juice" & Aesthetics
- High-DPI canvas vector graphics with neon drop-shadow bloom.
- **Dynamic Level Themes**: Neon Cyan (Lvl 1), Synthwave Magenta (Lvl 2), Matrix Toxic Green (Lvl 3), Sunset Amber (Lvl 4), Electric Violet (Lvl 5+).
- **Particle System**: Sparking dot eats, shockwave rings on power pellet bursts, radial shard explosions on ghost eating, floating score markers, and level victory confetti.
- **Screen Shake & Hit-Stop**: 80ms micro-pause ("hit-stop") on ghost capture for punchy tactile impact.
- **CRT Scanline Overlay & Marquee Cabinet Framing**.

### 5. Pure Synthesized Chiptune Audio (Web Audio API)
Zero external audio files needed; everything is synthesized dynamically:
- Dual-tone frequency-modulated **Waka-Waka** chomp.
- Dynamic tension **Sirens** that scale tempo and pitch with remaining pellets.
- Deep pulsing **Power Pellet Siren**.
- Multi-tone ascending **Ghost Capture Fanfare**.
- Harmonic arpeggio for **Bonus Fruits**.
- Descending pitch **Death Dissolution Whistle & Pop**.
- Intro and Level Clear arcades tunes.

---

## 🎮 How to Play

### Controls
- **Keyboard**: Arrow Keys or `W`, `A`, `S`, `D`
- **Corner Assist**: Buffer your turns slightly before junctions for smooth, effortless navigation.
- **Pause**: Press `P` or `ESC`
- **Mobile / Touch**: Swipe gestures or on-screen directional D-Pad.

### Quick Start
You can launch the game in any browser:
```bash
# Simply double-click index.html or run:
python -m http.server 8080
```
Then visit [http://localhost:8080](http://localhost:8080).
