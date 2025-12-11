export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const clamp = (p) => Math.max(1, Math.min(totalPages, p));
  const go = (p) => () => onChange(clamp(p));

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="pagination">
      <button onClick={go(page - 1)} disabled={page <= 1}>‹ Previous</button>
      {pages.map(n => (
        <button key={n} className={n === page ? 'active' : ''} onClick={go(n)}>{n}</button>
      ))}
      <button onClick={go(page + 1)} disabled={page >= totalPages}>Next ›</button>
    </nav>
  );
}
