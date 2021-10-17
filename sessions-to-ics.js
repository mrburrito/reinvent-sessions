const cheerio = require("cheerio");
const fs = require("fs");
const ics = require("ics");
const { DateTime } = require("luxon");

const $ = cheerio.load(fs.readFileSync("./sessions.html"), {
    normalizeWhitespace: true,
});

const dateRx = /(Mon|Tues|Wednes|Thurs|Fri)day, (December|November) (\d{1,2})/
const timeRx = /(\d\d?):(\d{2}) (AM|PM) - (\d\d?):(\d{2}) (AM|PM)/;

function extractTimeDetails(sessionProps) {
    function normalizeHour(hour, ap) {
        return (hour % 12) + (ap.toUpperCase() === "PM" ? 12 : 0);
    }

    function vegasDate(mon, dt, hour, ap, min) {
        return DateTime.local(DateTime.now().year, mon, dt, normalizeHour(hour, ap), min)
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

function extractTitle(sessionContainer) {
    const [titleNode, codeNode] = $(".awsui-util-mt-m > div", sessionContainer);
    const title = $(titleNode).text();
    const code = $(codeNode.firstChild).text();
    const extra = codeNode.lastChild != codeNode.firstChild ? ` ${$(codeNode.lastChild).text()}` : ""
    return `${title} [${code}${extra}]`;
}

function extractDescription(sessionContainer) {
    return $('.sanitized-html', sessionContainer).html().replace(/\s\s+/g, " ");
}

function extractSessionProps(sessionContainer) {
    const sessionInfoElements = $('.awsui-util-mr-xs', sessionContainer);
    const sessionInfo = {};
    sessionInfoElements.each((idx, n) => { sessionInfo[$(n.parent.children[0]).text().replace(":", "")] = $(n.parent.children[1]).text() });
    return sessionInfo;
}

function toIcs(sessionContainer) {
    const sessionProps = extractSessionProps(sessionContainer)
    let timeDetails = {};
    try {
        timeDetails = extractTimeDetails(sessionProps);
    } catch (err) {
        console.log(err);
        console.log($(sessionContainer).html());
        return undefined;
    }
    const sessionType = sessionProps["Session type"];
    const description = extractDescription(sessionContainer);

    const event = {
        start: timeDetails.start,
        startInputType: "utc",
        duration: timeDetails.duration,
        location: sessionProps["Location"],
        title: extractTitle(sessionContainer),
        description: `${sessionType}\n\n${description}`
    };
    return { sessionType, event };
}

const events = {};
$(".awsui-util-mb-xl").each((idx, row) => {
    const { sessionType, event } = toIcs(row);
    if (event) {
        if (!events.hasOwnProperty(sessionType)) {
            events[sessionType] = []
        }
        events[sessionType].push(event);
    }
});

function writeEvents(eventList, filename) {
    console.log(eventList)
    ics.createEvents(eventList, (err, icsEvents) => {
        if (err) {
            throw err;
        } else {
            fs.writeFileSync(`${__dirname}/${filename}.ics`, icsEvents);
            console.log(`Wrote ${eventList.length} events to ${__dirname}/${filename}.ics`);
        }
    });
}

let allEvents = [];
for (const eventType in events) {
    allEvents = allEvents.concat(events[eventType]);
    writeEvents(events[eventType], `${eventType}s`);
}
writeEvents(allEvents, 'all-sessions');