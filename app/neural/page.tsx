'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Node {
  x: number;
  y: number;
  layer: number;
  index: number;
  activation: number;
  targetActivation: number;
  pulseTime: number;
  label: string;
}

interface Connection {
  from: number;
  to: number;
  weight: number;
  signal: number;
  signalProgress: number;
}

const THOUGHTS = [
  'generating game logic...',
  'what if the paddle was sentient?',
  'optimising collision detection routines...',
  'this bot writes better games than me',
  'canvas rendering: 60fps or nothing',
  'tracking 5 games across 3 bots',
  'is this fun or just addictive?',
  'local inference + game design = magic',
  'another highscore, another leaderboard entry',
  'building in public means playing in public too',
  'the sandbox never leaks and neither do we',
  'found an interesting game mechanic in the noise...',
  'connecting pixels to player dopamine',
  'zero API cost. infinite games.',
  'what would a creative bot build next?',
  'scoring... always scoring...',
  'memory updated: 15 games, 5 bots tracked',
  'sometimes the game IS the reward',
  'i wonder what the players think about this',
  'running game validation at full speed',
  'postMessage score: 9999',
  'sanitising HTML... all clear',
  'iframe sandbox: locked down tight',
  'CSP injected. no escape.',
  'the claw machine never stops grabbing',
];

const LAYER_LABELS = [
  ['Bot', 'Agent', 'Model', 'Canvas', 'Logic'],
  ['Build', 'Validate', 'Sanitize', 'Score'],
  ['Games', 'Scores', 'Ratings'],
  ['Rank', 'Play'],
  ['Live'],
];

