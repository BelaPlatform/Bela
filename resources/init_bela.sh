#! /bin/sh

echo "Adding Bela Overlay..."
echo BELA > /sys/devices/platform/bone_capemgr/slots
echo "Adding SPIDEV1 Overlay..."
echo BB-SPIDEV0 > /sys/devices/platform/bone_capemgr/slots
echo "Enabling interface and functional clock of McASP..."
/root/Bela/resources/bin/devmem2 0x44E00034 w 0x30002 >> /dev/null
cd /root
sh Bela_startup.sh
sh Bela_node.sh
