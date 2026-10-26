import { useEffect, useRef, useState } from 'react';
import type {
  Data,
  Layout,
  PlotlyHTMLElement,
  PlotMouseEvent,
  PlotSelectionEvent,
} from 'plotly.js';
type Props = {
  data: Data[];
  layout?: Partial<Layout>;
  label: string;
  height?: number;
  fill?: boolean;
  onPoint?: (ref: string) => void;
  onSelect?: (refs: string[]) => void;
};
export function Chart({
  data,
  layout,
  label,
  height = 260,
  fill = false,
  onPoint,
  onSelect,
}: Props) {
  const node = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const renderQueue = useRef<Promise<void>>(Promise.resolve());
  const lifetime = useRef(0);
  const point = useRef(onPoint),
    select = useRef(onSelect);
  point.current = onPoint;
  select.current = onSelect;
  useEffect(() => {
    ++lifetime.current;
    const div = node.current!;
    return () => {
      const disposed = ++lifetime.current;
      // Dispose only after in-flight rendering; StrictMode remount invalidates disposal.
      renderQueue.current = renderQueue.current.then(async () => {
        if (lifetime.current !== disposed) return;
        const { default: P } = await import('../charts/plotly');
        if (lifetime.current === disposed) P.purge(div);
      });
    };
  }, []);
  useEffect(() => {
    let stopped = false;
    let cleanup = () => {};
    const div = node.current!;
    // Serialize Plotly writes on this DOM node; a stale promise never owns cleanup.
    renderQueue.current = renderQueue.current
      .then(async () => {
        const { default: P } = await import('../charts/plotly');
        if (stopped) return;
        const g = (await P.react(
          div,
          data,
          {
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { family: 'system-ui', size: 11, color: '#b8c5d2' },
            margin: { l: 48, r: 12, t: 12, b: 42 },
            height: fill ? undefined : height,
            autosize: true,
            showlegend: true,
            legend: { orientation: 'h', y: -0.25 },
            xaxis: { gridcolor: '#25313e', zerolinecolor: '#25313e' },
            yaxis: { gridcolor: '#25313e', zerolinecolor: '#25313e' },
            ...layout,
          },
          {
            responsive: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['toImage', 'sendChartToCloud', 'lasso2d'],
          },
        )) as PlotlyHTMLElement;
        if (stopped) return;
        const click = (e: PlotMouseEvent) => {
          const ref = e.points[0]?.customdata;
          if (typeof ref === 'string') point.current?.(ref);
        };
        const selected = (e: PlotSelectionEvent) => {
          const refs =
            e?.points?.map((p) => p.customdata).filter((r): r is string => typeof r === 'string') ??
            [];
          select.current?.([...new Set(refs)]);
        };
        g.on('plotly_click', click);
        g.on('plotly_selected', selected);
        const observer = new ResizeObserver(() => P.Plots.resize(div));
        observer.observe(div);
        cleanup = () => {
          observer.disconnect();
          g.removeAllListeners('plotly_click');
          g.removeAllListeners('plotly_selected');
        };
      })
      .catch((e) => {
        if (!stopped) setError('Chart unavailable: ' + String(e));
      });
    return () => {
      stopped = true;
      cleanup();
    };
  }, [data, layout, height, fill]);
  return (
    <div
      className={'chart' + (fill ? ' chart-fill' : '')}
      role="group"
      aria-label={label}
      style={{ minHeight: height }}
    >
      {error ? (
        <p role="alert">{error}; use the source table.</p>
      ) : (
        // Plotly's responsive resize may replace its pixel height with 100%.
        // Give non-fill plots a definite containing height so that cannot collapse to zero.
        <div ref={node} style={fill ? undefined : { height }} />
      )}
    </div>
  );
}
