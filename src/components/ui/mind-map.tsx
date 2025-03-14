"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { Button } from "./button";

export interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface MindMapConnection {
  source: string;
  target: string;
  label?: string;
}

interface MindMapProps {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
  className?: string;
}

export function MindMap({ nodes, connections, className }: MindMapProps) {
  const [scale, setScale] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));

  const createPath = (start: MindMapNode, end: MindMapNode) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const midX = start.x + dx / 2;
    const midY = start.y + dy / 2;

    return `M ${start.x} ${start.y} Q ${midX} ${start.y}, ${midX} ${midY} T ${end.x} ${end.y}`;
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button variant="outline" size="icon" onClick={zoomIn}>
          <ZoomInIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={zoomOut}>
          <ZoomOutIcon className="h-4 w-4" />
        </Button>
      </div>

      <motion.div
        ref={containerRef}
        className="relative w-full h-full min-h-[500px]"
        style={{
          scale,
          transformOrigin: "center center",
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: "500px" }}
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity="0.5"
              />
            </linearGradient>
          </defs>

          {connections.map((conn) => {
            const start = nodes.find((n) => n.id === conn.source);
            const end = nodes.find((n) => n.id === conn.target);

            if (!start || !end) return null;

            return (
              <g key={`${conn.source}-${conn.target}`}>
                <path
                  d={createPath(start, end)}
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="2"
                  className={cn(
                    "transition-opacity",
                    hoveredNode &&
                      hoveredNode !== conn.source &&
                      hoveredNode !== conn.target &&
                      "opacity-20"
                  )}
                />
                {conn.label && (
                  <text
                    x={(start.x + end.x) / 2}
                    y={(start.y + end.y) / 2}
                    textAnchor="middle"
                    className="fill-muted-foreground text-xs"
                    dy="-5"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}

          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <circle
                r="30"
                className={cn(
                  "fill-card stroke-border transition-colors",
                  hoveredNode === node.id && "fill-accent"
                )}
              />
              <text
                textAnchor="middle"
                dy="0.3em"
                className="fill-foreground text-sm font-medium pointer-events-none"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </motion.div>
    </div>
  );
} 