// React-safe Lucide icon. Builds the SVG string once and hands it to React as
// an opaque leaf (dangerouslySetInnerHTML) — Lucide never mutates React-managed
// DOM, so navigation/unmount stays clean. Exposed as window.Icon.
function Icon({ name, size = 17, color, style }) {
  const toPascal = (n) => n.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  const html = React.useMemo(() => {
    try {
      const node = window.lucide[toPascal(name)];
      if (!node) return '';
      const el = window.lucide.createElement(node);
      el.setAttribute('width', size);
      el.setAttribute('height', size);
      el.style.display = 'block';
      return el.outerHTML;
    } catch (e) { return ''; }
  }, [name, size]);
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex', flexShrink: 0, width: size, height: size, color, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
window.Icon = Icon;
