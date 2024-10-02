#!/usr/bin/env bash

if [[ ! -f config.json ]]; then
    cp config.template.json config.json
fi

now=$(date -u +%FT%H%M)

cookie="$(jq -r '.cookie//""' config.json)"
rfapiprofileid="$(jq -r '.rfapiprofileid//""' config.json)"
rfauthtoken="$(jq -r '.rfauthtoken//""' config.json)"

function show_help() {
    cat >&2 <<EOF
Please open developer tools in your browser and login to view your re:Invent agenda.

https://registration.awsevents.com/flow/awsevents/reinvent24/myagenda/page/myagenda

Update the values in config.json (shown below) with the corresponding headers from
the https://catalog.awsevents.com/api/myData request.

EOF
    cat >&2 config.template.json
}

if [[ -z "${cookie}" || -z "${rfapiprofileid}" || -z "${rfauthtoken}" ]]; then
    show_help
    exit 1
fi

interests_file="interests_${now}.json"

echo >&2 "Downloading agenda to ${interests_file}..."

curl -sLf 'https://catalog.awsevents.com/api/myData' \
    -X 'POST' \
    -H 'accept: */*' \
    -H 'accept-language: en-US,en;q=0.9' \
    -H 'content-length: 0' \
    -H 'content-type: application/x-www-form-urlencoded; charset=UTF-8' \
    -H "rfapiprofileid: ${rfapiprofileid}" \
    -H "rfauthtoken: ${rfauthtoken}" \
    -H 'rfwidgetid: 2mD9wSl40wp2ViMLVpbqhzk20AkPDb6Z' \
    -H "cookie: ${cookie}" \
    -H 'origin: https://registration.awsevents.com' \
    -H 'priority: u=1, i' \
    -H 'referer: https://registration.awsevents.com/' \
    -H 'sec-ch-ua: "Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"' \
    -H 'sec-ch-ua-mobile: ?0' \
    -H 'sec-ch-ua-platform: "macOS"' \
    -H 'sec-fetch-dest: empty' \
    -H 'sec-fetch-mode: cors' \
    -H 'sec-fetch-site: same-site' \
    -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' |
    jq >"${interests_file}"

if ! jq keys "${interests_file}" | grep -q loggedInUser; then
    echo >&2 "Unable to download schedule. Please check credentials and try again."
    echo >&2
    show_help
    exit 1
fi
