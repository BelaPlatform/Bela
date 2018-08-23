board_detect:
	g++ main.cpp -I../../../include  Spi_Codec.cpp I2c_Codec.cpp board_detect.cpp -o board_detect

install: board_detect
	cp board_detect /usr/local/bin/
