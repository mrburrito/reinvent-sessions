# sessions-to-ics

This script parses the HTML for AWS re:Invent's schedule pages and exports the discovered
events to iCal (.ics) format.

It generates one `.ics` file for each type of session (e.g. Builders Sessions, Workshops, etc.) and an
`all-sessions.ics` file with all sessions combined.

Steps to use:

1. Go to your AWS re:Invent [Sessions](https://portal.awsevents.com/events/reInvent2021/dashboard/event/sessions)

2. Select the tab you want to export, likely `My favorites` or `My reservations` 

3. Scroll to the bottom and click `Show more sessions` until all sessions are loaded
 
4. Open the Developer Console

5. Copy the HTML (in Safari, it only worked from the "Elements" tab of the dev tools; not by saving the page)
   and paste into an HTML file in the same folder as this script. (e.g. `sessions.html`)

6. Install node modules

    ```bash
    npm install
    ```
    
7. Execute the script to generate the `.ics` files.

   ```bash
   Usage: node sessions-to-ics [options] [file]
   
   Arguments:
   file                    the input file (default: "sessions.html")
   
   Options:
   -V, --version           output the version number
   -o, --output-dir <dir>  the output directory (default: "sessions")
   -h, --help              display help for command
   ```
   
   ICS files will be written to the output directory (default `./sessions`).

   *NOTE: Sessions that do not have scheduling details will be dumped to console*
    
9. Import the `*.ics` files into the Calendar of your choice.
