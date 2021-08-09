import dgram from 'dgram';
import { reportAbuse } from './report';
import parser from 'nsyslog-parser';
const CronJob = require('cron').CronJob;

const serverPort = process.env.serverPort;
const APIKey = process.env.APIKey;
if (!serverPort || !APIKey) {
    console.log(`Missing required environment variables: serverPort="${serverPort}" APIKey="${APIKey}"`);
    process.exit(1);
}
const nextServerAddr = process.env.nextServerAddr;
const nextServerPort = process.env.nextServerPort;
if (nextServerAddr == undefined || nextServerPort == undefined) console.log('Not forwarding messages');

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


const server = dgram.createSocket('udp4');
const client = dgram.createSocket('udp4');

// Keep a list of the reported IPs for the day
const reportedSet = new Set<string>();

// Create a job to clear the list of reported IPs every midnight
const job = new CronJob('00 00 00 * * *', reportedSet.clear());
job.start();

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

    // Forward the message to the intended syslog server
    if (nextServerAddr != undefined && nextServerPort != undefined) client.send(msg, +nextServerPort, nextServerAddr);

    const parsedMessage = <SysLogMessage<SynologyStructuredData>>parser(msg + "");

    // Check to verify it's a login failure
    if (!parsedMessage.message.includes('failed to log in via')) return;
    if (!parsedMessage.message.includes('due to authorization failure.')) return;

    // Temporary fix for me
    if (parsedMessage.structuredData[0].arg_1 == 'little') return;

    // This assumes that there is only a single structured data entry in the message
    const reportedIP = parsedMessage.structuredData[0].arg_3;

    // If the IP has already been reported today, don't report it
    if (reportedSet.has(reportedIP)) {
        console.log('Skipping recent IP:' + reportedIP)
        return;
    }
    reportedSet.add(reportedIP);

    reportAbuse(reportedIP, '18', parsedMessage.message, APIKey);

});

server.on('listening', () => {
    const address = server.address();
    console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(+serverPort);