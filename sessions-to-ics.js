const axios = require('axios');
const fs = require("fs");
const ics = require("ics");
const { DateTime } = require("luxon");
const { program } = require("commander");
const pluralize = require("pluralize");

const configTemplate = {
    cookie: "",
    rfapiprofileid: "",
    rfauthtoken: ""
};

// Check if config.json exists; if not, copy from the template
const CONFIG_FILE = 'config.json';

if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configTemplate, null, 2));
}

// Show help information
const CONFIG_HELP = `
Please open developer tools in your browser and log in to view your re:Invent agenda.

https://registration.awsevents.com/flow/awsevents/reinvent24/myagenda/page/myagenda

Update the values in config.json (shown below) with the corresponding headers from
the https://catalog.awsevents.com/api/myData request.

${JSON.stringify(configTemplate, null, 2)}
`.trimStart();

// Function to fetch the agenda data
const fetchAgenda = async (options) => {
    // Load the configuration file
    const {cookie, rfapiprofileid, rfauthtoken} = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

    // Check if any required value is missing and show help
    if (!cookie || !rfapiprofileid || !rfauthtoken) {
        console.error(CONFIG_HELP);
        process.exit(1);
    }

    try {
        console.error("Retrieving agenda ...");
        // Make the HTTP request using axios
        const response = await axios.post(
            'https://catalog.awsevents.com/api/myData',
            {},
            {
                headers: {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.9',
                    'content-length': '0',
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'rfapiprofileid': rfapiprofileid,
                    'rfauthtoken': rfauthtoken,
                    'rfwidgetid': '2mD9wSl40wp2ViMLVpbqhzk20AkPDb6Z',
                    'cookie': cookie,
                    'origin': 'https://registration.awsevents.com',
                    'priority': 'u=1, i',
                    'referer': 'https://registration.awsevents.com/',
                    'sec-ch-ua-mobile': '?0',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                }
            }
        );

        if (options.saveAgenda) {
            const agendaFile = `${options.outputDir}/agenda.json`;
            console.error(`Saving raw agenda to ${agendaFile}`);
            fs.writeFileSync(agendaFile, JSON.stringify(response.data, null, 2));
        }

        if (!response.data.hasOwnProperty('loggedInUser')) {
            console.error('Unable to download schedule. Please check credentials and try again.\n');
            showHelp();
            process.exit(1);
        }

        const agenda = {
            reserved: response.data.mySchedule?.filter(exists)?.map(parseSession) ?? [],
            interests: response.data.sessionInterests?.filter(exists)?.map(parseSession) ?? [],
        };
        console.error(`Downloaded agenda. Found ${agenda.reserved.length} Reservations and ${agenda.interests.length} Interests.`);
        return agenda;
    } catch (error) {
        // Handle errors from the HTTP request
        if (error.response) {
            console.error(`Failed to fetch agenda. HTTP Status: ${error.response.status}`);
        } else {
            console.error(`An error occurred: ${error.message}`);
        }
        process.exit(1);
    }
};

const CSV_HEADINGS = {
    startDay: "Start Day",
    startTime: "Start Time",
    endDay: "End Day",
    endTime: "End Time",
    venue: "Venue",
    room: "Room",
    capacity: "Capacity",
    sessionType: "Session Type",
    sessionId: "Session ID",
    title: "Title",
    topics: "Topic",
    areasOfInterest: "Area of Interest"
};

function exists(obj) {
    return obj !== null && obj !== undefined;
}

function normalizeFilename(filename) {
    return filename.toLowerCase().replace(/[^a-z]+/, '-');
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

function writeCsv(eventList, outputDir, filename) {
    filename = normalizeFilename(filename);
    const eventsWithHeadings = [CSV_HEADINGS, ...eventList];
    const outputEvents = eventsWithHeadings.map((e) => {
        return `${e.startDay},${e.startTime},${e.endDay},${e.endTime},"${e.venue}","${e.room}",${e.capacity},${e.sessionType},"${e.sessionId}","${e.title}","${e.topics}","${e.areasOfInterest}"`;
    });
    fs.writeFileSync(`${outputDir}/${filename}.csv`, outputEvents.join("\n"));
    console.log(`Wrote ${eventList.length} events to ${outputDir}/${filename}.csv`);
}

function toIcsDateTime(unixTimeSec) {
    const unixTimeMs = unixTimeSec * 1000;
    const date = new Date(unixTimeMs);
    return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1, // ICS months are 1-indexed; JavaScript are 0
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes()
    ];
}

