import React, { useEffect, useRef, useState, useCallback } from "react";
import Workspace from "@/models/workspace";
import { useTranslation } from "react-i18next";
import { ArrowsOutSimple } from "@phosphor-icons/react";
import ForceGraph3D from "react-force-graph-3d";

export default function GraphViewer({ workspace }) {
  const { t } = useTranslation();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  
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
          // react-force-graph-3d requires the relationships array to be named 'links'
          setGraphData({ nodes: data.nodes, links: data.edges || [] });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [workspace.slug, t]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height: height || 600 });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [loading, error]);

  const centerGraph = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  }, []);

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center text-theme-text-primary relative bg-theme-bg-primary rounded-b-xl border border-theme-modal-border border-t-0">
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button onClick={() => window.dispatchEvent(new CustomEvent('close-graph-viewer'))} className="bg-red-500/80 hover:bg-red-500 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white transition-colors mb-2" title="Close Graph">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
          </button>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text-secondary mb-4 border-t-transparent" />
        <p className="text-theme-text-secondary">{t('connectors.manage.loading-graph', "Loading Knowledge Graph...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center p-8 text-center text-theme-text-primary relative bg-[#0c111d] rounded-b-xl border border-theme-modal-border border-t-0">
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button onClick={() => window.dispatchEvent(new CustomEvent('close-graph-viewer'))} className="bg-red-500/80 hover:bg-red-500 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white transition-colors mb-2" title="Close Graph">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
          </button>
        </div>
        <div className="bg-black/40 p-6 rounded-xl border border-white/10 max-w-md">
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-[600px] bg-[#0c111d] rounded-bl-xl rounded-br-xl overflow-hidden border border-theme-modal-border border-t-0">
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-xs text-white/80 pointer-events-none z-10 flex flex-col gap-1 shadow-lg">
        <div className="font-semibold text-white mb-1">Knowledge Graph (3D)</div>
        <div className="flex justify-between gap-6">
          <span>Entities (Nodes)</span>
          <span className="text-sky-400 font-mono">{graphData.nodes.length}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Relationships</span>
          <span className="text-green-400 font-mono">{graphData.links?.length || 0}</span>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button onClick={() => window.dispatchEvent(new CustomEvent('close-graph-viewer'))} className="bg-red-500/80 hover:bg-red-500 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white transition-colors mb-2" title="Close Graph">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
        </button>
        <button onClick={centerGraph} className="bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-white/80 hover:text-white transition-colors" title="Center View">
          <ArrowsOutSimple size={20} />
        </button>
      </div>

      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#0c111d"
        nodeLabel="label"
        nodeAutoColorBy="label"
        nodeRelSize={6}
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.005}
        linkColor={() => "rgba(255, 255, 255, 0.2)"}
      />
      
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-50 text-xs text-white">
        Scroll to zoom • Drag background to rotate • Drag nodes to move
      </div>
    </div>
  );
}
