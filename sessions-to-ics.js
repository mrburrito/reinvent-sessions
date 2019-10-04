const cheerio = require("cheerio");
const fs = require("fs");
const ics = require("ics");

const $ = cheerio.load(fs.readFileSync("./sessions.html"), {
  normalizeWhitespace: true,
});

const timeRx = /(Mon|Tues|Wednes|Thurs|Fri)day, Dec (\d{1,2}), (\d\d?):(\d{2}) (AM|PM) - (\d\d?):(\d{2}) (AM|PM)/;

function extractTimeDetails(text) {
  function normalizeHour(hour, ap) {
    return (hour % 12) + (ap.toUpperCase() === "PM" ? 12 : 0);
  }

  const match = timeRx.exec(text);
  const date = +match[2];
  const startHour = +match[3];
  const startMin = +match[4];
  const startAp = match[5];
  const endHour = +match[6];
  const endMin = +match[7];
  const endAp = match[8];

  const startDate = new Date(2019, 11, date, normalizeHour(startHour, startAp), startMin);
  const endDate = new Date(2019, 11, date, normalizeHour(endHour, endAp), endMin);

  const durationInMin = (endDate - startDate) / 60000;
  return {
    start: [startDate.getFullYear(), startDate.getMonth()+1, startDate.getDate(), startDate.getHours(), startDate.getMinutes()],
    duration: {hours: Math.floor(durationInMin / 60), minutes: durationInMin % 60},
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
    duration: timeDetails.duration,
    location: $(".sessionRoom", row).text().replace(/^[^A-Za-z]*/g, ""),
    title: $(".openInPopup span", row).text(),
    description: `${type}\n\n${description}`,
  };
  return event;
}

const events = [];
$(".sessionRow").each((idx, row) => {
  const event = toIcs(row);
  if (event) {
    events.push(event);
  }
});

ics.createEvents(events, (err, icsEvents) => {
  if (err) {
    throw err;
  } else {
    fs.writeFileSync(`${__dirname}/sessions.ics`, icsEvents);
    console.log(`Wrote ${events.length} events to ${__dirname}/sessions.ics`);
  }
});
