/* @ds-bundle: {"format":3,"namespace":"HoneydoDesignSystem_cfe9be","components":[{"name":"InsightCard","sourcePath":"components/app/InsightCard.jsx"},{"name":"StreakHive","sourcePath":"components/app/StreakHive.jsx"},{"name":"TabBar","sourcePath":"components/app/TabBar.jsx"},{"name":"TimerEntry","sourcePath":"components/app/TimerEntry.jsx"},{"name":"WeekChart","sourcePath":"components/app/WeekChart.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"FilterChip","sourcePath":"components/core/FilterChip.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/core/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"TAG_COLORS","sourcePath":"components/core/Tag.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"}],"sourceHashes":{"components/app/InsightCard.jsx":"780547958c83","components/app/StreakHive.jsx":"9adc5fe2a636","components/app/TabBar.jsx":"6dab5c9487d8","components/app/TimerEntry.jsx":"33364943962f","components/app/WeekChart.jsx":"dfcf7183359f","components/core/Avatar.jsx":"749e6c9937ee","components/core/Badge.jsx":"377d45959cbc","components/core/Button.jsx":"5ab11fc339c9","components/core/Card.jsx":"f1bc36377f16","components/core/FilterChip.jsx":"42b902d5974c","components/core/IconButton.jsx":"d52ed7a8fbb7","components/core/Input.jsx":"3c2ed1479762","components/core/SegmentedControl.jsx":"d07fbae52e70","components/core/Switch.jsx":"2f16d66cc0ae","components/core/Tag.jsx":"8d70f958d7c2","ui_kits/honeydo/App.jsx":"9a2243097a0b","ui_kits/honeydo/AuthScreen.jsx":"9f2bc4551679","ui_kits/honeydo/EmptyScreen.jsx":"b610e638a117","ui_kits/honeydo/HistoryScreen.jsx":"04b399c407d8","ui_kits/honeydo/ProfileScreen.jsx":"a233c957ab39","ui_kits/honeydo/StatsScreen.jsx":"ca73aaa8757d","ui_kits/honeydo/TimerScreen.jsx":"9e2214868c2d","ui_kits/honeydo/kit-shared.jsx":"7643987f846e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.HoneydoDesignSystem_cfe9be = window.HoneydoDesignSystem_cfe9be || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/app/InsightCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI "daily insight" card — one short, warm sentence about today's pace.
 * Honey-tinted surface with a small jar/spark mark.
 */
function InsightCard({
  children,
  title = "Daily insight",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      overflow: "hidden",
      padding: 16,
      borderRadius: "var(--radius-md)",
      background: "linear-gradient(135deg, var(--accent-faint), color-mix(in srgb, var(--highlight-gold) 14%, var(--surface)))",
      border: "1px solid var(--accent-soft)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 24,
      height: 24,
      borderRadius: "50%",
      background: "var(--accent)",
      color: "var(--on-accent)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2l1.6 4.6L18 8l-4.4 1.4L12 14l-1.6-4.6L6 8l4.4-1.4z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18.5",
    cy: "16.5",
    r: "2"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-rounded)",
      fontSize: "var(--text-subhead)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text)",
      letterSpacing: "var(--tracking-wide)"
    }
  }, title)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-callout)",
      lineHeight: "var(--leading-relaxed)",
      color: "var(--text)"
    }
  }, children));
}
Object.assign(__ds_scope, { InsightCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/app/InsightCard.jsx", error: String((e && e.message) || e) }); }

// components/app/StreakHive.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Streak display as a row of honeycomb cells. Filled cells are amber;
 * the most recent filled cell can carry a small bee. Empty cells are
 * dashed outlines.
 */
function StreakHive({
  filled = 0,
  total = 7,
  current,
  label,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, Array.from({
    length: total
  }).map((_, i) => {
    const isFilled = i < filled;
    const isCurrent = i === filled - 1;
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        position: "relative",
        width: 34,
        height: 38,
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        inset: 0,
        clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
        background: isFilled ? "var(--accent)" : "var(--surface-alt)",
        border: isFilled ? "none" : "1px dashed var(--border)"
      }
    }), isCurrent && current && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16
      }
    }, "\uD83D\uDC1D"));
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-footnote)",
      color: "var(--text-muted)"
    }
  }, label));
}
Object.assign(__ds_scope, { StreakHive });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/app/StreakHive.jsx", error: String((e && e.message) || e) }); }

// components/app/TabBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * iOS bottom tab bar. Active tab reads amber. Pass items with an icon
 * node and label; control with `value` + `onChange`.
 */
function TabBar({
  items = [],
  value,
  onChange,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-around",
      paddingTop: 8,
      height: "var(--tabbar-height)",
      background: "color-mix(in srgb, var(--surface) 88%, transparent)",
      backdropFilter: "saturate(160%) blur(20px)",
      WebkitBackdropFilter: "saturate(160%) blur(20px)",
      borderTop: "1px solid var(--border)",
      ...style
    }
  }, rest), items.map(it => {
    const active = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      onClick: () => onChange && onChange(it.value),
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        flex: 1,
        padding: "4px 0",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: active ? "var(--accent)" : "var(--text-muted)",
        transition: "color var(--dur-fast)",
        WebkitTapHighlightColor: "transparent"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        transition: "transform var(--dur-fast) var(--ease-settle)",
        transform: active ? "scale(1.06)" : "scale(1)"
      }
    }, it.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-text)",
        fontSize: 11,
        fontWeight: active ? "var(--weight-bold)" : "var(--weight-medium)"
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/app/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/app/TimerEntry.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A single time-entry row: description, tag, elapsed duration, and a
 * quick "continue" affordance. When `running`, the row glows amber and
 * shows a live, pulsing dot.
 */
