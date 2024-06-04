#!/bin/bash

DEFAULT=$1
COMMIT=$2

if [ main == "$DEFAULT" ]; then
	PATTERN="main[\s\t]*(int.*)"
	FILE=core/default_main.cpp
elif [ libpd == "$DEFAULT" ]; then
	PATTERN="libraries/libpd/libpd.h"
	FILE=core/default_libpd_render.cpp
else
	echo "Usage: $0 <DEFAULT> <COMMIT>, where DEFAULT is main or libpd and COMMIT can be empty (in which case it defaults to the latest one to modify the DEFAULT file)"
	exit 1
fi

if [ -z "$COMMIT" ]; then
	COMMIT=`git log -n1 --pretty=%H $FILE`
fi

#git checkout examples/ && git clean -fd examples/
PATCH=`[ -n "$TMPDIR" ] && printf $TMPDIR || printf /tmp`/tmp-patch
git diff $COMMIT^..$COMMIT $FILE > $PATCH
FILES=`grep -RIl "$PATTERN" examples/`

for a in $FILES; do
	patch -s $a < $PATCH
done
