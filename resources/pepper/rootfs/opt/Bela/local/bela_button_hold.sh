#!/bin/bash
[ -z "$BELA_HOME" ] && BELA_HOME=/root/Bela

echo "Stopping the running Bela program"
make -C "$BELA_HOME" stoprunning

# bela button services appears to not be able to poll after
# patch is restarted on pepper
systemctl restart bela_button
