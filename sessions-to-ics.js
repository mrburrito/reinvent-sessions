const fs = require("fs");
const ics = require("ics");
const { DateTime } = require("luxon");
const { program } = require("commander");

const CSV_HEADINGS = {
    startDay: "Start Day",
    startTime: "Start Time",
    endDay: "End Day",
    endTime: "End Time",
    venue: "Venue",
    room: "Room",
    sessionType: "Session Type",
    sessionId: "Session ID",
    title: "Title",
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
        return `${e.startDay},${e.startTime},${e.endDay},${e.endTime},"${e.venue}","${e.room}",${e.sessionType},"${e.sessionId}","${e.title}"`;
    });
    fs.writeFileSync(`${outputDir}/${filename}.csv`, outputEvents.join("\n"));
    console.log(`Wrote ${eventList.length} events to ${outputDir}/${filename}.csv`);
}

function loadSessionsByID(sessionsFile) {
    const sessions = JSON.parse(fs.readFileSync(sessionsFile));
    return sessions.data.reduce((a, v) => ({ ...a, [v.scheduleUid]: v}), {});
}

function lookupSession(lookupType, sessions, scheduleUid) {
    const session = sessions[scheduleUid];
    if (!session) {
        console.warn(`Unknown Session [${lookupType}]: ${scheduleUid}`);
    }
    return session;
}

function loadInterests(interestsFile, sessions) {
    const interests = JSON.parse(fs.readFileSync(interestsFile));
    return interests.data.followedSessions
        .map((interest) => lookupSession("Interests", sessions, interest.scheduleUid))
        .filter(exists);
}

function loadReserved(interestsFile, sessions) {
    const interests = JSON.parse(fs.readFileSync(interestsFile));
    return interests.data.userReservationSessions
        .map((reservation) => lookupSession("Reservations", sessions, reservation.scheduleUid))
        .filter(exists);
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
    const event = {
        start: toIcsDateTime(session.startDateTime),
        startInputType: "utc",
        end: toIcsDateTime(session.endDateTime),
        location: `${session.venueName} - ${session.locationName}`,
        title: `${session.thirdPartyID} - ${session.title}`,
        description: `${sessionType}\n\n${session.description}`,
    };
    return { sessionType, event };
}

function sessionToCsv(session) {
    const start = toCsvDateTime(session.startDateTime);
    const end = toCsvDateTime(session.endDateTime);
    return {
        startDay: start.day,
        startTime: start.time,
        endDay: end.day,
        endTime: end.time,
        venue: session.venueName,
        room: session.locationName,
        sessionType: session.sessionType,
        sessionId: session.thirdPartyID.replace(/\s+/g, ""),
        title: session.title,
    };
}

function interestsToICS(sessionsFile, interestsFile, options, command) {
    const sessions = loadSessionsByID(sessionsFile);
    const interests = loadInterests(interestsFile, sessions);
    const reservations = loadReserved(interestsFile, sessions);
    const outputDir = options.outputDir;

    fs.mkdirSync(`./${outputDir}`, {recursive: true});

    if (!options.reservedOnly) {
        const events = {};
        interests.filter(exists).map(sessionToIcs).forEach((session) => {
            if (!events.hasOwnProperty(session.sessionType)) {
                events[session.sessionType] = [];
            }
            events[session.sessionType].push(session.event);
        });

        let allEvents = [];
        for (const eventType in events) {
            allEvents = allEvents.concat(events[eventType]);
            writeEvents(events[eventType], outputDir, `${eventType}s`);
        }
        writeEvents(allEvents, outputDir, 'all-sessions');

        const csvEvents = interests.filter(exists).map(sessionToCsv);
        writeCsv(csvEvents, outputDir, 'all-sessions');
    }

    writeEvents(reservations.map((r) => sessionToIcs(r).event), outputDir, "reserved");
}

program
    .name('sessions-to-ics')
    .version('2023.0.0')
    .showHelpAfterError(true)
    .option('-o, --output-dir <dir>', 'the output directory', 'sessions')
    .option('-r, --reserved-only', 'Only output reserved sessions')
    .argument('<sessions>', 'the session catalog')
    .argument('<interests>', 'the interests file')
    .action(interestsToICS)
    .parse();
