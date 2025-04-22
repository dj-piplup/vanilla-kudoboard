import { parseMessage } from "./markdown.ts";

export const hasHeaders = true;
export const columns = ['timestamp','name','message','art']
export const transforms = {
    message: (message) => {
        return parseMessage(message, false)
    },
}
