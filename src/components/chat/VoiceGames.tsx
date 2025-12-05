import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Circle, Grid3x3, Mountain, Timer } from "lucide-react";

interface VoiceGamesProps {
  onBroadcast?: (data: any) => void;
  gameState?: any;
}

// Cute Mascot Component
const Mascot = ({ x, y, size, isMoving, isJumping, isBig }: { x: number; y: number; size: number; isMoving: boolean; isJumping: boolean; isBig?: boolean }) => {
  const actualSize = isBig ? size * 1.5 : size;
  return (
    <svg
      style={{
        position: 'absolute',
        left: x,
        top: y - (isBig ? size * 0.5 : 0),
        width: actualSize,
        height: actualSize + 8,
        transition: 'none',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      }}
      viewBox="0 0 32 40"
    >
      {/* Antenna */}
      <g className={isMoving || isJumping ? "animate-wiggle" : ""}>
        <line x1="16" y1="8" x2="16" y2="2" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="1" r="2" fill="#38bdf8" className="animate-pulse">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
        </circle>
      </g>
      
      {/* Body - marshmallow shape */}
      <ellipse cx="16" cy="22" rx="12" ry="14" fill="url(#bodyGradient)" />
      <ellipse cx="16" cy="22" rx="10" ry="12" fill="url(#bodyInnerGradient)" opacity="0.5" />
      
      {/* Soft highlight */}
      <ellipse cx="12" cy="16" rx="4" ry="3" fill="white" opacity="0.4" />
      
      {/* Left arm - stubby */}
      <ellipse 
        cx="5" 
        cy="22" 
        rx="3" 
        ry="4" 
        fill="#c4b5fd"
        style={{ transform: isMoving ? 'rotate(-10deg)' : 'rotate(0deg)', transformOrigin: '8px 22px' }}
      />
      
      {/* Right arm - stubby */}
      <ellipse 
        cx="27" 
        cy="22" 
        rx="3" 
        ry="4" 
        fill="#c4b5fd"
        style={{ transform: isMoving ? 'rotate(10deg)' : 'rotate(0deg)', transformOrigin: '24px 22px' }}
      />
      
      {/* Left eye */}
      <ellipse cx="11" cy="20" rx="4" ry="5" fill="white" />
      <ellipse cx="11" cy="20" rx="3" ry="4" fill="#1e1b4b" />
      <circle cx="12" cy="19" r="1.5" fill="white" />
      {/* Eye glow */}
      <ellipse cx="11" cy="20" rx="4.5" ry="5.5" fill="none" stroke="#7dd3fc" strokeWidth="0.5" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </ellipse>
      
      {/* Right eye */}
      <ellipse cx="21" cy="20" rx="4" ry="5" fill="white" />
      <ellipse cx="21" cy="20" rx="3" ry="4" fill="#1e1b4b" />
      <circle cx="22" cy="19" r="1.5" fill="white" />
      {/* Eye glow */}
      <ellipse cx="21" cy="20" rx="4.5" ry="5.5" fill="none" stroke="#7dd3fc" strokeWidth="0.5" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </ellipse>
      
      {/* Curious expression - small open mouth */}
      <ellipse cx="16" cy="28" rx="2" ry="1.5" fill="#4c1d95" />
      
      {/* Blush marks */}
      <ellipse cx="6" cy="24" rx="2" ry="1" fill="#f9a8d4" opacity="0.5" />
      <ellipse cx="26" cy="24" rx="2" ry="1" fill="#f9a8d4" opacity="0.5" />
      
      {/* Gradients */}
      <defs>
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="50%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#99f6e4" />
        </linearGradient>
        <linearGradient id="bodyInnerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// Enemy Component
const Enemy = ({ x, y, type }: { x: number; y: number; type: 'goomba' | 'koopa' }) => {
  if (type === 'goomba') {
    return (
      <div 
        className="absolute"
        style={{ left: x, top: y, width: 20, height: 20 }}
      >
        <div 
          className="w-full h-full rounded-full"
          style={{ background: 'linear-gradient(to bottom, #92400e 0%, #78350f 100%)' }}
        >
          <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-white rounded-full" />
          <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 bg-white rounded-full" />
          <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-3 h-1.5 bg-black rounded-full" />
        </div>
      </div>
    );
  }
  return (
    <div 
      className="absolute"
      style={{ left: x, top: y, width: 20, height: 24 }}
    >
      <div 
        className="w-full h-full rounded-t-full"
        style={{ background: 'linear-gradient(to bottom, #22c55e 0%, #16a34a 100%)' }}
      />
    </div>
  );
};

// Tic Tac Toe Game - Multiplayer
const TicTacToe = ({ onBroadcast, gameState }: { onBroadcast?: (data: any) => void; gameState?: any }) => {
  const [board, setBoard] = useState<(string | null)[]>(gameState?.board || Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(gameState?.isXTurn ?? true);
  const [winner, setWinner] = useState<string | null>(gameState?.winner || null);

  useEffect(() => {
    if (gameState) {
      setBoard(gameState.board || Array(9).fill(null));
      setIsXTurn(gameState.isXTurn ?? true);
      setWinner(gameState.winner || null);
    }
  }, [gameState]);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = isXTurn ? "X" : "O";

    const gameWinner = checkWinner(newBoard);
    const newState = {
      board: newBoard,
      isXTurn: !isXTurn,
      winner: gameWinner
    };

    setBoard(newBoard);
    setWinner(gameWinner);
    setIsXTurn(!isXTurn);

    onBroadcast?.({ type: 'tictactoe', state: newState });
  };

  const resetGame = () => {
    const newState = { board: Array(9).fill(null), isXTurn: true, winner: null };
    setBoard(newState.board);
    setIsXTurn(newState.isXTurn);
    setWinner(newState.winner);
    onBroadcast?.({ type: 'tictactoe', state: newState });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        {winner ? (
          <p className="text-lg font-bold text-primary">Winner: {winner}!</p>
        ) : board.every(c => c !== null) ? (
          <p className="text-lg font-bold">Draw!</p>
        ) : (
          <p className="text-sm">Current: <span className="font-bold">{isXTurn ? "X" : "O"}</span></p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {board.map((cell, index) => (
          <Button
            key={index}
            onClick={() => handleClick(index)}
            className="w-12 h-12 text-lg font-bold"
            variant={cell ? "default" : "outline"}
          >
            {cell}
          </Button>
        ))}
      </div>
      <Button onClick={resetGame} size="sm" variant="outline">Reset</Button>
    </div>
  );
};

// Draw a Circle Game - Multiplayer
const DrawCircle = ({ onBroadcast, gameState }: { onBroadcast?: (data: any) => void; gameState?: any }) => {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(gameState?.bestScore || 0);
  const [bestPlayer, setBestPlayer] = useState(gameState?.bestPlayer || "");
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (gameState) {
      if (gameState.bestScore > bestScore) {
        setBestScore(gameState.bestScore);
        setBestPlayer(gameState.bestPlayer || "Someone");
      }
    }
  }, [gameState]);

  const calculateCircleScore = (pts: { x: number; y: number }[]) => {
    if (pts.length < 10) return 0;
    const centerX = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    const centerY = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
    const avgRadius = pts.reduce((sum, p) => {
      const dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
      return sum + dist;
    }, 0) / pts.length;
    const variance = pts.reduce((sum, p) => {
      const dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
      return sum + Math.abs(dist - avgRadius);
    }, 0) / pts.length;
    return Math.round(Math.max(0, 100 - variance));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setPoints([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const newPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setPoints(prev => [...prev, newPoint]);
    const ctx = canvas.getContext("2d");
    if (ctx && points.length > 0) {
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(newPoint.x, newPoint.y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      const finalScore = calculateCircleScore(points);
      setScore(finalScore);
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        setBestPlayer("You");
        onBroadcast?.({ type: 'circle', state: { bestScore: finalScore, bestPlayer: "Friend" } });
      }
      setIsDrawing(false);
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPoints([]);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Draw a perfect circle!</p>
        <div className="flex gap-3 justify-center text-xs">
          <p>Your: <span className="font-bold">{score}</span></p>
          <p>Best: <span className="font-bold text-primary">{bestScore}</span></p>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={180}
        height={180}
        className="border-2 border-border rounded-lg cursor-crosshair bg-background"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <Button onClick={resetCanvas} size="sm" variant="outline">Clear</Button>
    </div>
  );
};

// Level definitions
const LEVELS = [
  {
    name: "World 1-1",
    platforms: [
      { x: 0, y: 155, width: 2000, height: 25, type: 'ground' },
      { x: 200, y: 120, width: 60, height: 12, type: 'brick' },
      { x: 280, y: 120, width: 20, height: 12, type: 'question' },
      { x: 400, y: 90, width: 80, height: 12, type: 'brick' },
      { x: 500, y: 60, width: 20, height: 12, type: 'question' },
      { x: 600, y: 120, width: 100, height: 12, type: 'brick' },
      { x: 750, y: 85, width: 60, height: 12, type: 'brick' },
      { x: 850, y: 50, width: 20, height: 12, type: 'question' },
      { x: 950, y: 120, width: 80, height: 12, type: 'brick' },
    ],
    coins: [
      { x: 220, y: 90 }, { x: 250, y: 90 }, { x: 420, y: 60 }, { x: 450, y: 60 },
      { x: 620, y: 90 }, { x: 650, y: 90 }, { x: 680, y: 90 }, { x: 770, y: 55 },
    ],
    enemies: [
      { x: 350, y: 135, type: 'goomba' as const, direction: -1 },
      { x: 550, y: 135, type: 'goomba' as const, direction: -1 },
      { x: 700, y: 135, type: 'koopa' as const, direction: -1 },
      { x: 900, y: 135, type: 'goomba' as const, direction: -1 },
    ],
    goal: 1000,
  },
  {
    name: "World 1-2",
    platforms: [
      { x: 0, y: 155, width: 300, height: 25, type: 'ground' },
      { x: 350, y: 155, width: 200, height: 25, type: 'ground' },
      { x: 600, y: 155, width: 400, height: 25, type: 'ground' },
      { x: 100, y: 110, width: 60, height: 12, type: 'brick' },
      { x: 180, y: 70, width: 20, height: 12, type: 'question' },
      { x: 300, y: 120, width: 40, height: 12, type: 'brick' },
      { x: 400, y: 80, width: 100, height: 12, type: 'brick' },
      { x: 550, y: 110, width: 40, height: 12, type: 'brick' },
      { x: 700, y: 60, width: 20, height: 12, type: 'question' },
      { x: 800, y: 100, width: 80, height: 12, type: 'brick' },
    ],
    coins: [
      { x: 120, y: 80 }, { x: 320, y: 90 }, { x: 420, y: 50 }, { x: 450, y: 50 },
      { x: 480, y: 50 }, { x: 820, y: 70 }, { x: 850, y: 70 },
    ],
    enemies: [
      { x: 200, y: 135, type: 'goomba' as const, direction: -1 },
      { x: 400, y: 135, type: 'koopa' as const, direction: 1 },
      { x: 650, y: 135, type: 'goomba' as const, direction: -1 },
      { x: 750, y: 135, type: 'goomba' as const, direction: -1 },
      { x: 850, y: 135, type: 'koopa' as const, direction: 1 },
    ],
    goal: 950,
  },
  {
    name: "World 1-3",
    platforms: [
      { x: 0, y: 155, width: 150, height: 25, type: 'ground' },
      { x: 200, y: 155, width: 100, height: 25, type: 'ground' },
      { x: 350, y: 155, width: 80, height: 25, type: 'ground' },
      { x: 500, y: 155, width: 120, height: 25, type: 'ground' },
      { x: 700, y: 155, width: 400, height: 25, type: 'ground' },
      { x: 100, y: 120, width: 20, height: 12, type: 'question' },
      { x: 250, y: 100, width: 40, height: 12, type: 'brick' },
      { x: 380, y: 80, width: 20, height: 12, type: 'question' },
      { x: 550, y: 100, width: 60, height: 12, type: 'brick' },
      { x: 750, y: 60, width: 20, height: 12, type: 'question' },
      { x: 850, y: 90, width: 100, height: 12, type: 'brick' },
    ],
    coins: [
      { x: 250, y: 70 }, { x: 270, y: 70 }, { x: 560, y: 70 }, { x: 590, y: 70 },
      { x: 870, y: 60 }, { x: 900, y: 60 }, { x: 930, y: 60 },
    ],
    enemies: [
      { x: 220, y: 135, type: 'goomba' as const, direction: -1 },
      { x: 360, y: 135, type: 'goomba' as const, direction: 1 },
      { x: 520, y: 135, type: 'koopa' as const, direction: -1 },
      { x: 800, y: 135, type: 'goomba' as const, direction: -1 },
      { x: 900, y: 135, type: 'koopa' as const, direction: 1 },
    ],
    goal: 1000,
  }
];

// Mario-style Parkour Game with Side Scrolling
const ParkourGame = ({ onBroadcast, gameState }: { onBroadcast?: (data: any) => void; gameState?: any }) => {
  const [position, setPosition] = useState({ x: 50, y: 130 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isGrounded, setIsGrounded] = useState(false);
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [cameraX, setCameraX] = useState(0);
  const [isBig, setIsBig] = useState(false);
  const [coins, setCoins] = useState<{x: number; y: number; collected: boolean}[]>([]);
  const [enemies, setEnemies] = useState<{x: number; y: number; type: 'goomba' | 'koopa'; direction: number; alive: boolean}[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [otherPlayers, setOtherPlayers] = useState<{x: number; y: number}[]>([]);
  const [speedrunMode, setSpeedrunMode] = useState(false);
  const [speedrunTime, setSpeedrunTime] = useState(0);
  const [keySequence, setKeySequence] = useState("");
  const keysRef = useRef<Set<string>>(new Set());
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const GAME_WIDTH = 300;
  const GAME_HEIGHT = 180;
  const PLAYER_SIZE = 24;
  const GRAVITY = 0.5;
  const JUMP_FORCE = -10;
  const MOVE_SPEED = speedrunMode ? 5 : 3;

  const level = LEVELS[currentLevel];

  // Initialize level
  useEffect(() => {
    if (gameStarted && level) {
      setCoins(level.coins.map(c => ({ ...c, collected: false })));
      setEnemies(level.enemies.map(e => ({ ...e, alive: true })));
    }
  }, [gameStarted, currentLevel]);

  useEffect(() => {
    if (gameState?.players) setOtherPlayers(gameState.players);
  }, [gameState]);

  // Speedrun code detection
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) {
        const newSeq = (keySequence + e.key).slice(-6);
        setKeySequence(newSeq);
        if (newSeq === "071221") {
          setSpeedrunMode(true);
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [keySequence, gameStarted]);

  // Speedrun timer
  useEffect(() => {
    if (speedrunMode && gameStarted && !gameOver && !levelComplete) {
      const timer = setInterval(() => {
        setSpeedrunTime(t => t + 10);
      }, 10);
      return () => clearInterval(timer);
    }
  }, [speedrunMode, gameStarted, gameOver, levelComplete]);

  const checkCollision = useCallback((x: number, y: number, playerSize: number = PLAYER_SIZE) => {
    if (!level) return null;
    for (const platform of level.platforms) {
      if (
        x + playerSize > platform.x - cameraX &&
        x < platform.x + platform.width - cameraX &&
        y + playerSize > platform.y &&
        y < platform.y + platform.height
      ) {
        return platform;
      }
    }
    return null;
  }, [level, cameraX]);

  // Enemy movement
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const enemyLoop = setInterval(() => {
      setEnemies(prev => prev.map(enemy => {
        if (!enemy.alive) return enemy;
        let newX = enemy.x + enemy.direction * 0.5;
        // Bounce off edges
        if (newX < 50 || newX > level.goal - 50) {
          return { ...enemy, direction: -enemy.direction };
        }
        return { ...enemy, x: newX };
      }));
    }, 50);
    return () => clearInterval(enemyLoop);
  }, [gameStarted, gameOver, level]);

  useEffect(() => {
    if (!gameStarted || gameOver || levelComplete) return;

    const gameLoop = setInterval(() => {
      const moving = keysRef.current.has("ArrowLeft") || keysRef.current.has("ArrowRight") || 
                     keysRef.current.has("a") || keysRef.current.has("d");
      setIsMoving(moving);

      setPosition(prev => {
        let newX = prev.x;
        let newY = prev.y;
        let newVelY = velocity.y + GRAVITY;
        let grounded = false;

        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) newX -= MOVE_SPEED;
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) newX += MOVE_SPEED;

        newY += newVelY;

        const playerSize = isBig ? PLAYER_SIZE * 1.5 : PLAYER_SIZE;
        const collision = checkCollision(newX, newY, playerSize);
        
        if (collision) {
          if (newVelY > 0) {
            newY = collision.y - playerSize;
            newVelY = 0;
            grounded = true;
          }
          // Hit question block from below
          if (newVelY < 0 && collision.type === 'question') {
            setIsBig(true);
            setScore(s => s + 200);
          }
          // Break brick block if big
          if (isBig && newVelY < 0 && collision.type === 'brick') {
            // Can't actually remove platform in this simple impl, but score bonus
            setScore(s => s + 50);
          }
        }

        // Prevent going off left edge
        newX = Math.max(0, newX);
        
        // Update camera for side scrolling
        if (newX > GAME_WIDTH / 2) {
          setCameraX(Math.max(0, newX - GAME_WIDTH / 2));
        }

        // Check level completion
        if (newX + cameraX >= level.goal) {
          setLevelComplete(true);
        }

        // Fall off screen
        if (newY > GAME_HEIGHT) {
          setGameOver(true);
          return prev;
        }

        // Enemy collision
        const realX = newX + cameraX;
        enemies.forEach((enemy, idx) => {
          if (!enemy.alive) return;
          const dx = Math.abs(realX + playerSize/2 - enemy.x - 10);
          const dy = newY + playerSize - enemy.y;
          
          if (dx < 20 && dy > 0 && dy < 20) {
            // Stomp from above
            if (newVelY > 0) {
              setEnemies(e => e.map((en, i) => i === idx ? {...en, alive: false} : en));
              setScore(s => s + 100);
              newVelY = JUMP_FORCE / 2;
            } else {
              // Hit from side
              if (isBig) {
                setIsBig(false);
              } else {
                setGameOver(true);
              }
            }
          }
        });

        setVelocity(v => ({ ...v, y: newVelY }));
        setIsGrounded(grounded);

        // Coin collection
        setCoins(prevCoins => {
          let newScore = score;
          const updated = prevCoins.map(coin => {
            if (!coin.collected) {
              const dx = Math.abs(newX + cameraX + playerSize/2 - coin.x - 8);
              const dy = Math.abs(newY + playerSize/2 - coin.y - 8);
              if (dx < 20 && dy < 20) {
                newScore += 100;
                return { ...coin, collected: true };
              }
            }
            return coin;
          });
          if (newScore !== score) setScore(newScore);
          return updated;
        });

        onBroadcast?.({ type: 'parkour', state: { players: [{ x: newX + cameraX, y: newY }] } });
        return { x: newX, y: newY };
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, velocity.y, checkCollision, onBroadcast, score, cameraX, isBig, enemies, gameOver, levelComplete, level, MOVE_SPEED]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if ((e.key === " " || e.key === "ArrowUp" || e.key === "w") && isGrounded) {
        setVelocity(v => ({ ...v, y: JUMP_FORCE }));
        setIsGrounded(false);
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    if (gameStarted) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameStarted, isGrounded]);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setLevelComplete(false);
    setPosition({ x: 50, y: 130 });
    setVelocity({ x: 0, y: 0 });
    setCameraX(0);
    setScore(0);
    setIsBig(false);
    setSpeedrunTime(0);
    setCoins(level.coins.map(c => ({ ...c, collected: false })));
    setEnemies(level.enemies.map(e => ({ ...e, alive: true })));
    gameContainerRef.current?.focus();
  };

  const nextLevel = () => {
    if (currentLevel < LEVELS.length - 1) {
      setCurrentLevel(currentLevel + 1);
      setLevelComplete(false);
      setPosition({ x: 50, y: 130 });
      setVelocity({ x: 0, y: 0 });
      setCameraX(0);
    }
  };

  const resetGame = () => {
    setGameOver(false);
    setLevelComplete(false);
    setPosition({ x: 50, y: 130 });
    setVelocity({ x: 0, y: 0 });
    setCameraX(0);
    setIsBig(false);
    setCoins(level.coins.map(c => ({ ...c, collected: false })));
    setEnemies(level.enemies.map(e => ({ ...e, alive: true })));
  };

  // Brick pattern renderer
  const renderBrick = (x: number, y: number, width: number, height: number) => (
    <div
      key={`brick-${x}-${y}`}
      className="absolute"
      style={{ left: x - cameraX, top: y, width, height }}
    >
      <div 
        className="w-full h-full"
        style={{
          background: 'linear-gradient(to bottom, #c2410c 0%, #ea580c 20%, #c2410c 100%)',
          borderRadius: 2,
          boxShadow: 'inset 0 -2px 0 #7c2d12, inset 0 2px 0 #fb923c',
        }}
      >
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `
            linear-gradient(to right, #7c2d12 1px, transparent 1px),
            linear-gradient(to bottom, #7c2d12 1px, transparent 1px)
          `,
          backgroundSize: '15px 100%, 100% 6px',
        }} />
      </div>
    </div>
  );

  // Question block renderer
  const renderQuestionBlock = (x: number, y: number, width: number, height: number) => (
    <div
      key={`question-${x}-${y}`}
      className="absolute flex items-center justify-center animate-pulse"
      style={{ 
        left: x - cameraX, 
        top: y, 
        width, 
        height,
        background: 'linear-gradient(to bottom, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
        borderRadius: 3,
        boxShadow: 'inset 0 -2px 0 #92400e, inset 0 2px 0 #fcd34d',
      }}
    >
      <span className="text-amber-900 font-bold text-xs">?</span>
    </div>
  );

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-center flex items-center gap-3 flex-wrap justify-center">
        <p className="text-xs text-muted-foreground">{level?.name || "Level"}</p>
        {speedrunMode && (
          <div className="flex items-center gap-1 text-orange-500">
            <Timer className="w-3 h-3" />
            <span className="font-mono text-sm">{formatTime(speedrunTime)}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-yellow-500">
          <span className="text-sm">🪙</span>
          <span className="font-bold text-sm">{score}</span>
        </div>
        {isBig && <span className="text-xs bg-green-500 text-white px-1 rounded">BIG</span>}
      </div>
      <div
        ref={gameContainerRef}
        className="relative border-2 border-border rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ 
          width: GAME_WIDTH, 
          height: GAME_HEIGHT,
          background: 'linear-gradient(to bottom, #7dd3fc 0%, #bae6fd 60%, #38bdf8 100%)',
        }}
        tabIndex={0}
      >
        {/* Clouds */}
        <div className="absolute top-3 left-8 w-12 h-4 bg-white rounded-full opacity-80" style={{ left: 8 - (cameraX * 0.2) % 50 }} />
        <div className="absolute top-2 w-8 h-3 bg-white rounded-full opacity-80" style={{ left: 80 - (cameraX * 0.2) % 100 }} />
        <div className="absolute top-4 w-10 h-3 bg-white rounded-full opacity-70" style={{ left: 180 - (cameraX * 0.2) % 120 }} />
        
        {/* Hills in background */}
        <div className="absolute bottom-6 w-16 h-8 bg-green-400 rounded-t-full opacity-60" style={{ left: 20 - (cameraX * 0.3) % 200 }} />
        <div className="absolute bottom-6 w-20 h-10 bg-green-500 rounded-t-full opacity-50" style={{ left: 150 - (cameraX * 0.3) % 250 }} />

        {!gameStarted && !gameOver && !levelComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-20 gap-2">
            <p className="text-white text-xs">Arrow/WASD + Space</p>
            {speedrunMode && <p className="text-orange-400 text-xs font-bold">🏃 SPEEDRUN MODE</p>}
            <Button onClick={startGame} size="sm" className="bg-green-500 hover:bg-green-600">Start</Button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 gap-2">
            <p className="text-red-400 font-bold">Game Over!</p>
            <Button onClick={resetGame} size="sm" className="bg-green-500 hover:bg-green-600">Try Again</Button>
          </div>
        )}

        {levelComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 gap-2">
            <p className="text-green-400 font-bold">Level Complete!</p>
            {speedrunMode && <p className="text-orange-400 text-sm">Time: {formatTime(speedrunTime)}</p>}
            <p className="text-white text-sm">Score: {score}</p>
            {currentLevel < LEVELS.length - 1 ? (
              <Button onClick={nextLevel} size="sm" className="bg-green-500 hover:bg-green-600">Next Level</Button>
            ) : (
              <Button onClick={() => { setCurrentLevel(0); startGame(); }} size="sm" className="bg-green-500 hover:bg-green-600">Play Again</Button>
            )}
          </div>
        )}

        {/* Ground and platforms */}
        {level?.platforms.filter(p => p.type === 'ground').map((platform, i) => (
          <div
            key={`ground-${i}`}
            className="absolute"
            style={{ left: platform.x - cameraX, top: platform.y, width: platform.width, height: platform.height }}
          >
            <div 
              className="w-full h-full"
              style={{
                background: 'linear-gradient(to bottom, #65a30d 0%, #4d7c0f 30%, #3f6212 100%)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-3" style={{
                background: 'linear-gradient(to bottom, #84cc16, #65a30d)',
              }} />
            </div>
          </div>
        ))}

        {/* Platforms */}
        {level?.platforms.filter(p => p.type !== 'ground').map((platform) => (
          platform.type === 'question' 
            ? renderQuestionBlock(platform.x, platform.y, platform.width, platform.height)
            : renderBrick(platform.x, platform.y, platform.width, platform.height)
        ))}

        {/* Coins */}
        {coins.map((coin, i) => !coin.collected && (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{ left: coin.x - cameraX, top: coin.y }}
          >
            <div 
              className="w-4 h-4 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #fde047 0%, #facc15 50%, #eab308 100%)',
                boxShadow: '0 0 4px #fde047, inset -1px -1px 2px #ca8a04',
              }}
            />
          </div>
        ))}

        {/* Enemies */}
        {enemies.map((enemy, i) => enemy.alive && (
          <Enemy key={i} x={enemy.x - cameraX} y={enemy.y} type={enemy.type} />
        ))}

        {/* Goal flag */}
        <div
          className="absolute"
          style={{ left: level.goal - cameraX - 5, top: 80, width: 10, height: 75 }}
        >
          <div className="w-1 h-full bg-gray-600 mx-auto" />
          <div className="absolute top-0 left-1 w-8 h-6 bg-green-500" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
        </div>

        {/* Mascot Player */}
        <Mascot 
          x={position.x} 
          y={position.y - 8} 
          size={PLAYER_SIZE} 
          isMoving={isMoving}
          isJumping={!isGrounded}
          isBig={isBig}
        />

        {/* Other Players (ghost) */}
        {otherPlayers.map((player, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-40"
            style={{
              left: player.x - cameraX,
              top: player.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
              background: 'linear-gradient(135deg, #c4b5fd, #99f6e4)',
            }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={resetGame} size="sm" variant="outline">Reset</Button>
        <select 
          className="text-xs px-2 py-1 rounded border bg-background"
          value={currentLevel}
          onChange={(e) => { setCurrentLevel(Number(e.target.value)); setGameStarted(false); }}
        >
          {LEVELS.map((l, i) => (
            <option key={i} value={i}>{l.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const VoiceGames = ({ onBroadcast, gameState }: VoiceGamesProps) => {
  return (
    <div className="w-full max-w-sm mx-auto">
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .animate-wiggle {
          animation: wiggle 0.3s ease-in-out infinite;
          transform-origin: 16px 8px;
        }
      `}</style>
      <Tabs defaultValue="tictactoe" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-3">
          <TabsTrigger value="tictactoe" className="text-xs px-2">
            <Grid3x3 className="w-3 h-3 mr-1" />
            TicTacToe
          </TabsTrigger>
          <TabsTrigger value="circle" className="text-xs px-2">
            <Circle className="w-3 h-3 mr-1" />
            Circle
          </TabsTrigger>
          <TabsTrigger value="parkour" className="text-xs px-2">
            <Mountain className="w-3 h-3 mr-1" />
            Parkour
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tictactoe">
          <Card className="p-3">
            <TicTacToe onBroadcast={onBroadcast} gameState={gameState?.tictactoe} />
          </Card>
        </TabsContent>

        <TabsContent value="circle">
          <Card className="p-3">
            <DrawCircle onBroadcast={onBroadcast} gameState={gameState?.circle} />
          </Card>
        </TabsContent>

        <TabsContent value="parkour">
          <Card className="p-3">
            <ParkourGame onBroadcast={onBroadcast} gameState={gameState?.parkour} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VoiceGames;
