Three simple c scripts can be used to test the network, in conjunction with the basic_network project:
udp-client.c, udp-client-sweep.c,d udp-server.c
compile them with gcc -o udp-client udp-client.c and similar
They can be compiled and run from either the host or the bbb

usage
./udp-client 192.168.7.2 9998 #sends individual messages to the bbb on port 9998
#enter desired values for frequency (and phase).
123.0;0;

The parser is currently very stupid, so the format of the message has to be::
frequencyValue;phaseValue;
example:
700.0;0.1;

./udp-client-sweep 192.168.7.2 9998
sends messages every 1ms to control the frequency of the oscillator, thus generating a sine sweep

./udp-server 9999
#will print the info received from Bela with the following format
printf("%8d;%.3f;%.3;",gCounter,gFrequency,gPhase);
example:
88201;700.000;0.123;

