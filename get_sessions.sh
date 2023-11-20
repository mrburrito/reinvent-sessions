#!/usr/bin/env bash

if [[ ! -f reinvent.cookie ]]; then
    echo >&2 "Please login to https://hub.reinvent.awsevents.com/attendee-portal/agenda/ and save"
    echo >&2 "all Cookies from the request to ./reinvent.cookie"
    exit 1
fi
    
now=$(date -u +%FT%H%M)
cookie=$(cat reinvent.cookie)

curl -sLf 'https://hub.reinvent.awsevents.com/attendee-portal-api/sessions/list/' \
-X 'GET' \
-H 'Accept: application/json, text/plain, */*' \
-H 'Sec-Fetch-Site: same-origin' \
-H 'Accept-Language: en-US,en;q=0.9' \
-H 'Sec-Fetch-Mode: cors' \
-H 'Host: hub.reinvent.awsevents.com' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' \
-H 'Connection: keep-alive' \
-H 'Referer: https://hub.reinvent.awsevents.com/attendee-portal/agenda/' \
-H "Cookie: ${cookie}" \
-H 'Sec-Fetch-Dest: empty' \
-H 'X-Requested-With: XMLHttpRequest' | jq > "sessions_${now}.json"

curl -sLf "https://hub.reinvent.awsevents.com/attendee-portal-api/events/getUserReservations/" \
-X 'GET' \
-H 'Accept: application/json, text/plain, */*' \
-H 'Sec-Fetch-Site: same-origin' \
-H 'Accept-Language: en-US,en;q=0.9' \
-H 'Sec-Fetch-Mode: cors' \
-H 'Host: hub.reinvent.awsevents.com' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' \
-H 'Connection: keep-alive' \
-H 'Referer: https://hub.reinvent.awsevents.com/attendee-portal/agenda/' \
-H "Cookie: ${cookie}" \
-H 'Sec-Fetch-Dest: empty' \
-H 'X-Requested-With: XMLHttpRequest' | jq > "interests_${now}.json"
