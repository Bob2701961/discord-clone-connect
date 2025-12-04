import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Circle, Grid3x3, Mountain } from "lucide-react";

interface VoiceGamesProps {
  onBroadcast?: (data: any) => void;
  gameState?: any;
}

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

// Draw a Circle Game - Multiplayer with score competition
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

    const perfectnessScore = Math.max(0, 100 - variance);
    return Math.round(perfectnessScore);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
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
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setPoints([]);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Draw a perfect circle!</p>
        <div className="flex gap-3 justify-center text-xs">
          <p>Your: <span className="font-bold">{score}</span></p>
          <p>Best: <span className="font-bold text-primary">{bestScore}</span> {bestPlayer && `(${bestPlayer})`}</p>
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

// Parkour Game - Scaled down & Multiplayer
const ParkourGame = ({ onBroadcast, gameState }: { onBroadcast?: (data: any) => void; gameState?: any }) => {
  const [position, setPosition] = useState({ x: 20, y: 140 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isGrounded, setIsGrounded] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [otherPlayers, setOtherPlayers] = useState<{x: number; y: number}[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const GAME_WIDTH = 280;
  const GAME_HEIGHT = 180;

  const platforms = [
    { x: 0, y: 160, width: GAME_WIDTH, height: 20 },
    { x: 60, y: 125, width: 50, height: 10 },
    { x: 140, y: 95, width: 50, height: 10 },
    { x: 210, y: 60, width: 50, height: 10 },
  ];

  const GRAVITY = 0.6;
  const JUMP_FORCE = -10;
  const MOVE_SPEED = 4;
  const PLAYER_SIZE = 16;

  useEffect(() => {
    if (gameState?.players) {
      setOtherPlayers(gameState.players);
    }
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
      setPosition(prev => {
        let newX = prev.x;
        let newY = prev.y;
        let newVelY = velocity.y + GRAVITY;
        let grounded = false;

        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) {
          newX -= MOVE_SPEED;
        }
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) {
          newX += MOVE_SPEED;
        }

        newY += newVelY;

        const collision = checkCollision(newX, newY);
        if (collision && newVelY > 0) {
          newY = collision.y - PLAYER_SIZE;
          newVelY = 0;
          grounded = true;
        }

        newX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, newX));
        if (newY > GAME_HEIGHT) {
          newY = 140;
          newX = 20;
          newVelY = 0;
        }

        setVelocity(v => ({ ...v, y: newVelY }));
        setIsGrounded(grounded);

        const heightScore = Math.max(0, Math.floor((160 - newY) / 5));
        setScore(s => Math.max(s, heightScore));

        // Broadcast position to other players
        onBroadcast?.({ type: 'parkour', state: { players: [{ x: newX, y: newY }] } });

        return { x: newX, y: newY };
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, velocity.y, checkCollision, onBroadcast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      
      if ((e.key === " " || e.key === "ArrowUp" || e.key === "w") && isGrounded) {
        setVelocity(v => ({ ...v, y: JUMP_FORCE }));
        setIsGrounded(false);
      }
      
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
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
    setPosition({ x: 20, y: 140 });
    setVelocity({ x: 0, y: 0 });
    setScore(0);
    gameContainerRef.current?.focus();
  };

  const resetGame = () => {
    setPosition({ x: 20, y: 140 });
    setVelocity({ x: 0, y: 0 });
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Arrow/WASD + Space</p>
        <p className="text-sm">Score: <span className="font-bold">{score}</span></p>
      </div>
      <div
        ref={gameContainerRef}
        className="relative border-2 border-border rounded-lg bg-background overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        tabIndex={0}
      >
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Button onClick={startGame} size="sm">Start</Button>
          </div>
        )}
        {/* Your Player */}
        <div
          className="absolute bg-primary rounded-sm transition-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${PLAYER_SIZE}px`,
            height: `${PLAYER_SIZE}px`,
          }}
        />
        {/* Other Players */}
        {otherPlayers.map((player, i) => (
          <div
            key={i}
            className="absolute bg-secondary rounded-sm opacity-60 transition-none"
            style={{
              left: `${player.x}px`,
              top: `${player.y}px`,
              width: `${PLAYER_SIZE}px`,
              height: `${PLAYER_SIZE}px`,
            }}
          />
        ))}
        {/* Platforms */}
        {platforms.map((platform, i) => (
          <div
            key={i}
            className="absolute bg-muted"
            style={{
              left: `${platform.x}px`,
              top: `${platform.y}px`,
              width: `${platform.width}px`,
              height: `${platform.height}px`,
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
