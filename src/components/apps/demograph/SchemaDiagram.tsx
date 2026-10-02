import React, {useEffect, useId, useMemo, useRef} from 'react';
import * as d3 from 'd3';
import type {DemoGraphSchema, DemoNode, DemoRelationship} from '../../../demographTypes';

interface GraphNode extends d3.SimulationNodeDatum {id: string; label: string; count: number}
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {relationship: DemoRelationship}

export function SchemaDiagram({schema, onNode, onRelationship}: {
  schema: DemoGraphSchema; onNode: (node: DemoNode) => void;
  onRelationship: (relationship: DemoRelationship) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const arrow = useId().replace(/:/g, '');
  const layout = useMemo(() => {
    const nodes: GraphNode[] = schema.nodes.map(n => ({id: n.label, label: n.label, count: n.count}));
    const links: GraphLink[] = schema.relationships.map(r => ({source: r.source, target: r.target, relationship: r}));
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(n => n.id).distance(210))
      .force('charge', d3.forceManyBody().strength(-700))
      .force('center', d3.forceCenter(450, 250))
      .force('collision', d3.forceCollide(85)).stop();
    for (let tick = 0; tick < 180; tick++) simulation.tick();
    return {nodes, links};
  }, [schema.nodes, schema.relationships]);
  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]).on('zoom', event => {
      svg.select('g.graph-content').attr('transform', event.transform.toString());
    });
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity);
    return () => {svg.on('.zoom', null);};
  }, [layout]);
  const extentX = d3.extent<GraphNode, number>(layout.nodes, n => n.x ?? 0);
  const extentY = d3.extent<GraphNode, number>(layout.nodes, n => n.y ?? 0);
  const minX = (extentX[0] ?? 0) - 120;
  const minY = (extentY[0] ?? 0) - 90;
  return <svg ref={ref} className="w-full h-[430px] rounded-xl bg-zinc-950 border border-zinc-800 touch-none"
    viewBox={`${minX} ${minY} ${Math.max(600, (extentX[1] ?? 500) - minX + 120)} ${Math.max(400, (extentY[1] ?? 350) - minY + 90)}`}
    aria-label="DemoGraph schema">
    <defs><marker id={arrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8" fill="#71717a" />
    </marker></defs>
    <g className="graph-content">
      {layout.links.map((link, i) => {
        const source = link.source as GraphNode;
        const target = link.target as GraphNode;
        const sx = source.x ?? 0, sy = source.y ?? 0, tx = target.x ?? 0, ty = target.y ?? 0;
        const distance = Math.hypot(tx - sx, ty - sy) || 1;
        const endX = tx - (tx - sx) / distance * 55, endY = ty - (ty - sy) / distance * 35;
        return <g key={i} className="cursor-pointer" role="button" tabIndex={0}
          aria-label={link.relationship.type} onClick={() => onRelationship(link.relationship)}
          onKeyDown={event => {if (event.key === 'Enter') onRelationship(link.relationship);}}>
          <line x1={sx} y1={sy} x2={endX} y2={endY} stroke="#52525b" strokeWidth="2" markerEnd={`url(#${arrow})`} />
          <text x={(sx + tx) / 2} y={(sy + ty) / 2 - 9 - (i % 3) * 12} textAnchor="middle"
            fill="#a1a1aa" fontSize="10" paintOrder="stroke" stroke="#09090b" strokeWidth="3">
            {link.relationship.type}
          </text>
        </g>;
      })}
      {layout.nodes.map(node => <g key={node.id} transform={`translate(${node.x},${node.y})`}
        className="cursor-pointer" role="button" tabIndex={0} aria-label={`${node.label}: ${node.count}`}
        onClick={() => onNode(schema.nodes.find(n => n.label === node.id)!)}
        onKeyDown={event => {if (event.key === 'Enter') onNode(schema.nodes.find(n => n.label === node.id)!);}}>
        <rect x="-69" y="-28" width="138" height="56" rx="16" fill="#172554" stroke="#6366f1" />
        <text textAnchor="middle" y="-2" fill="#e0e7ff" fontSize="12">{node.label}</text>
        <text textAnchor="middle" y="15" fill="#a5b4fc" fontSize="11">{node.count.toLocaleString()}</text>
      </g>)}
    </g>
  </svg>;
}