function TimerEntry({
  description,
  tag,
  tagColor = "amber",
  duration,
  running = false,
  onContinue,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      background: running ? "color-mix(in srgb, var(--accent) 8%, var(--surface))" : "var(--surface)",
      border: `1px solid ${running ? "var(--accent-soft)" : "var(--border)"}`,
      borderRadius: "var(--radius-md)",
      boxShadow: running ? "var(--shadow-glow)" : "var(--shadow-1)",
      transition: "background var(--dur-base), box-shadow var(--dur-base)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-callout)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, description), tag && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: tagColor,
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-footnote)",
      color: "var(--text-muted)"
    }
  }, tag))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-numeric)",
      fontVariantNumeric: "tabular-nums",
      fontWeight: "var(--weight-bold)",
      fontSize: 19,
      letterSpacing: "var(--tracking-tight)",
      color: running ? "var(--accent)" : "var(--text)"
    }
  }, duration), /*#__PURE__*/React.createElement("button", {
    onClick: onContinue,
    "aria-label": running ? "Stop timer" : "Continue this entry",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 40,
      height: 40,
      flex: "none",
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      background: running ? "var(--accent)" : "var(--fill-soft)",
      color: running ? "var(--on-accent)" : "var(--accent)",
      transition: "transform var(--dur-fast) var(--ease-settle)",
      WebkitTapHighlightColor: "transparent"
    },
    onMouseDown: e => e.currentTarget.style.transform = "scale(0.9)",
    onMouseUp: e => e.currentTarget.style.transform = "scale(1)",
    onMouseLeave: e => e.currentTarget.style.transform = "scale(1)"
  }, running ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 13,
      height: 13,
      borderRadius: 3,
      background: "currentColor"
    }
  }) : /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "18",
    height: "18",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 5v14l11-7z"
  }))));
}
Object.assign(__ds_scope, { TimerEntry });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/app/TimerEntry.jsx", error: String((e && e.message) || e) }); }

// components/app/WeekChart.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Weekly bar chart — hours per day for the last 7 days. Bars grow from
 * the baseline with a staggered settle; the tallest (or `goal`-meeting)
 * bars read amber. Goal line is a dashed hairline.
 */
function WeekChart({
  data = [],
  goal,
  height = 150,
  style = {},
  ...rest
}) {
  const max = Math.max(goal || 0, ...data.map(d => d.hours), 1);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "flex-end",
      gap: 8,
      height
    }
  }, goal != null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: `${goal / max * 100}%`,
      borderTop: "1px dashed var(--border)",
      pointerEvents: "none"
    }
  }), data.map((d, i) => {
    const pct = Math.max(d.hours / max * 100, 2);
    const met = goal != null && d.hours >= goal;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        height: "100%",
        justifyContent: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: "var(--weight-bold)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-numeric)"
      }
    }, d.hours > 0 ? d.hours : ""), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 28,
        height: `${pct}%`,
        borderRadius: "var(--radius-xs)",
        background: met ? "var(--accent)" : d.today ? "var(--highlight-gold)" : "var(--surface-alt)",
        border: d.today ? "none" : "1px solid var(--border)",
        transition: "height var(--dur-slow) var(--ease-settle)"
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      textAlign: "center",
      fontSize: 11,
      color: d.today ? "var(--accent)" : "var(--text-muted)",
      fontWeight: d.today ? "var(--weight-bold)" : "var(--weight-medium)"
    }
  }, d.label))));
}
Object.assign(__ds_scope, { WeekChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/app/WeekChart.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Round avatar. Renders an image when `src` is given, otherwise warm
 * amber-tinted initials.
 */
function Avatar({
  src,
  name = "",
  size = 44,
  style = {},
  ...rest
}) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join("");
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      background: "linear-gradient(160deg, var(--highlight-gold), var(--accent))",
      color: "var(--on-accent)",
      fontFamily: "var(--font-rounded)",
      fontWeight: "var(--weight-bold)",
      fontSize: size * 0.4,
      flex: "none",
      border: "1px solid var(--border)",
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials || "🐝");
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small status/count badge. `tone` maps to semantic colors.
 */
function Badge({
  children,
  tone = "accent",
  style = {},
  ...rest
}) {
  const tones = {
    accent: {
      background: "var(--accent)",
      color: "var(--on-accent)"
    },
    success: {
      background: "var(--success)",
      color: "#10240F"
    },
    neutral: {
      background: "var(--fill-soft)",
      color: "var(--text)"
    },
    gold: {
      background: "var(--highlight-gold)",
      color: "#2A1B05"
    }
  };
  const t = tones[tone] || tones.accent;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 20,
      height: 20,
      padding: "0 7px",
      fontFamily: "var(--font-rounded)",
      fontSize: 12,
      fontWeight: "var(--weight-bold)",
      lineHeight: 1,
      borderRadius: "var(--radius-pill)",
      ...t,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Honeydo primary action button. Pill-shaped, honey-amber fill,
 * calm press settle. One primary action per screen.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "8px 16px",
      fontSize: 15,
      height: 36,
      gap: 6
    },
    md: {
      padding: "12px 22px",
      fontSize: 17,
      height: 48,
      gap: 8
    },
    lg: {
      padding: "16px 26px",
      fontSize: 18,
      height: 56,
      gap: 10
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: "var(--accent)",
      color: "var(--on-accent)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-2)"
    },
    secondary: {
      background: "var(--surface-alt)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      boxShadow: "none"
    },
    ghost: {
      background: "transparent",
      color: "var(--accent)",
      border: "1px solid transparent",
      boxShadow: "none"
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: block ? "flex" : "inline-flex",
      width: block ? "100%" : "auto",
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      fontFamily: "var(--font-rounded)",
      fontWeight: "var(--weight-bold)",
      fontSize: s.fontSize,
      letterSpacing: "var(--tracking-tight)",
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "transform var(--dur-fast) var(--ease-settle), background var(--dur-fast) var(--ease-standard), filter var(--dur-fast)",
      WebkitTapHighlightColor: "transparent",
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.96)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), leadingIcon, children, trailingIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Surface card. The base container for entries, stats, and settings
 * groups. Soft warm shadow, generous radius. `glow` lights the amber
 * running-timer ring.
 */
