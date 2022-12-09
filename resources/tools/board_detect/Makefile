CXX=g++
CXXFLAGS=-std=c++11
BUILD=build
$(shell mkdir -p build)
OBJS = $(BUILD)/Gpio.o $(BUILD)/GPIOcontrol.o $(BUILD)/Spi_Codec.o $(BUILD)/I2c_Codec.o $(BUILD)/I2c_MultiTLVCodec.o $(BUILD)/Es9080_Codec.o $(BUILD)/Tlv320_Es9080_Codec.o $(BUILD)/MiscUtilities.o $(BUILD)/board_detect.o $(BUILD)/main.o $(BUILD)/Mcasp.o $(BUILD)/Mmap.o

CPPFLAGS=-I../../../include

board_detect: $(OBJS)
	$(CXX) $(LDFLAGS) $(OBJS) $(LOADLIBES) -o "$@" -std=c++11

clean:
	rm -rf $(OBJS) board_detect

install: board_detect
	cp board_detect /usr/local/bin/

$(BUILD)/main.o: main.cpp
	$(CXX) "$<" -c $(CPPFLAGS) $(CXXFLAGS) -o "$@" -std=c++11

$(BUILD)/%.o: ../../../core/%.cpp
	$(CXX) "$<" -c $(CPPFLAGS) $(CXXFLAGS) -o "$@" -std=c++11
