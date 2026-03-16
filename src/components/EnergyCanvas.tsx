import { useEffect, useRef } from "react";

interface WaveLayer {
  baseY: number;      // vertical position ratio (0-1)
  amplitude: number;  // wave height
  frequency: number;  // how tight the wave curves are
  speed: number;      // horizontal scroll speed
  phase: number;      // offset
  color: string;      // fill color (deep → light as layers go up)
  foamColor: string;
  foamThreshold: number; // slope threshold to show foam
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

    // Layered wave definitions — back to front (deep ocean → towering crest)
    const layers: WaveLayer[] = [
      {
        baseY: 0.82, amplitude: 30, frequency: 0.0008,
        speed: 0.15, phase: 0,
        color: "rgba(4, 18, 38, 0.95)", foamColor: "rgba(80,130,160,0.08)", foamThreshold: 0.6,
      },
      {
        baseY: 0.68, amplitude: 55, frequency: 0.0012,
        speed: 0.25, phase: 1.2,
        color: "rgba(6, 30, 55, 0.9)", foamColor: "rgba(100,160,190,0.1)", foamThreshold: 0.5,
      },
      {
        baseY: 0.52, amplitude: 80, frequency: 0.0015,
        speed: 0.4, phase: 2.8,
        color: "rgba(8, 45, 72, 0.85)", foamColor: "rgba(140,190,210,0.12)", foamThreshold: 0.45,
      },
      {
        baseY: 0.38, amplitude: 110, frequency: 0.002,
        speed: 0.6, phase: 4.1,
        color: "rgba(12, 60, 90, 0.8)", foamColor: "rgba(170,210,225,0.15)", foamThreshold: 0.4,
      },
      {
        baseY: 0.25, amplitude: 140, frequency: 0.0025,
        speed: 0.85, phase: 5.5,
        color: "rgba(18, 80, 110, 0.75)", foamColor: "rgba(200,230,240,0.2)", foamThreshold: 0.35,
      },
      {
        baseY: 0.15, amplitude: 100, frequency: 0.003,
        speed: 1.1, phase: 0.7,
        color: "rgba(25, 100, 130, 0.65)", foamColor: "rgba(220,240,248,0.25)", foamThreshold: 0.3,
      },
    ];

    let time = 0;

    // Multi-octave wave function for organic turbulence
    const waveY = (x: number, t: number, layer: WaveLayer): number => {
      const f = layer.frequency;
      const s = layer.speed;
      const p = layer.phase;
      const a = layer.amplitude;

      // Primary swell
      let y = Math.sin(x * f + t * s * 0.01 + p) * a;
      // Secondary chop
      y += Math.sin(x * f * 2.3 + t * s * 0.017 + p * 1.7) * a * 0.4;
      // Tertiary turbulence
      y += Math.sin(x * f * 5.1 + t * s * 0.023 + p * 3.2) * a * 0.15;
      // Slow massive swell
      y += Math.sin(x * f * 0.3 + t * s * 0.005 + p * 0.5) * a * 0.7;

      return layer.baseY * height + y;
    };

    const draw = () => {
      time += 1;

      // Deep ocean gradient background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "#020a14");
      skyGrad.addColorStop(0.3, "#041828");
      skyGrad.addColorStop(0.6, "#062640");
      skyGrad.addColorStop(1, "#0a3a58");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw each wave layer back to front
      const step = 3;
      for (const layer of layers) {
        // Wave body
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += step) {
          const y = waveY(x, time, layer);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Vertical gradient on the wave face
        const topY = layer.baseY * height - layer.amplitude * 1.5;
        const botY = height;
        const waveGrad = ctx.createLinearGradient(0, topY, 0, botY);
        waveGrad.addColorStop(0, layer.color);
        waveGrad.addColorStop(0.3, layer.color.replace(/[\d.]+\)$/, "0.6)"));
        waveGrad.addColorStop(1, layer.color.replace(/[\d.]+\)$/, "0.95)"));
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Foam / spray on steep parts of the wave
        ctx.beginPath();
        let inFoam = false;
        for (let x = 0; x <= width; x += step) {
          const y = waveY(x, time, layer);
          const yNext = waveY(x + step, time, layer);
          const slope = Math.abs(yNext - y) / step;

          if (slope > layer.foamThreshold) {
            if (!inFoam) {
              ctx.moveTo(x, y);
              inFoam = true;
            }
            ctx.lineTo(x, y - 2 + Math.sin(x * 0.05 + time * 0.03) * 3);
          } else {
            if (inFoam) {
              ctx.lineTo(x, waveY(x, time, layer));
              inFoam = false;
            }
          }
        }
        ctx.strokeStyle = layer.foamColor;
        ctx.lineWidth = 3 + Math.sin(time * 0.02 + layer.phase) * 1.5;
        ctx.stroke();

        // Thin highlight line along wave crest
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
          const y = waveY(x, time, layer);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(180, 220, 240, ${0.04 + Math.sin(time * 0.01 + layer.phase) * 0.02})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

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
