// GitHub's own per-language colors (FR-LANG-03), lifted from github-linguist's
// colors.yml. A curated set covering the common languages; anything not listed
// falls back to the design system's chart track so the chart never breaks.

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Elixir: "#6e4a7e",
  Erlang: "#B83998",
  Haskell: "#5e5086",
  Clojure: "#db5855",
  Lua: "#000080",
  Perl: "#0298c3",
  R: "#198CE7",
  Julia: "#a270ba",
  "Objective-C": "#438eff",
  "Jupyter Notebook": "#DA5B0B",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  Vim_script: "#199f4b",
  PowerShell: "#012456",
  "Emacs Lisp": "#c065db",
  Nix: "#7e7eff",
  Zig: "#ec915c",
  Solidity: "#AA6746",
  OCaml: "#3be133",
  TeX: "#3D6117",
  Assembly: "#6E4C13",
  MDX: "#fcb32c",
  Astro: "#ff5a03",
};

/** Look up a language's GitHub color, or null when unknown. */
export function languageColor(name: string): string | null {
  return LANGUAGE_COLORS[name] ?? null;
}
