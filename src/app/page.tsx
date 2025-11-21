'use client';

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type InputState = {
  left: boolean;
  right: boolean;
  jump: boolean;
};

type UiState = {
  coins: number;
  lives: number;
  status: "ready" | "playing" | "won" | "lost";
};

type Collectable = {
  x: number;
  y: number;
  active: boolean;
};

const TILE_SIZE = 32;
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const PLAYER_WIDTH = 26;
const PLAYER_HEIGHT = 32;
const GRAVITY = 1800;
const MOVE_SPEED = 260;
const JUMP_VELOCITY = -720;
const LEVEL_LAYOUT = [
  "........................................................................................",
  "........................................................................................",
  "........................................................................................",
  "........................................................................................",
  "........................................................................................",
  "..............................................................C.........................",
  "......................................................XXXX..............................",
  "............................................C...................C.......................",
  ".......................................XXXXXXX.............XXXXXXX......................",
  "..............................C..........................................................",
  ".....................XXXX.................C.............................................",
  ".................C.................XXXXXXX...............................................",
  "............XXXXXXX.......................................................C..............",
  "............................................XXXX...............XXXXXXX..................",
  "......C..................................................C...............................",
  "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
];

const LEVEL_WIDTH = LEVEL_LAYOUT[0].length * TILE_SIZE;
const LEVEL_HEIGHT = LEVEL_LAYOUT.length * TILE_SIZE;
const LEVEL_BOTTOM = LEVEL_HEIGHT + TILE_SIZE * 2;
const SPAWN_X = TILE_SIZE * 2;
const SPAWN_Y = TILE_SIZE * 12;

function isSolid(tile: string) {
  return tile === "X";
}

function getTile(row: number, col: number) {
  return LEVEL_LAYOUT[row]?.[col] ?? ".";
}

