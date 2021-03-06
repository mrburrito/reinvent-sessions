# sessions-to-ics

This script parses the HTML for AWS re:Invent's schedule pages and exports the discovered
events to iCal (.ics) format.

It generates one `.ics` file for each type of session (e.g. Builders Sessions, Workshops, etc.) and an
`all-sessions.ics` file with all sessions combined.

Steps to use:

1.  Go to your AWS re:Invent [interests](https://www.portal.reinvent.awsevents.com/connect/interests.ww)

1.  Open the Developer Console and execute the following commands:

    ```javascript
    // Expand schedule details
    $(".expandSessionImg").click();

    // Expand descriptions
    $(".moreLink").click();
    ```

1.  Copy the HTML (in Safari, it only worked from the "Elements" tab of the dev tools; not by saving the page)
    and paste into `sessions.html` in the same folder as this script.

1.  Install node modules

    ```bash
    npm install
    ```
    
1.  Execute the script to generate the `.ics` files.

    ```bash
    node sessions-to-ics.js
    ```
    
    *NOTE: Sessions that do not have scheduling details will be dumped to console*
    
1.  Import the `*.ics` file into the Calendar of your choice.
