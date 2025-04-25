import { DataStore } from "./data.ts";
import { renderCard } from "./render.ts";
import { BoardState } from "./view-state.ts";

// static
const maxColCount = ~~import.meta.env.VITE_SITE_MAX_COL_COUNT;
const maxColWidth = ~~import.meta.env.VITE_SITE_MAX_COL_WIDTH;

// Guaranteed elements on load
const board = document.getElementById("board") as HTMLElement;
const splash = document.getElementById("splash") as HTMLDialogElement;

// State
const data = new DataStore();
const startingColumns = getColumnCount(window.innerWidth);
const boardState = new BoardState(board, startingColumns);

//#region Render Loop
/**
 * This determines if new cards are far enough off-screen that we should pause rendering new cards
 * @returns boolean
 */
const canFetchMore = () => {
  const minHeight = Math.min(...boardState.columns.heights);
  const cutoff = minHeight === Infinity ? 0 : minHeight;
  return (
    cutoff - board.scrollTop <=
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
  if (!canFetchMore()) {
    // If we've rendered enough, break, but add an event listener to start the render loop again if we're approaching new cards to render
    board.addEventListener("scroll", handleScroll);
    return;
  }
  // Try to grab the next card
  const next = boardState.lastRendered + 1;
  const card = await data.fetchCard(next);
  if(card === null){
    console.log('No card #', next);
    // If card comes back null, then we've done everything we could, there are no more cards to render
    return;
  }
  console.log('Rendering #', next);
  // Select the least filled out column, to render the card into
  const newCard = renderCard(data.cards[next], next);
  await boardState.handleRendered(newCard, next);

  // Keep processing new cards. The beginning of processNext will worry about if we should or not
  // This should not be a problem with "too much recursion", the recursion stops on a scale of "how many cards are on [single digit] screen heights" and the recursion limits are something like 9000+
  processNext();
}
//#endregion

//#region Column Recount
function getColumnCount(outerWidth: number) {
  return Math.min(Math.ceil(outerWidth / maxColWidth), maxColCount)
}

/**
 * Watches the board width and sets the number of columns accordingly, with some caching logic
 */
const resizer = new ResizeObserver((entries) => {
  const newest = entries.at(-1);
  // Since this is a simple resize observer on a simple element, it should be safe to assume there's only 1 border box size per entry
  const width = newest?.borderBoxSize[0].inlineSize!;
  const newColumnCount = getColumnCount(width);
  if(newColumnCount !== boardState.columnCount){
    boardState.setColumnCount(newColumnCount).then(()=>processNext());
  }
});

resizer.observe(board);
//#endregion

//#region Entrypoint
// Once the columns are set up, start fetching and rendering cards. The splash screen will cover the first batch up, and future cards will render off screen
boardState.initializing.then(()=>processNext());

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
//#endregion
