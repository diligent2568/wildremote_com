import { useEffect, useRef } from "react";

export default function EnergyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;

    // Noise-like function from layered sines
    const noise = (x: number, s: number): number =>
      Math.sin(x * 1.0 + s) * 0.5 +
      Math.sin(x * 2.3 + s * 1.3) * 0.25 +
      Math.sin(x * 4.7 + s * 0.7) * 0.125 +
      Math.sin(x * 9.1 + s * 1.9) * 0.0625;

    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, w, h);

      // --- Sky / deep background ---
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      sky.addColorStop(0, "#0b1a2e");
      sky.addColorStop(0.5, "#12304a");
      sky.addColorStop(1, "#1a4a68");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.45);

      // --- Deep ocean floor ---
      const floor = ctx.createLinearGradient(0, h * 0.7, 0, h);
      floor.addColorStop(0, "#041220");
      floor.addColorStop(1, "#020810");
      ctx.fillStyle = floor;
      ctx.fillRect(0, h * 0.7, w, h * 0.3);

      // === THE MAIN WAVE ===
      // The wave profile: rises from right, curls at center-left
      // Parametric curve for the wave face

      const wavePoints: [number, number][] = [];
      const steps = 200;

      // Wave shape parameters that slowly breathe
      const breathe = Math.sin(t * 0.3) * 0.03;
      const sway = Math.sin(t * 0.2) * 0.02;

      for (let i = 0; i <= steps; i++) {
        const p = i / steps; // 0 → 1 across screen width

        // Base wave profile: a big swell peaking around 30-40% from left
        const peak = 0.33 + sway;
        const spread = 0.28;
        // Gaussian-like hump
        const hump = Math.exp(-((p - peak) ** 2) / (2 * spread * spread));

        // Wave height — taller = higher up the screen (lower y)
        const waveHeight = hump * (0.55 + breathe);

        // Add the curling lip: steeper on the left side of the peak
        let curl = 0;
        if (p < peak) {
          const curlFactor = Math.max(0, (peak - p) / peak);
          curl = curlFactor ** 2.5 * 0.12;
        }

        // Turbulence on the wave face
        const turb = noise(p * 12 + t * 0.5, t * 0.8) * 0.035 * hump;

        const x = p * w;
        const y = h * (0.85 - waveHeight - curl + turb);

        wavePoints.push([x, y]);
      }

      // Draw the wave body
      ctx.beginPath();
      ctx.moveTo(w, h);
      ctx.lineTo(0, h);

      // Left side: water surface at base level
      for (const [px, py] of wavePoints) {
        ctx.lineTo(px, py);
      }

      ctx.lineTo(w, h);
      ctx.closePath();

      // Wave face gradient: deep dark at base → translucent teal-green at crest
      const waveFaceGrad = ctx.createLinearGradient(0, h * 0.15, 0, h);
      waveFaceGrad.addColorStop(0, "#1a8a7a");  // bright teal at the crest
      waveFaceGrad.addColorStop(0.15, "#0f6b6a");
      waveFaceGrad.addColorStop(0.3, "#0a5560");
      waveFaceGrad.addColorStop(0.5, "#073a48");
      waveFaceGrad.addColorStop(0.7, "#042430");
      waveFaceGrad.addColorStop(1, "#021018");
      ctx.fillStyle = waveFaceGrad;
      ctx.fill();

      // Translucent light passing through the wave face (the iconic Mavericks look)
      // A lighter region near the top of the wave where sunlight comes through
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const [px, py] = wavePoints[i];
        const thickness = 30 + noise(i * 0.1, t * 0.6) * 15;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py + thickness);
      }
      for (let i = steps; i >= 0; i--) {
        const [px, py] = wavePoints[i];
        ctx.lineTo(px, py);
      }
      ctx.closePath();

      const transGrad = ctx.createLinearGradient(w * 0.1, 0, w * 0.6, 0);
      transGrad.addColorStop(0, "rgba(20, 180, 160, 0.12)");
      transGrad.addColorStop(0.3, "rgba(30, 200, 180, 0.18)");
      transGrad.addColorStop(0.5, "rgba(40, 210, 190, 0.15)");
      transGrad.addColorStop(0.7, "rgba(20, 170, 155, 0.10)");
      transGrad.addColorStop(1, "rgba(10, 100, 100, 0.05)");
      ctx.fillStyle = transGrad;
      ctx.fill();
      ctx.restore();

      // === FOAM / SPRAY AT THE LIP ===
      // Thick white-ish spray along the wave crest, especially where it curls
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(t * 0.5) * 0.1;
      for (let pass = 0; pass < 3; pass++) {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const p = i / steps;
          const [px, py] = wavePoints[i];
          const peak = 0.33 + sway;
          const hump = Math.exp(-((p - peak) ** 2) / (2 * 0.2 * 0.2));

          if (hump < 0.3) continue;

          const sprayOffset =
            noise(p * 20 + t * 2 + pass * 3, t * 1.5 + pass) * 8 * hump -
            pass * 4;

          if (i === 0 || hump < 0.3) ctx.moveTo(px, py + sprayOffset);
          else ctx.lineTo(px, py + sprayOffset);
        }
        ctx.strokeStyle = `rgba(220, 240, 250, ${0.3 - pass * 0.08})`;
        ctx.lineWidth = 4 - pass * 1;
        ctx.stroke();
      }
      ctx.restore();

      // Spray particles flying off the lip
      ctx.save();
      const sprayCount = 40;
      for (let i = 0; i < sprayCount; i++) {
        const seed = i * 7.31;
        const life = ((t * 0.8 + seed) % 3) / 3; // 0→1 lifecycle
        if (life > 0.8) continue; // fade out

        const startIdx = Math.floor((0.18 + Math.sin(seed) * 0.12) * steps);
        const idx = Math.min(startIdx, steps);
        const [bx, by] = wavePoints[idx];

        const vx = (Math.sin(seed * 1.7) * 0.5 - 0.3) * life * 60;
        const vy = -life * 40 + life * life * 25; // arc up then down

        const px = bx + vx;
        const py = by + vy + Math.sin(seed * 3.1) * 10;
        const size = (1 - life) * 3 * (0.5 + Math.sin(seed * 2.3) * 0.5);

        ctx.globalAlpha = (1 - life) * 0.4;
        ctx.fillStyle = "#d8eef8";
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // === SECONDARY SWELL in foreground (bottom) ===
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 3) {
        const p = x / w;
        const swell = Math.sin(p * 3 + t * 0.4) * 20 +
                       Math.sin(p * 7 + t * 0.7) * 8 +
                       Math.sin(p * 13 + t * 1.1) * 4;
        ctx.lineTo(x, h * 0.82 + swell);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      const fgGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
      fgGrad.addColorStop(0, "#0a3545");
      fgGrad.addColorStop(0.4, "#062230");
      fgGrad.addColorStop(1, "#030d18");
      ctx.fillStyle = fgGrad;
      ctx.fill();

      // Surface texture on foreground water
      ctx.save();
      ctx.globalAlpha = 0.06;
      for (let x = 0; x < w; x += 20) {
        const p = x / w;
        const baseY = h * 0.82 + Math.sin(p * 3 + t * 0.4) * 20;
        const len = 10 + noise(p * 5, t * 0.3) * 15;
        ctx.strokeStyle = "#6ac0d0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, baseY + 5);
        ctx.lineTo(x + len, baseY + 3 + noise(p * 8, t * 0.5) * 4);
        ctx.stroke();
      }
      ctx.restore();

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
