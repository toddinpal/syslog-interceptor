# syslog-interceptor
Intercepts syslog messages from a Synology NAS to report abuse to AbuseIPDB.  To use this tool, you will need an APIKey from AbuseIPDB.  It's designed to run in a Docker container, although anything that can run Node.js can run the program.  As such there is a Dockerfile to use in building an image.  

This tool works by accepting syslog messages and inspecting them for an abuse report from DSM.  If it finds indication that a breakin was attempted it reports it to AbuseIPDB and then forwards the syslog message to a downstream syslog daemon if so configured.  So it basically sits between Log Center and any downstream syslog server if any.  Otherwise it becomes your syslog server.  Personally I'd suggest using Papertrail or some other syslog provider.

To run the Docker container, some environment variables need to be set for the container and as well the container must use the host's network.  It might work if you use a bridged network and map UDP port as defined by the serverPort environment variable as both the host port and container port.  Two environment variables are required:
1. serverPort - This is the UDP port the server will listen on
2. APIKey - This is the API key obtained from AbuseIPDB

As well two additional environment variables can be defined to forward the report to a downstream syslog server.  These variables are:
1. nextServerAddr - The network address of the downstream syslog server
2. nextServerPort - The port to use when communicating with the downstream syslog server

With that you can send your logs to the system running the container, although you may have to set up some firewall or port forwarding rules depending upon where you run this container.
