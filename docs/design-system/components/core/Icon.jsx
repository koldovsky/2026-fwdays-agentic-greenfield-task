import React from 'react';

/**
 * Icon — thin wrapper over Lucide. Renders a single line icon at the
 * brand's calm 1.75 stroke. Requires the Lucide UMD script to be loaded
 * globally (window.lucide); the design-system cards and UI kits load it
 * from CDN. Colour follows `currentColor`.
 */
export function Icon({ name, size = 20, stroke = 1.75, className = '', style = {}, label }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const host = ref.current;
    if (!host || !window.lucide) return;
    host.innerHTML = '';
    const el = document.createElement('i');
    el.setAttribute('data-lucide', name);
    host.appendChild(el);
    try {
      window.lucide.createIcons({
        nameAttr: 'data-lucide',
        attrs: { width: size, height: size, 'stroke-width': stroke },
      });
    } catch (e) { /* lucide not ready */ }
  }, [name, size, stroke]);

  return (
    <span
      ref={ref}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flex: 'none',
        color: 'currentColor',
        ...style,
      }}
    />
  );
}
