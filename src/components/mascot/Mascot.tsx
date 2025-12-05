import { cn } from "@/lib/utils";

interface MascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}

export const Mascot = ({ size = "md", animated = true, className }: MascotProps) => {
  const sizeClasses = {
    sm: "w-16 h-20",
    md: "w-24 h-30",
    lg: "w-32 h-40",
    xl: "w-48 h-60",
  };

  const eyeSizes = {
    sm: { width: 8, height: 10 },
    md: { width: 12, height: 16 },
    lg: { width: 16, height: 20 },
    xl: { width: 24, height: 30 },
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Floating animation wrapper */}
      <div className={cn("relative", animated && "animate-bounce-slow")}>
        {/* Glow effect behind mascot */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{
            background: "radial-gradient(circle, hsl(270, 70%, 80%) 0%, hsl(160, 60%, 70%) 50%, transparent 70%)",
            transform: "scale(1.5)",
          }}
        />
        
        {/* Main body - marshmallow shape */}
        <svg 
          viewBox="0 0 100 120" 
          className="w-full h-full relative z-10"
          style={{ filter: "drop-shadow(0 4px 20px hsla(270, 70%, 70%, 0.4))" }}
        >
          {/* Antenna */}
          <g className={cn(animated && "origin-bottom animate-wiggle")}>
            <line 
              x1="50" y1="15" 
              x2="50" y2="5" 
              stroke="hsl(200, 100%, 70%)" 
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle 
              cx="50" cy="3" r="4" 
              fill="hsl(200, 100%, 70%)"
              className="animate-pulse"
            />
            {/* Antenna glow */}
            <circle 
              cx="50" cy="3" r="6" 
              fill="hsl(200, 100%, 70%)"
              opacity="0.3"
              className="animate-ping"
            />
          </g>
          
          {/* Body - soft marshmallow shape */}
          <ellipse 
            cx="50" cy="65" 
            rx="38" ry="45" 
            fill="url(#bodyGradient)"
          />
          
          {/* Body highlight */}
          <ellipse 
            cx="40" cy="50" 
            rx="15" ry="20" 
            fill="hsla(270, 80%, 90%, 0.4)"
          />
          
          {/* Left arm */}
          <ellipse 
            cx="15" cy="65" 
            rx="8" ry="12" 
            fill="url(#armGradient)"
            className={cn(animated && "origin-right animate-wave")}
          />
          
          {/* Right arm */}
          <ellipse 
            cx="85" cy="65" 
            rx="8" ry="12" 
            fill="url(#armGradient)"
          />
          
          {/* Left eye */}
          <ellipse 
            cx="38" cy="55" 
            rx={eyeSizes[size].width / 2} 
            ry={eyeSizes[size].height / 2} 
            fill="hsl(220, 20%, 15%)"
          />
          {/* Left eye glow */}
          <ellipse 
            cx="38" cy="55" 
            rx={eyeSizes[size].width / 2 + 2} 
            ry={eyeSizes[size].height / 2 + 2} 
            fill="hsla(200, 100%, 70%, 0.3)"
            className="animate-pulse"
          />
          {/* Left eye highlight */}
          <ellipse 
            cx="36" cy="52" 
            rx="3" ry="4" 
            fill="white"
            opacity="0.8"
          />
          
          {/* Right eye */}
          <ellipse 
            cx="62" cy="55" 
            rx={eyeSizes[size].width / 2} 
            ry={eyeSizes[size].height / 2} 
            fill="hsl(220, 20%, 15%)"
          />
          {/* Right eye glow */}
          <ellipse 
            cx="62" cy="55" 
            rx={eyeSizes[size].width / 2 + 2} 
            ry={eyeSizes[size].height / 2 + 2} 
            fill="hsla(200, 100%, 70%, 0.3)"
            className="animate-pulse"
          />
          {/* Right eye highlight */}
          <ellipse 
            cx="60" cy="52" 
            rx="3" ry="4" 
            fill="white"
            opacity="0.8"
          />
          
          {/* Curious mouth - small 'o' shape */}
          <ellipse 
            cx="50" cy="78" 
            rx="5" ry="4" 
            fill="hsl(350, 60%, 60%)"
          />
          
          {/* Cheek blush left */}
          <ellipse 
            cx="28" cy="68" 
            rx="6" ry="4" 
            fill="hsla(350, 70%, 75%, 0.5)"
          />
          
          {/* Cheek blush right */}
          <ellipse 
            cx="72" cy="68" 
            rx="6" ry="4" 
            fill="hsla(350, 70%, 75%, 0.5)"
          />
          
          {/* Gradients */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(270, 70%, 85%)" />
              <stop offset="50%" stopColor="hsl(270, 60%, 80%)" />
              <stop offset="100%" stopColor="hsl(160, 50%, 80%)" />
            </linearGradient>
            <linearGradient id="armGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(270, 60%, 82%)" />
              <stop offset="100%" stopColor="hsl(160, 45%, 78%)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes wave {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out infinite;
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
