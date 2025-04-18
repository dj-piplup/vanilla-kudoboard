import DOMPurify from "dompurify";
import { parse as parseMarkdown } from "marked";
import { gulp, Card } from "./data.ts";

let dataComplete = false;

const board = document.getElementById("board")!;
const splash = document.getElementById("splash") as HTMLDialogElement;
let cards: Card[] = [];
const columnHeights: number[] = [];

let lastRendered = -1;
let columnCount = 3;
let changingColumns = false;

// This is for syntax highlighting purposes. These functions tag template strings "as-is"
const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values);

//#region Render Loop
const canFetchMore = () => {
  return (
    Math.min(...columnHeights) - board.scrollTop <=
    window.innerHeight * ~~import.meta.env.VITE_SITE_LAZY_FACTOR // Defined in .env file
  );
}

const processNext = async () => {
  if(cards.length === 0){
    // This prevents early calls from the resizer
    // processNext is automatically called after the first gulp is complete from the Entrypoint section of this file
    return;
  }
  if (lastRendered > 0 && cards.length - 1 === lastRendered) {
    if(!dataComplete){
      gulp(cards).then(finished => {
        dataComplete = finished;
        processNext()
      })
    }
    return;
  }
  if (columnHeights.length === 0) {
    writeColumns(columnCount);
  }
  if (!canFetchMore()) {
    board.addEventListener("scroll", handleScroll);
    return;
  }
  const nextIndex = columnHeights.indexOf(Math.min(...columnHeights));
  const newCard = renderCard(lastRendered + 1);
  if(changingColumns){
    return;
  }
  document.getElementById(`column-${nextIndex}`)!.appendChild(newCard);
  const img = newCard.querySelector('img');
  if(img){
    await paintPromise(img);
  }
  const bbox = newCard.getBoundingClientRect();
  columnHeights[nextIndex] += Math.floor(bbox.height) + ~~import.meta.env.VITE_SITE_GAP;
  if(changingColumns){
    return;
  }
  processNext();
}

const renderCard = (index: number): HTMLElement => {
  const data = cards[index];
  const img = data.art ? html`<img src=${data.art} class="card-img" />` : "";
  const card = html`
    <article tabindex=${index + 1 } class='card'>
      ${img}
      <section class="card-content">
        <div class="card-text">${processMessage(data.message)}</div>
        <div class="card-info">
          <p class="card-name">${data.name}</p>
        </div>
      </section>
    </article>
  `;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = card;
  lastRendered += 1;
  return wrapper.firstElementChild as HTMLElement;
}

const paintPromise = async (img: HTMLElement): Promise<void> => {
  let resolve: () => void;
  const didResize = new Promise<void>((r) => (resolve = r));
  const observer = new ResizeObserver((entries) => {
    if ((entries.at(-1)?.contentBoxSize[0]!.blockSize ?? 0) > 0) {
      resolve();
    }
  });
  observer.observe(img);
  await didResize;
  return;
}

function processMessage(markdown: string) {
  const parsed = parseMarkdown(markdown, { async: false });
  const bumpHeadersDown = parsed.replace(
    /<h(\d)/,
    (og: string, level: string) => (~~level < 6 ? `<h${~~level + 1}` : og)
  );
  return DOMPurify.sanitize(bumpHeadersDown);
}

const handleScroll = () => {
  if (canFetchMore()) {
    board.removeEventListener("scroll", handleScroll);
    processNext();
  }
};
//#endregion

//#region column recount
const cache:{content:string, lastRendered: number, columnHeights: number[]}[] = [];

const maxColWidth = ~~import.meta.env.VITE_SITE_MAX_COL_WIDTH;
const maxCols = ~~import.meta.env.VITE_SITE_MAX_COL_COUNT;
const resizer = new ResizeObserver((entries) => {
  const newest = entries.at(-1);
  const width = newest?.borderBoxSize[0].inlineSize!;
  const newColumnCount = Math.min(Math.ceil(width / maxColWidth), maxCols);
  if(newColumnCount !== columnCount){
    changingColumns = true;
    cache[columnCount] = {
      content: board.innerHTML,
      lastRendered,
      columnHeights: [...columnHeights]
    };
    columnCount = newColumnCount;
    if(cache[newColumnCount]){
      board.innerHTML = cache[newColumnCount].content;
      columnHeights.splice(0, columnHeights.length, ...cache[newColumnCount].columnHeights);
      lastRendered = cache[newColumnCount].lastRendered;
    } else {
      board.innerHTML = '';
      writeColumns(newColumnCount);
      lastRendered = -1;
    }
    changingColumns = false;
    processNext();
  }
});

function writeColumns(count: number){
  columnHeights.splice(0, columnHeights.length, ...(new Array(count).fill(0)));
  for(let i = 0; i < count; i ++){
    const col = document.createElement('section');
    col.id = `column-${i}`;
    col.classList.add('column');
    board.appendChild(col);
  }
}

resizer.observe(board);
//#endregion

//#region Entrypoint
gulp(cards).then(finished=>{
  dataComplete = finished;
  processNext()
});

const envStyles = new CSSStyleSheet();
envStyles.replaceSync(`body {
  --card-gap: ${import.meta.env.VITE_SITE_GAP}px;
  --max-col-width: ${import.meta.env.VITE_SITE_MAX_COL_WIDTH}px;
}`);

document.adoptedStyleSheets.push(envStyles);

splash.showModal();
const splashClose = document.getElementById('splash-close') as HTMLButtonElement;
// the button will still be first in the tab order, but don't show the focus outline unless they try to tab
splashClose.blur();

splashClose.addEventListener('click', () => {
  // Completely delete the splash screen so the opacity effects can clear
  splash.parentElement?.removeChild(splash);
  (document.activeElement as HTMLElement | undefined)?.blur();
});
