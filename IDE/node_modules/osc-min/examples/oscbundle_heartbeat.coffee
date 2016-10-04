# Same thing as the oscheartbeat example but with oscbundles.

osc = require 'osc-min'
dgram = require "dgram"

udp = dgram.createSocket "udp4"

if process.argv[2]?
    outport = parseInt process.argv[2]
else
    outport = 41234

# Get the unix timestamp in seconds
now = -> (new Date()).getTime() / 1000;

sendHeartbeat = () ->
    buf = osc.toBuffer(
        timetag : now() + 0.05  # 0.05 seconds from now
        elements : [
            {
                address : "/p1"
                args : new Buffer "beat"
            }
            {
                address : "/p2"
                args : "string"
            }
            {
                timetag: now() + 1  # 1 second from now
                elements : [
                    {
                        address : "/p3"
                        args : 12
                    }
                ]
            }
        ]
    )

    udp.send buf, 0, buf.length, outport, "localhost"

setInterval sendHeartbeat, 2000

console.log "sending heartbeat messages to http://localhost:" + outport
