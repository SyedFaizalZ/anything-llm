import React, { useEffect, useRef, useState } from "react";
import Workspace from "@/models/workspace";
import { useTranslation } from "react-i18next";
import { ArrowsOutSimple, MagnifyingGlassPlus, MagnifyingGlassMinus, SlidersHorizontal } from "@phosphor-icons/react";

export default function GraphViewer({ workspace }) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // physics configs
  const [showSettings, setShowSettings] = useState(false);
  const [physicsParams, setPhysicsParams] = useState({
    charge: 2500,
    gravity: 0.15,
    spring: 0.5
  });
  const paramsRef = useRef(physicsParams);

  const updateParam = (key, value) => {
    const newVal = Number(value);
    setPhysicsParams(prev => {
      const next = { ...prev, [key]: newVal };
      paramsRef.current = next;
      return next;
    });
  };
  
  // physics and render state
  const animationRef = useRef(null);
  const physicsRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const stateRef = useRef({ dragging: null, hovered: null, mouse: { x: 0, y: 0 } });
  
  // Fetch data
  useEffect(() => {
    async function fetchGraph() {
      setLoading(true);
      setError(null);
      try {
        const data = await Workspace.getGraphData(workspace.slug);
        if (!data || data.nodes?.length === 0) {
          setError(t('connectors.manage.no-graph-data', "No Graph RAG data found for this workspace. Enable Advanced Graph Mode during upload to build a knowledge graph."));
        } else {
          setGraphData(data);
          initPhysics(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
    
    return () => stopAnimation();
  }, [workspace.slug, t]);

  // Handle Canvas Resize
  useEffect(() => {
    if (!canvasRef.current || loading || error) return;
    
    const resizeObserver = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight || 500;
        
        // Auto-center on initial load
        if (transformRef.current.scale === 1 && transformRef.current.x === 0 && transformRef.current.y === 0) {
          centerGraph();
        }
      }
    });
    
    resizeObserver.observe(canvasRef.current.parentElement);
    return () => resizeObserver.disconnect();
  }, [loading, error]);
  
  const initPhysics = (data) => {
    const nodes = data.nodes.map(n => ({
      ...n, 
      x: Math.random() * 800, 
      y: Math.random() * 600,
      vx: 0, vy: 0,
      mass: 1,
      radius: 8 + (n.label.length * 0.2) // slightly larger for longer text
    }));
    
    // Map edges to node objects
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edges = data.edges.map(e => ({
      ...e,
      sourceObj: nodeMap.get(e.source),
      targetObj: nodeMap.get(e.target)
    })).filter(e => e.sourceObj && e.targetObj);
    
    physicsRef.current = { nodes, edges };
    
    // Start simulation loop
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    startAnimation();
  };
  
  const startAnimation = () => {
    let lastTime = performance.now();
    const tick = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1); // cap dt
      lastTime = time;
      
      updatePhysics(dt);
      renderCanvas();
      
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
  };
  
  const stopAnimation = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const updatePhysics = (dt) => {
    if (!physicsRef.current) return;
    const { nodes, edges } = physicsRef.current;
    
    const { charge, gravity: centerGravity, spring: k } = paramsRef.current;
    const damping = 0.5; // friction (more damping for stability)
    
    const canvas = canvasRef.current;
    const cw = canvas ? canvas.width : 800;
    const ch = canvas ? canvas.height : 600;
    const cx = cw / 2;
    const cy = ch / 2;

    // Forces
    nodes.forEach(n => { n.fx = 0; n.fy = 0; });

    // Center gravity (pulls nodes towards the center of the canvas)
    nodes.forEach(n => {
      n.fx += (cx - n.x) * centerGravity;
      n.fy += (cy - n.y) * centerGravity;
    });

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        let distSq = dx*dx + dy*dy;
        if (distSq === 0) { dx = Math.random(); dy = Math.random(); distSq = dx*dx + dy*dy; }
        
        let force = charge / distSq;
        // Cap excessive forces to prevent wild jumps when nodes are very close
        force = Math.min(500, force);
        
        const forceX = dx * force;
        const forceY = dy * force;
        
        n1.fx -= forceX; n1.fy -= forceY;
        n2.fx += forceX; n2.fy += forceY;
      }
    }

    // Spring attraction
    edges.forEach(e => {
      const dx = e.targetObj.x - e.sourceObj.x;
      const dy = e.targetObj.y - e.sourceObj.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist === 0) return;
      
      const targetDist = 300; // ideal spring length (doubled to spread clusters)
      const force = (dist - targetDist) * k * dt;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      e.sourceObj.fx += fx; e.sourceObj.fy += fy;
      e.targetObj.fx -= fx; e.targetObj.fy -= fy;
    });

    // Integration
    nodes.forEach(n => {
      // If dragging, override physics
      if (stateRef.current.dragging === n) return;
      
      n.vx = (n.vx + n.fx * dt) * damping;
      n.vy = (n.vy + n.fy * dt) * damping;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
    });
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !physicsRef.current) return;
    
    const ctx = canvas.getContext('2d');
    const { nodes, edges } = physicsRef.current;
    const { x: tx, y: ty, scale } = transformRef.current;
    const { hovered } = stateRef.current;
    
    // Smooth HD rendering
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply camera transform
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);
    
    // Determine highlighted nodes based on hover
    let highlightNodes = new Set();
    let highlightEdges = new Set();
    
    if (hovered) {
      highlightNodes.add(hovered.id);
      edges.forEach(e => {
        if (e.source === hovered.id || e.target === hovered.id) {
          highlightEdges.add(e);
          highlightNodes.add(e.source);
          highlightNodes.add(e.target);
        }
      });
    }
    
    // Draw edges
    edges.forEach(e => {
      const isHighlighted = hovered ? highlightEdges.has(e) : false;
      const isFaded = hovered && !isHighlighted;
      
      ctx.beginPath();
      ctx.moveTo(e.sourceObj.x, e.sourceObj.y);
      ctx.lineTo(e.targetObj.x, e.targetObj.y);
      ctx.strokeStyle = isHighlighted ? 'rgba(74, 222, 128, 0.8)' : isFaded ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isHighlighted ? 2 / scale : 1 / scale;
      ctx.stroke();
      
      // Draw edge label if highlighted or very close zoom
      if ((isHighlighted || scale > 1.5) && e.label) {
        const mx = (e.sourceObj.x + e.targetObj.x) / 2;
        const my = (e.sourceObj.y + e.targetObj.y) / 2;
        ctx.fillStyle = isHighlighted ? 'rgba(74, 222, 128, 1)' : 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.label, mx, my - 6);
      }
    });
    
    // Draw nodes
    nodes.forEach(n => {
      const isHovered = hovered === n;
      const isHighlighted = hovered ? highlightNodes.has(n.id) : true;
      const isFaded = hovered && !isHighlighted;
      const r = n.radius / (scale > 1 ? Math.sqrt(scale) : 1); // Maintain readable size
      
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? '#4ade80' : isFaded ? 'rgba(255, 255, 255, 0.1)' : '#38bdf8';
      ctx.fill();
      
      // Node outline
      ctx.lineWidth = 1.5 / scale;
      ctx.strokeStyle = isHovered ? '#fff' : isFaded ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();
      
      // Node label
      if (!isFaded && (scale > 0.8 || isHighlighted)) {
        ctx.fillStyle = isHovered ? '#fff' : 'rgba(255, 255, 255, 0.85)';
        ctx.font = `${isHovered ? 'bold ' : ''}${isHovered ? 14 : 12}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.radius + 16);
      }
    });
  };

  // Interactions
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Get mouse pos relative to canvas, accounting for transform
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);
    const { x: tx, y: ty, scale } = transformRef.current;
    
    return {
      x: (mx - tx) / scale,
      y: (my - ty) / scale
    };
  };

  const handlePointerDown = (e) => {
    const pos = getMousePos(e);
    stateRef.current.mouse = { rawX: e.clientX, rawY: e.clientY };
    
    if (!physicsRef.current) return;
    
    // Check if clicked a node
    const { scale } = transformRef.current;
    let clickedNode = null;
    for (const n of physicsRef.current.nodes) {
      const r = n.radius / (scale > 1 ? Math.sqrt(scale) : 1);
      const dx = n.x - pos.x;
      const dy = n.y - pos.y;
      if (dx*dx + dy*dy <= r*r) {
        clickedNode = n;
        break;
      }
    }
    
    if (clickedNode) {
      stateRef.current.dragging = clickedNode;
      e.target.setPointerCapture(e.pointerId);
    } else {
      stateRef.current.panning = true;
    }
  };

  const handlePointerMove = (e) => {
    stateRef.current.hoverRaw = { x: e.clientX, y: e.clientY };
    const pos = getMousePos(e);
    
    if (stateRef.current.dragging) {
      // Dragging node
      stateRef.current.dragging.x = pos.x;
      stateRef.current.dragging.y = pos.y;
      stateRef.current.dragging.vx = 0;
      stateRef.current.dragging.vy = 0;
    } else if (stateRef.current.panning) {
      // Panning camera
      const dx = e.clientX - stateRef.current.mouse.rawX;
      const dy = e.clientY - stateRef.current.mouse.rawY;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      stateRef.current.mouse = { rawX: e.clientX, rawY: e.clientY };
    } else if (physicsRef.current) {
      // Hover detection
      const { scale } = transformRef.current;
      let hoveredNode = null;
      for (const n of physicsRef.current.nodes) {
        const r = n.radius / (scale > 1 ? Math.sqrt(scale) : 1);
        const dx = n.x - pos.x;
        const dy = n.y - pos.y;
        if (dx*dx + dy*dy <= r*r) {
          hoveredNode = n;
          break;
        }
      }
      
      const prevHovered = stateRef.current.hovered;
      if (prevHovered !== hoveredNode) {
        stateRef.current.hovered = hoveredNode;
        canvasRef.current.style.cursor = hoveredNode ? 'pointer' : 'default';
      }
    }
  };

  const handlePointerUp = (e) => {
    stateRef.current.dragging = null;
    stateRef.current.panning = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const zoomIntensity = 0.1;
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    let { x: tx, y: ty, scale } = transformRef.current;
    
    const newScale = Math.max(0.1, Math.min(5, scale * (1 + delta)));
    
    // Zoom around mouse pointer
    tx = mx - (cx => cx * (newScale / scale))(mx - tx);
    ty = my - (cy => cy * (newScale / scale))(my - ty);
    
    transformRef.current = { x: tx, y: ty, scale: newScale };
  };

  const centerGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    transformRef.current = { x: 0, y: 0, scale: 1 };
  };
  
  const zoomIn = () => {
    let { scale } = transformRef.current;
    transformRef.current.scale = Math.min(5, scale * 1.5);
  };

  const zoomOut = () => {
    let { scale } = transformRef.current;
    transformRef.current.scale = Math.max(0.1, scale / 1.5);
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center text-white/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mb-4 border-t-transparent" />
        <p>{t('connectors.manage.loading-graph', "Loading Knowledge Graph...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="bg-theme-bg-primary/50 p-6 rounded-xl border border-white/10 max-w-md">
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] bg-[#0c111d] rounded-bl-xl rounded-br-xl overflow-hidden border border-theme-modal-border border-t-0">
      {/* Stats overlay */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-xs text-white/80 pointer-events-none z-10 flex flex-col gap-1 shadow-lg">
        <div className="font-semibold text-white mb-1">Knowledge Graph</div>
        <div className="flex justify-between gap-6">
          <span>Entities (Nodes)</span>
          <span className="text-sky-400 font-mono">{graphData.nodes.length}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Relationships</span>
          <span className="text-green-400 font-mono">{graphData.edges.length}</span>
        </div>
      </div>
      
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button onClick={() => window.dispatchEvent(new CustomEvent('close-graph-viewer'))} className="bg-red-500/80 hover:bg-red-500 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white transition-colors mb-2" title="Close Graph">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className={`backdrop-blur-sm border border-white/10 p-2 rounded-lg transition-colors mb-2 ${showSettings ? 'bg-theme-bg-secondary text-white' : 'bg-black/60 hover:bg-black/80 text-white/80 hover:text-white'}`} title="Physics Settings">
          <SlidersHorizontal size={20} />
        </button>
        <button onClick={zoomIn} className="bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white/80 hover:text-white transition-colors" title="Zoom In">
          <MagnifyingGlassPlus size={20} />
        </button>
        <button onClick={zoomOut} className="bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white/80 hover:text-white transition-colors" title="Zoom Out">
          <MagnifyingGlassMinus size={20} />
        </button>
        <button onClick={centerGraph} className="bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white/80 hover:text-white transition-colors" title="Center View">
          <ArrowsOutSimple size={20} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-16 w-64 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 text-sm text-white/90 z-20 shadow-2xl">
          <h4 className="font-semibold mb-4 text-white">Physics Settings</h4>
          
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-white/70">Node Repulsion</label>
              <span className="text-xs font-mono">{physicsParams.charge}</span>
            </div>
            <input 
              type="range" min="100" max="10000" step="100" 
              value={physicsParams.charge} 
              onChange={(e) => updateParam('charge', e.target.value)}
              className="w-full accent-sky-400"
            />
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-white/70">Center Gravity</label>
              <span className="text-xs font-mono">{physicsParams.gravity}</span>
            </div>
            <input 
              type="range" min="0.01" max="1.0" step="0.01" 
              value={physicsParams.gravity} 
              onChange={(e) => updateParam('gravity', e.target.value)}
              className="w-full accent-sky-400"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-white/70">Spring Edge Link</label>
              <span className="text-xs font-mono">{physicsParams.spring}</span>
            </div>
            <input 
              type="range" min="0.01" max="2.0" step="0.01" 
              value={physicsParams.spring} 
              onChange={(e) => updateParam('spring', e.target.value)}
              className="w-full accent-sky-400"
            />
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />
      
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-50 text-xs text-white">
        Scroll to zoom • Drag background to pan • Drag nodes to move
      </div>
    </div>
  );
}
