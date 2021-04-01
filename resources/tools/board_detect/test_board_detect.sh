#!/bin/bash

SYSFILE=/run/bela/belaconfig
USERFILE=/root/.bela/belaconfig
BO_SY=CtagFace
BO_US=Salt
mkdir -p $(dirname $SYSFILE)
mkdir -p $(dirname $USERFILE)

function cl_sy () {
	rm -rf $SYSFILE
}
function cl_us () {
	rm -rf $USERFILE
}
function cr_sy () {
	echo HARDWARE=$BO_SY > $SYSFILE
}
function cr_us () {
	echo BOARD=$BO_US > $USERFILE
}
NO_HW=NoHardware
cl_sy
BO_RE=`board_detect scan`

function tst () {
	TEST=`./board_detect $1`
	[ "$TEST" == "$2" ] || { echo "Error: expected \`$2' for \`./board_detect.sh $1\`. obtained \`$TEST' instead" 2> /dev/null; exit 1; }
}
cl_sy
cl_us
tst cacheOnly $NO_HW
tst cacheOnly $NO_HW
tst scan $BO_RE
tst cacheOnly $BO_RE
cl_sy
tst cache $BO_RE
tst cacheOnly $BO_RE
cr_sy
tst cache $BO_SY
tst cacheOnly $BO_SY
cl_us
tst user $BO_SY
tst userOnly $NO_HW
cr_us
tst userOnly $BO_US
tst user $BO_US
tst "" $BO_US # calling board_detect with no arguments
echo "Success"
exit 0

