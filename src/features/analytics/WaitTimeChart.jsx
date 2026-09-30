import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export function WaitTimeChart({ data = [], width = 280, height = 140 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 12, right: 12, bottom: 24, left: 36 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (data.length < 2) {
      // Empty state placeholder
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#A8A29E')
        .attr('font-size', '11px')
        .text('Simulating to plot wait-time trend...');
      return;
    }

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Simulation Time (seconds)
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.time))
      .range([0, innerWidth]);

    // Y Scale: Average Wait Time (minutes)
    const maxWait = d3.max(data, (d) => d.avgWaitMinutes) || 5;
    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(5, maxWait * 1.15)])
      .range([innerHeight, 0]);

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(3)
          .tickSize(-innerWidth)
          .tickFormat('')
      )
      .selectAll('line')
      .attr('stroke', '#F5F5F4')
      .attr('stroke-dasharray', '2,2');

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(4)
      .tickFormat((d) => {
        const m = Math.floor(d / 60);
        const s = Math.floor(d % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      });

    const yAxis = d3.axisLeft(yScale).ticks(3).tickFormat((d) => `${d}m`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#78716C')
      .attr('font-size', '9px');

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#78716C')
      .attr('font-size', '9px');

    // Area Gradient
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'wait-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#D97706').attr('stop-opacity', 0.25);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#D97706').attr('stop-opacity', 0.0);

    // Area generator
    const area = d3
      .area()
      .curve(d3.curveMonotoneX)
      .x((d) => xScale(d.time))
      .y0(innerHeight)
      .y1((d) => yScale(d.avgWaitMinutes));

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#wait-gradient)')
      .attr('d', area);

    // Line generator
    const line = d3
      .line()
      .curve(d3.curveMonotoneX)
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.avgWaitMinutes));

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#B45309')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Latest point indicator
    const latest = data[data.length - 1];
    if (latest) {
      g.append('circle')
        .attr('cx', xScale(latest.time))
        .attr('cy', yScale(latest.avgWaitMinutes))
        .attr('r', 3.5)
        .attr('fill', '#D97706')
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 1.5);
    }
  }, [data, width, height]);

  return (
    <div className="w-full overflow-hidden flex flex-col items-center">
      <svg ref={svgRef} width={width} height={height} className="overflow-visible" />
    </div>
  );
}
