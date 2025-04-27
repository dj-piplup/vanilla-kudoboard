import { parseMessage } from "./markdown.ts";

const columnsIn = [
  "timestamp",
  "name",
  "message",
  "art"
] as const;

export const config: CSVConfig<typeof columnsIn> = {
  hasHeaders: true,
  columnsIn,
  transforms: {
    message: (raw) => {
      return parseMessage(raw, false);
    },
  },
};

interface CSVConfig<T extends readonly string[]> {
  /**
   * Says if the csv file includes a header row. Since we define our column names ourself, this is essentially "ignore the first row or not"
   * @default false
   */
  hasHeaders?: boolean;

  /**
   * The json keys each column will be mapped to
   */
  columnsIn: T;

  /**
   * Which keys to include in the final output, it doesn't have to be all of them
   * @default Uses columnsIn
   */
  columnsOut?: T[number][];

  /**
   * A mapping that says how to process each column's data
   */
  transforms?: Partial<
    Record<T[number], (raw: string, line?: number) => string>
  >;

  /**
   * Determines if a given row should be included in the final output or not **before** transformation
   * @param row The json object for the full input row
   * @returns true if the row should be output to the final json, false if not
   */
  prefilter?: (row: Record<T[number], string>) => boolean;

  /**
   * Determines if a given row should be included in the final output or not **after** transformation
   * @param row The json object for the full input row
   * @returns true if the row should be output to the final json, false if not
   */
  filter?: (row: Record<T[number], string>) => boolean;
}
