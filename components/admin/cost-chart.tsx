// 일별 비용 막대 차트 (단일 시리즈 → 범례 없음). 서버 컴포넌트, 인라인 SVG.
export function CostChart({ data }: { data: { date: string; usd: number }[] }) {
  const W = 720, H = 160, PAD = { l: 44, r: 8, t: 12, b: 24 };
  const max = Math.max(0.01, ...data.map((d) => d.usd));
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const bw = Math.max(2, iw / data.length - 2);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const maxIdx = data.findIndex((d) => d.usd === max);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="최근 30일 일별 LLM 비용(USD)">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={PAD.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.6}>
              ${(max * f).toFixed(2)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.l + (i * iw) / data.length + 1;
          const top = y(d.usd), h = Math.max(0, PAD.t + ih - top);
          return (
            <g key={d.date}>
              <rect x={x} y={top} width={bw} height={h} rx={2} fill="hsl(var(--chart-1))">
                <title>{`${d.date}: $${d.usd.toFixed(4)}`}</title>
              </rect>
              {i === maxIdx && d.usd > 0 && (
                <text x={x + bw / 2} y={top - 3} textAnchor="middle" fontSize={10} fill="currentColor">${d.usd.toFixed(2)}</text>
              )}
              {(i === 0 || i === data.length - 1 || i % 7 === 0) && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.6}>{d.date.slice(5)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="cursor-pointer">표로 보기</summary>
        <table className="mt-1 w-full">
          <tbody>
            {data.filter((d) => d.usd > 0).map((d) => (
              <tr key={d.date}><td>{d.date}</td><td className="text-right">${d.usd.toFixed(4)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
