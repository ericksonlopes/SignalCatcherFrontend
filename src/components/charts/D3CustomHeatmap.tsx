import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface D3CustomHeatmapProps {
  data?: { day: string; hour: number; value: number }[];
}

export const D3CustomHeatmap: React.FC<D3CustomHeatmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Default sample matrix if not provided
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const hours = Array.from({ length: 12 }, (_, i) => i * 2); // 0, 2, 4, ... 22

    const sampleData: { day: string; hour: number; value: number }[] = [];
    days.forEach((day) => {
      hours.forEach((hour) => {
        sampleData.push({
          day,
          hour,
          value: Math.floor(Math.random() * 90) + 10
        });
      });
    });

    const matrixData = data && data.length > 0 ? data : sampleData;

    // Clear previous renders
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 500 - margin.left - margin.right;
    const height = 220 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand().range([0, width]).domain(hours.map(String)).padding(0.08);
    const y = d3.scaleBand().range([height, 0]).domain(days).padding(0.08);

    const colorScale = d3
      .scaleSequential()
      .interpolator(d3.interpolateCyan)
      .domain([0, 100]);

    // X axis
    svg
      .append('g')
      .style('font-size', '9px')
      .style('font-family', 'monospace')
      .style('color', '#64748b')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickFormat((d) => `${d}h`))
      .select('.domain')
      .remove();

    // Y axis
    svg
      .append('g')
      .style('font-size', '9px')
      .style('font-family', 'monospace')
      .style('color', '#64748b')
      .call(d3.axisLeft(y))
      .select('.domain')
      .remove();

    // Squares
    svg
      .selectAll()
      .data(matrixData, (d: any) => `${d.day}:${d.hour}`)
      .enter()
      .append('rect')
      .attr('x', (d) => x(String(d.hour)) || 0)
      .attr('y', (d) => y(d.day) || 0)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .style('fill', (d) => colorScale(d.value))
      .style('stroke', '#020617')
      .style('stroke-width', '2px')
      .style('opacity', 0.85)
      .on('mouseover', function () {
        d3.select(this).style('stroke', '#00f3ff').style('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).style('stroke', '#020617').style('opacity', 0.85);
      });
  }, [data]);

  return (
    <div className="w-full overflow-x-auto flex justify-center">
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
};
