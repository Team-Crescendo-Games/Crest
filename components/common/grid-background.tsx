"use client";

import { useState, useEffect, useCallback } from "react";

export function GridBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((event: MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const maskStyle = {
    maskImage: `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, white, transparent)`,
    WebkitMaskImage: `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, white, transparent)`,
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Base dots — always visible, subtle */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      />
      {/* Highlighted dots — follows mouse cursor */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, var(--grid-dot-highlight) 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
          ...maskStyle,
        }}
      />
    </div>
  );
}
