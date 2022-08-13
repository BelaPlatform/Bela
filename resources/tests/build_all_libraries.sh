#!/bin/bash -ex
cd /root/Bela
make -f Makefile.libraries cleanall
make -f Makefile.libraries all $*
