import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Circle, Grid3x3, Mountain } from "lucide-react";

interface VoiceGamesProps {
  onBroadcast?: (data: any) => void;
  gameState?: any;
}

// Cute Mascot Component
const Mascot = ({ x, y, size, isMoving, isJumping }: { x: number; y: number; size: number; isMoving: boolean; isJumping: boolean }) => {
  return (
    <svg
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size + 8,
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

// Mario-style Parkour Game
const ParkourGame = ({ onBroadcast, gameState }: { onBroadcast?: (data: any) => void; gameState?: any }) => {
  const [position, setPosition] = useState({ x: 20, y: 130 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isGrounded, setIsGrounded] = useState(false);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState([
    { x: 80, y: 100, collected: false },
    { x: 160, y: 70, collected: false },
    { x: 230, y: 35, collected: false },
  ]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [otherPlayers, setOtherPlayers] = useState<{x: number; y: number}[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const GAME_WIDTH = 300;
  const GAME_HEIGHT = 180;
  const PLAYER_SIZE = 24;

  // Mario-style platforms
  const platforms = [
    { x: 0, y: 155, width: GAME_WIDTH, height: 25, type: 'ground' },
    { x: 50, y: 120, width: 60, height: 12, type: 'brick' },
    { x: 130, y: 85, width: 60, height: 12, type: 'brick' },
    { x: 210, y: 50, width: 70, height: 12, type: 'brick' },
    { x: 110, y: 120, width: 20, height: 12, type: 'question' },
  ];

  const GRAVITY = 0.5;
  const JUMP_FORCE = -9;
  const MOVE_SPEED = 3;

  useEffect(() => {
    if (gameState?.players) setOtherPlayers(gameState.players);
  }, [gameState]);

  const checkCollision = useCallback((x: number, y: number) => {
    for (const platform of platforms) {
      if (
        x + PLAYER_SIZE > platform.x &&
        x < platform.x + platform.width &&
        y + PLAYER_SIZE > platform.y &&
        y < platform.y + platform.height
      ) {
        return platform;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!gameStarted) return;

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

        const collision = checkCollision(newX, newY);
        if (collision && newVelY > 0) {
          newY = collision.y - PLAYER_SIZE;
          newVelY = 0;
          grounded = true;
        }

        newX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, newX));
        if (newY > GAME_HEIGHT) {
          newY = 130;
          newX = 20;
          newVelY = 0;
          setCoins(c => c.map(coin => ({ ...coin, collected: false })));
        }

        setVelocity(v => ({ ...v, y: newVelY }));
        setIsGrounded(grounded);

        // Coin collection
        setCoins(prevCoins => {
          let newScore = score;
          const updated = prevCoins.map(coin => {
            if (!coin.collected && 
                Math.abs(newX + PLAYER_SIZE/2 - coin.x - 8) < 16 && 
                Math.abs(newY + PLAYER_SIZE/2 - coin.y - 8) < 16) {
              newScore += 100;
              return { ...coin, collected: true };
            }
            return coin;
          });
          if (newScore !== score) setScore(newScore);
          return updated;
        });

        onBroadcast?.({ type: 'parkour', state: { players: [{ x: newX, y: newY }] } });
        return { x: newX, y: newY };
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, velocity.y, checkCollision, onBroadcast, score]);

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
    setPosition({ x: 20, y: 130 });
    setVelocity({ x: 0, y: 0 });
    setScore(0);
    setCoins(c => c.map(coin => ({ ...coin, collected: false })));
    gameContainerRef.current?.focus();
  };

  const resetGame = () => {
    setPosition({ x: 20, y: 130 });
    setVelocity({ x: 0, y: 0 });
    setScore(0);
    setCoins(c => c.map(coin => ({ ...coin, collected: false })));
  };

  // Brick pattern renderer
  const renderBrick = (x: number, y: number, width: number, height: number) => (
    <div
      className="absolute"
      style={{ left: x, top: y, width, height }}
    >
      <div 
        className="w-full h-full"
        style={{
          background: 'linear-gradient(to bottom, #c2410c 0%, #ea580c 20%, #c2410c 100%)',
          borderRadius: 2,
          boxShadow: 'inset 0 -2px 0 #7c2d12, inset 0 2px 0 #fb923c',
        }}
      >
        {/* Brick lines */}
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
      className="absolute flex items-center justify-center"
      style={{ 
        left: x, 
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

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-center flex items-center gap-3">
        <p className="text-xs text-muted-foreground">Arrow/WASD + Space</p>
        <div className="flex items-center gap-1 text-yellow-500">
          <span className="text-sm">🪙</span>
          <span className="font-bold text-sm">{score}</span>
        </div>
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
        <div className="absolute top-3 left-8 w-12 h-4 bg-white rounded-full opacity-80" />
        <div className="absolute top-2 left-12 w-8 h-3 bg-white rounded-full opacity-80" />
        <div className="absolute top-4 right-16 w-10 h-3 bg-white rounded-full opacity-70" />
        
        {/* Hills in background */}
        <div className="absolute bottom-6 left-4 w-16 h-8 bg-green-400 rounded-t-full opacity-60" />
        <div className="absolute bottom-6 right-8 w-20 h-10 bg-green-500 rounded-t-full opacity-50" />

        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <Button onClick={startGame} size="sm" className="bg-green-500 hover:bg-green-600">Start</Button>
          </div>
        )}

        {/* Ground */}
        <div
          className="absolute"
          style={{ left: 0, top: 155, width: GAME_WIDTH, height: 25 }}
        >
          <div 
            className="w-full h-full"
            style={{
              background: 'linear-gradient(to bottom, #65a30d 0%, #4d7c0f 30%, #3f6212 100%)',
            }}
          >
            {/* Grass blades */}
            <div className="absolute top-0 left-0 right-0 h-3" style={{
              background: 'linear-gradient(to bottom, #84cc16, #65a30d)',
            }} />
          </div>
        </div>

        {/* Platforms */}
        {platforms.filter(p => p.type !== 'ground').map((platform, i) => (
          platform.type === 'question' 
            ? renderQuestionBlock(platform.x, platform.y, platform.width, platform.height)
            : renderBrick(platform.x, platform.y, platform.width, platform.height)
        ))}

        {/* Coins */}
        {coins.map((coin, i) => !coin.collected && (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{ left: coin.x, top: coin.y }}
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

        {/* Mascot Player */}
        <Mascot 
          x={position.x} 
          y={position.y - 8} 
          size={PLAYER_SIZE} 
          isMoving={isMoving}
          isJumping={!isGrounded}
        />

        {/* Other Players (ghost) */}
        {otherPlayers.map((player, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-40"
            style={{
              left: player.x,
              top: player.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
              background: 'linear-gradient(135deg, #c4b5fd, #99f6e4)',
            }}
          />
        ))}
      </div>
      <Button onClick={resetGame} size="sm" variant="outline">Reset</Button>
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