function toCsvDateTime(unixTimeSec) {
    const unixTimeMs = unixTimeSec * 1000;
    const date = DateTime.fromMillis(unixTimeMs).setZone("America/Los_Angeles");
    return { day: date.toFormat("EEE"), time: date.toFormat("HH:mm") }
}

function sessionToIcs(session) {
    const sessionType = session.sessionType;
    const withPrefix = (s, sep) => s ? `${sep}${s}` : '';
    const formatSpeaker = (s) => `${s.name}${withPrefix(s.jobTitle, ' - ')}${withPrefix(s.company, ' - ')}`;
    const speakers = session.speakers?.map(formatSpeaker);
    const topics = session.topics?.sort()?.join(', ') ?? '';
    const areasOfInterest = session.areasOfInterest?.sort()?.join(', ') ?? '';

    const event = {
        start: toIcsDateTime(session.start),
        startInputType: "utc",
        end: toIcsDateTime(session.end),
        location: `${session.venue} | ${session.room}`,
        title: `${session.code} - ${session.title}`,
        description: [
            `${sessionType}\nCapacity: ${session.capacity}`,
            withPrefix(topics, 'Topics: '),
            withPrefix(areasOfInterest, 'Areas of Interest: '),
            session.abstract,
            speakers?.join('\n'),
        ].filter(exists).join('\n\n'),
    };
    return { sessionType, event };
}

function sessionToCsv(session) {
    const start = toCsvDateTime(session.start);
    const end = toCsvDateTime(session.end);
    return {
        startDay: start.day,
        startTime: start.time,
        endDay: end.day,
        endTime: end.time,
        venue: session.venue,
        room: session.room,
        capacity: session.capacity,
        sessionType: session.sessionType,
        sessionId: session.code,
        title: session.title,
        topics: session.topics?.sort()?.join(', ') ?? '',
        areasOfInterest: session.areasOfInterest?.sort()?.join(', ') ?? '',
    };
}

function getAttribute(session, attributeId) {
    return session.attributevalues?.filter((a) => a.attribute_id === attributeId)?.map((a) => a.value) ?? [];
}

function toTitleCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function parseSession(session) {
    const toUnixTime = (d) => DateTime.fromFormat(d, 'yyyy/MM/dd HH:mm:ss', {zone: 'UTC'}).toUnixInteger();
    const sessionTime = session.times[0];
    const [venue, ...room] = sessionTime.room.split(' | ');

    return {
        code: session.code.replace(/\s+/, ''),
        title: session.title,
        sessionType: toTitleCase(pluralize.singular(getAttribute(session, 'Sessiontypes')[0])),
        abstract: session.abstract,
        speakers: session.participants?.map((p) => ({
            name: p.fullName,
            company: p.companyName,
            jobTitle: p.jobTitle
        })),
        topics: getAttribute(session, 'Topic'),
        areasOfInterest: getAttribute(session, 'Areaofinterest'),
        venue,
        room: room.join(' | '),
        capacity: sessionTime.capacity,
        start: toUnixTime(sessionTime.utcStartTime),
        end: toUnixTime(sessionTime.utcEndTime),

    };
}

async function exportSessions(options, command) {
    const {reserved, interests} = await fetchAgenda(options);
    const outputDir = options.outputDir;

    fs.mkdirSync(`./${outputDir}`, {recursive: true});

    if (!options.reservedOnly) {
        const events = {};
        interests.map(sessionToIcs).forEach(({sessionType, event}) => {
            if (!events.hasOwnProperty(sessionType)) {
                events[sessionType] = [];
            }
            events[sessionType].push(event);
        });

        let allEvents = [];
        for (const eventType in events) {
            allEvents = allEvents.concat(events[eventType]);
            writeEvents(events[eventType], outputDir, `${eventType}s`);
        }
        writeEvents(allEvents, outputDir, 'all-sessions');

        const csvEvents = interests.map(sessionToCsv);
        writeCsv(csvEvents, outputDir, 'all-sessions');
    }

    if (reserved.length > 0) {
        writeEvents(reserved.map((r) => sessionToIcs(r).event), outputDir, "reserved");
    }
}

program
    .name('sessions-to-ics')
    .version('2024.0.0')
    .showHelpAfterError(true)
    .option('-o, --output-dir <dir>', 'the output directory', 'sessions')
    .option('-r, --reserved-only', 'Only output reserved sessions')
    .option('-a, --save-agenda', 'Save the raw agenda JSON to <dir>/agenda.json')
    .action(exportSessions)
    .parse();
