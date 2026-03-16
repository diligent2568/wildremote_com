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

    const noise = (x: number, y: number): number =>
      Math.sin(x * 1.2 + y * 0.9) * 0.5 +
      Math.sin(x * 2.5 - y * 1.3) * 0.25 +
      Math.sin(x * 5.3 + y * 2.1) * 0.125;

    // City lights — positions in a 2D grid that will be projected with perspective
    interface City {
      gx: number; // ground x: -1 to 1 (left-right)
      gy: number; // ground y: 0+ (distance ahead, 0 = near camera)
      size: number;
      brightness: number;
      cluster: { dx: number; dy: number; b: number }[];
    }

    const cities: City[] = [];
    const cityCount = 120;
    for (let i = 0; i < cityCount; i++) {
      const seed = i * 7.31;
      const gx = (Math.sin(seed * 1.7) * 2.2);
      const gy = (Math.sin(seed * 2.3) * 0.5 + 0.5) * 5 + Math.random() * 2;
      const size = 2 + Math.pow(Math.random(), 2) * 8;
      const brightness = 0.3 + Math.random() * 0.7;

      const cluster: { dx: number; dy: number; b: number }[] = [];
      const subCount = Math.floor(2 + Math.random() * (size * 1.5));
      for (let j = 0; j < subCount; j++) {
        cluster.push({
          dx: (Math.random() - 0.5) * size * 2,
          dy: (Math.random() - 0.5) * size * 2,
          b: 0.3 + Math.random() * 0.7,
        });
      }

      cities.push({ gx, gy, size, brightness, cluster });
    }

    // Roads between nearby cities
    interface Road { from: number; to: number }
    const roads: Road[] = [];
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const dx = cities[i].gx - cities[j].gx;
        const dy = cities[i].gy - cities[j].gy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.8 && Math.random() > 0.6) {
          roads.push({ from: i, to: j });
        }
      }
    }

    let t = 0;
    const scrollSpeed = 0.4;
    const worldDepth = 7; // total world depth that wraps

    // Curved horizon: large arc so edges dip down, center is highest
    const horizonCenterY = () => h * 0.18;
    const horizonCurveR = () => w * 3.5; // radius of curvature
    const horizonAtX = (sx: number): number => {
      const dx = sx - w * 0.5;
      const r = horizonCurveR();
      // arc: y = centerY + (r - sqrt(r^2 - dx^2))  — sags at edges
      return horizonCenterY() + (r - Math.sqrt(Math.max(0, r * r - dx * dx)));
    };

    // Project ground coords to screen with perspective
    // gy=0 is near camera (bottom of screen), gy=large is far (top/horizon)
    const project = (gx: number, gy: number): { sx: number; sy: number; scale: number } | null => {
      if (gy < 0.2) return null; // behind camera
      const perspective = 1.5 / gy;
      const sx = w * 0.5 + gx * w * 0.4 * perspective;
      // Map to screen: far away = near curved horizon (top), close = bottom
      const baseHorizon = horizonAtX(sx);
      const sy = baseHorizon + (perspective * h * 0.9);
      if (sy < baseHorizon - 10 || sy > h + 30 || sx < -100 || sx > w + 100) return null;
      return { sx, sy, scale: Math.min(perspective * 2, 4) };
    };

    const draw = () => {
      t += 0.008;
      const scroll = t * scrollSpeed;

      // Clear frame
      ctx.fillStyle = "#000308";
      ctx.fillRect(0, 0, w, h);

      // Earth surface below curved horizon
      const hCenterY = horizonCenterY();
      const hR = horizonCurveR();
      // Fill earth below the curve — draw arc then fill down
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      // Draw the curved horizon from left to right
      for (let x = 0; x <= w; x += 4) {
        ctx.lineTo(x, horizonAtX(x));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.clip();
      const earthGrad = ctx.createLinearGradient(0, h * 0.15, 0, h);
      earthGrad.addColorStop(0, "#020510");
      earthGrad.addColorStop(0.3, "#030710");
      earthGrad.addColorStop(1, "#010308");
      ctx.fillStyle = earthGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Space above the curve
      ctx.save();
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        ctx.lineTo(x, horizonAtX(x));
      }
      ctx.lineTo(w, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.clip();
      const skyGrad2 = ctx.createLinearGradient(0, 0, 0, hCenterY);
      skyGrad2.addColorStop(0, "#000308");
      skyGrad2.addColorStop(1, "#010510");
      ctx.fillStyle = skyGrad2;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // === ATMOSPHERE GLOW along curved horizon ===
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // Broad glow — draw multiple thin curved strips
      for (let i = -12; i <= 8; i++) {
        const offset = i * (h * 0.005);
        const intensity = Math.exp(-((i - (-1)) * (i - (-1))) / 18);
        if (intensity < 0.02) continue;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = horizonAtX(x) + offset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const blue = Math.round(180 + intensity * 75);
        ctx.strokeStyle = `rgba(80, 160, ${blue}, ${intensity * 0.12})`;
        ctx.lineWidth = h * 0.005;
        ctx.stroke();
      }

      // Thin bright arc line
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = horizonAtX(x);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(120, 190, 255, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // === STARS above horizon ===
      ctx.save();
      for (let i = 0; i < 120; i++) {
        const seed = i * 13.37;
        const sx = (Math.sin(seed * 1.1) * 0.5 + 0.5) * w;
        const maxY = horizonAtX(sx) - 5; // stay above the curved horizon
        const sy = (Math.cos(seed * 1.7) * 0.5 + 0.5) * maxY;
        const twinkle = Math.sin(t * 3 + seed) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(200, 210, 255, ${0.12 + twinkle * 0.2})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.4 + twinkle * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // === CITY LIGHTS with perspective projection ===
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // Sort cities by distance (far first, then near on top)
      const projected: { city: City; sx: number; sy: number; scale: number; gy: number }[] = [];

      for (const city of cities) {
        // Wrap the ground Y with scroll
        let gy = ((city.gy - scroll) % worldDepth);
        if (gy < 0) gy += worldDepth;

        const p = project(city.gx, gy);
        if (!p) continue;
        projected.push({ city, sx: p.sx, sy: p.sy, scale: p.scale, gy });
      }

      // Sort far to near
      projected.sort((a, b) => a.gy - b.gy);

      for (const { city, sx, sy, scale, gy } of projected) {
        // Fade near horizon
        const distRatio = Math.min(1, gy / 1.0);
        const horizonFade = 1 - Math.pow(1 - distRatio, 0.5);

        // Fade at depth extremes
        const depthFade = gy > 5 ? Math.max(0, 1 - (gy - 5) / 2) : 1;

        const fade = horizonFade * depthFade * Math.min(scale, 1.5);

        const flicker = 0.85 + noise(city.gx * 10 + t * 4, city.gy * 10) * 0.15;
        const alpha = city.brightness * fade * flicker;

        if (alpha < 0.01) continue;

        // Sub-lights
        for (const sub of city.cluster) {
          const lx = sx + sub.dx * scale;
          const ly = sy + sub.dy * scale * 0.5; // squish vertically for perspective
          const la = alpha * sub.b * 0.5;

          ctx.fillStyle = `rgba(255, 220, 150, ${la})`;
          ctx.beginPath();
          ctx.arc(lx, ly, (0.5 + city.size * 0.08) * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core glow
        const glowR = city.size * 2 * scale;
        if (glowR > 1.5) {
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
          glow.addColorStop(0, `rgba(255, 230, 170, ${alpha * 0.35})`);
          glow.addColorStop(0.3, `rgba(255, 200, 100, ${alpha * 0.15})`);
          glow.addColorStop(0.7, `rgba(255, 160, 50, ${alpha * 0.04})`);
          glow.addColorStop(1, "rgba(255, 100, 20, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === ROAD LINES ===
      for (const road of roads) {
        const c1 = cities[road.from];
        const c2 = cities[road.to];

        let gy1 = ((c1.gy - scroll) % worldDepth);
        if (gy1 < 0) gy1 += worldDepth;
        let gy2 = ((c2.gy - scroll) % worldDepth);
        if (gy2 < 0) gy2 += worldDepth;

        const p1 = project(c1.gx, gy1);
        const p2 = project(c2.gx, gy2);
        if (!p1 || !p2) continue;

        const avgScale = (p1.scale + p2.scale) / 2;
        const roadAlpha = Math.min(avgScale * 0.04, 0.08);
        if (roadAlpha < 0.005) continue;

        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.strokeStyle = `rgba(255, 200, 100, ${roadAlpha})`;
        ctx.lineWidth = Math.min(avgScale * 0.3, 0.8);
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
