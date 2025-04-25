import { Card } from "./data";
import DOMPurify from "dompurify";

// This is for syntax highlighting purposes. These functions tag template strings "as-is"
const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values);

/**
 * Writes N columns into a parent element and returns the height state with an appropriate amount of "0"s
 * @param count Number of columns
 * @param parent 
 */
export function writeColumns(
  count: number,
  parent: HTMLElement
) {
  for (let i = 0; i < count; i++) {
    const col = document.createElement("section");
    col.id = `column-${i}`;
    col.classList.add("column");
    parent.appendChild(col);
  }
}

/**
 * Renders a single card from card data
 * @param data The actual card data to be rendered
 * @param index The card's index in the card array, used to render tab order
 * @returns The HTML element of the card
 */
export const renderCard = (data: Card, index: number): HTMLElement => {
  const img = data.art ? html`<img src=${data.art} class="card-img" />` : "";
  const cardMarkup = html`
    <article tabindex=${index + 1} class="card">
      ${img}
      <section class="card-content">
        <div class="card-text">${DOMPurify.sanitize(data.message)}</div>
        <div class="card-info">
          <p class="card-name">${data.name}</p>
        </div>
      </section>
    </article>
  `;
  // use ".innerHTML" to parse the card, but pull it out and discard the wrapper afterward
  const wrapper = document.createElement("div");
  wrapper.innerHTML = cardMarkup;
  const card = wrapper.firstElementChild as HTMLElement;
  wrapper.removeChild(card);
  return card;
};

export const paintPromise = async (img: HTMLElement): Promise<void> => {
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
};
