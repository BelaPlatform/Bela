#!/bin/bash -e
BELA_DIR=/root/Bela/
[ -z "$NOCLEAN" ] || make -C $BELA_DIR coreclean
[ -z "$NOTEST" ] || $BELA_DIR/resources/tests/build_all_examples.sh --distcc
[ -z "$NOCLEAN" ] || rm -rf $BELA_DIR/projects/
make -C $BELA_DIR EXAMPLE=01-Basics/sinetone PROJECT=basic
# fuck OSX
find $BELA_DIR -iname .DS_Store -exec rm {} \;
echo "Everything should be ok. Maybe double check this:
- update the version in /etc/motd
- update the version in the IDE
- run the following:
ssh bbb \"echo > .bash_history\""

