/* @ds-bundle: {"format":4,"namespace":"OrbitTVRemoteDesignSystem_08e5b7","components":[{"name":"AppShortcut","sourcePath":"components/controls/AppShortcut.jsx"},{"name":"DPad","sourcePath":"components/controls/DPad.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"DeviceCard","sourcePath":"components/core/DeviceCard.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Slider","sourcePath":"components/forms/Slider.jsx"},{"name":"Toggle","sourcePath":"components/forms/Toggle.jsx"}],"sourceHashes":{"components/controls/AppShortcut.jsx":"235bec6dffb5","components/controls/DPad.jsx":"03a60c104847","components/core/Badge.jsx":"0263933242d9","components/core/Button.jsx":"c4e70d237b05","components/core/Card.jsx":"62d21bcb9469","components/core/DeviceCard.jsx":"5da15b6adfa4","components/core/IconButton.jsx":"8419e65129d3","components/feedback/Modal.jsx":"e915fd4d0c7b","components/forms/Input.jsx":"951867c97f32","components/forms/Slider.jsx":"2f3ee2cf808d","components/forms/Toggle.jsx":"352535cd7a33","ui_kits/tv-remote/DeviceListScreen.jsx":"d0f4c45eceee","ui_kits/tv-remote/RemoteScreen.jsx":"e737faefc6fa"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OrbitTVRemoteDesignSystem_08e5b7 = window.OrbitTVRemoteDesignSystem_08e5b7 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/controls/AppShortcut.jsx
try { (() => {
/**
 * AppShortcut — a square icon tile for the smart-TV app shortcuts row
 * (Netflix, YouTube, etc. — represented generically here since no brand
 * app icons were supplied). Raised tile, subtle press-to-inset feedback.
 */
function AppShortcut({
  icon,
  label,
  onClick,
  color
}) {
  const [pressed, setPressed] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
    onMouseLeave: () => setPressed(false),
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      width: 72
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 'var(--radius-lg)',
      background: 'var(--base-100)',
      boxShadow: pressed ? 'var(--nm-inset-sm)' : 'var(--nm-raised-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'box-shadow 0.12s ease'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: 26,
      color: color || 'var(--fg-2)'
    }
  }, icon)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--fg-2)',
      fontWeight: 'var(--weight-medium)'
    }
  }, label));
}
Object.assign(__ds_scope, { AppShortcut });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/AppShortcut.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const map = {
  online: {
    color: 'var(--online)',
    wash: 'var(--online-wash)',
    label: 'Online',
    dot: true
  },
  offline: {
    color: 'var(--fg-3)',
    wash: 'transparent',
    label: 'Offline',
    dot: true
  },
  connecting: {
    color: 'var(--connecting)',
    wash: 'transparent',
    label: 'Connecting…',
    dot: true
  }
};

/**
 * Badge — small status pill, primarily used to show a TV's connection
 * state in the device list. Dot + label, no border, tinted wash background.
 */
function Badge({
  status = 'online',
  children,
  style
}) {
  const cfg = map[status] || map.online;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px 4px 8px',
      borderRadius: 'var(--radius-full)',
      background: cfg.wash,
      color: cfg.color,
      fontSize: 'var(--text-caption)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: cfg.color,
      flexShrink: 0
    }
  }), children || cfg.label);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  md: {
    padding: '12px 22px',
    fontSize: 'var(--text-body)',
    gap: 8
  },
  lg: {
    padding: '15px 28px',
    fontSize: 'var(--text-body-lg)',
    gap: 10
  },
  sm: {
    padding: '9px 16px',
    fontSize: 'var(--text-body-sm)',
    gap: 6
  }
};
function variantStyle(variant, pressed) {
  switch (variant) {
    case 'primary':
      return {
        background: pressed ? 'linear-gradient(145deg, var(--accent-strong), var(--accent))' : 'linear-gradient(145deg, var(--accent), var(--accent-strong))',
        color: 'var(--fg-on-accent)',
        boxShadow: pressed ? 'var(--nm-inset-sm)' : 'var(--nm-raised-accent)',
        border: 'none'
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--fg-2)',
        boxShadow: 'none',
        border: '1px solid var(--hairline)'
      };
    case 'secondary':
    default:
      return {
        background: 'var(--base-100)',
        color: 'var(--fg-1)',
        boxShadow: pressed ? 'var(--nm-inset-sm)' : 'var(--nm-raised-sm)',
        border: 'none'
      };
  }
}

