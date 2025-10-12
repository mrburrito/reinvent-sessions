# sessions-to-ics

**Updated for 2025!**

This script exports the re:Invent sessions you've flagged as favorites to iCal (.ics) format.

It generates one `.ics` file for each type of session (e.g. Builders Sessions, Workshops, etc.) and an
`all-sessions.ics` file with all sessions combined.

It will also generate an `all-sessions.csv` file that can be opened in Excel, Google Sheets, or Numbers and,
once you've registered, a `reserved.ics` file containing your reserved sessions.

You can use the `--save-agenda` option to save the raw JSON response from AWS with your session details
to `agenda.json`.

Steps to use:

1. Copy `config.template.json` to `config.json`

   ```bash
   cp config.template.json config.json
   ```

2. Open your browser's Developer Tools and go to the Network tab.

3. Go to the AWS re:Invent [Event Catalog](https://registration.awsevents.com/flow/awsevents/reinvent2025/event-catalog/page/eventCatalog). Make sure you're logged in.

4. Find the `myData` (https://catalog.awsevents.com/api/myData) request in the Network tab of Developer Tools.

5. Copy the `cookie`, `rfapiprofileid`, and `rfauthotken` headers and add them to `config.json`.

   You can copy the full request as a cURL request and find the `-H` values to load into `config.json`. Make sure to
   take only the values and not the `cookie: ` key prefix.

   You may need to ensure 'Cookies' are selected for inclusion in the
   headers and some browsers may use the `-b` flag for curl to set
   cookies instead of `-H 'cookie: ...'`.

6. Install node modules

    ```bash
    npm install
    ```
    
7.  Execute the script to generate the `.ics` files.

   ```bash
   $ node sessions-to-ics.js --help

   Usage: sessions-to-ics [options]

   Options:
      -V, --version           output the version number
      -o, --output-dir <dir>  the output directory (default: "sessions")
      -r, --reserved-only     Only output reserved sessions
      -a, --save-agenda       Save the raw agenda JSON to <dir>/agenda.json
      -h, --help              display help for command
   ```
   
   ICS files will be written to the output directory (default `./sessions`).

   ```bash
   $ node sessions-to-ics.js -a
   Retrieving agenda ...
   Saving raw agenda to sessions/agenda.json
   Downloaded agenda. Found 0 Reservations and 207 Interests.
   Wrote 92 events to sessions/chalk-talks.ics
   Wrote 66 events to sessions/breakout-sessions.ics
   Wrote 34 events to sessions/workshops.ics
   Wrote 9 events to sessions/gamified-learnings.ics
   Wrote 1 events to sessions/innovation-talks.ics
   Wrote 5 events to sessions/keynotes.ics
   Wrote 207 events to sessions/all-sessions.ics
   Wrote 207 events to sessions/all-sessions.csv
   ```

8. Import the `*.ics` files into the Calendar of your choice.
