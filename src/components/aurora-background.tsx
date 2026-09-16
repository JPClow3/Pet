"use client";

import { useEffect, useRef } from "react";

export function AuroraBackground({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let disposed = false;
    let frame = 0;
    let cleanup = () => {};

    void (async () => {
      try {
        const { Renderer, Program, Mesh, Triangle } = await import("ogl");
        if (disposed) return;

        const renderer = new Renderer({
          alpha: true,
          dpr: Math.min(window.devicePixelRatio, 2),
        });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        container.appendChild(gl.canvas);

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
          vertex: `
            attribute vec2 uv;
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = vec4(position, 0.0, 1.0);
            }
          `,
          fragment: `
            precision highp float;
            uniform float uTime;
            uniform vec3 uInk;
            uniform vec3 uMint;
            uniform vec3 uTeal;
            varying vec2 vUv;

            float blob(vec2 uv, vec2 center, float radius) {
              float d = distance(uv, center);
              return smoothstep(radius, 0.0, d);
            }

            void main() {
              vec2 uv = vUv;
              float time = uTime * 0.12;
              float a = blob(uv, vec2(0.24 + 0.06 * sin(time), 0.72 + 0.05 * cos(time * 1.3)), 0.62);
              float b = blob(uv, vec2(0.82 + 0.05 * cos(time * 0.9), 0.28 + 0.06 * sin(time * 1.1)), 0.58);
              float c = blob(uv, vec2(0.58 + 0.08 * sin(time * 0.7), 0.62 + 0.06 * cos(time * 0.8)), 0.5);
              vec3 color = uMint * 0.85;
              color = mix(color, uTeal, clamp(a * 0.55, 0.0, 0.6));
              color = mix(color, uInk, clamp(b * 0.35, 0.0, 0.45));
              color = mix(color, vec3(1.0), clamp(c * 0.5, 0.0, 0.55));
              gl_FragColor = vec4(color, 1.0);
            }
          `,
          uniforms: {
            uTime: { value: 0 },
            uInk: { value: [0.09, 0.2, 0.3] },
            uMint: { value: [0.91, 0.97, 0.96] },
            uTeal: { value: [0.42, 0.76, 0.72] },
          },
        });

        const mesh = new Mesh(gl, { geometry, program });

        const resize = () => {
          const { clientWidth, clientHeight } = container;
          renderer.setSize(clientWidth, clientHeight);
        };
        resize();

        const observer = new ResizeObserver(resize);
        observer.observe(container);

        const start = performance.now();
        const render = () => {
          program.uniforms.uTime.value = (performance.now() - start) / 1000;
          renderer.render({ scene: mesh });
          if (!reducedMotion) frame = requestAnimationFrame(render);
        };
        render();

        cleanup = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          gl.canvas.remove();
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
      } catch {
        cleanup = () => {};
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      style={{
        background:
          "radial-gradient(120% 120% at 15% 20%, #e8f7f4 0%, #ffffff 45%, #f3f6f8 100%)",
      }}
    />
  );
}
