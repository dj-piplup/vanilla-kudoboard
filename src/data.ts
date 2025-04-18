/**
 * Data fetching function, for if you have an api instead of a json file, and don't want to fetch all at once
 * @param cards - Existing cards before taking another "gulp"
 * @returns Promise that resolves when the data is finished fetching. True if this was the last gulp, false if not
 */
export async function gulp(cards: Card[]): Promise<boolean> {
    await fetch("./cards.json").then((r) => r.json()).then(json => cards.push(...json));
    return true;
}

export interface Card {
    timestamp: string | number;
    name: string;
    message: string;
    tabIndex?: number;
    art?: string;
  }