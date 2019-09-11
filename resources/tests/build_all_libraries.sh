#!/bin/bash -ex
cd /root/Bela
for L in libraries/*; do
	L=`basename $L`
	make -f Makefile.libraries LIBRARY=$L clean
	make -f Makefile.libraries LIBRARY=$L
done
