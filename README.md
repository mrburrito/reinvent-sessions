# sessions-to-ics

This script parses the HTML for AWS re:Invent's schedule pages and exports the discovered
events to iCal (.ics) format.

It generates one `.ics` file for each type of session (e.g. Builders Sessions, Workshops, etc.) and an
`all-sessions.ics` file with all sessions combined.

Steps to use:

1. Go to your AWS re:Invent [Sessions](https://portal.awsevents.com/events/reInvent2021/dashboard/event/sessions)

2. Open `My Favorites`

3. Scroll to the bottom and click `Show more sessions` until all sessions are loaded
 
5. Open the Developer Console

6. Copy the HTML (in Safari, it only worked from the "Elements" tab of the dev tools; not by saving the page)
   and paste into `sessions.html` in the same folder as this script.

7. Install node modules

    ```bash
    npm install
    ```
    
8. Execute the script to generate the `.ics` files.

    ```bash
    node sessions-to-ics.js
    ```
    
    *NOTE: Sessions that do not have scheduling details will be dumped to console*
    
9. Import the `*.ics` files into the Calendar of your choice.
