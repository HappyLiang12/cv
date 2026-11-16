const base = import.meta.env.BASE_URL;

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-inner">
        <span>© 2026 Happy Liang Yee Ching · Hong Kong</span>
        <span>Static site · no trackers</span>
        <nav className="foot-links" aria-label="CV formats">
          <a href={`${base}cv/`}>CV</a>
          <a href={`${base}cv.txt`}>cv.txt</a>
          <a href={`${base}llms.txt`}>llms.txt</a>
        </nav>
      </div>
    </footer>
  );
}
