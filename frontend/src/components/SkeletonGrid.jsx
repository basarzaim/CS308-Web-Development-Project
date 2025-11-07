const SKELETON_COUNT = 12;

export default function SkeletonGrid() {
  return (
    <section className="grid">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <article key={i} className="card">
          <div className="thumb skeleton" />
          <div className="content">
            <div className="skeleton line title" />
            <div className="skeleton line small" />
            <div className="skeleton line price" />
            <div className="skeleton line small" />
          </div>
        </article>
      ))}
    </section>
  );
}
