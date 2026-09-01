/**
 * Applies the saved theme and Indic size before first paint.
 *
 * Without this the choice made in Settings only survived client-side
 * navigation: a hard reload of any other route rendered against
 * prefers-color-scheme, because nothing outside Settings wrote `data-theme`.
 * Reading localStorage inline, before React hydrates, also avoids the flash of
 * the wrong theme. It touches only the document element, never the network.
 */
const SCRIPT = `(function(){try{
var raw = localStorage.getItem("ulasa-store-v1");
if(!raw) return;
var s = JSON.parse(raw).state || {};
if(s.theme === "light" || s.theme === "dark") document.documentElement.setAttribute("data-theme", s.theme);
if(s.indicSize) document.documentElement.style.setProperty("--indic-size", s.indicSize + "px");
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
