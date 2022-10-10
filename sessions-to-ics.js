const cheerio = require("cheerio");
const fs = require("fs");
const ics = require("ics");
const { DateTime } = require("luxon");
const { program } = require('commander');

const year = DateTime.now().year;
const dateRx = /(Mon|Tues|Wednes|Thurs|Fri)day, (December|November) (\d{1,2})/
const timeRx = /(\d{1,2}):(\d{2}) (AM|PM) - (\d{1,2}):(\d{2}) (AM|PM)/;

// Selectors for elements
const SESSION_SELECTOR="div[data-testid$=sessionCard]"

// these selectors are relative to SESSION_SELECTOR
const SESSION_TITLE="h3"
const SESSION_CODE="h3 + span"
const SESSION_DESCRIPTION="div.sanitized-html"
const SESSION_PROPS="div > div > div + div > div > div + div + div + div > div > div"

// props are relative to SESSION_PROPS
const SESSION_PROPS_KEY="div > div > div > div"
// there is some massaging done to this next element in the function anyways
const SESSION_PROPS_VALUE="div > div > div"

function extractTimeDetails(sessionProps) {
    function normalizeHour(hour, ap) {
        return (hour % 12) + (ap.toUpperCase() === "PM" ? 12 : 0);
    }

    function vegasDate(mon, dt, hour, ap, min) {
        return DateTime.local(year, mon, dt, normalizeHour(hour, ap), min)
            .setZone('America/Los_Angeles', { keepLocalTime: true })
            .setZone('UTC');
    }

    const matchDate = dateRx.exec(sessionProps["Date"]);
    const monthName = matchDate[2].toLowerCase();
    const month = monthName === "november" ? 11 : 12;
    const date = +matchDate[3];

    const matchTime = timeRx.exec(sessionProps["Time"]);
    const startHour = +matchTime[1];
    const startMin = +matchTime[2];
    const startAp = matchTime[3];
    const endHour = +matchTime[4];
    const endMin = +matchTime[5];
    const endAp = matchTime[6];

    const startDate = vegasDate(month, date, startHour, startAp, startMin);
    const endDate = vegasDate(month, date, endHour, endAp, endMin);

    const duration = endDate.diff(startDate, ['hours', 'minutes']);
    return {
        start: [startDate.year, startDate.month, startDate.day, startDate.hour, startDate.minute],
        duration: { hours: duration.hours, minutes: duration.minutes },
    };
}

function extractTitle($, sessionContainer) {
    const titleNode = $(SESSION_TITLE, sessionContainer);
    const codeNode = $(SESSION_CODE, sessionContainer);
    const title = $(titleNode).text();
    const code = $(codeNode).text();
    return `${title} [${code}]`;
}

function extractDescription($, sessionContainer) {
    return $(SESSION_DESCRIPTION, sessionContainer).html().replace(/\s\s+/g, " ");
}

function extractSessionProps($, sessionContainer) {
    const sessionInfoElements = $(SESSION_PROPS, sessionContainer);
    const sessionInfo = {};
    sessionInfoElements.children((idx, n) => {
        const key = $(SESSION_PROPS_KEY, n).text()
        const value = $(SESSION_PROPS_VALUE, n)[1].next.data
        sessionInfo[key] = value
    });
    console.log(sessionInfo)
    return sessionInfo;
}

function normalizeFilename(filename) {
    return filename.toLowerCase().replace(/[^a-z]+/, '-');
}

function toIcs($, sessionContainer) {
    const sessionProps = extractSessionProps($, sessionContainer)
    const title = extractTitle($, sessionContainer);
    const description = extractDescription($, sessionContainer);
    const sessionType = sessionProps['Session type'];

    let timeDetails = {};
    try {
        timeDetails = extractTimeDetails(sessionProps);
    } catch (err) {
        // console.debug(err);
        // console.debug($(sessionContainer).html());
        console.warn(`Unable to extract schedule for session: ${title}`);
        return { undefined, undefined };
    }

    const event = {
        start: timeDetails.start,
        startInputType: "utc",
        duration: timeDetails.duration,
        location: sessionProps["Location"],
        title: title,
        description: `${sessionType}\n\n${description}`
    };
    return { sessionType, event };
}

function writeEvents(eventList, outputDir, filename) {
    filename = normalizeFilename(filename);
    ics.createEvents(eventList, (err, icsEvents) => {
        if (err) {
            throw err;
        } else {
            fs.writeFileSync(`${outputDir}/${filename}.ics`, icsEvents);
            console.log(`Wrote ${eventList.length} events to ${outputDir}/${filename}.ics`);
        }
    });
}

function parseEvents(inputFile, options, command) {
    const outputDir = options.outputDir;

    fs.mkdirSync(`./${outputDir}`, {recursive: true});
    const $ = cheerio.load(fs.readFileSync(inputFile), {
        normalizeWhitespace: true,
    });

    const events = {};
    $(SESSION_SELECTOR).each((idx, row) => {
        const { sessionType, event } = toIcs($, row.children);
        if (event) {
            if (!events.hasOwnProperty(sessionType)) {
                events[sessionType] = []
            }
            events[sessionType].push(event);
        }
    });

    let allEvents = [];
    for (const eventType in events) {
        allEvents = allEvents.concat(events[eventType]);
        writeEvents(events[eventType], outputDir, `${eventType}s`);
    }
    writeEvents(allEvents, outputDir, 'all-sessions');
}

program
    .name('sessions-to-ics')
    .version('2022.0.0')
    .showHelpAfterError(true)
    .option('-o, --output-dir <dir>', 'the output directory', 'sessions')
    .argument('[file]', 'the input file', 'sessions.html')
    .action(parseEvents)
    .parse();
