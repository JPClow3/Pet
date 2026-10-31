"use client";

import { useId, useMemo, useState } from "react";
import { AlertCircle, Scale, Target } from "lucide-react";
import { formatShortDate } from "@/lib/domain/dates";
import { detectSuddenWeightChange, type WeightAlert } from "@/lib/domain/weight";

export type WeightPoint = {
  date: string;
  weightKg: number | null;
  at?: string;
};

export function WeightChart({
  measurements,
  targetWeightKg,
  petName,
}: {
  measurements: WeightPoint[];
  targetWeightKg?: number | null;
  petName?: string;
}) {
  const gradientId = useId();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Deduplicate points on the same date by keeping the latest, then sort chronologically
  const sortedPoints = useMemo(() => {
    // Sort input first by date and by timestamp if available
    const ordered = [...measurements].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.at ? Date.parse(a.at) : 0) - (b.at ? Date.parse(b.at) : 0);
    });
    const map = new Map<string, number>();
    for (const m of ordered) {
      if (m.weightKg != null && m.weightKg > 0) {
        map.set(m.date, m.weightKg);
      }
    }
    return Array.from(map.entries())
      .map(([date, weightKg]) => ({ date, weightKg }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [measurements]);

  const alert = useMemo<WeightAlert | null>(
    () => detectSuddenWeightChange(sortedPoints, 5, 90),
    [sortedPoints],
  );

  if (sortedPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/40 p-6 text-center text-muted">
        <Scale aria-hidden="true" className="size-8 text-muted/60" />
        <p className="mt-2 text-body font-semibold text-ink">
          Sem pesagens registradas
        </p>
        <p className="mt-0.5 max-w-[34ch] text-meta text-muted">
          Registre o peso em consultas, vacinas ou no diário para acompanhar a
          curva de evolução.
        </p>
      </div>
    );
  }

  // Viewport dimensions
  const width = 460;
  const height = 180;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 34;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allWeights = sortedPoints.map((p) => p.weightKg);
  if (targetWeightKg && targetWeightKg > 0) {
    allWeights.push(targetWeightKg);
  }

  const rawMin = Math.min(...allWeights);
  const rawMax = Math.max(...allWeights);
  const diff = rawMax - rawMin;
  const margin = diff === 0 ? Math.max(1, rawMin * 0.1) : Math.max(0.5, diff * 0.15);
  const yMin = Math.max(0, Math.floor((rawMin - margin) * 10) / 10);
  const yMax = Math.ceil((rawMax + margin) * 10) / 10;
  const yRange = yMax - yMin || 1;

  const getY = (val: number) =>
    padTop + chartH - ((val - yMin) / yRange) * chartH;

  const minTime = Date.parse(`${sortedPoints[0].date}T12:00:00Z`);
  const maxTime = Date.parse(
    `${sortedPoints[sortedPoints.length - 1].date}T12:00:00Z`,
  );
  const timeRange = maxTime - minTime;

  const getX = (dateStr: string, idx: number) => {
    if (sortedPoints.length === 1 || timeRange === 0) {
      return padLeft + chartW / 2;
    }
    const t = Date.parse(`${dateStr}T12:00:00Z`);
    return padLeft + ((t - minTime) / timeRange) * chartW;
  };

  const coordinates = sortedPoints.map((p, idx) => ({
    ...p,
    x: getX(p.date, idx),
    y: getY(p.weightKg),
  }));

  const activePoint =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < coordinates.length
      ? coordinates[selectedIdx]
      : coordinates[coordinates.length - 1];

  let pathD = "";
  let areaD = "";
  if (coordinates.length > 1) {
    pathD = coordinates.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
      "",
    );
    const firstX = coordinates[0].x.toFixed(1);
    const lastX = coordinates[coordinates.length - 1].x.toFixed(1);
    const bottomY = (padTop + chartH).toFixed(1);
    areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  const targetY =
    targetWeightKg && targetWeightKg > 0 ? getY(targetWeightKg) : null;

  // Mid y-grid level
  const yMid = Math.round(((yMin + yMax) / 2) * 10) / 10;

  return (
    <div className="flex flex-col gap-3">
      {/* Header Info Banner */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
            {activePoint.weightKg.toFixed(1).replace(".", ",")} kg
          </span>
          <span className="text-meta text-muted">
            em {formatShortDate(activePoint.date)}
          </span>
        </div>
        {targetWeightKg ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-ink/20 bg-mint/50 px-2.5 py-1 text-meta font-semibold text-teal-deep">
            <Target aria-hidden="true" className="size-3.5" />
            <span>Meta: {targetWeightKg.toFixed(1).replace(".", ",")} kg</span>
          </div>
        ) : null}
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-hidden rounded-card border border-line bg-surface/20 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible select-none"
          aria-label={`Gráfico de evolução de peso${petName ? ` de ${petName}` : ""}`}
          role="img"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#176B87" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#176B87" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y labels */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={width - padRight}
            y2={padTop}
            stroke="currentColor"
            className="text-line/60"
            strokeDasharray="2 3"
          />
          <text
            x={padLeft - 6}
            y={padTop + 4}
            textAnchor="end"
            className="fill-muted text-caption tabular-nums"
          >
            {yMax.toFixed(1).replace(".", ",")}
          </text>

          <line
            x1={padLeft}
            y1={getY(yMid)}
            x2={width - padRight}
            y2={getY(yMid)}
            stroke="currentColor"
            className="text-line/40"
            strokeDasharray="2 3"
          />
          <text
            x={padLeft - 6}
            y={getY(yMid) + 4}
            textAnchor="end"
            className="fill-muted text-caption tabular-nums"
          >
            {yMid.toFixed(1).replace(".", ",")}
          </text>

          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={width - padRight}
            y2={padTop + chartH}
            stroke="currentColor"
            className="text-line/70"
          />
          <text
            x={padLeft - 6}
            y={padTop + chartH + 3}
            textAnchor="end"
            className="fill-muted text-caption tabular-nums"
          >
            {yMin.toFixed(1).replace(".", ",")}
          </text>

          {/* Target Weight Reference Line */}
          {targetY !== null ? (
            <g className="transition-all duration-300">
              <line
                x1={padLeft}
                y1={targetY}
                x2={width - padRight}
                y2={targetY}
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={width - padRight - 2}
                y={targetY - 5}
                textAnchor="end"
                className="fill-sky-700 text-caption font-semibold"
              >
                Meta {targetWeightKg?.toFixed(1).replace(".", ",")} kg
              </text>
            </g>
          ) : null}

          {/* Area fill */}
          {areaD ? <path d={areaD} fill={`url(#${gradientId})`} /> : null}

          {/* Trend line */}
          {pathD ? (
            <path
              d={pathD}
              fill="none"
              stroke="#176B87"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Single point horizontal dashed guide */}
          {coordinates.length === 1 ? (
            <line
              x1={padLeft}
              y1={coordinates[0].y}
              x2={width - padRight}
              y2={coordinates[0].y}
              stroke="#176B87"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              opacity="0.5"
            />
          ) : null}

          {/* Interactive Data points */}
          {coordinates.map((pt, idx) => {
            const isSelected = activePoint === pt;
            return (
              <g
                key={`${pt.date}-${idx}`}
                className="cursor-pointer focus:outline-none"
                onClick={() => setSelectedIdx(idx)}
                onMouseEnter={() => setSelectedIdx(idx)}
              >
                {/* Hit target */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Point ring */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "6.5" : "4.5"}
                  fill="#ffffff"
                  stroke="#176B87"
                  strokeWidth={isSelected ? "3" : "2"}
                  className="transition-all duration-150"
                />

                {isSelected ? (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="9.5"
                    fill="none"
                    stroke="#176B87"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                ) : null}
              </g>
            );
          })}

          {/* X Axis Date Labels (first, middle, last) */}
          {coordinates.length > 1 ? (
            <>
              <text
                x={coordinates[0].x}
                y={padTop + chartH + 18}
                textAnchor="start"
                className="fill-muted text-caption"
              >
                {formatShortDate(coordinates[0].date)}
              </text>
              {(() => {
                if (coordinates.length < 3) return null;
                const midIdx = Math.floor(coordinates.length / 2);
                const midX = coordinates[midIdx].x;
                const firstX = coordinates[0].x;
                const lastX = coordinates[coordinates.length - 1].x;
                if (midX - firstX < 60 || lastX - midX < 60) return null;
                return (
                  <text
                    x={midX}
                    y={padTop + chartH + 18}
                    textAnchor="middle"
                    className="fill-muted text-caption"
                  >
                    {formatShortDate(coordinates[midIdx].date)}
                  </text>
                );
              })()}
              <text
                x={coordinates[coordinates.length - 1].x}
                y={padTop + chartH + 18}
                textAnchor="end"
                className="fill-muted text-caption"
              >
                {formatShortDate(coordinates[coordinates.length - 1].date)}
              </text>
            </>
          ) : (
            <text
              x={coordinates[0].x}
              y={padTop + chartH + 18}
              textAnchor="middle"
              className="fill-muted text-caption"
            >
              {formatShortDate(coordinates[0].date)}
            </text>
          )}
        </svg>
      </div>

      {/* Clinical Warning Alert for Sudden Weight Changes */}
      {alert ? (
        <aside
          role="note"
          aria-label="Aviso de variação de peso"
          className="flex items-start gap-2.5 rounded-control border border-amber-500/25 bg-amber-500/10 p-3 text-ink"
        >
          <AlertCircle
            aria-hidden="true"
            className="size-5 shrink-0 text-amber-600"
          />
          <div className="flex-1 text-label leading-relaxed">
            <p className="font-semibold text-amber-950 dark:text-amber-200">
              Variação de {alert.percentage.toFixed(1).replace(".", ",")}% detectada (
              {alert.deltaKg > 0
                ? `+${alert.deltaKg.toFixed(1).replace(".", ",")}`
                : alert.deltaKg.toFixed(1).replace(".", ",")}{" "}
              kg em {alert.days === 1 ? "1 dia" : `${alert.days} dias`})
            </p>
            <p className="mt-0.5 text-amber-900/80 dark:text-amber-300/80">
              Variações bruscas de peso são o primeiro sinal clínico de diversas
              condições em cães e gatos. Se não foi intencional, consulte o
              veterinário.
            </p>
          </div>
        </aside>
      ) : null}

      {coordinates.length === 1 ? (
        <p className="text-center text-meta text-muted">
          Registre mais pesagens nos próximos meses para ver a curva completa de
          evolução.
        </p>
      ) : null}
    </div>
  );
}
