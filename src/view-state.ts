import { paintPromise, writeColumns } from "./render";

export class BoardState {
  cache: Record<number, ColumnsState> = {};

  board: HTMLElement;

  #columns: ColumnsState;
  get columns() {
    return this.#columns;
  }
  async setColumns(v: ColumnsState) {
    await (this.rendering ?? Promise.resolve());
    this.#columns?.save();
    this.#columns = v;
    this.#columns.load();
    if (!(this.#columns.count in this.cache)) {
      this.cache[this.#columns.count] = this.#columns;
      writeColumns(this.#columns.count, this.board);
    }
  }

  #columnCount: number;
  get columnCount(): number {
    return this.#columnCount;
  }
  async setColumnCount(v: number) {
    const normalized = Math.max(0, Math.min(v, ~~import.meta.env.VITE_SITE_MAX_COL_COUNT));
    if (normalized === this.#columnCount) {
      return;
    }
    this.#columnCount = v;
    // Double check that we don't already have existing data for the new column count
    if (this.cache[v]) {
      return this.setColumns(this.cache[v]);
    } else {
      return this.setColumns(new ColumnsState(this.board, v));
    }
  }

  initializing: Promise<void>;

  constructor(board: HTMLElement, count: number) {
    this.board = board;
    this.initializing = this.setColumnCount(count);
    // This is to appease typescript. There isn't really a way for the setter to not set the other values. If these come first, they'll get overwritten, if they come second, they won't do anything
    this.#columnCount ??= 0;
    this.#columns ??= new ColumnsState(this.board, 0);
  }

  get lastRendered() {
    return this.columns.lastRendered;
  }

  rendering?: Promise<void> 

  async handleRendered(cardEl: HTMLElement, index: number) {
    this.rendering = this.#handleRendered(cardEl, index);
    await this.rendering;
  }

  async #handleRendered(cardEl: HTMLElement, index: number) {
    const col = this.#columns;
    const nextColIdx = col.getNextIndex();
    // Add the card to the dom so we can evaluate height
    document.getElementById(`column-${nextColIdx}`)!.appendChild(cardEl);
    const img = cardEl.querySelector("img");
    if (img) {
      // If there's an image on the card, we need to wait for it to at least load the size of the image so we know how tall the card actually is
      await paintPromise(img);
    }
    // Check the height of the card, and add it to the height of the column we're putting it in
    const bbox = cardEl.getBoundingClientRect();
    this.#columns.placeCard(bbox.height, nextColIdx, index);
  }
}

export class ColumnsState {
  /**
   * How tall each column is in pixels
   */
  heights: number[] = [];
  /**
   * The index of the last card to get rendered
   */
  lastRendered = -1;
  /**
   * How many columns there are. This is subject to change via a resize observer, and will cause the layout to be rerendered. The board dom is cached when switching though
   */
  count: number;

  #html: string = "";

  parent: HTMLElement;

  save() {
    this.#html = this.parent.innerHTML;
  }

  load() {
    this.parent.innerHTML = this.#html;
  }

  getNextIndex() {
    let next = Math.floor(this.count / 2.01); // Default it close to the middle, pushing towards the start half on evens
    let nextH = this.heights[next];
    this.heights.forEach((h, idx) => {
      if (h < nextH) {
        next = idx;
        nextH = h;
      }
    });
    return next;
  }

  placeCard(height: number, column: number, index: number){
    this.heights[column] +=
      Math.floor(height) + ~~import.meta.env.VITE_SITE_GAP;

    this.lastRendered = index;
  }

  constructor(parent: HTMLElement, count: number) {
    this.parent = parent;
    this.count = count;
    this.heights = new Array(count).fill(0);
  }
}
