import { useEffect, useRef } from "react";

const PITCH_MIN = 22;
const PITCH_MAX = 28;
const DOT_R = 1.25;
const INFLUENCE = 140;
const SPRING = 0.12;
const DAMPING = 0.78;
const PUSH = 28;
const RIPPLE_MS = 1200;
const BREATH_MS = 5000;
const WAKE_DECAY = 0.92;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isFinePointer() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
}

function parseCssColor(str, fallback) {
  if (!str || str === "transparent") return fallback;
  const c = document.createElement("canvas").getContext("2d");
  c.fillStyle = "#000";
  c.fillStyle = str;
  const computed = c.fillStyle;
  if (computed.startsWith("#") && computed.length === 7) {
    return {
      r: parseInt(computed.slice(1, 3), 16),
      g: parseInt(computed.slice(3, 5), 16),
      b: parseInt(computed.slice(5, 7), 16),
    };
  }
  const m = String(computed).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return fallback;
}

function readThemeColors(el) {
  const root = el.closest(".landing") || el;
  const rootCs = getComputedStyle(root);
  const fg = parseCssColor(rootCs.color, { r: 11, g: 12, b: 14 });
  const probe = document.createElement("span");
  probe.className = "text-azure-600";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  el.appendChild(probe);
  const accent = parseCssColor(getComputedStyle(probe).color, { r: 37, g: 99, b: 235 });
  el.removeChild(probe);
  return { fg, accent };
}

function loadMarkImage() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = "/icon.svg";
  });
}

function buildDots(w, h, markImg) {
  const pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, Math.round(Math.min(w, h) / 36)));
  const markSize = Math.min(w, h) * 0.45;
  const markCx = w * 0.5;
  const markCy = h * 0.42;

  const side = Math.ceil(markSize);
  const off = document.createElement("canvas");
  off.width = side;
  off.height = side;
  const octx = off.getContext("2d", { willReadFrequently: true });
  octx.clearRect(0, 0, side, side);
  octx.drawImage(markImg, 0, 0, side, side);
  let data = null;
  try {
    data = octx.getImageData(0, 0, side, side).data;
  } catch {
    /* ignore */
  }

  const dots = [];
  const cols = Math.ceil(w / pitch) + 2;
  const rows = Math.ceil(h / pitch) + 2;
  const ox = (w - (cols - 1) * pitch) / 2;
  const oy = (h - (rows - 1) * pitch) / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const homeX = ox + col * pitch;
      const homeY = oy + row * pitch;
      let isMark = false;
      if (data) {
        const lx = ((homeX - markCx) / markSize + 0.5) * side;
        const ly = ((homeY - markCy) / markSize + 0.5) * side;
        if (lx >= 0 && ly >= 0 && lx < side && ly < side) {
          const ix = (Math.floor(ly) * side + Math.floor(lx)) * 4;
          isMark = data[ix + 3] > 40;
        }
      }
      dots.push({ x: homeX, y: homeY, homeX, homeY, vx: 0, vy: 0, isMark });
    }
  }

  return { dots, markCx, markCy, markSize };
}

function edgeFade(x, y, w, h) {
  const dx = x / w - 0.5;
  const dy = y / h - 0.5;
  return 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy) * 1.35);
}

/**
 * Decorative living-dot field. Listens for window "auth:pulse".
 */
