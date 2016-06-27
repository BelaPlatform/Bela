#!/bin/bash
SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

[ -z $BBB_HOST ] && BBB_HOST=bbb
CONFIG_FILENAME=$HOME/.ssh/config
mkdir -p $HOME/.ssh # create the ssh folder if it does not exist
printf "\nHost $BBB_HOST\nHostname $BBB_HOSTNAME\nUser $BBB_USER\nStrictHostKeyChecking=no\n\n" >> $HOME/.ssh/config 
if [ $? -eq 0 ];
then
  printf "You can now login into the Beaglebone with\n\$ ssh $BBB_HOST\n"
else
  printf "Something went wrong. You should still be able to log into the BeagleBone with \n\$ ssh $BBB_USER@$BBB_HOSTNAME\n"
fi
