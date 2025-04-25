export class DataStore {
  cards: Card[] = [];

  dataComplete: boolean = false;

  /**
   * Data fetching function, for if you have an api instead of a json file, and don't want to fetch all at once
   * Modifies the stored cards
   */
  async gulp(): Promise<void> {
    if(this.dataComplete) return;
    await fetch("./formdata.json")
      .then((r) => r.json())
      .then((json) => this.cards.push(...json));
    this.dataComplete = true;
    return;
  }

  remoteCouldHave(index: number) {
    return !this.dataComplete && !(index in this.cards);
  }

  async fetchCard(index: number): Promise<Card | null> {
    while(this.remoteCouldHave(index)){
      await this.gulp();
    }
    return this.cards[index] ?? null;
  }
}
export interface Card {
  timestamp: string | number;
  name: string;
  message: string;
  tabIndex?: number;
  art?: string;
}
