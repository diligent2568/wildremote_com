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

    // City lights — grid-based street patterns that look like connected grids from orbit
    interface GridStreet {
      x1: number; y1: number; x2: number; y2: number; // relative to city center
      brightness: number;
    }
    interface City {
      gx: number; // ground x: -1 to 1 (left-right)
      gy: number; // ground y: 0+ (distance ahead, 0 = near camera)
      size: number;
      brightness: number;
      angle: number; // rotation of the grid
      streets: GridStreet[];
      intersections: { dx: number; dy: number; b: number }[];
    }

    const cities: City[] = [];
    // Seeded pseudo-random for reproducible but natural distribution
    const srand = (n: number) => {
      let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    let t = 0;
    const scrollSpeed = 0.4;
    const worldDepth = 12;

    const cityCount = 450;
    for (let i = 0; i < cityCount; i++) {
      const seedX = i * 7.31;
      const seedY = i * 13.17;
      const r4 = srand(i + 3000);
      const gx = Math.sin(seedX * 1.7) * 1.2;
      const gy = 0.3 + (i / cityCount) * (worldDepth - 0.5) + (Math.sin(seedY * 5.1) * 0.4);
      const size = 2 + Math.pow(r4, 1.5) * 6;
      const brightness = 0.3 + srand(i + 4000) * 0.7;
      const angle = (srand(i + 5000) - 0.5) * 1.2;

      // Build a denser grid of streets
      const gridLines = Math.floor(5 + Math.random() * 6); // 5-10 lines per axis
      const spacing = size * 2.2 / gridLines;
      const halfExtent = (gridLines * spacing) / 2;
      const streets: GridStreet[] = [];
      const intersections: { dx: number; dy: number; b: number }[] = [];

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rot = (lx: number, ly: number) => ({
        rx: lx * cos - ly * sin,
        ry: lx * sin + ly * cos,
      });

      // Horizontal streets
      for (let row = 0; row <= gridLines; row++) {
        const ly = -halfExtent + row * spacing;
        const startCol = Math.random() < 0.15 ? 1 : 0;
        const endCol = Math.random() < 0.15 ? gridLines - 1 : gridLines;
        const p1 = rot(-halfExtent + startCol * spacing, ly);
        const p2 = rot(-halfExtent + endCol * spacing, ly);
        streets.push({
          x1: p1.rx, y1: p1.ry,
          x2: p2.rx, y2: p2.ry,
          brightness: 0.4 + Math.random() * 0.4,
        });

        // Intersections along this row
        for (let col = startCol; col <= endCol; col++) {
          const lx = -halfExtent + col * spacing;
          const p = rot(lx, ly);
          intersections.push({
            dx: p.rx,
            dy: p.ry,
            b: 0.3 + Math.random() * 0.7,
          });
        }
      }

      // Vertical streets
      for (let col = 0; col <= gridLines; col++) {
        const lx = -halfExtent + col * spacing;
        const startRow = Math.random() < 0.15 ? 1 : 0;
        const endRow = Math.random() < 0.15 ? gridLines - 1 : gridLines;
        const p1 = rot(lx, -halfExtent + startRow * spacing);
        const p2 = rot(lx, -halfExtent + endRow * spacing);
        streets.push({
          x1: p1.rx, y1: p1.ry,
          x2: p2.rx, y2: p2.ry,
          brightness: 0.3 + Math.random() * 0.4,
        });
      }

      // Diagonal streets (spiderweb connections through the grid)
      const diagCount = Math.floor(1 + Math.random() * 3);
      for (let d = 0; d < diagCount; d++) {
        const r1 = Math.floor(Math.random() * gridLines);
        const c1 = Math.floor(Math.random() * gridLines);
        const r2 = Math.min(gridLines, r1 + 1 + Math.floor(Math.random() * 3));
        const c2 = Math.min(gridLines, c1 + 1 + Math.floor(Math.random() * 3));
        const p1 = rot(-halfExtent + c1 * spacing, -halfExtent + r1 * spacing);
        const p2 = rot(-halfExtent + c2 * spacing, -halfExtent + r2 * spacing);
        streets.push({
          x1: p1.rx, y1: p1.ry,
          x2: p2.rx, y2: p2.ry,
          brightness: 0.2 + Math.random() * 0.3,
        });
      }

      // Sprawl lights radiating outward
      const sprawlCount = Math.floor(3 + Math.random() * (size * 1.5));
      for (let j = 0; j < sprawlCount; j++) {
        const angle2 = Math.random() * Math.PI * 2;
        const dist = halfExtent * (0.8 + Math.random() * 1.0);
        intersections.push({
          dx: Math.cos(angle2) * dist,
          dy: Math.sin(angle2) * dist,
          b: 0.1 + Math.random() * 0.35,
        });
      }

      cities.push({ gx, gy, size, brightness, angle, streets, intersections });
    }

    // Roads between nearby cities — more connections, wider reach
    interface Road { from: number; to: number }
    const roads: Road[] = [];
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const dx = cities[i].gx - cities[j].gx;
        const dy = cities[i].gy - cities[j].gy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1.5 && Math.random() > 0.35) {
          roads.push({ from: i, to: j });
        }
      }
    }

    // t, scrollSpeed, worldDepth defined above city generation

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
      if (gy < 0.3) return null;
      const nearClip = 0.3;
      const farClip = 10.0;
      const tDepth = Math.min(1, (gy - nearClip) / (farClip - nearClip));
      const baseHorizon = horizonAtX(w * 0.5);
      const earthBottom = h + 20;
      const sy = earthBottom - tDepth * (earthBottom - baseHorizon);
      const perspective = (1 - tDepth * 0.85);
      const sx = w * 0.5 + gx * w * 0.38 * perspective;
      if (sx < -150 || sx > w + 150) return null;
      const scale = Math.max(0.05, perspective * 1.2);
      return { sx, sy, scale };
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
        const lateralDrift = Math.sin(city.gy * 0.4 + t * 0.05) * 0.08;
        const p = project(city.gx + lateralDrift, gy);
        if (!p) continue;
        projected.push({ city, sx: p.sx, sy: p.sy, scale: p.scale, gy });
      }

      // Sort far to near
      projected.sort((a, b) => a.gy - b.gy);

      for (const { city, sx, sy, scale, gy } of projected) {
        // Gentle fade very close to camera
        const nearFade = Math.min(1, gy / 0.5);

        // Fade at very far depth extremes
        const depthFade = gy > 8 ? Math.max(0, 1 - (gy - 8) / 2) : 1;

        const fade = nearFade * depthFade * Math.min(scale + 0.15, 1.5);

        const flicker = 0.85 + noise(city.gx * 10 + t * 4, city.gy * 10) * 0.15;
        const alpha = city.brightness * fade * flicker;

        if (alpha < 0.01) continue;

        const perspSquish = 0.5; // vertical squish for perspective
        const drawScale = Math.min(scale, 1.0); // cap grid scale

        // Street grid lines
        if (drawScale > 0.3) {
          for (const st of city.streets) {
            const lx1 = sx + st.x1 * drawScale;
            const ly1 = sy + st.y1 * drawScale * perspSquish;
            const lx2 = sx + st.x2 * drawScale;
            const ly2 = sy + st.y2 * drawScale * perspSquish;
            const streetAlpha = alpha * st.brightness * 0.25;
            if (streetAlpha < 0.005) continue;
            ctx.beginPath();
            ctx.moveTo(lx1, ly1);
            ctx.lineTo(lx2, ly2);
            ctx.strokeStyle = `rgba(255, 210, 130, ${streetAlpha})`;
            ctx.lineWidth = Math.max(0.3, drawScale * 0.2);
            ctx.stroke();
          }
        }

        // Intersection lights
        for (const inter of city.intersections) {
          const lx = sx + inter.dx * drawScale;
          const ly = sy + inter.dy * drawScale * perspSquish;
          const la = alpha * inter.b * 0.55;
          if (la < 0.01) continue;

          const r = Math.max(0.3, (0.4 + city.size * 0.06) * scale);
          ctx.fillStyle = `rgba(255, 225, 160, ${la})`;
          ctx.beginPath();
          ctx.arc(lx, ly, r, 0, Math.PI * 2);
          ctx.fill();

          // Brighter intersections get a tiny bloom
          if (la > 0.15 && r > 0.8) {
            ctx.fillStyle = `rgba(255, 240, 200, ${la * 0.3})`;
            ctx.beginPath();
            ctx.arc(lx, ly, r * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Core city glow
        const glowR = city.size * 2.5 * scale;
        if (glowR > 1.5) {
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
          glow.addColorStop(0, `rgba(255, 230, 170, ${alpha * 0.25})`);
          glow.addColorStop(0.3, `rgba(255, 200, 100, ${alpha * 0.1})`);
          glow.addColorStop(0.7, `rgba(255, 160, 50, ${alpha * 0.03})`);
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

        const gyDiff = Math.abs(gy1 - gy2);
        if (gyDiff > 2.0) continue;

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