function collectablesFromLayout(): Collectable[] {
  const coins: Collectable[] = [];
  LEVEL_LAYOUT.forEach((row, y) => {
    [...row].forEach((char, x) => {
      if (char === "C") {
        coins.push({
          x: x * TILE_SIZE + TILE_SIZE / 2,
          y: y * TILE_SIZE + TILE_SIZE / 2,
          active: true,
        });
      }
    });
  });
  return coins;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, jump: false });
  const lastTimeRef = useRef<number | null>(null);
  const playerRef = useRef({
    x: SPAWN_X,
    y: SPAWN_Y,
    vx: 0,
    vy: 0,
    coins: 0,
    lives: 3,
    onGround: false,
    status: "ready" as UiState["status"],
  });
  const collectablesRef = useRef<Collectable[]>(collectablesFromLayout());
  const [uiState, setUiState] = useState<UiState>({
    coins: 0,
    lives: 3,
    status: "ready",
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const updateUi = () => {
      const player = playerRef.current;
      setUiState((prev) => {
        if (
          prev.coins === player.coins &&
          prev.lives === player.lives &&
          prev.status === player.status
        ) {
          return prev;
        }
        return {
          coins: player.coins,
          lives: player.lives,
          status: player.status,
        };
      });
    };

    const resetPosition = () => {
      const player = playerRef.current;
      player.x = SPAWN_X;
      player.y = SPAWN_Y;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
    };

    const resetLevel = () => {
      collectablesRef.current = collectablesFromLayout();
    };

    const drawScene = (player: typeof playerRef.current) => {
      ctx.save();
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#87ceeb");
      gradient.addColorStop(1, "#e0f7ff");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const cameraX = Math.min(
        Math.max(player.x + PLAYER_WIDTH / 2 - CANVAS_WIDTH / 2, 0),
        LEVEL_WIDTH - CANVAS_WIDTH,
      );
      const cameraY = Math.min(
        Math.max(player.y + PLAYER_HEIGHT / 2 - CANVAS_HEIGHT / 2, 0),
        LEVEL_HEIGHT - CANVAS_HEIGHT,
      );

      const startCol = Math.floor(cameraX / TILE_SIZE);
      const endCol = Math.ceil((cameraX + CANVAS_WIDTH) / TILE_SIZE);
      const startRow = Math.floor(cameraY / TILE_SIZE);
      const endRow = Math.ceil((cameraY + CANVAS_HEIGHT) / TILE_SIZE);

      for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
          const tile = getTile(row, col);
          const drawX = col * TILE_SIZE - cameraX;
          const drawY = row * TILE_SIZE - cameraY;
          if (tile === "X") {
            ctx.fillStyle = "#c86f32";
            ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#a6541c";
            ctx.fillRect(drawX + 4, drawY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          } else if (tile === "C") {
            // keep layout reference for respawns, coins drawn separately
          }
        }
      }

      // draw coins
      collectablesRef.current.forEach((coin) => {
        if (!coin.active) return;
        const drawX = coin.x - cameraX;
        const drawY = coin.y - cameraY;
        ctx.fillStyle = "#f9d342";
        ctx.beginPath();
        ctx.ellipse(drawX, drawY, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4b400";
        ctx.beginPath();
        ctx.ellipse(drawX, drawY, 5, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // draw player
      ctx.save();
      ctx.translate(player.x - cameraX, player.y - cameraY);
      ctx.fillStyle = "#ff2d2d";
      ctx.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
      ctx.fillStyle = "#ffd966";
      ctx.fillRect(4, 4, PLAYER_WIDTH - 8, 10);
      ctx.fillStyle = "#3d3d3d";
      ctx.fillRect(6, PLAYER_HEIGHT - 6, PLAYER_WIDTH - 12, 6);
      ctx.restore();
      ctx.restore();
    };

    const enterMenu = (status: UiState["status"]) => {
      resetPosition();
      resetLevel();
      const player = playerRef.current;
      if (status === "ready") {
        player.coins = 0;
        player.lives = 3;
      } else if (status === "lost") {
        player.coins = 0;
        player.lives = 0;
      }
      inputRef.current.jump = false;
      player.status = status;
      lastTimeRef.current = null;
      updateUi();
      drawScene(player);
    };

    const startGame = () => {
      const player = playerRef.current;
      if (player.status === "playing") return;
      resetPosition();
      resetLevel();
      player.coins = 0;
      player.lives = 3;
      player.status = "playing";
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.jump = false;
      lastTimeRef.current = null;
      updateUi();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const input = inputRef.current;
      if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = true;
      if (event.code === "ArrowRight" || event.code === "KeyD") input.right = true;
      if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") {
        input.jump = true;
      }
      if (playerRef.current.status !== "playing") {
        startGame();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const input = inputRef.current;
      if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = false;
      if (event.code === "ArrowRight" || event.code === "KeyD") input.right = false;
      if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") {
        input.jump = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const checkCollisions = (x: number, y: number, width: number, height: number) => {
      const tiles: { row: number; col: number }[] = [];
      const startCol = Math.floor(x / TILE_SIZE);
      const endCol = Math.floor((x + width - 1) / TILE_SIZE);
      const startRow = Math.floor(y / TILE_SIZE);
      const endRow = Math.floor((y + height - 1) / TILE_SIZE);

      for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
          const tile = getTile(row, col);
          if (isSolid(tile)) {
            tiles.push({ row, col });
          }
        }
      }
      return tiles;
    };

    const resolveHorizontal = (player: typeof playerRef.current, dt: number) => {
      const input = inputRef.current;
      if (input.left && !input.right) {
        player.vx = -MOVE_SPEED;
      } else if (input.right && !input.left) {
        player.vx = MOVE_SPEED;
      } else {
        player.vx = 0;
      }

      let newX = player.x + player.vx * dt;
      newX = Math.max(0, Math.min(newX, LEVEL_WIDTH - PLAYER_WIDTH));
      const collisions = checkCollisions(newX, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
      for (const tile of collisions) {
        const tileLeft = tile.col * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE;
        if (player.vx > 0) {
          newX = tileLeft - PLAYER_WIDTH - 0.01;
        } else if (player.vx < 0) {
          newX = tileRight + 0.01;
        }
      }
      player.x = newX;
    };

    const resolveVertical = (player: typeof playerRef.current, dt: number) => {
      if (inputRef.current.jump && player.onGround) {
        player.vy = JUMP_VELOCITY;
        player.onGround = false;
      }

      player.vy += GRAVITY * dt;
      if (player.vy > GRAVITY) {
        player.vy = GRAVITY;
      }

      let newY = player.y + player.vy * dt;
      const collisions = checkCollisions(player.x, newY, PLAYER_WIDTH, PLAYER_HEIGHT);
      player.onGround = false;

      for (const tile of collisions) {
        const tileTop = tile.row * TILE_SIZE;
        const tileBottom = tileTop + TILE_SIZE;
        if (player.vy > 0) {
          newY = tileTop - PLAYER_HEIGHT - 0.01;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          newY = tileBottom + 0.01;
          player.vy = 0;
        }
      }

      player.y = newY;
    };

    const handleCollectables = (player: typeof playerRef.current) => {
      const coins = collectablesRef.current;
      const pxCenter = player.x + PLAYER_WIDTH / 2;
      const pyCenter = player.y + PLAYER_HEIGHT / 2;

      coins.forEach((coin) => {
        if (!coin.active) return;
        const dx = Math.abs(pxCenter - coin.x);
        const dy = Math.abs(pyCenter - coin.y);
        if (dx < TILE_SIZE * 0.6 && dy < TILE_SIZE * 0.6) {
          coin.active = false;
          player.coins += 1;
          if (player.coins % 5 === 0) {
            player.lives = Math.min(player.lives + 1, 9);
          }
          updateUi();
        }
      });
    };

    const checkFall = (player: typeof playerRef.current) => {
      if (player.y > LEVEL_BOTTOM) {
        player.lives -= 1;
        if (player.lives <= 0) {
          enterMenu("lost");
        } else {
          resetPosition();
          player.vx = 0;
          player.vy = 0;
          player.onGround = false;
          updateUi();
        }
      }
    };

    const maybeWin = (player: typeof playerRef.current) => {
      if (player.x + PLAYER_WIDTH >= LEVEL_WIDTH - TILE_SIZE * 2) {
        enterMenu("won");
      }
    };

    const loop = (timestamp: number) => {
      if (!canvasRef.current) return;

      const player = playerRef.current;
      if (player.status !== "playing") {
        drawScene(player);
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      const lastTime = lastTimeRef.current ?? timestamp;
      const delta = Math.min(0.04, (timestamp - lastTime) / 1000);
      lastTimeRef.current = timestamp;

      resolveHorizontal(player, delta);
      resolveVertical(player, delta);
      handleCollectables(player);
      checkFall(player);
      maybeWin(player);
      drawScene(player);

      animationRef.current = requestAnimationFrame(loop);
    };

    enterMenu("ready");
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.hud}>
        <div className={styles.hudBlock}>
          <span className={styles.hudLabel}>MARIO</span>
          <span className={styles.hudValue}>{uiState.coins.toString().padStart(3, "0")}</span>
        </div>
        <div className={styles.hudBlock}>
          <span className={styles.hudLabel}>WORLD</span>
          <span className={styles.hudValue}>1-1</span>
        </div>
        <div className={styles.hudBlock}>
          <span className={styles.hudLabel}>LIVES</span>
          <span className={styles.hudValue}>{uiState.lives}</span>
        </div>
      </header>
      <main className={styles.main}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className={styles.canvas} />
        <div className={styles.panel}>
          {uiState.status === "ready" && (
            <p className={styles.message}>Press any arrow key or space to start</p>
          )}
          {uiState.status === "won" && (
            <p className={styles.message}>
              You reached the flag! Press jump to play again.
            </p>
          )}
          {uiState.status === "lost" && (
            <p className={styles.message}>
              Game over! Press jump to try again.
            </p>
          )}
          <p className={styles.instructions}>
            Controls: Arrow keys / WASD to move, Space or Up to jump. Collect coins for extra lives.
          </p>
        </div>
      </main>
    </div>
  );
}
