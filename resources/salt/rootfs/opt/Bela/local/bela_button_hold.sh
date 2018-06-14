#!/bin/bash
[ -z "$BELA_HOME" ] && BELA_HOME=/root/Bela

echo "Stopping the running Bela program"
make -C "$BELA_HOME" stoprunning

