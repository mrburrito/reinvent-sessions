const cheerio = require("cheerio");
const fs = require("fs");
const ics = require("ics");
const { DateTime } = require("luxon");

const $ = cheerio.load(fs.readFileSync("./sessions.html"), {
  normalizeWhitespace: true,
});

const timeRx = /(Mon|Tues|Wednes|Thurs|Fri)day, (Dec) (\d{1,2}), (\d\d?):(\d{2}) (AM|PM) - (\d\d?):(\d{2}) (AM|PM)/;

function extractTimeDetails(text) {
  function normalizeHour(hour, ap) {
    return (hour % 12) + (ap.toUpperCase() === "PM" ? 12 : 0);
  }

  function vegasDate(mon, dt, hour, ap, min)  {
    return DateTime.local(2019, mon, dt, normalizeHour(hour, ap), min)
        .setZone('America/Los_Angeles', {keepLocalTime: true})
        .setZone('UTC');
  }

  const match = timeRx.exec(text);
  const monthName = match[2].toLowerCase();
  const month = monthName === "nov" ? 11 : 12;
  const date = +match[3];
  const startHour = +match[4];
  const startMin = +match[5];
  const startAp = match[6];
  const endHour = +match[7];
  const endMin = +match[8];
  const endAp = match[9];

  const startDate = vegasDate(month, date, startHour, startAp, startMin);
  const endDate = vegasDate(month, date, endHour, endAp, endMin);

  const duration = endDate.diff(startDate, ['hours','minutes']);
  return {
    start: [startDate.year, startDate.month, startDate.day, startDate.hour, startDate.minute],
    duration: {hours: duration.hours, minutes: duration.minutes},
  };
}

function toIcs(row) {
  let timeDetails = {};
  try {
    timeDetails = extractTimeDetails($(".sessionTimeList", row).html());
  } catch (err) {
    console.log(err);
    console.log($(row).html());
    return undefined;
  }
  const type = $(".type", row).text();
  let description = $(".abstract", row).html();
  description = description.substring(0, description.indexOf(" <a"));

  const event = {
    start: timeDetails.start,
    startInputType: "utc",
    duration: timeDetails.duration,
    location: $(".sessionRoom", row).text().replace(/^[^A-Za-z]*/g, ""),
    title: $(".openInPopup span", row).text(),
    description: `${type}\n\n${description}`,
  };
  return event;
}

function toNormalizedType(row) {
  const type = $(".type", row).text();
  return type.toLowerCase().replace(/ +/, '-');
}

const events = {};
$(".sessionRow").each((idx, row) => {
  const event = toIcs(row);
  if (event) {
    const eventType = toNormalizedType(row);
    if (!events.hasOwnProperty(eventType)) {
      events[eventType] = []
    }
    events[eventType].push(event);
  }
});

function writeEvents(eventList, filename) {
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