function Card({
  children,
  elevation = 1,
  glow = false,
  padding = 16,
  style = {},
  ...rest
}) {
  const shadows = {
    0: "none",
    1: "var(--shadow-1)",
    2: "var(--shadow-2)",
    3: "var(--shadow-3)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--surface)",
      border: `1px solid ${glow ? "var(--accent-soft)" : "var(--border)"}`,
      borderRadius: "var(--radius-md)",
      boxShadow: glow ? "var(--shadow-glow)" : shadows[elevation],
      padding,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/FilterChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Selectable filter chip for the History tag-filter row.
 * Fills amber when selected; soft surface when not.
 */
function FilterChip({
  children,
  selected = false,
  dot,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      height: 34,
      padding: "0 14px",
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-subhead)",
      fontWeight: "var(--weight-semibold)",
      color: selected ? "var(--on-accent)" : "var(--text)",
      background: selected ? "var(--accent)" : "var(--fill-soft)",
      border: "1px solid transparent",
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-settle), color var(--dur-fast)",
      WebkitTapHighlightColor: "transparent",
      ...style
    },
    onMouseDown: e => e.currentTarget.style.transform = "scale(0.95)",
    onMouseUp: e => e.currentTarget.style.transform = "scale(1)",
    onMouseLeave: e => e.currentTarget.style.transform = "scale(1)"
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: selected ? "var(--on-accent)" : dot,
      flex: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Circular icon-only button (nav actions, quick continue, etc.).
 * Pass the icon node as children.
 */
function IconButton({
  children,
  variant = "soft",
  size = 40,
  disabled = false,
  label,
  style = {},
  ...rest
}) {
  const variants = {
    soft: {
      background: "var(--fill-soft)",
      color: "var(--text)",
      border: "1px solid transparent"
    },
    accent: {
      background: "var(--accent)",
      color: "var(--on-accent)",
      border: "1px solid transparent"
    },
    outline: {
      background: "transparent",
      color: "var(--text)",
      border: "1px solid var(--border)"
    },
    plain: {
      background: "transparent",
      color: "var(--text-muted)",
      border: "1px solid transparent"
    }
  };
  const v = variants[variant] || variants.soft;
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "transform var(--dur-fast) var(--ease-settle), background var(--dur-fast)",
      WebkitTapHighlightColor: "transparent",
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.9)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text field with optional label and leading icon. iOS-style filled
 * surface with a soft border that warms to amber on focus.
 */
function Input({
  label,
  leadingIcon = null,
  trailingIcon = null,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7,
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-subhead)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: 52,
      padding: "0 16px",
      background: "var(--surface-alt)",
      border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
      borderRadius: "var(--radius-md)",
      boxShadow: focused ? "0 0 0 3px var(--accent-faint)" : "none",
      transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)"
    }
  }, leadingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "flex"
    }
  }, leadingIcon), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: e => {
      setFocused(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-text)",
      fontSize: "var(--text-body)",
      color: "var(--text)",
      ...style
    }
  }, rest)), trailingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "flex"
    }
  }, trailingIcon)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * iOS segmented control. Used for the Light/Dark/System theme switch.
 * Controlled via `value` + `onChange`.
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "inline-flex",
      gap: 2,
      padding: 3,
      background: "var(--fill-soft)",
      borderRadius: "var(--radius-sm)",
      ...style
    }
  }, rest), options.map(opt => {
    const val = typeof opt === "string" ? opt : opt.value;
    const labelText = typeof opt === "string" ? opt : opt.label;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      onClick: () => onChange && onChange(val),
      style: {
        flex: 1,
        padding: "7px 16px",
        border: "none",
        borderRadius: "calc(var(--radius-sm) - 2px)",
        cursor: "pointer",
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-subhead)",
        fontWeight: "var(--weight-semibold)",
        whiteSpace: "nowrap",
        color: active ? "var(--text)" : "var(--text-muted)",
        background: active ? "var(--surface)" : "transparent",
        boxShadow: active ? "var(--shadow-1)" : "none",
        transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast)",
        WebkitTapHighlightColor: "transparent"
      }
    }, labelText);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * iOS-style toggle switch. Track turns amber when on. Controlled via
 * `checked` + `onChange`.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = "md",
  style = {},
  ...rest
}) {
  const dims = size === "sm" ? {
    w: 44,
    h: 26,
    knob: 22
  } : {
    w: 51,
    h: 31,
    knob: 27
  };
  const pad = (dims.h - dims.knob) / 2;
  return /*#__PURE__*/React.createElement("button", _extends({
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: "relative",
      width: dims.w,
      height: dims.h,
      borderRadius: "var(--radius-pill)",
      border: "none",
      padding: 0,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      background: checked ? "var(--accent)" : "var(--fill-soft)",
      transition: "background var(--dur-base) var(--ease-standard)",
      WebkitTapHighlightColor: "transparent",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: pad,
      left: checked ? dims.w - dims.knob - pad : pad,
      width: dims.knob,
      height: dims.knob,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 2px 5px rgba(42,27,5,0.28)",
      transition: "left var(--dur-base) var(--ease-settle)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Tag color presets — warm, honey-adjacent hues. */
const TAG_COLORS = {
  amber: "#F5A300",
  gold: "#FFC75A",
  green: "#7BC57F",
  clay: "#E07A5F",
  plum: "#9B6A9E",
  teal: "#4FA39A",
  blue: "#5B8DEF",
  brown: "#A87C4F"
};

/**
 * A small labelled tag with a leading color dot. Used to categorize
 * time entries (e.g. "Design", "Admin").
 */
function Tag({
  children,
  color = "amber",
  size = "md",
  style = {},
  ...rest
}) {
  const dot = TAG_COLORS[color] || color;
  const sizes = {
    sm: {
      fontSize: 12,
      padding: "3px 9px 3px 7px",
      dot: 6,
      gap: 6
    },
    md: {
      fontSize: 13,
      padding: "5px 11px 5px 9px",
      dot: 8,
      gap: 7
    }
  };
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: s.gap,
      padding: s.padding,
      fontFamily: "var(--font-text)",
      fontSize: s.fontSize,
      fontWeight: "var(--weight-semibold)",
      color: "var(--text)",
      background: "var(--fill-soft)",
      borderRadius: "var(--radius-pill)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: s.dot,
      height: s.dot,
      borderRadius: "50%",
      background: dot,
      flex: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { TAG_COLORS, Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// ui_kits/honeydo/App.jsx
try { (() => {
/* Honeydo UI kit — interactive app shell */
function fmt(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor(secs % 3600 / 60);
  const s = secs % 60;
  const pad = n => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function HoneydoApp() {
  const {
    TabBar
  } = window.DS;
  const [view, setView] = React.useState("auth"); // auth | empty | app
  const [tab, setTab] = React.useState("timer");
  const [theme, setTheme] = React.useState("Dark");
  const themeAttr = theme.toLowerCase() === "light" ? "light" : "dark";
  const [running, setRunning] = React.useState(false);
  const [secs, setSecs] = React.useState(0);
  const [desc, setDesc] = React.useState("Design review — Honeydo");
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const today = [{
    description: "Inbox & standup",
    tag: "Admin",
    color: "#7BC57F",
    duration: "32m"
  }, {
    description: "Roadmap sync",
    tag: "Meetings",
    color: "#5B8DEF",
    duration: "48m"
  }, {
    description: "Wireframes",
    tag: "Design",
    color: "#F5A300",
    duration: "2:15:00"
  }];
  const toggle = () => {
    if (!running) {
      setSecs(0);
      setRunning(true);
    } else setRunning(false);
  };
  let screen;
  if (view === "auth") screen = /*#__PURE__*/React.createElement(AuthScreen, {
    onSignIn: () => setView("empty")
  });else if (view === "empty") screen = /*#__PURE__*/React.createElement(EmptyScreen, {
    onStart: () => {
      setView("app");
      setTab("timer");
      setRunning(true);
      setSecs(0);
    }
  });else {
    const inner = {
      timer: /*#__PURE__*/React.createElement(TimerScreen, {
        running: running,
        elapsed: fmt(secs),
        description: desc,
        setDescription: setDesc,
        onToggle: toggle,
        today: today,
        onContinue: e => {
          setDesc(e.description);
          setSecs(0);
          setRunning(true);
        }
      }),
      history: /*#__PURE__*/React.createElement(HistoryScreen, null),
      stats: /*#__PURE__*/React.createElement(StatsScreen, null),
      profile: /*#__PURE__*/React.createElement(ProfileScreen, {
        theme: theme,
        setTheme: setTheme
      })
    }[tab];
    screen = /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }
    }, inner, /*#__PURE__*/React.createElement(TabBar, {
      value: tab,
      onChange: setTab,
      items: [{
        value: "timer",
        label: "Timer",
        icon: /*#__PURE__*/React.createElement("i", {
          "data-lucide": "timer"
        })
      }, {
        value: "history",
        label: "History",
        icon: /*#__PURE__*/React.createElement("i", {
          "data-lucide": "list"
        })
      }, {
        value: "stats",
        label: "Stats",
        icon: /*#__PURE__*/React.createElement("i", {
          "data-lucide": "bar-chart-2"
        })
      }, {
        value: "profile",
        label: "Profile",
        icon: /*#__PURE__*/React.createElement("i", {
          "data-lucide": "user"
        })
      }]
    }));
  }
  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 22,
      padding: "32px 0 48px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      background: "rgba(0,0,0,.28)",
      padding: 4,
      borderRadius: 999
    }
  }, [["auth", "Sign in"], ["empty", "First run"], ["app", "App"]].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setView(v),
    style: chipBtn(view === v)
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      background: "rgba(0,0,0,.28)",
      padding: 4,
      borderRadius: 999
    }
  }, ["Dark", "Light"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTheme(t),
    style: chipBtn(theme === t)
  }, t)))), /*#__PURE__*/React.createElement(PhoneFrame, {
    theme: themeAttr
  }, screen));
}
function chipBtn(active) {
  return {
    border: "none",
    cursor: "pointer",
    padding: "7px 16px",
    borderRadius: 999,
    fontFamily: "var(--font-rounded)",
    fontWeight: 700,
    fontSize: 14,
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#2A1B05" : "#cdbfa8",
    transition: "all .15s ease"
  };
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(HoneydoApp, null));
requestAnimationFrame(() => window.lucide && window.lucide.createIcons());
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/honeydo/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/honeydo/AuthScreen.jsx
try { (() => {
/* Honeydo — Auth / Sign in screen */
function AuthScreen({
  onSignIn
}) {
  const {
    Button,
    Input
  } = window.DS;
  const [email, setEmail] = React.useState("maya@honey.do");
  const [pw, setPw] = React.useState("buzzbuzz");
  return /*#__PURE__*/React.createElement("div", {
    className: "honey-comb-bg",
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "0 24px",
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      textAlign: "center",
      paddingTop: 48,
      paddingBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 78,
      height: 78,
      margin: "0 auto 18px",
      borderRadius: "var(--radius-icon)",
      background: "linear-gradient(160deg, var(--highlight-gold), var(--accent-pressed))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "var(--shadow-3)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    n: "hexagon",
    size: 40,
    color: "#2A1B05",
    style: {
      fill: "#2A1B05"
    }
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 30,
      fontWeight: 800,
      color: "var(--text)"
    }
  }, "Welcome to Honeydo"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      color: "var(--text-muted)",
      fontSize: 16
    }
  }, "Track your day, one sweet entry at a time.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    leadingIcon: /*#__PURE__*/React.createElement(Ico, {
      n: "mail",
      size: 18
    }),
    placeholder: "you@honey.do"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Password",
    type: "password",
    value: pw,
    onChange: e => setPw(e.target.value),
    leadingIcon: /*#__PURE__*/React.createElement(Ico, {
      n: "lock",
      size: 18
    }),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      marginTop: -4
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      color: "var(--accent)",
      fontSize: 14,
      fontWeight: 600,
      textDecoration: "none"
    }
  }, "Forgot password?")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    block: true,
    onClick: onSignIn,
    style: {
      marginTop: 4
    }
  }, "Sign in"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      margin: "6px 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--border)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "or"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--border)"
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onSignIn,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      height: 52,
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      color: "var(--text)",
      fontFamily: "var(--font-rounded)",
      fontWeight: 700,
      fontSize: 16
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
    width: "20",
    height: "20",
    alt: ""
  }), "Continue with Google")), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 14,
      marginTop: 24,
      paddingBottom: 20
    }
  }, "New here? ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      fontWeight: 700
    }
  }, "Create an account")));
}
Object.assign(window, {
  AuthScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/honeydo/AuthScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/honeydo/EmptyScreen.jsx
try { (() => {
/* Honeydo — First-run empty state */
function EmptyScreen({
  onStart
}) {
  const {
    Button
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    className: "honey-comb-bg",
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "0 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 132,
      height: 132,
      borderRadius: "50%",
      background: "radial-gradient(circle at 50% 35%, var(--accent-faint), transparent 70%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 92,
      height: 92,
      borderRadius: "var(--radius-icon)",
      background: "linear-gradient(160deg, var(--highlight-gold), var(--accent))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "var(--shadow-glow)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    n: "hexagon",
    size: 48,
    color: "#2A1B05",
    style: {
      fill: "#2A1B05"
    }
  })))), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 27,
      fontWeight: 800,
      color: "var(--text)",
      marginBottom: 10
    }
  }, "Your hive is empty"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)",
      fontSize: 16,
      lineHeight: 1.5,
      maxWidth: 280,
      marginBottom: 28
    }
  }, "Start a timer with a quick note about what you're doing. Stop it when you switch. That's the whole thing."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onStart,
    leadingIcon: /*#__PURE__*/React.createElement(Ico, {
      n: "play",
      size: 20,
      style: {
        fill: "currentColor"
      }
    })
  }, "Start your first entry"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)",
      fontSize: 13,
      marginTop: 18,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    n: "sparkles",
    size: 14,
    color: "var(--accent)"
  }), " Tip: you can start from your Home Screen too"));
}
Object.assign(window, {
  EmptyScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/honeydo/EmptyScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/honeydo/HistoryScreen.jsx
try { (() => {
/* Honeydo — History screen */
function HistoryScreen() {
  const {
    TimerEntry,
    FilterChip
  } = window.DS;
  const [filter, setFilter] = React.useState("All");
  const tags = [{
    name: "All",
    dot: null
  }, {
    name: "Design",
    dot: "#F5A300"
  }, {
    name: "Admin",
    dot: "#7BC57F"
  }, {
    name: "Meetings",
    dot: "#5B8DEF"
  }, {
    name: "Personal",
    dot: "#9B6A9E"
  }];
  const days = [{
    label: "Today",
    total: "6h 12m",
    entries: [{
      description: "Design review — Honeydo",
      tag: "Design",
      color: "#F5A300",
      duration: "1:24:08"
    }, {
      description: "Inbox & standup",
      tag: "Admin",
      color: "#7BC57F",
      duration: "32m"
    }, {
      description: "Roadmap sync",
      tag: "Meetings",
      color: "#5B8DEF",
      duration: "48m"
    }]
  }, {
    label: "Yesterday",
    total: "7h 02m",
    entries: [{
      description: "Prototype build",
      tag: "Design",
      color: "#F5A300",
      duration: "3:10:00"
    }, {
      description: "Reading",
      tag: "Personal",
      color: "#9B6A9E",
      duration: "26m"
    }, {
      description: "1:1 with Sam",
      tag: "Meetings",
      color: "#5B8DEF",
      duration: "30m"
    }]
  }, {
    label: "Monday, Jun 26",
    total: "5h 40m",
    entries: [{
      description: "Email triage",
      tag: "Admin",
      color: "#7BC57F",
      duration: "44m"
    }, {
      description: "Wireframes",
      tag: "Design",
      color: "#F5A300",
      duration: "2:15:00"
    }]
  }];
  const match = e => filter === "All" || e.tag === filter;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(LargeTitle, null, "History"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      overflowX: "auto",
      padding: "2px 20px 12px",
      flex: "none"
    }
  }, tags.map(t => /*#__PURE__*/React.createElement(FilterChip, {
    key: t.name,
    dot: t.dot,
    selected: filter === t.name,
    onClick: () => setFilter(t.name)
  }, t.name))), /*#__PURE__*/React.createElement(ScreenScroll, null, days.map((d, i) => {
    const visible = d.entries.filter(match);
    if (!visible.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 20px 6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color: "var(--text-muted)"
      }
    }, d.label), /*#__PURE__*/React.createElement("span", {
      className: "honey-numeric",
      style: {
        fontSize: 15,
        fontWeight: 800,
        color: "var(--text)"
      }
    }, d.total)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "0 20px"
      }
    }, visible.map((e, j) => /*#__PURE__*/React.createElement(TimerEntry, {
      key: j,
      description: e.description,
      tag: e.tag,
      tagColor: e.color,
      duration: e.duration
    }))));
  })));
}
Object.assign(window, {
  HistoryScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/honeydo/HistoryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/honeydo/ProfileScreen.jsx
try { (() => {
/* Honeydo — Profile / Settings screen */
function SettingRow({
  icon,
  iconBg,
  label,
  trailing,
  last
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      borderBottom: last ? "none" : "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      background: iconBg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    n: icon,
    size: 17,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 16,
      color: "var(--text)",
      fontWeight: 500
    }
  }, label), trailing);
}
function ProfileScreen({
  theme,
  setTheme
}) {
  const {
    Avatar,
    SegmentedControl,
    Switch,
    Button,
    StreakHive,
    Card
  } = window.DS;
  const [reminders, setReminders] = React.useState(true);
  const [goal, setGoal] = React.useState(6);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(LargeTitle, null, "Profile"), /*#__PURE__*/React.createElement(ScreenScroll, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Maya Okonkwo",
    size: 64
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      fontFamily: "var(--font-rounded)",
      color: "var(--text)"
    }
  }, "Maya Okonkwo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)"
    }
  }, "maya@honey.do"))), /*#__PURE__*/React.createElement(Card, {
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-rounded)",
      fontWeight: 700,
      fontSize: 16,
      color: "var(--text)"
    }
  }, "Streak"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      color: "var(--accent)",
      fontWeight: 800,
      fontFamily: "var(--font-rounded)"
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    n: "flame",
    size: 16,
    color: "var(--accent)",
    style: {
      fill: "var(--accent)"
    }
  }), " 5 days")), /*#__PURE__*/React.createElement(StreakHive, {
    filled: 5,
    total: 7,
    current: true,
    label: "Hit your goal 5 days running \u2014 keep it warm."
  })), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      color: "var(--text)",
      fontWeight: 500
    }
  }, "Daily goal"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setGoal(g => Math.max(1, g - 1)),
    style: {
      width: 30,
      height: 30,
      borderRadius: "50%",
      border: "1px solid var(--border)",
      background: "var(--surface-alt)",
      color: "var(--text)",
      cursor: "pointer",
      fontSize: 18
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("span", {
    className: "honey-numeric",
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: "var(--text)",
      minWidth: 38,
      textAlign: "center"
    }
  }, goal, "h"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setGoal(g => Math.min(16, g + 1)),
    style: {
      width: 30,
      height: 30,
      borderRadius: "50%",
      border: "1px solid var(--border)",
      background: "var(--surface-alt)",
      color: "var(--text)",
      cursor: "pointer",
      fontSize: 18
    }
  }, "+")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: ".04em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      padding: "0 4px 8px"
    }
  }, "Appearance"), /*#__PURE__*/React.createElement(Card, {
    padding: 14
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    style: {
      display: "flex",
      width: "100%"
    },
    options: ["Light", "Dark", "System"],
    value: theme,
    onChange: setTheme
  }))), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(SettingRow, {
    icon: "bell",
    iconBg: "#F5A300",
    label: "Daily reminder",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: reminders,
      onChange: setReminders,
      size: "sm"
    })
  }), /*#__PURE__*/React.createElement(SettingRow, {
    icon: "tag",
    iconBg: "#5B8DEF",
    label: "Manage tags",
    trailing: /*#__PURE__*/React.createElement(Ico, {
      n: "chevron-right",
      size: 18,
      color: "var(--text-muted)"
    })
  }), /*#__PURE__*/React.createElement(SettingRow, {
    icon: "download",
    iconBg: "#7BC57F",
    label: "Export data",
    trailing: /*#__PURE__*/React.createElement(Ico, {
      n: "chevron-right",
      size: 18,
      color: "var(--text-muted)"
    }),
    last: true
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    block: true,
    style: {
      color: "#E07A5F"
    }
  }, "Sign out"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10
    }
  }))));
}
Object.assign(window, {
  ProfileScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/honeydo/ProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/honeydo/StatsScreen.jsx
try { (() => {
/* Honeydo — Stats screen */
function StatBlock({
  value,
  unit,
  label,
  accent
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: "14px 12px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "honey-numeric",
    style: {
      fontSize: 26,
      fontWeight: 800,
      color: accent ? "var(--accent)" : "var(--text)",
      letterSpacing: "-.02em"
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)",
      fontWeight: 700
    }
  }, unit)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 3,
      fontWeight: 600
    }
  }, label));
}
function TopTag({
  name,
  color,
  hours,
  pct
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: color,
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 90,
      fontSize: 15,
      fontWeight: 600,
      color: "var(--text)"
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 8,
      background: "var(--surface-alt)",
      borderRadius: 4,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      height: "100%",
      width: pct,
      background: color,
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "honey-numeric",
    style: {
      width: 48,
      textAlign: "right",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--text-muted)"
    }
  }, hours));
}
function StatsScreen() {
  const {
    WeekChart,
    InsightCard,
    Card
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(LargeTitle, null, "Stats"), /*#__PURE__*/React.createElement(ScreenScroll, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    value: "6.2",
    unit: "h",
    label: "Today",
    accent: true
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "31",
    unit: "h",
    label: "This week"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "412",
    unit: "h",
    label: "All time"
  })), /*#__PURE__*/React.createElement(Card, {
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-rounded)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text)"
    }
  }, "This week"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Goal 6h / day")), /*#__PURE__*/React.createElement(WeekChart, {
    goal: 6,
    data: [{
      label: "M",
      hours: 4
    }, {
      label: "T",
      hours: 7
    }, {
      label: "W",
      hours: 5.5
    }, {
      label: "T",
      hours: 6
    }, {
      label: "F",
      hours: 3
    }, {
      label: "S",
      hours: 1
    }, {
      label: "S",
      hours: 6.2,
      today: true
    }]
  })), /*#__PURE__*/React.createElement(InsightCard, null, "You're 1h ahead of your usual Tuesday pace \u2014 three deep-work blocks already. Sweet."), /*#__PURE__*/React.createElement(Card, {
    padding: 16
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-rounded)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text)",
      display: "block",
      marginBottom: 6
    }
  }, "Top tags"), /*#__PURE__*/React.createElement(TopTag, {
    name: "Design",
    color: "#F5A300",
    hours: "14h",
    pct: "78%"
  }), /*#__PURE__*/React.createElement(TopTag, {
    name: "Meetings",
    color: "#5B8DEF",
    hours: "8h",
    pct: "46%"
  }), /*#__PURE__*/React.createElement(TopTag, {
    name: "Admin",
    color: "#7BC57F",
    hours: "5h",
    pct: "28%"
  }), /*#__PURE__*/React.createElement(TopTag, {
    name: "Personal",
    color: "#9B6A9E",
    hours: "4h",
    pct: "22%"
  })))));
}
Object.assign(window, {
  StatsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/honeydo/StatsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/honeydo/TimerScreen.jsx
try { (() => {
/* Honeydo — Timer / Home screen (the core loop) */
function TimerScreen({
  running,
  elapsed,
  description,
  setDescription,
  onToggle,
  today,
  onContinue
}) {
  const {
    TimerEntry
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(LargeTitle, {
    sub: "GOOD EVENING, MAYA",
    trailing: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "var(--surface-alt)",
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid var(--border)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "flame",
      size: 16,
      color: "var(--accent)",
      style: {
        fill: "var(--accent)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 800,
        fontFamily: "var(--font-rounded)",
        color: "var(--text)"
      }
    }, "5"))
  }, "Today"), /*#__PURE__*/React.createElement(ScreenScroll, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 20px 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: running ? "color-mix(in srgb, var(--accent) 12%, var(--surface))" : "var(--surface)",
      border: `1px solid ${running ? "var(--accent-soft)" : "var(--border)"}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: running ? "var(--shadow-glow)" : "var(--shadow-2)",
      padding: 20,
      transition: "all var(--dur-base) var(--ease-settle)"
    }
  }, running && /*#__PURE__*/React.createElement("div", {
    className: "honey-pulse",
    style: {
      position: "absolute",
      top: -40,
      right: -40,
      width: 160,
      height: 160,
      borderRadius: "50%",
      background: "radial-gradient(circle, var(--running-glow-soft), transparent 70%)"
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: description,
    onChange: e => setDescription(e.target.value),
    placeholder: "What are you working on?",
    style: {
      width: "100%",
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-text)",
      fontSize: 18,
      fontWeight: 600,
      color: "var(--text)",
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "honey-numeric",
    style: {
      fontSize: running ? 44 : 40,
      fontWeight: 700,
      color: running ? "var(--accent)" : "var(--text-muted)",
      fontVariantNumeric: "tabular-nums",
      letterSpacing: "-.02em",
      transition: "color var(--dur-base)"
    }
  }, elapsed), /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    "aria-label": running ? "Stop" : "Start",
    style: {
      width: 64,
      height: 64,
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      background: running ? "var(--accent)" : "linear-gradient(160deg, var(--highlight-gold), var(--accent))",
      color: "var(--on-accent)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: running ? "var(--shadow-glow)" : "var(--shadow-3)",
      transition: "transform var(--dur-fast) var(--ease-settle)"
    },
    onMouseDown: e => e.currentTarget.style.transform = "scale(0.92)",
    onMouseUp: e => e.currentTarget.style.transform = "scale(1)",
    onMouseLeave: e => e.currentTarget.style.transform = "scale(1)"
  }, running ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 6,
      background: "currentColor"
    }
  }) : /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "30",
    height: "30",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 5v14l11-7z"
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 20px 4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: ".04em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Today"), /*#__PURE__*/React.createElement("span", {
    className: "honey-numeric",
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: "var(--text)"
    }
  }, "6h 12m")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "6px 20px 8px"
    }
  }, today.map((e, i) => /*#__PURE__*/React.createElement(TimerEntry, {
    key: i,
    description: e.description,
    tag: e.tag,
    tagColor: e.color,
    duration: e.duration,
    onContinue: () => onContinue(e)
  })))));
}
Object.assign(window, {
  TimerScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/honeydo/TimerScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/honeydo/kit-shared.jsx
try { (() => {
/* Honeydo UI kit — shared frame, status bar, headers, helpers.
   Exposes everything on window for the sibling screen scripts. */

const DS = window.HoneydoDesignSystem_cfe9be;
const Ico = ({
  n,
  size = 22,
  color,
  style
}) => React.createElement("i", {
  "data-lucide": n,
  style: {
    width: size,
    height: size,
    color,
    display: "inline-flex",
    ...style
  }
});

/* iOS status bar */
function StatusBar({
  dark
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      height: 50,
      paddingTop: 6,
      flex: "none",
      color: "var(--text)",
      fontFamily: "var(--font-rounded)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Ico, {
    n: "signal",
    size: 16
  }), /*#__PURE__*/React.createElement(Ico, {
    n: "wifi",
    size: 16
  }), /*#__PURE__*/React.createElement(Ico, {
    n: "battery-full",
    size: 18
  })));
}

/* Large iOS title with optional trailing node */
function LargeTitle({
  children,
  trailing,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 20px 10px",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent)",
      letterSpacing: ".02em",
      marginBottom: 2
    }
  }, sub), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-large-title)",
      fontWeight: 800,
      color: "var(--text)",
      letterSpacing: "-.01em"
    }
  }, children)), trailing);
}

/* The phone shell. Sets the theme scope; chrome (notch + home indicator)
   sits outside the scrollable screen area. */
function PhoneFrame({
  theme,
  children,
  statusBar = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-theme": theme,
    style: {
      position: "relative",
      width: 390,
      height: 844,
      background: "var(--bg)",
      borderRadius: 54,
      boxShadow: "0 40px 90px rgba(20,12,0,.5), 0 0 0 12px #0c0a08, 0 0 0 13px #2a2622",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-text)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      width: 124,
      height: 36,
      background: "#0a0807",
      borderRadius: 20,
      zIndex: 50
    }
  }), statusBar && /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }
  }, children));
}

/* A vertically scrolling screen body with bottom inset for the tab bar. */
function ScreenScroll({
  children,
  pad = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      paddingBottom: 16,
      ...style
    }
  }, children);
}
Object.assign(window, {
  DS,
  Ico,
  StatusBar,
  LargeTitle,
  PhoneFrame,
  ScreenScroll
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/honeydo/kit-shared.jsx", error: String((e && e.message) || e) }); }

__ds_ns.InsightCard = __ds_scope.InsightCard;

__ds_ns.StreakHive = __ds_scope.StreakHive;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.TimerEntry = __ds_scope.TimerEntry;

__ds_ns.WeekChart = __ds_scope.WeekChart;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.TAG_COLORS = __ds_scope.TAG_COLORS;

__ds_ns.Tag = __ds_scope.Tag;

})();
