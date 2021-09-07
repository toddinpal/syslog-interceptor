# syslog-interceptor
Intercepts syslog messages to report abuse to AbuseIPDB

To run the Docker container, some environment variables need to be set for the container and as well the container must use the host's network.  It might work if you use a bridged network and map UDP port as defined by the serverPort environment variable as both the host port and container port.  Two environment variables are required:
1. serverPort - This is the UDP port the server will listen on
2. APIKey - This is the API key obtained from AbuseIPDB

As well two additional environment variables can be defined to forward the report to a downstream syslog server.  These variables are:
1. nextServerAddr - The network address of the downstream syslog server
2. nextServerPort - The port to use when communicating with the downstream syslog server

With that you can send your logs to the system running the container, although you may have to set up some firewall or port forwarding rules depending upon where you run this container.
