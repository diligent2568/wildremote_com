import { useEffect, useRef } from "react";

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  speed: number;
  hue: number;
}

export default function EnergyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Create energy blobs
    const blobs: Blob[] = Array.from({ length: 6 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: 150 + Math.random() * 200,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.006,
      hue: 200 + Math.random() * 60, // blue-cyan-violet range
    }));

    let time = 0;

    const draw = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Dark background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      // Draw each blob as a radial gradient
      for (const blob of blobs) {
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Bounce off edges softly
        if (blob.x < -blob.radius) blob.vx = Math.abs(blob.vx);
        if (blob.x > width + blob.radius) blob.vx = -Math.abs(blob.vx);
        if (blob.y < -blob.radius) blob.vy = Math.abs(blob.vy);
        if (blob.y > height + blob.radius) blob.vy = -Math.abs(blob.vy);

        // Pulsing radius
        const pulse = Math.sin(time * blob.speed + blob.phase);
        const r = blob.radius + pulse * 40;

        const grad = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          r
        );
        const alpha = 0.15 + pulse * 0.05;
        const hueShift = Math.sin(time * 0.002 + blob.phase) * 20;
        const h = blob.hue + hueShift;

        grad.addColorStop(0, `hsla(${h}, 80%, 60%, ${alpha + 0.1})`);
        grad.addColorStop(0.4, `hsla(${h}, 70%, 45%, ${alpha})`);
        grad.addColorStop(1, `hsla(${h}, 60%, 30%, 0)`);

        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}