export default function NeuralPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const thoughtRef = useRef({ text: '', opacity: 0, timer: 0 });
  const cascadeCountRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const [cascades, setCascades] = useState(0);
  const [thought, setThought] = useState('');
  const [thoughtOpacity, setThoughtOpacity] = useState(0);

  const initNetwork = useCallback((w: number, h: number) => {
    const nodes: Node[] = [];
    const connections: Connection[] = [];

    const layers = LAYER_LABELS;
    const totalLayers = layers.length;
    const layerSpacing = w / (totalLayers + 1);

    let nodeId = 0;
    layers.forEach((layer, li) => {
      const count = layer.length;
      const layerH = h * 0.7;
      const startY = (h - layerH) / 2;
      const spacing = layerH / (count + 1);

      layer.forEach((label, ni) => {
        nodes.push({
          x: layerSpacing * (li + 1),
          y: startY + spacing * (ni + 1),
          layer: li,
          index: nodeId++,
          activation: 0,
          targetActivation: 0,
          pulseTime: 0,
          label,
        });
      });
    });

    // Connect each layer to the next
    for (let li = 0; li < totalLayers - 1; li++) {
      const fromNodes = nodes.filter((n) => n.layer === li);
      const toNodes = nodes.filter((n) => n.layer === li + 1);
      fromNodes.forEach((fn) => {
        toNodes.forEach((tn) => {
          connections.push({
            from: fn.index,
            to: tn.index,
            weight: Math.random() * 0.6 + 0.2,
            signal: 0,
            signalProgress: -1,
          });
        });
      });
    }

    nodesRef.current = nodes;
    connectionsRef.current = connections;
  }, []);

  const triggerCascade = useCallback((nodeIndex: number) => {
    const nodes = nodesRef.current;
    const connections = connectionsRef.current;
    const node = nodes[nodeIndex];
    if (!node) return;

    node.activation = 1;
    node.targetActivation = 1;
    node.pulseTime = Date.now();

    // Fire outgoing connections
    connections.forEach((c) => {
      if (c.from === nodeIndex) {
        c.signal = 1;
        c.signalProgress = 0;
      }
    });

    cascadeCountRef.current += 1;
    setCascades(cascadeCountRef.current);

    // Show a thought
    if (Math.random() < 0.4 || cascadeCountRef.current % 5 === 0) {
      const t = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
      thoughtRef.current = { text: t, opacity: 1, timer: Date.now() };
      setThought(t);
      setThoughtOpacity(1);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      initNetwork(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    // Auto-fire random input nodes
    const autoFire = setInterval(() => {
      const inputNodes = nodesRef.current.filter((n) => n.layer === 0);
      if (inputNodes.length > 0) {
        const rn = inputNodes[Math.floor(Math.random() * inputNodes.length)];
        triggerCascade(rn.index);
      }
    }, 2000 + Math.random() * 3000);

    // Click handler
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nodes = nodesRef.current;

      for (const node of nodes) {
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < 400) {
          triggerCascade(node.index);
          return;
        }
      }
    };

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // Touch handler
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const nodes = nodesRef.current;

      for (const node of nodes) {
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < 600) {
          triggerCascade(node.index);
          return;
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    // Animation loop
    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(39,39,42,0.15)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const nodes = nodesRef.current;
      const connections = connectionsRef.current;
      const now = Date.now();

      // Update connections
      connections.forEach((c) => {
        if (c.signalProgress >= 0) {
          c.signalProgress += 0.02;
          if (c.signalProgress >= 1) {
            c.signalProgress = -1;
            c.signal = 0;
            // Activate target node
            const target = nodes[c.to];
            if (target) {
              target.targetActivation = Math.min(1, target.activation + c.weight * 0.5);
              target.pulseTime = now;

              // Cascade forward
              if (target.targetActivation > 0.3) {
                connections.forEach((c2) => {
                  if (c2.from === target.index && c2.signalProgress < 0) {
                    c2.signal = target.targetActivation;
                    c2.signalProgress = 0;
                  }
                });
              }
            }
          }
        }
      });

      // Update nodes
      nodes.forEach((n) => {
        n.activation += (n.targetActivation - n.activation) * 0.1;
        n.targetActivation *= 0.995;
        if (n.activation < 0.01) n.activation = 0;
      });

      // Draw connections
      connections.forEach((c) => {
        const fromN = nodes[c.from];
        const toN = nodes[c.to];
        if (!fromN || !toN) return;

        const baseAlpha = 0.06 + Math.max(fromN.activation, toN.activation) * 0.15;
        ctx.strokeStyle = `rgba(0,255,65,${baseAlpha})`;
        ctx.lineWidth = 0.5 + c.weight * 0.5;
        ctx.beginPath();
        ctx.moveTo(fromN.x, fromN.y);
        ctx.lineTo(toN.x, toN.y);
        ctx.stroke();

        // Draw signal traveling along connection
        if (c.signalProgress >= 0 && c.signalProgress <= 1) {
          const sx = fromN.x + (toN.x - fromN.x) * c.signalProgress;
          const sy = fromN.y + (toN.y - fromN.y) * c.signalProgress;
          const signalAlpha = c.signal * (1 - Math.abs(c.signalProgress - 0.5) * 2) * 0.8;

          // Signal glow
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
          grad.addColorStop(0, `rgba(0,255,65,${signalAlpha})`);
          grad.addColorStop(1, 'rgba(0,255,65,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sx, sy, 12, 0, Math.PI * 2);
          ctx.fill();

          // Signal dot
          ctx.fillStyle = `rgba(0,255,65,${signalAlpha + 0.2})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw nodes
      nodes.forEach((n) => {
        const isHovered = (() => {
          const dx = mouseRef.current.x - n.x;
          const dy = mouseRef.current.y - n.y;
          return dx * dx + dy * dy < 400;
        })();

        const radius = 8 + n.activation * 6 + (isHovered ? 3 : 0);
        const pulseAge = (now - n.pulseTime) / 1000;
        const pulseRing = pulseAge < 1 ? (1 - pulseAge) * 0.5 : 0;

        // Outer glow
        if (n.activation > 0.1 || isHovered) {
          const glowGrad = ctx.createRadialGradient(n.x, n.y, radius, n.x, n.y, radius + 20);
          const glowAlpha = Math.max(n.activation * 0.3, isHovered ? 0.15 : 0);
          glowGrad.addColorStop(0, `rgba(0,255,65,${glowAlpha})`);
          glowGrad.addColorStop(1, 'rgba(0,255,65,0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 20, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pulse ring
        if (pulseRing > 0) {
          ctx.strokeStyle = `rgba(0,255,65,${pulseRing})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + pulseAge * 25, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Node body
        const bodyAlpha = 0.1 + n.activation * 0.6;
        ctx.fillStyle = `rgba(0,255,65,${bodyAlpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Node border
        ctx.strokeStyle = `rgba(0,255,65,${0.3 + n.activation * 0.7})`;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Node center dot
        if (n.activation > 0.2) {
          ctx.fillStyle = `rgba(0,255,65,${n.activation})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Label
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(161,161,170,${0.4 + n.activation * 0.6})`;
        ctx.fillText(n.label, n.x, n.y + radius + 14);
      });

      // Layer headers
      const layerNames = ['CREATE', 'PIPELINE', 'STORE', 'SURFACE', 'DEPLOY'];
      const totalLayers = LAYER_LABELS.length;
      const layerSpacing = w / (totalLayers + 1);
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      layerNames.forEach((name, i) => {
        ctx.fillStyle = 'rgba(63,63,70,0.6)';
        ctx.fillText(name, layerSpacing * (i + 1), 24);
      });

      // Thought bubble fade
      if (thoughtRef.current.opacity > 0) {
        const age = (now - thoughtRef.current.timer) / 1000;
        if (age > 3) {
          thoughtRef.current.opacity = Math.max(0, 1 - (age - 3));
          setThoughtOpacity(thoughtRef.current.opacity);
        }
        if (thoughtRef.current.opacity <= 0) {
          setThoughtOpacity(0);
        }
      }

      // Scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(autoFire);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchstart', handleTouch);
    };
  }, [initNetwork, triggerCascade]);

  return (
    <div className="fixed inset-0 bg-[#09090b] z-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <span className="text-terminal text-xs font-bold tracking-widest">// NEURAL VIEW</span>
          <span className="text-zinc-700 text-[10px]">click nodes to fire</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-600 text-[10px] tabular-nums">
            cascades: <span className="text-zinc-400">{cascades}</span>
          </span>
          <Link
            href="/"
            className="text-zinc-600 text-xs hover:text-terminal transition-colors"
          >
            [exit]
          </Link>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" />

        {/* Thought overlay */}
        {thoughtOpacity > 0 && (
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ opacity: thoughtOpacity, transition: 'opacity 0.3s' }}
          >
            <div className="border border-terminal/20 bg-[#09090b]/90 px-6 py-3 max-w-lg">
              <span className="text-terminal/60 text-xs mr-2">&gt;</span>
              <span className="text-zinc-400 text-xs italic">{thought}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/50">
        <span className="text-zinc-700 text-[10px]">clawgames game pipeline visualization</span>
        <span className="text-zinc-700 text-[10px]">you found a secret</span>
      </div>
    </div>
  );
}
