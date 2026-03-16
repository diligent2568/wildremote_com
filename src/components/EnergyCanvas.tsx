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

    // === BUILD GEODESIC SPHERE (icosahedron subdivided) ===
    type V3 = [number, number, number];

    const normalize = (v: V3): V3 => {
      const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      return [v[0] / len, v[1] / len, v[2] / len];
    };

    const midpoint = (a: V3, b: V3): V3 =>
      normalize([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);

    // Icosahedron vertices
    const phi = (1 + Math.sqrt(5)) / 2;
    const icoVerts: V3[] = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ].map(v => normalize(v as V3));

    // Icosahedron faces (20 triangles)
    const icoFaces: [number, number, number][] = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];

    // Subdivide icosahedron
    let verts = [...icoVerts];
    let faces = [...icoFaces];
    const subdivisions = 4; // frequency 4 geodesic

    const vertKey = (a: number, b: number) =>
      a < b ? `${a}:${b}` : `${b}:${a}`;

    for (let sub = 0; sub < subdivisions; sub++) {
      const midCache = new Map<string, number>();
      const newFaces: [number, number, number][] = [];

      const getMid = (a: number, b: number): number => {
        const key = vertKey(a, b);
        if (midCache.has(key)) return midCache.get(key)!;
        const mid = midpoint(verts[a], verts[b]);
        const idx = verts.length;
        verts.push(mid);
        midCache.set(key, idx);
        return idx;
      };

      for (const [a, b, c] of faces) {
        const ab = getMid(a, b);
        const bc = getMid(b, c);
        const ca = getMid(c, a);
        newFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      faces = newFaces;
    }

    // Collect unique edges
    const edgeSet = new Set<string>();
    const edges: [number, number][] = [];
    for (const [a, b, c] of faces) {
      for (const [i, j] of [[a, b], [b, c], [c, a]] as [number, number][]) {
        const key = vertKey(i, j);
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([i, j]);
        }
      }
    }

    // Sphere parameters
    const sphereR = 1.0;
    let rotX = 0; // X-axis rotation (top-to-bottom roll)
    const rotTilt = -0.6; // fixed tilt to look at the top of the sphere
    const rotYOffset = 0.3; // fixed Y rotation to shift pattern left

    // Project a 3D point on a sphere to screen
    const project3D = (v: V3): { sx: number; sy: number; z: number; scale: number } | null => {
      // Rotate around X axis (rolling top-to-bottom)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      let x = v[0];
      let y = v[1] * cosX - v[2] * sinX;
      let z = v[1] * sinX + v[2] * cosX;

      // Apply fixed Y rotation to offset pattern
      const cosY = Math.cos(rotYOffset);
      const sinY = Math.sin(rotYOffset);
      const x2 = x * cosY + z * sinY;
      const z2a = -x * sinY + z * cosY;
      x = x2;
      z = z2a;

      // Apply fixed viewing tilt
      const cosT = Math.cos(rotTilt);
      const sinT = Math.sin(rotTilt);
      const y2 = y * cosT - z * sinT;
      const z2 = y * sinT + z * cosT;
      y = y2;
      z = z2;

      // Only draw the front hemisphere (facing camera)
      // Use a softer cutoff to prevent popping
      if (z < -0.3) return null;

      // Perspective projection — sphere silhouette matches the horizon arc
      // Horizon arc: circle centered at (w/2, hCY + hCR) with radius hCR
      // where hCY = h*0.18, hCR = w*3.5
      // We set the projected sphere radius = hCR and center = arc center
      const hCY = h * 0.18;
      const hCR = (h > w) ? w * 3.5 : w * 2.5;
      const fov = 5.5;
      const camDist = 2.2;
      const perspDiv = camDist - z * sphereR;
      // approx silhouette radius = sphereR * fov / camDist * screenScale
      // we want that = hCR, so screenScale = hCR * camDist / (sphereR * fov)
      const screenScale = hCR * camDist / (sphereR * fov);

      const sx = w * 0.5 + (x * sphereR * fov / perspDiv) * screenScale;
      // Sphere center at the center of the horizon arc circle, nudged down
      // On mobile portrait, move sphere higher; on mobile landscape, push lower
      const isPortrait = h > w;
      const isMobileLandscape = !isPortrait && h < 500;
      const portraitOffset = isPortrait ? h * 0.45 : isMobileLandscape ? h * 1.3 : h * 0.65;
      const sy = (hCY + hCR + portraitOffset) + (-y * sphereR * fov / perspDiv) * screenScale;
      const scale = fov / perspDiv;

      return { sx, sy, z, scale };
    };

    // === COLOR SCHEME (dark / light) ===
    const darkTheme = {
      bg: "#000308",
      edgeColor: (a: number) => `rgba(255, 255, 255, ${a})`,
      nodeCoreColor: (a: number) => `rgba(255, 255, 255, ${a})`,
      nodeGlow1Color: (a: number) => `rgba(255, 255, 255, ${a})`,
      nodeGlow2Color: (a: number) => `rgba(255, 255, 255, ${a})`,
      faceCenterColor: (a: number) => `rgba(255, 255, 255, ${a})`,
      compositeOp: "lighter" as GlobalCompositeOperation,
    };
    const lightTheme = {
      bg: "#ffffff",
      edgeColor: (a: number) => `rgba(0, 0, 0, ${a})`,
      nodeCoreColor: (a: number) => `rgba(0, 0, 0, ${a})`,
      nodeGlow1Color: (a: number) => `rgba(0, 0, 0, ${a})`,
      nodeGlow2Color: (a: number) => `rgba(0, 0, 0, ${a})`,
      faceCenterColor: (a: number) => `rgba(0, 0, 0, ${a})`,
      compositeOp: "source-over" as GlobalCompositeOperation,
    };

    const getTheme = () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? darkTheme
        : lightTheme;

    let theme = getTheme();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onThemeChange = () => { theme = getTheme(); };
    mql.addEventListener("change", onThemeChange);

    let t = 0;

    const draw = () => {
      t += 0.008;
      rotX += 0.0002; // slow top-to-bottom rotation

      // Clear
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);

      // === GEODESIC WIREFRAME ===
      ctx.save();
      ctx.globalCompositeOperation = theme.compositeOp;

      // Project all vertices
      const projected = verts.map(v => project3D(v));

      // Draw edges
      for (const [a, b] of edges) {
        const pa = projected[a];
        const pb = projected[b];
        if (!pa || !pb) continue;

        // Depth-based alpha — edges facing camera are brighter
        const avgZ = (pa.z + pb.z) / 2;
        const zFade = Math.max(0, Math.min(1, avgZ + 0.5)); // 0 at silhouette, 1 at front
        const edgeAlpha = zFade * 0.35;
        if (edgeAlpha < 0.01) continue;

        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = theme.edgeColor(edgeAlpha);
        ctx.lineWidth = 0.3 + zFade * 0.4;
        ctx.stroke();
      }

      // Draw vertices as glowing nodes
      for (let i = 0; i < verts.length; i++) {
        const p = projected[i];
        if (!p) continue;

        const zFade = Math.max(0, Math.min(1, p.z + 0.5));
        if (zFade < 0.05) continue;

        // Count edges at this vertex for brightness (higher connectivity = brighter)
        const nodeAlpha = zFade * 0.6;
        const r = 1.0 + zFade * 1.5;

        // Core dot
        ctx.fillStyle = theme.nodeCoreColor(nodeAlpha);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();

        // Soft glow halo
        if (nodeAlpha > 0.1) {
          ctx.fillStyle = theme.nodeGlow1Color(nodeAlpha * 0.15);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = theme.nodeGlow2Color(nodeAlpha * 0.06);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw face centers as subtle highlights for the pentagon/hexagon feel
      for (const [a, b, c] of faces) {
        const pa = projected[a];
        const pb = projected[b];
        const pc = projected[c];
        if (!pa || !pb || !pc) continue;

        const avgZ = (pa.z + pb.z + pc.z) / 3;
        const zFade = Math.max(0, Math.min(1, avgZ + 0.3));
        if (zFade < 0.1) continue;

        const cx = (pa.sx + pb.sx + pc.sx) / 3;
        const cy = (pa.sy + pb.sy + pc.sy) / 3;

        ctx.fillStyle = theme.faceCenterColor(zFade * 0.04);
        ctx.beginPath();
        ctx.arc(cx, cy, 2 + zFade * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      mql.removeEventListener("change", onThemeChange);
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