/**
 * Button — the primary tappable action. Neumorphic raised surface that
 * inverts to an inset shadow on press. Primary variant carries the warm
 * accent gradient for the single most important action on a screen
 * (e.g. "Add TV", "Confirm"); secondary is the flat neumorphic default;
 * ghost is a bordered, shadowless option for low-emphasis actions.
 */
function Button({
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  icon = null,
  onClick,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const sizeStyle = sizes[size] || sizes.md;
  const vStyle = variantStyle(variant, pressed);
  return /*#__PURE__*/React.createElement("button", _extends({
    onMouseDown: () => !disabled && setPressed(true),
    onMouseUp: () => setPressed(false),
    onMouseLeave: () => setPressed(false),
    onClick: disabled ? undefined : onClick,
    disabled: disabled,
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: sizeStyle.fontSize,
      padding: sizeStyle.padding,
      borderRadius: 'var(--radius-md)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sizeStyle.gap,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'box-shadow 0.12s ease, transform 0.08s ease',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
      outline: 'none',
      ...vStyle,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: '1.15em'
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
/**
 * Card — the base neumorphic surface. `raised` (default) extrudes from
 * the background; `inset` recedes into it (used for wells like search
 * fields or the now-playing strip). This is the primitive every other
 * container in the kit is built from.
 */
function Card({
  children,
  variant = 'raised',
  padding = 'var(--space-6)',
  radius = 'var(--radius-lg)',
  style,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: 'var(--base-100)',
      borderRadius: radius,
      padding,
      boxShadow: variant === 'inset' ? 'var(--nm-inset-md)' : 'var(--nm-raised-md)',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/DeviceCard.jsx
try { (() => {
/**
 * DeviceCard — one row in the TV list: a neumorphic raised tile icon,
 * name + model/IP metadata, and a status Badge. The whole row is a Card
 * with a hover lift, tappable to open the remote for that TV.
 */
function DeviceCard({
  name,
  model,
  ip,
  status = 'online',
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-5)',
      cursor: 'pointer',
      transform: hover ? 'translateY(-2px)' : 'none',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      boxShadow: hover ? 'var(--nm-raised-lg)' : 'var(--nm-raised-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'contents'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 52,
      height: 52,
      borderRadius: 'var(--radius-md)',
      background: 'var(--base-100)',
      boxShadow: 'var(--nm-inset-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: 26,
      color: status === 'online' ? 'var(--accent)' : 'var(--fg-3)'
    }
  }, "tv")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-lg)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--fg-1)'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--fg-2)',
      marginTop: 2
    }
  }, model, " \xB7 ", ip)), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    status: status
  }), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: 20,
      color: 'var(--fg-3)'
    }
  }, "chevron_right")));
}
Object.assign(__ds_scope, { DeviceCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/DeviceCard.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const sizeMap = {
  sm: 40,
  md: 52,
  lg: 68
};

/**
 * IconButton — circular neumorphic button for glyph-only actions:
 * D-pad arrows, power, volume, mute, home. Raised by default, inverts
 * to inset on press. `tone="accent"` for the power button / primary glyph.
 */
function IconButton({
  icon,
  size = 'md',
  tone = 'default',
  active = false,
  disabled = false,
  onClick,
  'aria-label': ariaLabel,
  style
}) {
  const [pressed, setPressed] = React.useState(false);
  const px = sizeMap[size] || sizeMap.md;
  const isInset = pressed || active;
  const accent = tone === 'accent';
  const danger = tone === 'danger';
  const bg = accent ? 'linear-gradient(145deg, var(--accent), var(--accent-strong))' : danger ? 'linear-gradient(145deg, var(--offline), #a8443d)' : 'var(--base-100)';
  const color = accent || danger ? 'var(--fg-on-accent)' : 'var(--fg-1)';
  const shadow = accent ? isInset ? 'var(--nm-inset-md)' : 'var(--nm-raised-accent)' : isInset ? 'var(--nm-inset-md)' : 'var(--nm-raised-md)';
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": ariaLabel || icon,
    disabled: disabled,
    onMouseDown: () => !disabled && setPressed(true),
    onMouseUp: () => setPressed(false),
    onMouseLeave: () => setPressed(false),
    onClick: disabled ? undefined : onClick,
    style: {
      width: px,
      height: px,
      borderRadius: 'var(--radius-full)',
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: bg,
      color,
      boxShadow: shadow,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'box-shadow 0.12s ease, transform 0.08s ease',
      transform: isInset ? 'scale(0.96)' : 'scale(1)',
      flexShrink: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: px * 0.42
    }
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/controls/DPad.jsx
try { (() => {
/**
 * DPad — the signature remote-control primitive: a circular neumorphic
 * housing with four directional arrows around a central OK button.
 * The housing itself is a large inset ring so the raised arrow buttons
 * read as resting inside a carved dish.
 */
function DPad({
  onDirection,
  onSelect,
  size = 220
}) {
  const cell = size / 3;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'var(--base-100)',
      boxShadow: 'var(--nm-inset-md)',
      display: 'grid',
      gridTemplateColumns: `repeat(3, ${cell}px)`,
      gridTemplateRows: `repeat(3, ${cell}px)`,
      placeItems: 'center',
      padding: 10,
      boxSizing: 'content-box'
    }
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "keyboard_arrow_up",
    size: "md",
    onClick: () => onDirection && onDirection('up'),
    "aria-label": "Up"
  }), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "keyboard_arrow_left",
    size: "md",
    onClick: () => onDirection && onDirection('left'),
    "aria-label": "Left"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "fiber_manual_record",
    size: "md",
    tone: "accent",
    onClick: onSelect,
    "aria-label": "Select",
    style: {
      fontSize: 10
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "keyboard_arrow_right",
    size: "md",
    onClick: () => onDirection && onDirection('right'),
    "aria-label": "Right"
  }), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "keyboard_arrow_down",
    size: "md",
    onClick: () => onDirection && onDirection('down'),
    "aria-label": "Down"
  }), /*#__PURE__*/React.createElement("div", null));
}
Object.assign(__ds_scope, { DPad });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/DPad.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
/**
 * Modal — centered neumorphic dialog on a translucent scrim. Used for
 * the "Add TV by IP" flow. Contains its own raised close button.
 */
