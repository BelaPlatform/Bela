CXX=clang++
CXXFLAGS=-std=c++11
BUILD=build
$(shell mkdir -p build)
OBJS = $(BUILD)/MiscUtilities.o $(BUILD)/main.o

CPPFLAGS=-I../../../include

BIN:=bela-extract-dependencies
$(BIN): $(OBJS)
	$(CXX) $(LDFLAGS) $(OBJS) $(LOADLIBES) -o "$@" -std=c++11

clean:
	rm -rf $(OBJS) $(BIN)

install: $(BIN)
	cp $(BIN) /usr/local/bin

$(BUILD)/main.o: main.cpp
	$(CXX) "$<" -c $(CPPFLAGS) $(CXXFLAGS) -o "$@" -std=c++11

$(BUILD)/%.o: ../../../core/%.cpp
	$(CXX) "$<" -c $(CPPFLAGS) $(CXXFLAGS) -o "$@" -std=c++11
