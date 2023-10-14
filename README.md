# sessions-to-ics

**Updated for 2023!**

This script exports the re:Invent sessions you've flagged as favorites to iCal (.ics) format.

It generates one `.ics` file for each type of session (e.g. Builders Sessions, Workshops, etc.) and an
`all-sessions.ics` file with all sessions combined.

It will also generate an `all-sessions.csv` file that can be opened in Excel, Google Sheets, or Numbers and,
once you've registered, a `reserved.ics` file containing your reserved sessions.

Steps to use:

1. Go to your AWS re:Invent [Sessions](https://hub.reinvent.awsevents.com/attendee-portal/agenda/). Make sure you're logged in.

2. Open your browser's Developer Tools and select any request to view it's properties. (You may need to refresh the page)

3. Save the `Cookie` value from the Request headers to `reinvent.cookie`. You can get this by copying the header value, copying the full request as curl and pulling out the `-H` value, etc. It should look like `AWSALB=7Sr4u...`; do not save the `Cookie: ` key to the file.
ß
4. Get the "userUid" from the Response returned at the "/user" http call at Developer Tools.

6. Run `./get_sessions.sh "<userUid>"` passing the userUid; this will create two files, `sessions_YYYY-MM-DDTHHMM.json` and `interests_YYYY-MM-DDTHHMM.json`.

7. Install node modules

    ```bash
    npm install
    ```
    
8. Execute the script to generate the `.ics` files.

   ```bash
   Usage: node sessions-to-ics.js [options] <sessions> <interests>

   Arguments:
      sessions                the session catalog
      interests               the interests file

   Options:
      -V, --version           output the version number
      -o, --output-dir <dir>  the output directory (default: "sessions")
      -r, --reserved-only     Only output reserved sessions
      -h, --help              display help for command
   ```
   
   ICS files will be written to the output directory (default `./sessions`).

9. Import the `*.ics` files into the Calendar of your choice.