function Modal({
  open,
  onClose,
  title,
  children,
  footer
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(30, 34, 40, 0.35)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--base-100)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--nm-raised-lg)',
      padding: 'var(--space-8)',
      width: 380,
      maxWidth: '90vw',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h2)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--fg-1)'
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "close",
    size: "sm",
    onClick: onClose,
    "aria-label": "Close"
  })), children, footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 12
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
/**
 * Input — neumorphic inset text field. Used for entering a TV's IP
 * address when pairing manually. Optional leading icon and helper/error text.
 */
function Input({
  value,
  onChange,
  placeholder,
  icon,
  error,
  label,
  type = 'text',
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-overline)',
      textTransform: 'uppercase',
      color: 'var(--fg-3)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '13px 18px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--base-100)',
      boxShadow: error ? '0 0 0 2px var(--offline)' : 'var(--nm-inset-md)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: 20,
      color: 'var(--fg-3)'
    }
  }, icon), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    placeholder: placeholder,
    style: {
      border: 'none',
      outline: 'none',
      background: 'transparent',
      font: 'inherit',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-body)',
      color: 'var(--fg-1)',
      width: '100%'
    }
  })), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--offline)'
    }
  }, error));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Slider.jsx
try { (() => {
/**
 * Slider — neumorphic groove slider for volume/brightness. Inset track,
 * raised circular thumb, accent-filled progress within the groove.
 */
function Slider({
  value = 50,
  min = 0,
  max = 100,
  onChange,
  icon
}) {
  const pct = (value - min) / (max - min) * 100;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      width: '100%'
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: 22,
      color: 'var(--fg-2)',
      flexShrink: 0
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      height: 14,
      borderRadius: 'var(--radius-full)',
      background: 'var(--base-100)',
      boxShadow: 'var(--nm-inset-sm)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: `${pct}%`,
      borderRadius: 'var(--radius-full)',
      background: 'linear-gradient(90deg, var(--accent-soft), var(--accent))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: `calc(${pct}% - 12px)`,
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: 'var(--base-100)',
      boxShadow: 'var(--nm-raised-sm)',
      transform: 'translateY(-50%)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: min,
    max: max,
    value: value,
    onChange: e => onChange && onChange(Number(e.target.value)),
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      opacity: 0,
      cursor: 'pointer',
      margin: 0
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--fg-2)',
      width: 28,
      textAlign: 'right',
      flexShrink: 0
    }
  }, value));
}
Object.assign(__ds_scope, { Slider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Slider.jsx", error: String((e && e.message) || e) }); }

// components/forms/Toggle.jsx
try { (() => {
/**
 * Toggle — neumorphic on/off switch. Track is inset; thumb is a small
 * raised circle that slides and picks up the accent color when on.
 * Used for the light/dark theme switch and other binary settings.
 */
function Toggle({
  checked = false,
  onChange,
  disabled = false,
  label
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 52,
      height: 30,
      borderRadius: 'var(--radius-full)',
      background: 'var(--base-100)',
      boxShadow: 'var(--nm-inset-sm)',
      position: 'relative',
      flexShrink: 0,
      transition: 'background 0.2s ease'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 25 : 3,
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: checked ? 'linear-gradient(145deg, var(--accent), var(--accent-strong))' : 'var(--base-100)',
      boxShadow: 'var(--nm-raised-sm)',
      transition: 'left 0.18s ease, background 0.18s ease'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--fg-2)'
    }
  }, label));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Toggle.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tv-remote/DeviceListScreen.jsx
try { (() => {
// DeviceListScreen — first page of the app: nearby TVs found on the
// local network, plus "Add a TV" by IP address.
const NS = window.OrbitTVRemoteDesignSystem_08e5b7;
const SAMPLE_DEVICES = [{
  id: 1,
  name: 'Living Room',
  model: 'OrbitCast X1',
  ip: '192.168.1.42',
  status: 'online'
}, {
  id: 2,
  name: 'Bedroom',
  model: 'OrbitCast S',
  ip: '192.168.1.58',
  status: 'online'
}, {
  id: 3,
  name: 'Kitchen',
  model: 'OrbitCast X1',
  ip: '192.168.1.61',
  status: 'connecting'
}, {
  id: 4,
  name: 'Guest Room',
  model: 'OrbitCast Mini',
  ip: '192.168.1.77',
  status: 'offline'
}];
function DeviceListScreen({
  dark,
  onToggleDark,
  onOpenRemote
}) {
  const {
    Button,
    DeviceCard,
    Modal,
    Input
  } = NS;
  const [modalOpen, setModalOpen] = React.useState(false);
  const [ip, setIp] = React.useState('');
  const [devices, setDevices] = React.useState(SAMPLE_DEVICES);
  function addDevice() {
    if (!ip.trim()) return;
    setDevices(d => [...d, {
      id: Date.now(),
      name: 'New TV',
      model: 'Unknown model',
      ip,
      status: 'connecting'
    }]);
    setIp('');
    setModalOpen(false);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100%',
      background: 'var(--base-100)',
      padding: '40px 48px',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-overline)',
      textTransform: 'uppercase',
      color: 'var(--fg-3)',
      fontWeight: 700,
      marginBottom: 6
    }
  }, "Local network"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h1)',
      fontWeight: 800,
      color: 'var(--fg-1)'
    }
  }, "Your TVs")), /*#__PURE__*/React.createElement("div", {
    onClick: onToggleDark,
    title: "Toggle theme",
    style: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'var(--base-100)',
      boxShadow: 'var(--nm-raised-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--fg-2)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded"
  }, dark ? 'dark_mode' : 'light_mode'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginBottom: 28
    }
  }, devices.map(d => /*#__PURE__*/React.createElement(DeviceCard, {
    key: d.id,
    name: d.name,
    model: d.model,
    ip: d.ip,
    status: d.status,
    onClick: () => onOpenRemote(d)
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "add",
    onClick: () => setModalOpen(true)
  }, "Add a TV"), /*#__PURE__*/React.createElement(Modal, {
    open: modalOpen,
    onClose: () => setModalOpen(false),
    title: "Add a TV",
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => setModalOpen(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      onClick: addDevice
    }, "Connect"))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-body-sm)',
      color: 'var(--fg-2)',
      lineHeight: 'var(--leading-relaxed)'
    }
  }, "Enter the IP address shown in your TV's network settings."), /*#__PURE__*/React.createElement(Input, {
    label: "IP Address",
    icon: "lan",
    placeholder: "192.168.1.42",
    value: ip,
    onChange: setIp
  }))));
}
window.DeviceListScreen = DeviceListScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tv-remote/DeviceListScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tv-remote/RemoteScreen.jsx
try { (() => {
// RemoteScreen — second page of the app: the actual remote control
// for a paired TV. D-pad, transport/volume, power, and an app shortcuts row.
const NS2 = window.OrbitTVRemoteDesignSystem_08e5b7;
function RemoteScreen({
  device,
  onBack
}) {
  const {
    IconButton,
    DPad,
    Slider,
    Badge,
    AppShortcut
  } = NS2;
  const [volume, setVolume] = React.useState(38);
  const [muted, setMuted] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100%',
      background: 'var(--base-100)',
      padding: '32px 40px',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 420,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow_back",
    size: "sm",
    onClick: onBack,
    "aria-label": "Back"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-lg)',
      fontWeight: 700,
      color: 'var(--fg-1)'
    }
  }, device?.name || 'Living Room'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--fg-2)'
    }
  }, device?.ip || '192.168.1.42')), /*#__PURE__*/React.createElement(Badge, {
    status: device?.status || 'online'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      justifyContent: 'space-between',
      padding: '4px 6px'
    }
  }, /*#__PURE__*/React.createElement(AppShortcut, {
    icon: "live_tv",
    label: "Live TV"
  }), /*#__PURE__*/React.createElement(AppShortcut, {
    icon: "movie",
    label: "Movies"
  }), /*#__PURE__*/React.createElement(AppShortcut, {
    icon: "sports_esports",
    label: "Games"
  }), /*#__PURE__*/React.createElement(AppShortcut, {
    icon: "apps",
    label: "Apps"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement(DPad, {
    size: 220,
    onDirection: () => {},
    onSelect: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "keyboard_backspace",
    "aria-label": "Back"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "home",
    "aria-label": "Home"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "menu",
    "aria-label": "Menu"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: muted ? 'volume_off' : 'volume_up',
    active: muted,
    size: "sm",
    onClick: () => setMuted(m => !m),
    "aria-label": "Mute"
  }), /*#__PURE__*/React.createElement(Slider, {
    value: volume,
    onChange: setVolume
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "power_settings_new",
    tone: "accent",
    size: "lg",
    "aria-label": "Power"
  }))));
}
window.RemoteScreen = RemoteScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tv-remote/RemoteScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AppShortcut = __ds_scope.AppShortcut;

__ds_ns.DPad = __ds_scope.DPad;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.DeviceCard = __ds_scope.DeviceCard;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Slider = __ds_scope.Slider;

__ds_ns.Toggle = __ds_scope.Toggle;

})();
