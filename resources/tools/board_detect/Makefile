CXX=g++
tCXXFLAGS=-std=c++11
BUILD=build
$(shell mkdir -p build)
OBJS = $(BUILD)/GPIOcontrol.o $(BUILD)/Spi_Codec.o $(BUILD)/I2c_Codec.o $(BUILD)/board_detect.o $(BUILD)/main.o

CPPFLAGS=-I../../../include

board_detect: $(OBJS)
	$(CC) $(LDFLAGS) $(OBJS) $(LOADLIBES) -o "$@"

clean:
	rm -rf $(OBJS) board_detect

install: board_detect
	cp board_detect /usr/local/bin/

$(BUILD)/main.o: main.cpp
	$(CXX) "$<" -c $(CPPFLAGS) $(CXXFLAGS) -o "$@"

$(BUILD)/%.o: ../../../core/%.cpp
	$(CXX) "$<" -c $(CPPFLAGS) $(CXXFLAGS) -o "$@"
