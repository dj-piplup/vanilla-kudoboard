
import styleContent from "./css/style.css?raw";
import themeContent from "./css/theme.css?raw";

// We do it this way so that we know for sure that styles are loaded before content is. This will be inlined as raw text on build
const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styleContent);
const themeSheet = new CSSStyleSheet();
themeSheet.replaceSync(themeContent);
document.adoptedStyleSheets.push(styleSheet, themeSheet);