import React from 'react';

interface BoundingBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
  trackId?: string;
}

export const BoundingBox = React.memo(function BoundingBox({ x, y, width, height, label, confidence }: BoundingBoxProps) {
  const isThreat = label.toLowerCase() !== 'person' && label.toLowerCase() !== 'vehicle';
  
  // Premium color logic
  const color = isThreat 
    ? '#F43F5E' // rose-500
    : '#3B82F6'; // blue-500
    
  const bgColor = isThreat 
    ? 'rgba(244, 63, 94, 0.1)'
    : 'rgba(59, 130, 246, 0.05)';

  return (
    <g className="transition-all duration-300">
      {/* Box Fill */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={bgColor}
        className="pointer-events-none"
      />
      
      {/* Glow Effect for threats */}
      {isThreat && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={color}
          strokeWidth="3"
          className="opacity-40 blur-[4px]"
        />
      )}

      {/* Main Border */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />

      {/* Detached Premium Label */}
      <g transform={`translate(${x}, ${y - 28})`}>
        {/* Drop shadow for label */}
        <rect
          x="0"
          y="2"
          width={label.length * 8 + 65}
          height="22"
          fill="rgba(0,0,0,0.4)"
          rx="4"
          className="blur-[2px]"
        />
        <rect
          x="0"
          y="0"
          width={label.length * 8 + 65}
          height="22"
          fill={color}
          rx="4"
        />
        <text
          x="6"
          y="15"
          fill="#FFF"
          fontSize="11"
          fontFamily="Inter, monospace"
          fontWeight="600"
          letterSpacing="0.05em"
          style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
        >
          {label.toUpperCase()} {(confidence * 100).toFixed(0)}%
        </text>
      </g>
    </g>
  );
});
