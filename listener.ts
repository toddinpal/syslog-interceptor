/*
Copyright 2021 Todd Little and the syslog-interceptor contributors.  All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

import dgram from 'dgram';
import { reportAbuse } from './report';
import parser from 'nsyslog-parser';
const CronJob = require('cron').CronJob;
const envRegExpPrefix = "CHECK_REGEXP_";

const regExpList: RegExp[] = [];

const serverPort = process.env.serverPort;
const APIKey = process.env.APIKey;
if (!serverPort || !APIKey) {
    console.log(`Missing required environment variables: serverPort="${serverPort}" APIKey="${APIKey}"`);
    console.log('Please see https://github.com/toddinpal/syslog-interceptor for more details on how to use.');
    process.exit(1);
}
const nextServerAddr = (process.env.nextServerAddr) ? process.env.nextServerAddr : "";
const nextServerPort = (process.env.nextServerPort) ? +process.env.nextServerPort : 0;
const forwarding = (nextServerAddr != "" && nextServerPort != 0);
if (forwarding) {
    console.log(`Passing syslog messages to: ${nextServerAddr}:${nextServerPort}`);
} else {
    console.log("Not forwarding messages because either nextServerAddr and/or nextServerPort isn't set.");
    console.log('Please see https://github.com/toddinpal/syslog-interceptor for more details on how to use.');
}
for (const envVariable in process.env) {
    if (envVariable.startsWith(envRegExpPrefix)) {
      const value = process.env[envVariable];
      if (typeof value === 'string') {
        const regex = new RegExp(value, "i");
        regExpList.push(regex);
      }
    }
}

if (regExpList.length == 0) {
    console.log(`Please provide at least one regexp value`);
} else {
    console.log(`Loaded RegExp expressions:`)
    regExpList.forEach((regex, index) => {
        console.log(`RegExp ${index + 1}: ${regex}`);
      });
}
// The structure of a syslog message
interface SysLogMessage<T> {
    originalMessage: string
    pri: string
    prival: number
    facilityval: number
    levelval: number
    facility: string
    level: string
    type: string
    ts: string
    host: string
    appName: string
    message: string
    header: string
    version: number
    pid: string
    messageid: string
    chain: string[]
    structuredData: T[]
}

// Synology structured data in a syslog message.  Gleaned by examination.  Wish Synology would document these.
interface SynologyStructuredData {
    '$id': string
    event_id: string
    synotype: string
    username: string
    luser: string
    event: string
    arg_1: string
    arg_2: string
    arg_3: string
    arg_4: string
    sequenceId: string
}

// Create UDP sockets for this server and for the server to relay the messages to
const server = dgram.createSocket('udp4');
const client = dgram.createSocket('udp4');

// Connect the downstream socket
try {
    if (forwarding) client.connect(nextServerPort, nextServerAddr);
} catch (error) {
    console.log(`Error connecting to downstream syslog server: ${error}\nNot forwarding messages.`);
}

// Keep a list of the reported IPs for the day as we only want to report an IP address once a day per AbuseIPDB
const reportedSet = new Set<string>();

// Create a job to clear the list of reported IPs every midnight
const job = new CronJob('00 00 00 * * *', function () {
    console.log("Clearing the reported IP list");
    reportedSet.clear();
    });
job.start();

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

//  For each syslog message we receive:
server.on('message', (msg, rinfo) => {
    console.log(`Message received: ${msg.toString('utf-8',0,msg.length-1)}`);

    // Forward the message to the intended syslog server, should probably check return status
    if (forwarding) client.send(msg, +nextServerPort, nextServerAddr);

    // Parse the syslog message
    const parsedMessage = <SysLogMessage<SynologyStructuredData>>parser(msg + "");

    // Currently this is set up to make sure the syslog message contains the strings "failed to log in via" and "due to authorization failure." to
    // determine if the syslog message is a login failure that should be reported.  This could easily be expanded to include other messages, although
    // the parsing logic below to generate the AbuseIPDB report might need to be updated as well.
    //
    // Check to verify it's a login failure
    const isMatch = matchesAnyRegExp(parsedMessage.message, regExpList);
    if (!isMatch) return;
    // if (!parsedMessage.message.includes('failed to log in via')) return;
    // if (!parsedMessage.message.includes('due to authorization failure.')) return;

    // Temporary fix for me as one of my DSMs is reporting the other one for login failures
    if (parsedMessage.structuredData[0].arg_1 == 'little') return;

    // This assumes that there is only a single structured data entry in the message
    const reportedIP = parsedMessage.structuredData[0].arg_3;

    // If the IP has already been reported today, don't report it
    if (reportedSet.has(reportedIP)) {
        console.log('Skipping recent IP:' + reportedIP)
        return;
    }
    reportedSet.add(reportedIP);

    // Report the abuse.  Currently just reports all abuse as category 18 - Brute-Force
    reportAbuse(reportedIP, '18', parsedMessage.message, APIKey);

});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening ${address.address}:${address.port}`);
});

server.bind(+serverPort);

function matchesAnyRegExp(str: string, regexArray: RegExp[]): boolean {
    for (const regex of regexArray) {
      if (regex.test(str)) {
        return true;
      }
    }
    return false;
  }