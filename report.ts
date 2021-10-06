/*
Copyright 2021 Todd Little and the syslog-interceptor contributors.  All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

//
// This routine is used to send an abuse report to AbuseIPDB based upon their REST API.  You need to have an APIKey
// from AbuseIPDB to use this function.
//
import fetch from "node-fetch"
interface ReportResponse {
    data: ReportResponseData
}
interface ReportResponseData {
    ipAddress: string,
    abuseConfidenceScore: number
}

export async function reportAbuse(ip: string, categories: string, comment: string, APIkey: string) {
    const url = new URL("https://api.abuseipdb.com/api/v2/report");
    url.searchParams.set("ip", ip);
    url.searchParams.set("categories", categories);
    url.searchParams.set("comment", comment);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Key": APIkey,
            "Accept": "application/json"
        }
    })
    const body = <ReportResponse>await response.json();
    console.log(`Reported ${ip} confidence score: ${body.data.abuseConfidenceScore}`);
}