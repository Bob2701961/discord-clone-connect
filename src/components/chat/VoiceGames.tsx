import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Circle, Grid3x3, Mountain } from "lucide-react";

interface VoiceGamesProps {
  onBroadcast?: (data: any) => void;
  gameState?: any;
}

// Tic Tac Toe Game
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
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    const newState = {
      board: newBoard,
      isXTurn: !isXTurn,
      winner: gameWinner
    };

    if (gameWinner) {
      setWinner(gameWinner);
    } else {
      setIsXTurn(!isXTurn);
    }

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
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        {winner ? (
          <p className="text-xl font-bold">Winner: {winner}!</p>
        ) : (
          <p className="text-lg">Current Player: {isXTurn ? "X" : "O"}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, index) => (
          <Button
            key={index}
            onClick={() => handleClick(index)}
            className="w-16 h-16 text-xl font-bold"
            variant={cell ? "default" : "outline"}
          >
            {cell}
          </Button>
        ))}
      </div>
      <Button onClick={resetGame} size="sm">Reset Game</Button>
    </div>
  );
};

// Draw a Circle Game
const DrawCircle = () => {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      ctx.lineWidth = 3;
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
    <div className="flex flex-col items-center gap-3">
      <div className="text-center space-y-1">
        <p className="text-sm">Draw a perfect circle!</p>
        <div className="flex gap-4 justify-center text-sm">
          <p>Score: <span className="font-bold">{score}</span></p>
          <p>Best: <span className="font-bold text-primary">{bestScore}</span></p>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={250}
        height={250}
        className="border-2 border-border rounded-lg cursor-crosshair bg-background"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <Button onClick={resetCanvas} size="sm">Clear</Button>
    </div>
  );
};

// Parkour Game with working physics
const ParkourGame = () => {
  const [position, setPosition] = useState({ x: 50, y: 300 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isGrounded, setIsGrounded] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const keysRef = useRef<Set<string>>(new Set());
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const platforms = [
    { x: 0, y: 350, width: 600, height: 50 },
    { x: 150, y: 280, width: 100, height: 20 },
    { x: 300, y: 210, width: 100, height: 20 },
    { x: 450, y: 140, width: 100, height: 20 },
  ];

  const GRAVITY = 0.8;
  const JUMP_FORCE = -14;
  const MOVE_SPEED = 5;
  const PLAYER_SIZE = 24;

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

        // Horizontal movement
        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) {
          newX -= MOVE_SPEED;
        }
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) {
          newX += MOVE_SPEED;
        }

        // Apply gravity
        newY += newVelY;

        // Check platform collisions
        const collision = checkCollision(newX, newY);
        if (collision && newVelY > 0) {
          newY = collision.y - PLAYER_SIZE;
          newVelY = 0;
          grounded = true;
        }

        // Boundary checks
        newX = Math.max(0, Math.min(600 - PLAYER_SIZE, newX));
        if (newY > 400) {
          newY = 300;
          newX = 50;
          newVelY = 0;
        }

        setVelocity(v => ({ ...v, y: newVelY }));
        setIsGrounded(grounded);

        // Score based on height reached
        const heightScore = Math.max(0, Math.floor((350 - newY) / 10));
        setScore(s => Math.max(s, heightScore));

        return { x: newX, y: newY };
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, velocity.y, checkCollision]);

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
    setPosition({ x: 50, y: 300 });
    setVelocity({ x: 0, y: 0 });
    setScore(0);
    gameContainerRef.current?.focus();
  };

  const resetGame = () => {
    setPosition({ x: 50, y: 300 });
    setVelocity({ x: 0, y: 0 });
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center space-y-1">
        <p className="text-sm">Arrow Keys / WASD to move, Space to jump</p>
        <p className="text-sm">Score: <span className="font-bold">{score}</span></p>
      </div>
      <div
        ref={gameContainerRef}
        className="relative w-[400px] h-[300px] border-2 border-border rounded-lg bg-background overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
        tabIndex={0}
      >
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Button onClick={startGame}>Start Game</Button>
          </div>
        )}
        {/* Player */}
        <div
          className="absolute bg-primary rounded transition-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${PLAYER_SIZE}px`,
            height: `${PLAYER_SIZE}px`,
          }}
        />
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
      <Button onClick={resetGame} size="sm">Reset</Button>
    </div>
  );
};

const VoiceGames = ({ onBroadcast, gameState }: VoiceGamesProps) => {
  return (
    <div className="w-full">
      <Tabs defaultValue="tictactoe" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="tictactoe" className="text-xs">
            <Grid3x3 className="w-3 h-3 mr-1" />
            Tic Tac Toe
          </TabsTrigger>
          <TabsTrigger value="circle" className="text-xs">
            <Circle className="w-3 h-3 mr-1" />
            Circle
          </TabsTrigger>
          <TabsTrigger value="parkour" className="text-xs">
            <Mountain className="w-3 h-3 mr-1" />
            Parkour
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tictactoe">
          <Card className="p-4">
            <TicTacToe onBroadcast={onBroadcast} gameState={gameState?.tictactoe} />
          </Card>
        </TabsContent>

        <TabsContent value="circle">
          <Card className="p-4">
            <DrawCircle />
          </Card>
        </TabsContent>

        <TabsContent value="parkour">
          <Card className="p-4">
            <ParkourGame />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VoiceGames;
