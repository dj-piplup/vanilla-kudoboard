# Vanilla Postboard

Static website layout that takes a json of "card" data and lays it out into a masonry wall with text and image posts. By default, cards are lazy-loaded up to one screen-height off screen.

This is meant to be a template you can fork and use yourself. Simple configuration can be done with .env or theme.css. If you have an alternate data method (say, an api endpoint), data.ts defines a "gulp" function to fetch each "gulp" of data.

## .env

`VITE_SITE_TITLE` is the title that goes on the tab

`VITE_SITE_BANNER` is the title that goes on the banner at the top of the page

`VITE_SITE_SPLASH_TEXT` is the text that appears on the splash screen

`VITE_SITE_SPLASH_CONTINUE` is the text that appears on the button for moving past the splash screen

`VITE_SITE_EMBED_DESCRIPTION` is the text that displays in search engine results and embed blocks when linking the site

`VITE_SITE_GAP` is the amount of px between each card. Normally, this is a style, but it gets used in the masonry calculations.

`VITE_SITE_MAX_COL_COUNT` is the maximum amount of columns the layout can distribute into

`VITE_SITE_MAX_COL_WIDTH` is how wide columns can be before they split into 2 columns. This is done as max width not min so that it can be reused for styling in the max column count case

`VITE_SITE_LAZY_FACTOR` is the number of screens ahead to load cards. "2" means to load cards until 2 screens worth of cards exist past your scroll position, including the screen that's visible. If your screen is 1080px tall, then the site will load cards until a block of 2160 px is fully filled with cards, then pause until you scroll

## src/theme.css

`--header-color` is the background color of the header

`--header-text` is the color of the text for the header

`--button-color` is the base color for buttons

`--button-hover` is the button color while your mouse is over it

`--button-text` is the color of the text on the button

`--card-roundness` is how large the rounded corners on the card are

`--card-text` is the font color for everything else that isn't otherwise specified by the above text colors

`--card-color` is the background color of each card

`--card-username` is the color of the username text on the bottom right corner of the card

`background` is for the entire site. This can stay a color or be an image using `URL('<image url>')`. Image may take further styling. Images are default sized so that they cover the entire back of the page with no repeats, so the entire image may not be visible

Theme variables default in light mode, and get overridden for dark mode (see the @media section in the same file)

## src/data.ts

Defines a function for each "gulp" of data, which takes the current data set in, modifies the data in-place, and returns whether or not there's more data to get. The default "gulp" is to grab the full statically defined json in one go, but this can be modified to, for instance, query an api for 20 more cards after \[cards.length\]

## dev-src/...

This section is for any sort of preprocessing you want to do, such as parsing a csv file and writing it to a json for front-end use. Default behavior:

### process-csv.ts

Called by `pnpm process:data`. Reads in all csv files in the `/raw` folder, throws them into the csv parser, and writes the result to a json file in `/public`. This is not automatic in any workflow, and will not cause a hot reload in dev mode either.

### csv-structure.ts

This defines how to parse the csv. `columns` is the name of each column's json key, not a pretty name. This must match the csv's column counts exactly, even if there are unused columns at the end. `transforms` defines any sort of logic that should be done on a given column. The keys must match a column you defined, and gets called immediately after parsing, but before the final json is written

### markdown.ts

This preprocesses messages to use markdown formatting, rather than offloading that logic to frontend. For the most part, it's just a wrapper around `marked`, but can be used to customize the markdown process options and renderers and keep it as a simple 1-2 arg function.