import fetch from "node-fetch"
interface ReportResponse {
    data: ReportResponseData
}
interface ReportResponseData {
    ipAddress: string,
    abuseConfidenceScore: number
}
// url.searchParams.set("ip", "118.212.69.142");
// url.searchParams.set("categories", "18");
// url.searchParams.set("comment", "Test report to verify API usage");


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
    console.log(body);
}