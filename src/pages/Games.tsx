import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Circle, Grid3x3, Mountain } from "lucide-react";

// Tic Tac Toe Game
const TicTacToe = () => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
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
    if (gameWinner) {
      setWinner(gameWinner);
    } else {
      setIsXTurn(!isXTurn);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXTurn(true);
    setWinner(null);
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
            className="w-20 h-20 text-2xl font-bold"
            variant={cell ? "default" : "outline"}
          >
            {cell}
          </Button>
        ))}
      </div>
      <Button onClick={resetGame}>Reset Game</Button>
    </div>
  );
};

// Draw a Circle Game
const DrawCircle = () => {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(100);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  const calculateCircleScore = (pts: { x: number; y: number }[]) => {
    if (pts.length < 10) return 0;

    // Calculate center
    const centerX = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    const centerY = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;

    // Calculate average radius
    const avgRadius = pts.reduce((sum, p) => {
      const dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
      return sum + dist;
    }, 0) / pts.length;

    // Calculate variance from average radius
    const variance = pts.reduce((sum, p) => {
      const dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
      return sum + Math.abs(dist - avgRadius);
    }, 0) / pts.length;

    // Score is inverse of variance (lower variance = better circle)
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

    // Draw on canvas
    const ctx = canvas.getContext("2d");
    if (ctx && points.length > 0) {
      ctx.strokeStyle = "#6d28d9";
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
      if (finalScore < bestScore) {
        setBestScore(finalScore);
      }
      setIsDrawing(false);
    }
  };

  const resetCanvas = () => {
    const canvas = document.getElementById("draw-canvas") as HTMLCanvasElement;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setPoints([]);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center space-y-2">
        <p className="text-lg">Draw a perfect circle!</p>
        <div className="flex gap-4 justify-center">
          <p>Last Score: <span className="font-bold">{score}</span></p>
          <p>Best: <span className="font-bold text-primary">{bestScore}</span></p>
        </div>
      </div>
      <canvas
        id="draw-canvas"
        width={400}
        height={400}
        className="border-2 border-border rounded-lg cursor-crosshair bg-background"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <Button onClick={resetCanvas}>Clear Canvas</Button>
    </div>
  );
};

// Parkour Game (Simple platformer)
const ParkourGame = () => {
  const [position, setPosition] = useState({ x: 50, y: 300 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isJumping, setIsJumping] = useState(false);
  const [score, setScore] = useState(0);

  const platforms = [
    { x: 0, y: 350, width: 600, height: 50 },
    { x: 150, y: 250, width: 100, height: 20 },
    { x: 300, y: 180, width: 100, height: 20 },
    { x: 450, y: 120, width: 100, height: 20 },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " && !isJumping) {
      setVelocity(prev => ({ ...prev, y: -15 }));
      setIsJumping(true);
    }
    if (e.key === "ArrowLeft") {
      setVelocity(prev => ({ ...prev, x: -5 }));
    }
    if (e.key === "ArrowRight") {
      setVelocity(prev => ({ ...prev, x: 5 }));
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      setVelocity(prev => ({ ...prev, x: 0 }));
    }
  };

  const resetGame = () => {
    setPosition({ x: 50, y: 300 });
    setVelocity({ x: 0, y: 0 });
    setIsJumping(false);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center space-y-2">
        <p className="text-lg">Parkour Game - Use Arrow Keys & Space to Jump</p>
        <p>Score: <span className="font-bold">{score}</span></p>
      </div>
      <div
        className="relative w-[600px] h-[400px] border-2 border-border rounded-lg bg-background overflow-hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      >
        {/* Player */}
        <div
          className="absolute w-8 h-8 bg-primary rounded"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
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
      <div className="flex gap-2">
        <Button onClick={resetGame}>Reset</Button>
        <p className="text-sm text-muted-foreground">Click inside the game area to enable controls</p>
      </div>
    </div>
  );
};

const Games = () => {
  return (
    <div className="flex-1 bg-discord-chat p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Mini Games</h1>
        <Tabs defaultValue="tictactoe" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tictactoe">
              <Grid3x3 className="w-4 h-4 mr-2" />
              Tic Tac Toe
            </TabsTrigger>
            <TabsTrigger value="circle">
              <Circle className="w-4 h-4 mr-2" />
              Draw Circle
            </TabsTrigger>
            <TabsTrigger value="parkour">
              <Mountain className="w-4 h-4 mr-2" />
              Parkour
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tictactoe">
            <Card className="p-8">
              <TicTacToe />
            </Card>
          </TabsContent>

          <TabsContent value="circle">
            <Card className="p-8">
              <DrawCircle />
            </Card>
          </TabsContent>

          <TabsContent value="parkour">
            <Card className="p-8">
              <ParkourGame />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Games;