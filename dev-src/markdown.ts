import { Renderer } from "marked";
import { parseInline } from "marked";

const renderOverrides:Partial<Renderer> = {
  // This is basically me overriding some markdown features to not work
  // We should probably just support strong, em, and newline
  codespan({text}) {
    return `\`${text}\``;
  },
  del({ tokens }) {
    return `~~${this.parser.parseInline(tokens)}~~`;
  },
  image({ href, title, text }) {
    return `![${text}](${href}${title ? ` "${title}"` : ''})`;
  },
  text({ text }) {
    return text;
  },
  html({ text }) {
    const allTagsOut = text.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    // unescape ins because underlines are fine and this is how github markdown handles it
    return allTagsOut.replaceAll(/&lt;(\/?)ins&gt;/sg, (_, slash) => `<${slash}ins>`);
  },
};

const renderer = new Renderer();
Object.assign(renderer, renderOverrides);

const linklessRenderer = new Renderer();
Object.assign(linklessRenderer, {...renderOverrides, link({href, title, tokens}){
  return `[${this.parser.parseInline(tokens)}](${href}${title ? ` ${title}` : ''})`;
}})

export function parseMessage(message: string, linksOk: boolean) {
  return parseInline(message, {
    renderer: linksOk ? renderer : linklessRenderer,
    gfm: true,
    breaks: true,
    async: false,
  });
}