export function AuthDotField() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    let dots = [];
    let markCx = 0;
    let markCy = 0;
    let markImg = null;
    let colors = readThemeColors(wrap);
    let raf = 0;
    let breathTimer = 0;
    let running = false;
    let visible = true;
    let reduced = prefersReducedMotion();
    let fine = isFinePointer();
    let w = 0;
    let h = 0;
    let needsDraw = true;
    let lastBreathDraw = 0;

    const pointer = { x: -9999, y: -9999, active: false, px: 0, py: 0, wake: 0 };
    const ripples = [];

    function resize() {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (markImg) {
        const built = buildDots(w, h, markImg);
        dots = built.dots;
        markCx = built.markCx;
        markCy = built.markCy;
      }
      needsDraw = true;
      kick();
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      const breath = reduced ? 0 : Math.sin(((now % BREATH_MS) / BREATH_MS) * Math.PI * 2) * 0.1;

      // Muted field — one path
      ctx.beginPath();
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        if (d.isMark) continue;
        if (edgeFade(d.x, d.y, w, h) < 0.06) continue;
        ctx.moveTo(d.x + DOT_R, d.y);
        ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgba(${colors.fg.r},${colors.fg.g},${colors.fg.b},0.22)`;
      ctx.fill();

      // Mark dots — one path
      const ma = Math.min(0.92, 0.7 + breath);
      ctx.beginPath();
      let anyMark = false;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        if (!d.isMark) continue;
        anyMark = true;
        ctx.moveTo(d.x + DOT_R * 1.15, d.y);
        ctx.arc(d.x, d.y, DOT_R * 1.15, 0, Math.PI * 2);
      }
      if (anyMark) {
        ctx.fillStyle = `rgba(${colors.accent.r},${colors.accent.g},${colors.accent.b},${ma})`;
        ctx.fill();
      }

      // Near-pointer warm tint (few dots only)
      if (pointer.active && fine && !reduced) {
        ctx.beginPath();
        let anyWarm = false;
        for (let i = 0; i < dots.length; i++) {
          const d = dots[i];
          if (d.isMark) continue;
          const dist = Math.hypot(d.x - pointer.x, d.y - pointer.y);
          if (dist >= INFLUENCE) continue;
          anyWarm = true;
          ctx.moveTo(d.x + DOT_R, d.y);
          ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
        }
        if (anyWarm) {
          const wakeA = 0.28 + pointer.wake * 0.2;
          ctx.fillStyle = `rgba(${colors.accent.r},${colors.accent.g},${colors.accent.b},${wakeA})`;
          ctx.globalAlpha = 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Soft vignette (edge fade)
      const vg = ctx.createRadialGradient(
        w * 0.5,
        h * 0.42,
        Math.min(w, h) * 0.22,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.75
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(0.68, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }

    function clearTimers() {
      if (raf) cancelAnimationFrame(raf);
      if (breathTimer) clearTimeout(breathTimer);
      raf = 0;
      breathTimer = 0;
    }

    function step(now) {
      if (!visible || document.hidden) {
        running = false;
        raf = 0;
        return;
      }

      let moving = needsDraw;
      needsDraw = false;

      if (!reduced) {
        // Prune ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
          if (now - ripples[i].t0 >= RIPPLE_MS) ripples.splice(i, 1);
          else moving = true;
        }

        if (fine) {
          for (let i = 0; i < dots.length; i++) {
            const d = dots[i];
            let fx = (d.homeX - d.x) * SPRING;
            let fy = (d.homeY - d.y) * SPRING;

            if (pointer.active) {
              const pdx = d.x - pointer.x;
              const pdy = d.y - pointer.y;
              const dist = Math.sqrt(pdx * pdx + pdy * pdy) || 0.001;
              if (dist < INFLUENCE) {
                const t = 1 - dist / INFLUENCE;
                const force = PUSH * t * t;
                fx += (pdx / dist) * force;
                fy += (pdy / dist) * force;
                moving = true;
              }
            }

            for (let ri = 0; ri < ripples.length; ri++) {
              const rp = ripples[ri];
              const age = (now - rp.t0) / RIPPLE_MS;
              const radius = age * Math.max(w, h) * 0.55;
              const pdx = d.x - rp.x;
              const pdy = d.y - rp.y;
              const dist = Math.sqrt(pdx * pdx + pdy * pdy);
              const band = Math.abs(dist - radius);
              if (band < 40) {
                const amp = (1 - age) * (1 - band / 40) * 10;
                fx += (pdx / (dist || 1)) * amp;
                fy += (pdy / (dist || 1)) * amp;
                moving = true;
              }
            }

            d.vx = (d.vx + fx) * DAMPING;
            d.vy = (d.vy + fy) * DAMPING;
            d.x += d.vx;
            d.y += d.vy;

            if (Math.abs(d.vx) > 0.02 || Math.abs(d.vy) > 0.02 || Math.abs(d.x - d.homeX) > 0.15) {
              moving = true;
            } else {
              d.x = d.homeX;
              d.y = d.homeY;
              d.vx = 0;
              d.vy = 0;
            }
          }

          pointer.wake *= WAKE_DECAY;
          if (pointer.wake > 0.02) moving = true;
        }

        if (now - lastBreathDraw > 50) {
          lastBreathDraw = now;
          moving = true;
        }
      }

      if (moving || reduced) {
        draw(now);
      }

      if (reduced) {
        running = false;
        raf = 0;
        return;
      }

      if (!moving && !pointer.active && ripples.length === 0) {
        running = false;
        raf = 0;
        breathTimer = window.setTimeout(() => {
          breathTimer = 0;
          needsDraw = true;
          kick();
        }, 50);
        return;
      }

      raf = requestAnimationFrame(step);
    }

    function kick() {
      if (!visible || document.hidden) return;
      if (running) return;
      if (breathTimer) {
        clearTimeout(breathTimer);
        breathTimer = 0;
      }
      running = true;
      raf = requestAnimationFrame(step);
    }

    function onPointerMove(e) {
      if (!fine || reduced) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const spd = Math.hypot(x - pointer.px, y - pointer.py);
      pointer.wake = Math.min(1, pointer.wake + spd * 0.02);
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      kick();
    }

    function onPointerLeave() {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
      kick();
    }

    function onPointerDown(e) {
      if (reduced) return;
      const rect = canvas.getBoundingClientRect();
      ripples.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        t0: performance.now(),
      });
      kick();
    }

    function onPulse() {
      if (reduced) return;
      ripples.push({ x: markCx, y: markCy, t0: performance.now() });
      kick();
    }

    function onTheme() {
      colors = readThemeColors(wrap);
      needsDraw = true;
      kick();
      if (reduced) draw(performance.now());
    }

    function onVisibility() {
      if (document.hidden) {
        clearTimers();
        running = false;
      } else {
        needsDraw = true;
        kick();
      }
    }

    function onMotionChange() {
      reduced = prefersReducedMotion();
      fine = isFinePointer();
      needsDraw = true;
      if (reduced) {
        for (let i = 0; i < dots.length; i++) {
          dots[i].x = dots[i].homeX;
          dots[i].y = dots[i].homeY;
          dots[i].vx = 0;
          dots[i].vy = 0;
        }
        draw(performance.now());
        clearTimers();
        running = false;
      } else {
        kick();
      }
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (visible) {
          needsDraw = true;
          kick();
        } else {
          clearTimers();
          running = false;
        }
      },
      { threshold: 0.01 }
    );
    io.observe(wrap);

    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqFine = window.matchMedia("(pointer: fine)");
    mqReduce.addEventListener?.("change", onMotionChange);
    mqFine.addEventListener?.("change", onMotionChange);

    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("auth:pulse", onPulse);
    document.addEventListener("visibilitychange", onVisibility);

    let cancelled = false;
    loadMarkImage()
      .then((img) => {
        if (cancelled) return;
        markImg = img;
        resize();
        if (reduced) draw(performance.now());
        else kick();
      })
      .catch(() => {
        if (cancelled) return;
        resize();
        kick();
      });

    return () => {
      cancelled = true;
      clearTimers();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("auth:pulse", onPulse);
      document.removeEventListener("visibilitychange", onVisibility);
      mqReduce.removeEventListener?.("change", onMotionChange);
      mqFine.removeEventListener?.("change", onMotionChange);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <img
        src="/icon.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[42%] w-[min(45%,280px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.1] dark:opacity-[0.12]"
        draggable={false}
      />
    </div>
  );
}
