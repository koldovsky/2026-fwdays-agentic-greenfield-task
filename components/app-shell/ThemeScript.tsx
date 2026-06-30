import { themeBootstrapScript } from "@/lib/theme/theme";

/** Blocking inline script: read localStorage → set data-theme before paint. @trace FR-SHELL-03 */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }}
    />
  );
}
