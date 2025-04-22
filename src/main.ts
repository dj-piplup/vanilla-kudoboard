import { gulp, Card } from "./data.ts";
import { paintPromise, renderCard, replace, writeColumns } from "./render.ts";


// Guaranteed elements on load
const board = document.getElementById("board") as HTMLElement;
const splash = document.getElementById("splash") as HTMLDialogElement;

// State
/**
 * *Current* card data that is fetched. This is mutated only when gulping more data
 */
const cards: Card[] = [];
const columnHeights: number[] = [];

/**
 * Set to true when the gulp function says there's nothing left to fetch
 */
let dataComplete = false;
/**
 * The index of the last card to get rendered
 */
let lastRendered = -1;
/**
 * How many columns there are. This is subject to change via a resize observer, and will cause the layout to be rerendered. The board dom is cached when switching though
 */
let columnCount = 3;
/**
 * Marks if we're in the middle of changing how many columns there are. Specifically used to make sure that we don't add cards in the middle of a column number changeover
 */
let changingColumns = false;

//#region Render Loop
/**
 * This determines if new cards are far enough off-screen that we should pause rendering new cards
 * @returns boolean
 */
const canFetchMore = () => {
  return (
    Math.min(...columnHeights) - board.scrollTop <=
    window.innerHeight * ~~import.meta.env.VITE_SITE_LAZY_FACTOR // Defined in .env file
  );
}

/**
 * Temporary scroll handler if we've loaded enough cards into the dom. Restarts the render loop and **unsets itself** if scrolling down far enough that more cards should render
 */
const handleScroll = () => {
  if (canFetchMore()) {
    board.removeEventListener("scroll", handleScroll);
    processNext();
  }
};

/**
 * One step of the render loop, which should result in one card being placed in the masonry layout
 */
const processNext = async () => {
  if(cards.length === 0){
    // This prevents early calls from the resizer
    // processNext is automatically called after the first gulp is complete from the Entrypoint section of this file
    return;
  }
  // If we've rendered all the cards we're currently holding onto, break
  if (lastRendered > 0 && cards.length - 1 === lastRendered) {
    // Grab more data if it exists, then start the render loop again when it's done;
    if(!dataComplete){
      gulp(cards).then(finished => {
        dataComplete = finished;
        processNext()
      })
    }
    return;
  }
  if (columnHeights.length === 0) {
    // Make sure that our height counting infrastructure exists since it's used for masonry placement
    replace(columnHeights, writeColumns(columnCount, board));
  }
  if (!canFetchMore()) {
    // If we've rendered enough, break, but add an event listener to start the render loop again if we're approaching new cards to render
    board.addEventListener("scroll", handleScroll);
    return;
  }
  // Select the least filled out column, to render the card into
  const nextIndex = columnHeights.indexOf(Math.min(...columnHeights));
  const newCard = renderCard(cards[lastRendered + 1], lastRendered + 1);
  if(changingColumns){
    // Special case: column count changed mid-process
    // We catch here because this is right before the card gets inserted to dom 
    return;
  }
  lastRendered += 1;
  // Add the card to the dom so we can evaluate height
  document.getElementById(`column-${nextIndex}`)!.appendChild(newCard);
  const img = newCard.querySelector('img');
  if(img){
    // If there's an image on the card, we need to wait for it to at least load the size of the image so we know how tall the card actually is
    await paintPromise(img);
  }
  // Check the height of the card, and add it to the height of the column we're putting it in
  const bbox = newCard.getBoundingClientRect();
  columnHeights[nextIndex] += Math.floor(bbox.height) + ~~import.meta.env.VITE_SITE_GAP;
  if(changingColumns){
    // Same special case, column count changed mid-process
    // Since we awaited an async function, it's very possible it could have started between the last check and now
    // This one catches it before the render loop starts another iteration
    return;
  }
  // Keep processing new cards. The beginning of processNext will worry about if we should or not
  // This should not be a problem with "too much recursion", the recursion stops on a scale of "how many cards are on [single digit] screen heights" and the recursion limits are something like 9000+
  processNext();
}
//#endregion

//#region column recount
/**
 * Holds on to rendered dom for different column counts if the column count ever changes
 */
const cache:{content:string, lastRendered: number, columnHeights: number[]}[] = [];

/**
 * Max pixel width of an individual column, set in the global site env settings
 */
const maxColWidth = ~~import.meta.env.VITE_SITE_MAX_COL_WIDTH;
/**
 * Max number of columns, also set in the global site env settings
 */
const maxCols = ~~import.meta.env.VITE_SITE_MAX_COL_COUNT;

/**
 * Watches the board width and sets the number of columns accordingly, with some caching logic
 */
const resizer = new ResizeObserver((entries) => {
  const newest = entries.at(-1);
  // Since this is a simple resize observer on a simple element, it should be safe to assume there's only 1 border box size per entry
  const width = newest?.borderBoxSize[0].inlineSize!;
  const newColumnCount = Math.min(Math.ceil(width / maxColWidth), maxCols);
  if(newColumnCount !== columnCount){
    // Make sure the render loop knows to stop. We'll restart it when we're done here
    changingColumns = true;
    // Save the dom and render logic state for the old column count
    cache[columnCount] = {
      content: board.innerHTML,
      lastRendered,
      columnHeights: [...columnHeights]
    };
    columnCount = newColumnCount;
    // Double check that we don't already have existing data for the new column count
    if(cache[newColumnCount]){
      board.innerHTML = cache[newColumnCount].content;
      replace(columnHeights, cache[newColumnCount].columnHeights);
      lastRendered = cache[newColumnCount].lastRendered;
    } else {
      board.innerHTML = '';
      replace(columnHeights, writeColumns(newColumnCount, board));
      lastRendered = -1;
    }
    // Allow render loops to run, then start it up again
    changingColumns = false;
    processNext();
  }
});

resizer.observe(board);
//#endregion

//#region Entrypoint
// Start fetching the data and render the layout when it appears. This will be obfuscated by the splash screen
gulp(cards).then(finished=>{
  dataComplete = finished;
  processNext()
});

// Apply styles from env as an adopted stylesheet because CSP has a problem with <style> tags
const envStyles = new CSSStyleSheet();
envStyles.replaceSync(`body {
  --card-gap: ${import.meta.env.VITE_SITE_GAP}px;
  --max-col-width: ${import.meta.env.VITE_SITE_MAX_COL_WIDTH}px;
}`);
document.adoptedStyleSheets.push(envStyles);

// Open and set up the "splash screen"
splash.showModal();
const splashClose = document.getElementById('splash-close') as HTMLButtonElement;
// the button will still be first in the tab order, but don't show the focus outline unless they try to tab
splashClose.blur();

splashClose.addEventListener('click', () => {
  // Completely delete the splash screen so the opacity effects can clear
  splash.parentElement?.removeChild(splash);
  // Again, remove the focus unless they actively start keyboard nav. Cards will tab in order correctly
  (document.activeElement as HTMLElement | undefined)?.blur();
});
