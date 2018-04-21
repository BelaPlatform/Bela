#!/bin/bash
WRAPPERS_FILE=/usr/xenomai/lib/cobalt.wrappers
SKIP_LINES='\<vprintf\>\|\<vfprintf\>\|\<printf\>\|\<fprintf\>\|\<write\>\|\<open\>\|\<read\>\|\<close\>\|\<time\>\|\<recvfrom\>\|\<fcntl\>\|\<send\>\|\<sleep\>'
GREP_FOR=`sed 's/--wrap \(.*\)$/\\\\<\1\\\\>\\\\|/g' /usr/xenomai/lib/cobalt.wrappers | grep -v $SKIP_LINES | tr -d '[:space:]'`NEEDTOCLOSETHELASTOR
for FILE in ../../core/* ../../include/*
do
	SKIPTHIS=false
	for SKIP in ../../core/Udp* ../../include/I2c* ../../include/libpd/z_libpd.h ../../core/WriteFile.cpp
	do
		[ "$FILE" = "$SKIP" ] && SKIPTHIS=true
	done
	[ "$SKIPTHIS" = true ] && { echo "Skipping $FILE"; continue; }
	grep -Rn $GREP_FOR $FILE /dev/null | grep -v NOWRAP
done
