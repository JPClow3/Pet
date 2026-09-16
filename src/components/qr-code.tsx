"use client";

import { useMemo } from "react";
import { encode } from "uqr";

export function QrCode({
  value,
  className,
  dark = "#17324d",
  light = "#ffffff",
}: {
  value: string;
  className?: string;
  dark?: string;
  light?: string;
}) {
  const qr = useMemo(() => encode(value, { ecc: "M", border: 4 }), [value]);
  const cells = useMemo(() => {
    const output: { x: number; y: number }[] = [];
    qr.data.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) output.push({ x, y });
      });
    });
    return output;
  }, [qr]);

  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      className={className}
      role="img"
      aria-label="QR Code da carteirinha"
      shapeRendering="crispEdges"
    >
      <rect width={qr.size} height={qr.size} fill={light} />
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x}
          y={cell.y}
          width={1}
          height={1}
          fill={dark}
        />
      ))}
    </svg>
  );
}
