# Bela
# Low-latency, real-time audio and sensor processing on BeagleBone Black
# (c) 2016 Andrew McPherson, Victor Zappi, Giulio Moro, Liam Donovan
# Centre for Digital Music, Queen Mary University of London

## This Makefile is intended for use on the BeagleBone Black itself #
## and not for cross-compiling #
## available command line options: #
## EXAMPLE=             -- name of the folder in examples/ to be copied to projects/ and built
## PROJECT=             -- name of the folder in projects/ to be built
## CL=                  -- list of command line options to pass to the program when running
## CPPFLAGS=           -- list of additional flags passed to the C++ compiler
## CFLAGS=             -- list of additional flags passed to the C compiler
## COMPILER=            -- compiler to use (clang or gcc)
## LDFLAGS=                -- linker flags (e.g.: -L. ) 
## LDLIBS=                -- libs to link in (e.g.: -lm )
## AT=                  -- used instead of @ to silence the output. Defaults AT=@, use AT= for a very verbose output
## DISTCC=              -- specify whether to use distcc (1) or not (0, default)
## RELINK=              -- specify whether to force re-linking the project file (1) or not (0, default). Set it to 1 when developing a library.
## SHARED=              -- specify whether to build the project-specific files as a shared library and link the executable to it and libbela (1) or not (0, default).
###
##available targets: #
-include CustomMakefileTop.in
.DEFAULT_GOAL := Bela

DISTCC ?= 0 # set this to 1 to use distcc by default

# an empty recipe to avoid implicit rules for .d files
%.d:
	
AT?=@
NO_PROJECT_TARGETS+=help coreclean distclean startup startuploop stopstartup stoprunning stop nostartup connect_startup connect idestart idestop idestartup idenostartup ideconnect scsynthstart scsynthstop scsynthconnect scsynthstartup scsynthnostartup update checkupdate updateunsafe lib lib/libbela.so lib/libbelaextra.so lib/libbela.a lib/libbelaextra.a csoundstart
NO_PROJECT_TARGETS_MESSAGE=PROJECT or EXAMPLE should be set for all targets except: $(NO_PROJECT_TARGETS)
# list of targets that automatically activate the QUIET=true flag
QUIET_TARGETS=runide

# not sure exactly whether we need separate values for BASE_DIR and BELA_DIR.
# By having them separate they can be overridden individually if needed
# BELA_DIR is the path to be used as a reference for updates
BELA_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
# BASE_DIR is the place where the files to be built are located
BASE_DIR:=$(BELA_DIR)
UPDATES_DIR?=$(BELA_DIR)/updates
UPDATE_SOURCE_DIR?=/tmp/belaUpdate
UPDATE_REQUIRED_PATHS?=scripts include core scripts/update_board
UPDATE_BELA_PATCH?=/tmp/belaPatch
UPDATE_BELA_MV_BACKUP?=$(BELA_DIR)/../_BelaUpdateBackup
ALL_DEPS:=

# Type `$ make help` to get a description of the functionalities of this Makefile.
help: ## Show this help
	$(AT) echo 'Usage: make [target] CL=[command line options] [PROJECT=[projectName] | EXAMPLE=[exampleName]]'
	$(AT) printf "\n$(NO_PROJECT_TARGETS_MESSAGE)\n\n"
	$(AT) echo 'Targets: (default: $(.DEFAULT_GOAL))'
	$(AT) echo list: $(MAKEFILE_LIST)
	$(AT) fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/^\(.*\): .*##\(.*\)/\1:#\2/' | sed -e 's/^\(.*\)= .* -- \(.*\)/\1=#\2/' | sed 's/^##//' | awk -F"#" '{ printf "%-18s %-1s\n", $$1, $$2}' 

# PROJECT or EXAMPLE must be set for targets that are not included in NO_PROJECT_TARGETS
ifeq (,$(filter $(NO_PROJECT_TARGETS),$(MAKECMDGOALS)))
  ifndef PROJECT
    ifndef EXAMPLE
      $(error $(NO_PROJECT_TARGETS_MESSAGE))
    endif
  endif
endif

# if we are building an example, just copy it to the projects/ folder
# and then treat it as a project
ifdef EXAMPLE
  #you can alternatively specify PROJECT= along with EXAMPLE=
  PROJECT?=exampleTempProject
  PROJECT_DIR?=$(abspath projects/$(PROJECT))
  $(shell mkdir -p $(abspath projects))
  $(shell rm -rf $(PROJECT_DIR))
  $(shell cp -r examples/$(EXAMPLE) $(PROJECT_DIR))
else
ifdef PROJECT
  PROJECT_DIR := $(abspath projects/$(PROJECT))
else
  PROJECT_DIR :=
endif
endif

COMMAND_LINE_OPTIONS?=$(CL)
ifeq ($(RUN_WITH_PRU_BIN),true)
# Only use this one for development. You may have to run it without this option at least once, to generate 
# include/pru_rtaudio_bin.h
ifndef PROJECT
$(warning PROJECT is not defined, so RUN_WITH_PRU_BIN will be ignored)
endif # ifndef PROJECT
COMMAND_LINE_OPTIONS := --pru-file $(BASE_DIR)/pru_rtaudio_irq.bin $(COMMAND_LINE_OPTIONS)
run: pru_rtaudio.bin
run: pru_rtaudio_irq.bin
runide: pru_rtaudio.bin
runide: pru_rtaudio_irq.bin
else
build/core/PruBinary.o: build/pru/pru_rtaudio_bin.h build/pru/pru_rtaudio_irq_bin.h
endif #ifeq($(RUN_WITH_PRU_BIN),true)

ifdef PROJECT

#check if project dir exists
CHECK_PROJECT_DIR_EXIST=$(shell stat $(PROJECT_DIR))
ifeq ($(CHECK_PROJECT_DIR_EXIST),)
$(error $(PROJECT_DIR) does not exist)
endif
# set default values
SHOULD_BUILD=true
PROJECT_TYPE=invalid
RUN_PREREQUISITES=

RUN_FILE?=$(PROJECT_DIR)/run.sh
SUPERCOLLIDER_FILE=$(PROJECT_DIR)/_main.scd
LIBPD_FILE=$(PROJECT_DIR)/_main.pd
CSOUND_FILE=$(PROJECT_DIR)/_main.csd
HAS_RUN_FILE=false

FILE_LIST:= $(wildcard $(PROJECT_DIR)/*)
ifeq ($(filter $(RUN_FILE),$(FILE_LIST)),$(RUN_FILE))
SHOULD_BUILD=false
HAS_RUN_FILE=true
PROJECT_TYPE=custom
endif

# if heavy-unzip-archive, then we should have a HEAVY_ARCHIVE=...
ifeq (heavy-unzip-archive,$(filter heavy-unzip-archive,$(MAKECMDGOALS)))
# which hopefully points to a valid  Heavy zip archive.
ifeq (,$(HEAVY_ARCHIVE))
$(error Missing HEAVY_ARCHIVE=... for target heavy-unzip-archive)
else
# If that is the case, then we can consider this project a cpp project
# (assuming there are some other targets AFTER heavy-unzip-archive,
# otherwise it will fail miserably)
PROJECT_TYPE=cpp
endif
endif # heavy-unzip-archive

ifeq ($(filter $(SUPERCOLLIDER_FILE),$(FILE_LIST)),$(SUPERCOLLIDER_FILE))
PROJECT_TYPE=sc
SHOULD_BUILD=false
RUN_PREREQUISITES+=lib/libbela.so lib/libbelaextra.so
else
ifeq ($(filter $(LIBPD_FILE),$(FILE_LIST)),$(LIBPD_FILE))
PROJECT_TYPE=libpd
else
ifeq ($(filter $(CSOUND_FILE),$(FILE_LIST)),$(CSOUND_FILE))
PROJECT_TYPE=cs
SHOULD_BUILD=false
RUN_PREREQUISITES+=lib
else
ifneq ($(filter %.c %.cpp %.cc,$(FILE_LIST)),)
PROJECT_TYPE=cpp
endif
endif
endif
endif

ifeq ($(AT),)
$(info Automatically detected PROJECT_TYPE: $(PROJECT_TYPE) )
endif
ifeq ($(PROJECT_TYPE),invalid)
ifeq ($(HAS_RUN_FILE),false)
$(error Invalid/empty project. A project needs to have at least one .cpp or .c or .cc or $(notdir $(LIBPD_FILE)) or $(notdir $(SUPERCOLLIDER_FILE)) or $(notdir $(CSOUND_FILE) or $(notdir $(RUN_FILE)) file ))
endif
endif

endif # ifdef PROJECT

BUILD_DIRS=build/core build/pru
ifneq ($(PROJECT_DIR),)
ifeq ($(SHOULD_BUILD),true)
BUILD_DIRS+=$(PROJECT_DIR)/build
endif
endif

OUTPUT_FILE?=$(PROJECT_DIR)/$(PROJECT)
RUN_FROM?=$(PROJECT_DIR)
ifeq ($(HAS_RUN_FILE),true)
RUN_COMMAND?=bash $(RUN_FILE)
else
ifeq ($(PROJECT_TYPE),sc)
SCLANG_FIFO=/tmp/sclangfifo
RUN_COMMAND?=bash -c 'touch /tmp/sclang.yaml; rm -rf $(SCLANG_FIFO) && mkfifo $(SCLANG_FIFO) && sclang -l /tmp/sclang.yaml $(SUPERCOLLIDER_FILE) <> $(SCLANG_FIFO)'
else
ifeq ($(PROJECT_TYPE),cs)
RUN_COMMAND?=bash -c 'belacsound --csd=$(CSOUND_FILE) $(COMMAND_LINE_OPTIONS) 2>&1'
else
RUN_COMMAND?=$(OUTPUT_FILE) $(COMMAND_LINE_OPTIONS)
endif
endif
endif

RUN_IDE_COMMAND?=PATH=$$PATH:/usr/local/bin/ stdbuf -oL -eL $(RUN_COMMAND)
BELA_AUDIO_THREAD_NAME?=bela-audio 
XENO_CONFIG=/usr/xenomai/bin/xeno-config
XENOMAI_SKIN=posix

# Find out what system we are running on and set system-specific variables
# We cache these in $(SYSTEM_SPECIFIC_MAKEFILE) after every boot
SYSTEM_SPECIFIC_MAKEFILE=/tmp/BelaMakefile.inc
-include $(SYSTEM_SPECIFIC_MAKEFILE)
ifeq ($(DEBIAN_VERSION),)
# If they are not there, let's go find out ...
DEBIAN_VERSION=$(shell grep "VERSION=" /etc/os-release | sed "s/.*(\(.*\)).*/\1/g")
# Lazily, let's assume if we are not on 2.6 we are on 3. I sincerely hope we will survive till Xenomai 4 to see this fail
XENOMAI_VERSION=$(shell $(XENO_CONFIG) --version | grep -o "2\.6" || echo "3")

ifeq ($(XENOMAI_VERSION),2.6)
XENOMAI_MAJOR=2
endif
ifeq ($(XENOMAI_VERSION),3)
XENOMAI_MAJOR=3
endif

# Xenomai flags
DEFAULT_XENOMAI_CFLAGS := $(shell $(XENO_CONFIG) --skin=$(XENOMAI_SKIN) --cflags)
DEFAULT_XENOMAI_CFLAGS += -DXENOMAI_SKIN_$(XENOMAI_SKIN) -DXENOMAI_MAJOR=$(XENOMAI_MAJOR)
# Cleaning up any `pie` introduced because of gcc 6.3, as it would confuse clang
DEFAULT_XENOMAI_CFLAGS := $(filter-out -no-pie, $(DEFAULT_XENOMAI_CFLAGS))
DEFAULT_XENOMAI_CFLAGS := $(filter-out -fno-pie, $(DEFAULT_XENOMAI_CFLAGS))
SED_REMOVE_WRAPPERS_REGEX=sed "s/-Wl,@[A-Za-z_/]*.wrappers\>//g"
ifeq ($(XENOMAI_VERSION),2.6)
  DEFAULT_XENOMAI_LDFLAGS := $(shell $(XENO_CONFIG) --skin=$(XENOMAI_SKIN) --ldflags | $(SED_REMOVE_WRAPPERS_REGEX))
else
  DEFAULT_XENOMAI_LDFLAGS := $(shell $(XENO_CONFIG) --skin=$(XENOMAI_SKIN) --ldflags --no-auto-init | $(SED_REMOVE_WRAPPERS_REGEX) | sed s/-Wl,--no-as-needed//)
endif
DEFAULT_XENOMAI_LDFLAGS := $(filter-out -no-pie, $(DEFAULT_XENOMAI_LDFLAGS))
DEFAULT_XENOMAI_LDFLAGS := $(filter-out -fno-pie, $(DEFAULT_XENOMAI_LDFLAGS))
# remove posix wrappers if present: explicitly call __wrap_pthread_... when needed
DEFAULT_XENOMAI_LDFLAGS := $(filter-out -Wlusr/xenomai/lib/cobalt.wrappers, $(DEFAULT_XENOMAI_LDFLAGS))

#... and cache them to the file
$(shell printf "DEBIAN_VERSION=$(DEBIAN_VERSION)\nXENOMAI_VERSION=$(XENOMAI_VERSION)\nDEFAULT_XENOMAI_CFLAGS=$(DEFAULT_XENOMAI_CFLAGS)\nDEFAULT_XENOMAI_LDFLAGS=$(DEFAULT_XENOMAI_LDFLAGS)\nXENOMAI_MAJOR=$(XENOMAI_MAJOR)\n" > $(SYSTEM_SPECIFIC_MAKEFILE) )
endif  # ifeq ($(DEBIAN_VERSION),)

ifeq ($(AT),)
  $(info Running on __$(DEBIAN_VERSION)__ with Xenomai __$(XENOMAI_VERSION)__)
endif

ifeq ($(XENOMAI_VERSION),2.6)
XENOMAI_STAT_PATH=/proc/xenomai/stat
LIBPD_LIBS=-lpd -lpthread_rt
endif
ifeq ($(XENOMAI_VERSION),3)
XENOMAI_STAT_PATH=/proc/xenomai/sched/stat
LIBPD_LIBS=-lpd -lpthread
endif

# This is used to run Bela projects from the terminal in the background
# On wheezy, it is also used for running Bela at startup
SCREEN_NAME?=Bela

# These are parsed by the IDE to understand if a program is active at startup
BELA_STARTUP_ENV?=/opt/Bela/startup_env
BELA_POST_ENABLE_STARTUP_COMMAND=mkdir -p /opt/Bela && printf "ACTIVE=1\nPROJECT=$(PROJECT)\nARGS=$(COMMAND_LINE_OPTIONS)" > $(BELA_STARTUP_ENV)
BELA_PRE_DISABLE_STARTUP_COMMAND=mkdir -p /opt/Bela && printf "ACTIVE=0\n" > $(BELA_STARTUP_ENV)

ifeq ($(DEBIAN_VERSION), wheezy)
# this section contains some hardcoded and/or obsolete variables. It is currently unsupported and deprecated and we'll remove it "soon" (GM said on 2021.06.09)
BELA_IDE_HOME?=$(BELA_DIR)/IDE
BELA_IDE_SCREEN_NAME?=IDE-Bela
BELA_IDE_STARTUP_SCRIPT?=/root/Bela_node.sh
BELA_STARTUP_SCRIPT?=/root/Bela_startup.sh
BELA_ENABLE_STARTUP_COMMAND=printf "\#!/bin/sh\n\#\n\# This file is autogenerated by Bela. Do not edit!\n\necho Running Bela...\nexport PATH=\"$$PATH:/usr/local/bin\"\n cd $(RUN_FROM) && screen -S $(SCREEN_NAME) -d -m bash -c \"while sleep 0.6 ; do echo Running Bela...; $(RUN_COMMAND);  done\"\n" > $(BELA_STARTUP_SCRIPT) && chmod +x $(BELA_STARTUP_SCRIPT) && $(BELA_POST_ENABLE_STARTUP_COMMAND)

BELA_DISABLE_STARTUP_COMMAND=$(BELA_PRE_DISABLE_STARTUP_COMMAND); printf "\#!/bin/sh\n\#\n\n\# This file is autogenerated by Bela. Do not edit!\n\n\# Run on startup disabled -- nothing to do here\n" > $(BELA_STARTUP_SCRIPT)
BELA_IDE_START_COMMAND?=cd $(BELA_IDE_HOME) && export USER=root && export HOME=/root && export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin && screen -S $(BELA_IDE_SCREEN_NAME) -d -m bash -c "while true; do /usr/local/bin/node index.js; sleep 0.5; done"
BELA_IDE_STOP_COMMAND?=screen -X -S $(BELA_IDE_SCREEN_NAME) quit > /dev/null || true
BELA_IDE_ENABLE_STARTUP_COMMAND?=printf '\#!/bin/sh\n\#\n\# This file is autogenerated by Bela. Do not edit!\n\necho Running the Bela IDE...\n$(BELA_IDE_START_COMMAND)\n' > $(BELA_IDE_STARTUP_SCRIPT)
BELA_IDE_DISABLE_STARTUP_COMMAND?=printf "#!/bin/sh\n#\n\n# This file is autogenerated by Bela. Do not edit!\n\n# The Bela IDE is disabled on startup.\n" > $(BELA_IDE_STARTUP_SCRIPT)
BELA_IDE_CONNECT_COMMAND=screen -r -S $(BELA_IDE_SCREEN_NAME)
else
BELA_ENABLE_STARTUP_COMMAND=systemctl enable bela_startup && $(BELA_POST_ENABLE_STARTUP_COMMAND)
BELA_DISABLE_STARTUP_COMMAND=$(BELA_PRE_DISABLE_STARTUP_COMMAND); systemctl disable bela_startup
BELA_IDE_START_COMMAND=systemctl restart bela_ide
BELA_IDE_STOP_COMMAND=systemctl stop bela_ide
BELA_IDE_ENABLE_STARTUP_COMMAND=systemctl enable bela_ide
BELA_IDE_DISABLE_STARTUP_COMMAND=systemctl disable bela_ide
BELA_IDE_CONNECT_COMMAND=journalctl -fu bela_ide -n 50
endif
SC_CL?=-u 57110 -z 16 -J 8 -K 8 -G 16 -i 2 -o 2 -B 0.0.0.0

ifneq (,$(filter $(QUIET_TARGETS),$(MAKECMDGOALS)))
  QUIET=true
endif
QUIET?=false

RM := rm -rf

LEGACY_INCLUDE_PATH := ./include/legacy

INCLUDES := -I$(PROJECT_DIR) -I$(LEGACY_INCLUDE_PATH)  -I./include -I./build/pru/ -I./
ifeq ($(XENOMAI_VERSION),2.6)
  BELA_USE_DEFINE?=BELA_USE_POLL
endif
ifeq ($(XENOMAI_VERSION),3)
  BELA_USE_DEFINE?=BELA_USE_RTDM
endif

DEFAULT_COMMON_FLAGS := $(DEFAULT_XENOMAI_CFLAGS) -O3 -g -march=armv7-a -mtune=cortex-a8 -mfloat-abi=hard -mfpu=neon -ftree-vectorize -ffast-math -DNDEBUG -D$(BELA_USE_DEFINE) -I$(BASE_DIR)/resources/$(DEBIAN_VERSION)/include -save-temps=obj -DENABLE_PRU_UIO=1
ifeq ($(SHARED),1)
DEFAULT_COMMON_FLAGS+= -fPIC
PROJ_INFIX=.fpic
else
PROJ_INFIX=
endif # SHARED
DEFAULT_CPPFLAGS := $(DEFAULT_COMMON_FLAGS) -std=c++11
DEFAULT_CFLAGS := $(DEFAULT_COMMON_FLAGS) -std=gnu11
BELA_LDFLAGS = -Llib/ -Wl,--as-needed
BELA_CORE_LDLIBS = $(DEFAULT_XENOMAI_LDFLAGS) -lprussdrv -lstdc++ # libraries needed by core code (libbela.so)
BELA_EXTRA_LDLIBS = -lasound -lseasocks -lNE10 # additional libraries needed by extra code (libbelaextra.so)
BELA_LDLIBS := $(BELA_CORE_LDLIBS) $(BELA_EXTRA_LDLIBS)
BELA_LDLIBS := $(filter-out -lNE10 -lstdc++,$(BELA_LDLIBS))
ifeq ($(PROJECT_TYPE),libpd)
BELA_LDLIBS += $(LIBPD_LIBS)
# Objects for a system-supplied default render() file for libpd projects,
# if the user only wants to provide the Pd files.
DEFAULT_PD_CPP_SRCS := ./core/default_libpd_render.cpp
DEFAULT_PD_OBJS := $(addprefix build/core/,$(notdir $(DEFAULT_PD_CPP_SRCS:.cpp=.o)))
ALL_DEPS += $(addprefix build/core/,$(notdir $(DEFAULT_PD_CPP_SRCS:.cpp=.d)))

# TODO: replace the below with proper parsing of default_libpd_render.ii
include libraries/Midi/build/Makefile.link
include libraries/Scope/build/Makefile.link
include libraries/Gui/build/Makefile.link
include libraries/Trill/build/Makefile.link
include libraries/Pipe/build/Makefile.link
endif

ifndef COMPILER
# check whether clang is installed
  TEST_COMPILER := $(shell which clang)
  ifneq ($(strip $(TEST_COMPILER)), )
    #if it is installed, use it
    COMPILER := clang
	CLANG_PATH:=$(TEST_COMPILER)
  else
    # just in case the PATH is broken, check for the full path to clang
	# this is a workaround for people with old IDE startup script (without /usr/local/bin in the $PATH)
    CLANG_PATH:=/usr/local/bin/clang
    TEST_COMPILER := $(shell [ -e $(CLANG_PATH) ] && echo yes)
    ifneq ($(strip $(TEST_COMPILER)), )
      COMPILER := clang
    else
      COMPILER := gcc
    endif
  endif
endif

ifeq ($(COMPILER), clang)
  CLANG_PATH?=/usr/bin/clang
  CC=$(CLANG_PATH)
  CXX=$(CLANG_PATH)++
  DEFAULT_CPPFLAGS += -DNDEBUG # Maybe we should add back in -no-integrated-as?
  DEFAULT_CFLAGS += -DNDEBUG
else 
  ifeq ($(COMPILER), gcc)
    CC=gcc
    CXX=g++
    DEFAULT_CPPFLAGS += -Wno-psabi
    DEFAULT_CFLAGS += -Wno-psabi
    LDFLAGS+=-fno-pie -no-pie
  endif
endif

DISTCC := $(strip $(DISTCC))
ifeq ($(DISTCC),1)
  CC = /usr/local/bin/distcc-clang
  CXX = /usr/local/bin/distcc-clang++
endif

ifneq ($(PROJECT),)
find_files = $(if $(if $(PROJECT_DIR),$(if $(1),_)), $(shell find $(PROJECT_DIR)/ -type f -name "$(1)" | grep -v "$(PROJECT_DIR)/heavy/.*\.cpp"))

ASM_SRCS := $(call find_files,*.S)
ASM_OBJS := $(addprefix $(PROJECT_DIR)/build/,$(notdir $(ASM_SRCS:.S=$(PROJ_INFIX).o)))
ALL_DEPS += $(addprefix $(PROJECT_DIR)/build/,$(notdir $(ASM_SRCS:.S=$(PROJ_INFIX).d)))

P_SRCS := $(call find_files,*.p)
P_OBJS := $(addprefix $(PROJECT_DIR)/,$(notdir $(P_SRCS:.p=_bin.h)))

C_SRCS := $(call find_files,*.c)
C_OBJS := $(subst $(PROJECT_DIR),$(PROJECT_DIR)/build,$(C_SRCS:.c=$(PROJ_INFIX).o))
ALL_DEPS += $(addprefix $(PROJECT_DIR)/build/,$(notdir $(C_SRCS:.c=$(PROJ_INFIX).d)))

CPP_SRCS := $(call find_files,*.cpp)
CPP_OBJS := $(subst $(PROJECT_DIR),$(PROJECT_DIR)/build,$(CPP_SRCS:.cpp=$(PROJ_INFIX).o))

BUILD_DIRS += $(dir $(C_OBJS))
BUILD_DIRS += $(dir $(CPP_OBJS))
ALL_DEPS += $(addprefix $(PROJECT_DIR)/build/,$(notdir $(CPP_SRCS:.cpp=.d)))
endif # $(PROJECT)
#create build directories, should probably be conditional to PROJECT or li
#TODO: currently `make clean run PROJECT=...` will fail when the project has
#subfolders, because `clean` will remove them after they have been created
#below.
$(shell mkdir -p  $(BUILD_DIRS) lib)

PROJECT_OBJS := $(P_OBJS) $(ASM_OBJS) $(C_OBJS) $(CPP_OBJS)

# Core Bela sources
CORE_C_SRCS = $(wildcard core/*.c)
CORE_OBJS := $(addprefix build/core/,$(notdir $(CORE_C_SRCS:.c=.o)))
ALL_DEPS += $(addprefix build/core/,$(notdir $(CORE_C_SRCS:.c=.d)))

CORE_CPP_SRCS = $(filter-out core/default_main.cpp core/default_libpd_render.cpp, $(wildcard core/*.cpp))
CORE_OBJS := $(CORE_OBJS) $(addprefix build/core/,$(notdir $(CORE_CPP_SRCS:.cpp=.o)))
ALL_DEPS += $(addprefix build/core/,$(notdir $(CORE_CPP_SRCS:.cpp=.d)))

CORE_ASM_SRCS := $(wildcard core/*.S)
CORE_ASM_OBJS := $(addprefix build/core/,$(notdir $(CORE_ASM_SRCS:.S=.o)))
ALL_DEPS += $(addprefix build/core/,$(notdir $(CORE_ASM_SRCS:.S=.d)))

CORE_CORE_OBJS := build/core/RTAudio.o build/core/PRU.o build/core/RTAudioCommandLine.o build/core/I2c.o build/core/I2c_Codec.o build/core/I2c_MultiTLVCodec.o build/core/I2c_MultiI2sCodec.o build/core/I2c_MultiTdmCodec.o build/core/Spi_Codec.o build/core/math_runfast.o build/core/GPIOcontrol.o build/core/PruBinary.o build/core/board_detect.o build/core/DataFifo.o build/core/BelaContextFifo.o build/core/BelaContextSplitter.o build/core/MiscUtilities.o build/core/Mmap.o build/core/Mcasp.o build/core/PruManager.o build/core/FormatConvert.o
EXTRA_CORE_OBJS := $(filter-out $(CORE_CORE_OBJS), $(CORE_OBJS)) $(filter-out $(CORE_CORE_OBJS),$(CORE_ASM_OBJS))
# Objects for a system-supplied default main() file, if the user
# only wants to provide the render functions.
DEFAULT_MAIN_CPP_SRCS := ./core/default_main.cpp
DEFAULT_MAIN_OBJS := build/core/default_main.o
ALL_DEPS += ./build/core/default_main.d

DEFAULT_ALL_OBJS:=$(DEFAULT_MAIN_OBJS) $(DEFAULT_PD_OBJS)
ifeq ($(SHARED),1)
LIB_PROJECT_SO:=lib$(PROJECT).so
LIB_PROJECT_SO_FULL:=$(PROJECT_DIR)/$(LIB_PROJECT_SO)
ALL_OBJS=$(LIB_PROJECT_SO_FULL) lib/$(LIB_EXTRA_SO) lib/$(LIB_SO) $(DEFAULT_ALL_OBJS)
BELA_LDFLAGS+=-Wl,-rpath,$(PROJECT_DIR)
else # SHARED
ALL_OBJS=$(CORE_ASM_OBJS) $(CORE_OBJS) $(PROJECT_OBJS) $(DEFAULT_ALL_OBJS)
endif # SHARED

# include all dependencies - necessary to force recompilation when a header is changed
# (had to remove -MT"$(@:%.o=%.d)" from compiler call for this to work)
-include $(ALL_DEPS)
-include libraries/*/build/*.d # dependencies for each of the libraries' object files

Bela: ## Builds the Bela program with all the optimizations
Bela: $(OUTPUT_FILE)

# all = build Bela 
all: ## Same as Bela
all: SYNTAX_FLAG :=
all: Bela

# debug = buildBela debug
debug: ## Same as Bela but with debug flags and no optimizations
debug: DEFAULT_CPPFLAGS=-g -std=c++11 $(DEFAULT_XENOMAI_CFLAGS) -D$(BELA_USE_DEFINE) -mfpu=neon -O0
debug: DEFAULT_CFLAG=-g -std=c11 $(DEFAULT_XENOMAI_CFLAGS) -D$(BELA_USE_DEFINE) -std=gnu11 -mfpu=neon -O0
debug: all

# syntax = check syntax
syntax: ## Only checks syntax
syntax: CC=clang
syntax: CXX=clang++
syntax: $(PROJECT_OBJS) 
ifneq (,$(filter syntax,$(MAKECMDGOALS)))
SYNTAX_FLAG := -fsyntax-only
endif

# Rule for Bela core C files
build/core/%.o: ./core/%.c
	$(AT) echo 'Building $(notdir $<)...'
#	$(AT) echo 'Invoking: C Compiler $(CC)'
	$(AT) $(CC) $(SYNTAX_FLAG) $(INCLUDES) $(DEFAULT_CFLAGS)  -Wall -c -fmessage-length=0 -U_FORTIFY_SOURCE -MMD -MP -MF"$(@:%.o=%.d)" -o "$@" "$<" $(CFLAGS) -fPIC -Wno-unused-function
	$(AT) echo ' ...done'
	$(AT) echo ' '

# Rule for Bela core C++ files
build/core/%.o: ./core/%.cpp
	$(AT) echo 'Building $(notdir $<)...'
#	$(AT) echo 'Invoking: C++ Compiler $(CXX)'
	$(AT) $(CXX) $(SYNTAX_FLAG) $(INCLUDES) $(DEFAULT_CPPFLAGS) -Wall -c -fmessage-length=0 -U_FORTIFY_SOURCE -MMD -MP -MF"$(@:%.o=%.d)" -o "$@" "$<" $(CPPFLAGS) -fPIC -Wno-unused-function -Wno-unused-const-variable
	$(AT) echo ' ...done'
	$(AT) echo ' '

# Rule for Bela core ASM files
build/core/%.o: ./core/%.S
ifeq (,$(SYNTAX_FLAG))
	$(AT) echo 'Building $(notdir $<)...'
#	$(AT) echo 'Invoking: GCC Assembler'
	$(AT) as -o "$@" "$<"
	$(AT) echo ' ...done'
endif
	$(AT) echo ' '

%.bin: pru/%.p
ifeq (,$(SYNTAX_FLAG))
	$(AT) echo 'Building $<...'
	$(AT) pasm -V2 -L -c -b "$<" > /dev/null
	$(AT) echo ' ...done'
endif
	$(AT) echo ' '

build/pru/%_bin.h: pru/%.p
ifeq (,$(SYNTAX_FLAG))
	$(AT) echo 'Building $<...'
	$(AT) pasm -V2 -L -c "$<" > /dev/null
	$(AT) mv "$(@:build/pru/%=%)" build/pru/
	$(AT) echo ' ...done'
endif
	$(AT) echo ' '

# distcc does not actually store the temp files with -save-temps, so we have to generate them manually.
ifeq ($(DISTCC),1)
ifeq ($(SYNTAX_FLAG),)
GENERATE_PREPROCESSED := 1
endif
endif

# Rule for user-supplied C++ files
$(PROJECT_DIR)/build/%$(PROJ_INFIX).o: $(PROJECT_DIR)/%.cpp
	$(AT) echo 'Building $(notdir $<)...'
#	$(AT) echo 'Invoking: C++ Compiler $(CXX)'
	$(AT) $(CXX) $(SYNTAX_FLAG) $(INCLUDES) $(DEFAULT_CPPFLAGS) -Wall -c -fmessage-length=0 -U_FORTIFY_SOURCE -MMD -MP -MF"$(@:%.o=%.d)" -o "$@" "$<" $(CPPFLAGS)
ifeq ($(GENERATE_PREPROCESSED),1)
	$(AT) $(CXX) $(INCLUDES) $(DEFAULT_CPPFLAGS) -w -E -o "$(@:%.o=%.ii)" "$<" $(CPPFLAGS)
endif
	$(AT) echo ' ...done'
	$(AT) echo ' '

# Rule for user-supplied C files
$(PROJECT_DIR)/build/%$(PROJ_INFIX).o: $(PROJECT_DIR)/%.c
	$(AT) echo 'Building $(notdir $<)...'
#	$(AT) echo 'Invoking: C Compiler $(CC)'
	$(AT) $(CC) $(SYNTAX_FLAG) $(INCLUDES) $(DEFAULT_CFLAGS) -Wall -c -fmessage-length=0 -U_FORTIFY_SOURCE -MMD -MP -MF"$(@:%.o=%.d)" -o "$@" "$<" $(CFLAGS)
ifeq ($(GENERATE_PREPROCESSED),1)
	$(AT) $(CC) $(INCLUDES) $(DEFAULT_CFLAGS) -w -E -o "$(@:%.o=%.i)" "$<" $(CFLAGS)
endif
	$(AT) echo ' ...done'
	$(AT) echo ' '

# Rule for user-supplied assembly files
$(PROJECT_DIR)/build/%$(PROJ_INFIX).o: $(PROJECT_DIR)/%.S
ifeq (,$(SYNTAX_FLAG))
	$(AT) echo 'Building $(notdir $<)...'
#	$(AT) echo 'Invoking: GCC Assembler'
	$(AT) as -o "$@" "$<"
	$(AT) echo ' ...done'
endif
	$(AT) echo ' '

# Rule for user-supplied assembly files
$(PROJECT_DIR)/%_bin.h: $(PROJECT_DIR)/%.p
ifeq (,$(SYNTAX_FLAG))
	$(AT) echo 'Building $(notdir $<)...'
	$(AT) echo 'Invoking: PRU Assembler'
	$(AT)#check if pasm exists, skip otherwise. This provides (sort of)
	$(AT)#backwards compatibility in case pre-compiled header is available.
	$(AT)#pasm outputs to the same folder, so cd to the project folder before running it
	$(AT) if [ -z "`which pasm`" ]; then echo 'pasm not found, .p files not compiled.' 1>&2; else \
	      cd $(PROJECT_DIR) &&\
	      pasm "$<" -c >/dev/null && echo ' ...done'; fi
endif
	$(AT) echo ' '


ifeq ($(SHOULD_BUILD),false)
# if it is a project that does not require build, there are no dependencies to compile, nor a binary to generate
$(OUTPUT_FILE):
else

.EXPORT_ALL_VARIABLES:

PROJECT_PREPROCESSED_FILES := $(C_OBJS:%.o=%.i) $(CPP_OBJS:%.o=%.ii)
PROJECT_LIBRARIES_MAKEFILE := $(PROJECT_DIR)/build/Makefile.inc

#these rules do nothing, but keep make happy in case there is no .ii/.i file
#(e.g.: when updating from a codebase that did not save preprocessed files)
$(PROJECT_DIR)/build/%.i: $(PROJECT_DIR)/build/%.o ;
$(PROJECT_DIR)/build/%.ii: $(PROJECT_DIR)/build/%.o ;

$(PROJECT_LIBRARIES_MAKEFILE): $(PROJECT_PREPROCESSED_FILES)
	$(AT)./resources/tools/detectlibraries.sh --path $(PROJECT_DIR)/build

ifeq ($(RELINK),1)
  ifeq (,$(filter runide runonly,$(MAKECMDGOALS)))
    ifneq (,$(PROJECT_DIR))
      $(shell rm -rf $(OUTPUT_FILE))
    endif
  endif
endif
# first make sure the Makefile included by Makefile.linkbela is up to date ...
# ... then call Makefile.linkbela
$(OUTPUT_FILE): $(ALL_OBJS) $(PROJECT_LIBRARIES_MAKEFILE)
	$(AT) $(MAKE) -f Makefile.linkbela --no-print-directory $(OUTPUT_FILE)

endif # ifeq ($(SHOULD_BUILD),false)

projectclean: ## Remove the PROJECT's build objects & binary
	-$(RM) $(PROJECT_DIR)/build/* $(OUTPUT_FILE)
	-@echo ' '	

clean: ## Same as projectclean
clean: projectclean

coreclean: ## Remove the core's build objects
	-$(RM) build/*

prompt:
	$(AT) printf "Warning: you are about to DELETE the projects/ folder and its content. This operation cannot be undone. Continue? (y/N) "
	$(AT) read REPLY; if [ $$REPLY !=  y ] && [ $$REPLY != Y ]; then echo "Aborting..."; exit 1; fi
	
distclean: ## Restores the Bela folder to a pristine state: remove all the projects source and the built objects, including the core Bela objects.
distclean: prompt distcleannoprompt
	
distcleannoprompt: ## Same as distclean, but does not prompt for confirmation. Use with care.
	-$(RM) build/source/* $(CORE_OBJS) $(CORE_CPP_DEPS) $(DEFAULT_MAIN_OBJS) $(DEFAULT_MAIN_CPP_DEPS) $(OUTPUT_FILE)
	-@echo ' '

runonly: ## Run PROJECT in the foreground
runonly: $(RUN_PREREQUISITES)
	$(AT) echo "Running" $(RUN_COMMAND)
	$(AT) sync& cd $(RUN_FROM) && $(RUN_COMMAND)

runfg: run
run: ## Run PROJECT in the foreground after stopping previously running one
run: stop Bela runonly

runide: ## Run PROJECT for IDE (foreground, no buffering)
runide: stop Bela $(RUN_PREREQUISITES)
	$(AT) sync& cd $(RUN_FROM) && $(RUN_IDE_COMMAND)
runscreen: ## Run PROJECT in the background (detached screen)
runscreen: stop $(OUTPUT_FILE)
	$(AT) echo "Running $(RUN_COMMAND) in a screen"
	$(AT) cd $(RUN_FROM) && screen -S $(SCREEN_NAME) -d -m $(RUN_COMMAND)
runscreenfg: ## Run PROJECT in a screen in the foreground (can detach with ctrl-a ctrl-d)
runscreenfg: stop $(OUTPUT_FILE)
	$(AT) echo "Running $(RUN_COMMAND) in a screen"
	$(AT) cd $(RUN_FROM) && screen -S $(SCREEN_NAME) -m $(RUN_COMMAND)

nostartup: ## No Bela project runs at startup 
nostartup:
	$(AT) echo "Disabling Bela at startup..."
	$(AT) $(BELA_DISABLE_STARTUP_COMMAND)

startuploop: ## Makes PROJECT run at startup and restarts it if it crashes
ifneq ($(PROJECT),)
startuploop: Bela
endif
	$(AT) echo "Enabling Bela at startup in a loop..."
	$(AT) $(BELA_ENABLE_STARTUP_COMMAND)

startup: ## Same as startuploop
startup: startuploop # compatibility only

stopstartup: ## stop the system service that ran Bela at startup
ifneq ($(DEBIAN_VERSION),wheezy)
	$(AT) systemctl stop bela_startup || true
endif

stoprunning: ## Stops a Bela program that is currently running
	$(AT) PID=`grep $(BELA_AUDIO_THREAD_NAME) $(XENOMAI_STAT_PATH) | cut -d " " -f 5 | sed s/\s//g`; if [ -z $$PID ]; then [ $(QUIET) = true ] || echo "No process to kill"; else [  $(QUIET) = true  ] || echo "Killing old Bela process $$PID"; kill -2 $$PID; sleep 0.2; kill -9 $$PID 2> /dev/null; fi; screen -X -S $(SCREEN_NAME) quit > /dev/null; exit 0;
# take care of stale sclang / scsynth processes
ifeq ($(PROJECT_TYPE),sc)
#if we are about to start a sc project, these killall should be synchronous, otherwise they may kill they newly-spawn sclang process
	$(AT) killall scsynth 2>/dev/null; killall sclang 2>/dev/null; true
else
#otherwise, it safe if they are asynchronous (faster). The Bela program will still be able to start as the 
# audio thread has been killed above
	$(AT) killall scsynth 2>/dev/null& killall sclang 2>/dev/null& true
endif

stop: ## Stops any system service and Bela program that is currently running
stop: stopstartup stoprunning

ifneq ($(DEBIAN_VERSION),wheezy)
connect_startup: ## Connects to Bela program running at startup
	$(AT) journalctl -fu bela_startup -n 30
endif

connect: ## Connects to the running Bela program (if any), can detach with ctrl-a ctrl-d.
	$(AT) screen -r -S $(SCREEN_NAME)
	
idestart: ## Starts the on-board IDE
ifeq ($(DEBIAN_VERSION),wheezy)
# when using systemctl, idestart does not require idestop.
idestart: idestop
endif
	$(AT) printf "Starting IDE..."
	$(AT) $(BELA_IDE_START_COMMAND)
	$(AT) printf "done\n"

idestop: ## Stops the on-board IDE
	$(AT) printf "Stopping currently running IDE..."
	$(AT) $(BELA_IDE_STOP_COMMAND)
	$(AT) printf "done\n"

idestartup: ## Enables the IDE at startup
	$(AT) echo "Enabling the IDE at startup"
	$(AT) $(BELA_IDE_ENABLE_STARTUP_COMMAND)

idenostartup: ## Disables the IDE at startup
	$(AT) echo "Disabling the IDE at startup"
	$(AT) $(BELA_IDE_DISABLE_STARTUP_COMMAND)

ideconnect: ## Brings up the IDE's log
	$(AT) $(BELA_IDE_CONNECT_COMMAND)

csoundstart: # Start csound
	$(AT) screen -r -S $(RUN_COMMAND)

SCSYNTH_SCREEN_NAME=scsynth
SCSYNTH_RUN_COMMAND=screen -S $(SCSYNTH_SCREEN_NAME) -d -m scsynth $(SC_CL)
SCSYNTH_STOP_COMMAND?=screen -X -S $(SCSYNTH_SCREEN_NAME) quit > /dev/null 
scsynthstart: ## Starts scsynth
scsynthstart: scsynthstop
	$(AT) printf "Starting scsynth..."
	$(AT) $(SCSYNTH_RUN_COMMAND)
	$(AT) printf "done\n"

scsynthstop: ## Stops scsynth
	$(AT) printf "Stopping currently running scsynth..."
	$(AT) $(SCSYNTH_STOP_COMMAND); exit 0;
	$(AT) printf "done\n"

scsynthconnect: ## Brings in the foreground the scsynth that currently is running in a screen (if any), can detach with ctrl-a ctrl-d.
	$(AT) screen -r -S $(SCSYNTH_SCREEN_NAME)

SCSYNTH_STARTUP_COMMAND=printf '\#!/bin/sh\n\#\n\# This file is autogenerated by Bela. Do not edit!\n\necho Running scsynth...\n$(SCSYNTH_RUN_COMMAND)\n' 
scsynthstartup: ## Enables scsynth at startup
	$(SCSYNTH_STARTUP_COMMAND) > $(BELA_STARTUP_SCRIPT)

scsynthnostartup: ## Disables scsynth at startup
scsynthnostartup: nostartup
	$(AT) echo "Disabling scsynth at startup...done"

updateclean: ## Cleans the $(UPDATES_DIR) folder
	$(AT) [ -n $(UPDATE_DIR) ] && rm -rf $(UPDATE_DIR) && mkdir -p $(UPDATE_DIR)

checkupdate: ## Unzips the zip file in $(UPDATES_DIR) and checks that it contains a valid
	$(AT) echo Validating archive...
	$(AT) cd $(UPDATES_DIR) && COUNT=`ls -l *.zip | wc -l` && [ $$COUNT -eq 1 ] && rm -rf "`ls | grep -v \"\.zip$$\"`"
	$(AT) #TODO: heuristics on available space. Use unzip -l and df
	$(AT) echo uncompressed size: `unzip -l "$(UPDATES_DIR)/*.zip" | tail -n1 | awk '{print $$1}'`
	$(AT) # Delete and re-create the temp directory (first, make sure it is not an empty string!)
	$(AT) [ -n $(UPDATE_SOURCE_DIR) ] && rm -rf $(UPDATE_SOURCE_DIR) && mkdir -p $(UPDATE_SOURCE_DIR)
	$(AT) echo Unzipping archive...
	$(AT) cd $(UPDATE_SOURCE_DIR) && unzip -qq "$(UPDATES_DIR)/*zip"
	$(AT) # RemoveMac OSX garbage if it exists
	$(AT) rm -rf $(UPDATE_SOURCE_DIR)/__MACOSX $(UPDATE_SOURCE_DIR)/.DS_store
	$(AT) # Strip the top-level folder ( if there is only one )
	$(AT) DIR=`ls -d $(UPDATE_SOURCE_DIR)` && COUNT=`ls $$DIR | wc -l` &&\
	  [ $$COUNT -eq 1 ] && mv $(UPDATE_SOURCE_DIR)/* /tmp/supertemp && rm -rf $(UPDATE_SOURCE_DIR) && mv /tmp/supertemp $(UPDATE_SOURCE_DIR)
	
	$(AT) echo Validating unzipped archive...
	$(AT) cd $(UPDATE_SOURCE_DIR) && FAIL=0 && for path in $(UPDATE_REQUIRED_PATHS); do `ls $$path >/dev/null 2>&1` || { FAIL=1; break; }; done;\
	  [ $$FAIL -eq 0 ] || { echo "$$path was not found in the zip archive. Maybe it is corrupted?"; exit 1; }
	$(AT) echo 	...done
UPDATE_LOG?=$(BELA_DIR)/../update.log
LOG=>> $(shell realpath $(UPDATE_LOG)) 2>&1
TEE_LOG=2>&1 | tee -a $(UPDATE_LOG)
UPDATE_LOG_INIT:=echo > $(UPDATE_LOG); \
 echo DATE=`date -u +"%Y-%m-%dT%H:%M:%SZ"` $(LOG); \
 echo FILENAME=`ls $(UPDATES_DIR)/*zip` $(LOG);
UPDATE_LOG_SUCCESS:=echo SUCCESS=true $(LOG)

updateunsafe: ## Installs the update from $(UPDATES_DIR) in a more brick-friendly way
	$(AT) $(UPDATE_LOG_INIT)
	$(AT) echo METHOD=make updateunsafe $(LOG)
	# Re-perform the check, just in case ...	
	$(AT) cd $(UPDATE_SOURCE_DIR) && FAIL=0 && for path in $(UPDATE_REQUIRED_PATHS); do `ls $$path >/dev/null 2>&1` || { FAIL=1; break; }; done;\
	  [ $$FAIL -eq 0 ] || { echo "$$path was not found in the zip archive. Maybe it is corrupted?"; exit 1; }
	$(AT) cd $(UPDATE_SOURCE_DIR)/scripts $(LOG) && BBB_ADDRESS=root@127.0.0.1 BBB_BELA_HOME=$(BELA_DIR) ./update_board -y --no-frills $(TEE_LOG)
	$(AT) screen -S update-Bela -d -m bash -c "echo Restart the IDE $(LOG) &&\
	  $(MAKE) --no-print-directory idestart $(LOG) && echo Update successful $(LOG); $(UPDATE_LOG_SUCCESS)" $(LOG)
update: ## Installs the update from $(UPDATES_DIR)
update: stop
	$(AT) $(UPDATE_LOG_INIT)
	$(AT) echo METHOD=make update $(LOG)
	$(AT) echo Re-perform the check, just in case ... >> $(UPDATE_LOG)
	$(AT) cd $(UPDATE_SOURCE_DIR) && FAIL=0 && for path in $(UPDATE_REQUIRED_PATHS); do `ls $$path >/dev/null 2>&1` || { FAIL=1; break; }; done;\
	  [ $$FAIL -eq 0 ] || { echo "$$path was not found in the zip archive. Maybe it is corrupted?"; exit 1; }
	$(AT) [ -n $(UPDATE_BELA_PATCH) ] && mkdir -p $(UPDATE_BELA_PATCH)
	$(AT) [ -n "$(UPDATE_BELA_MV_BACKUP)" ] && rm -rf $(UPDATE_BELA_MV_BACKUP) $(LOG)
	$(AT) #TODO: this would allow to trim trailing slashes in case we want to be safer: a="`pwd`/" ; target=${a%/} ; echo $target
	$(AT) $(MAKE) --no-print-directory coreclean > /dev/null || true
	$(AT) $(MAKE) --no-print-directory -f Makefile.libraries cleanall > /dev/null || true
	$(AT) echo Copying $(BELA_DIR) to $(UPDATE_BELA_PATCH) ... $(TEE_LOG)
	$(AT) rsync -a --delete-during --exclude Documentation --exclude .git $(BELA_DIR)/ $(UPDATE_BELA_PATCH)
	$(AT) echo Applying patch in $(UPDATE_BELA_PATCH)... $(TEE_LOG)
	$(AT) cd $(UPDATE_SOURCE_DIR)/scripts && BBB_ADDRESS=root@127.0.0.1 BBB_BELA_HOME=$(UPDATE_BELA_PATCH) ./update_board -y --no-frills --no-log $(LOG)
	$(AT) # If everything went ok, we now have the updated version of $(BELA_DIR) in $(UPDATE_BELA_PATCH)
	$(AT) # So let's operate the magic swap. $(BELA_DIR) is moved to $(UPDATE_BELA_MV_BACKUP) and $(UPDATE_BELA_PATCH) is moved to $(BELA_DIR).
	$(AT) # The fun part is that this Makefile is moved as well...
	$(AT) # We are about to kill the IDE, so just in case you are running this from within the IDE, we run the remainder of this update in a screen.
	$(AT) # Output will be logged to $(UPDATE_LOG)
	$(AT) echo Restoring directory structure... $(TEE_LOG)
	$(AT) set -x; screen -S update-Bela -d -m bash -c '\
		set -x;\
		exec > >(tee -a "$(UPDATE_LOG)") 2>&1 ; \
	        echo Kill the IDE $(LOG) && \
	        $(MAKE) --no-print-directory idestop $(LOG) &&\
	        mv $(BELA_DIR) $(UPDATE_BELA_MV_BACKUP) $(LOG) && mv $(UPDATE_BELA_PATCH) $(BELA_DIR) $(LOG) &&\
	        mv $(UPDATE_BELA_MV_BACKUP)/.git $(BELA_DIR) $(LOG) &&\
	        echo Hope we are still alive here $(LOG) &&\
	        echo Restart the IDE $(LOG) &&\
	        make --no-print-directory -C $(BELA_DIR) idestart $(LOG) &&\
		echo Update successful $(LOG) &&\
		$(UPDATE_LOG_SUCCESS) ||\
		{ echo Error updating $(LOG); exit 1; }' $(LOG)

LIB_EXTRA_SO = libbelaextra.so
LIB_EXTRA_A = libbelaextra.a
# some library objects are required by libbelaextra.
LIB_EXTRA_OBJS = $(EXTRA_CORE_OBJS) build/core/GPIOcontrol.o libraries/Scope/build/Scope.o libraries/UdpClient/build/UdpClient.o libraries/UdpServer/build/UdpServer.o libraries/Midi/build/Midi.o libraries/Midi/build/Midi_c.o
libraries/%.o: # how to build those objects needed by libbelaextra
	$(AT) $(MAKE) -f Makefile.linkbela --no-print-directory $@

lib/$(LIB_EXTRA_SO): $(LIB_EXTRA_OBJS)
	$(AT) echo Building lib/$(LIB_EXTRA_SO)
	$(AT) $(CXX) $(BELA_LDFLAGS) $(LDFLAGS) -shared -Wl,-soname,$(LIB_EXTRA_SO) -o lib/$(LIB_EXTRA_SO) $(LIB_EXTRA_OBJS) $(LDLIBS) $(BELA_CORE_LDLIBS) $(BELA_EXTRA_LDLIBS)
	$(AT) ldconfig $(BASE_DIR)/$@

lib/$(LIB_EXTRA_A): $(LIB_EXTRA_OBJS) $(PRU_OBJS) $(LIB_DEPS)
	$(AT) echo Building lib/$(LIB_EXTRA_A)
	$(AT) ar rcs lib/$(LIB_EXTRA_A) $(LIB_EXTRA_OBJS)

LIB_SO =libbela.so
LIB_A = libbela.a
LIB_OBJS = $(CORE_CORE_OBJS) build/core/AuxiliaryTasks.o build/core/Gpio.o
lib/$(LIB_SO): $(LIB_OBJS)
	$(AT) echo Building lib/$(LIB_SO)
	$(AT) $(CXX) $(BELA_LDFLAGS) $(LDFLAGS) -shared -Wl,-soname,$(LIB_SO) $(LDLIBS) -o lib/$(LIB_SO) $(LIB_OBJS) $(LDLIBS) $(BELA_CORE_LDLIBS)
	$(AT) ldconfig $(BASE_DIR)/$@

lib/$(LIB_A): $(LIB_OBJS) $(PRU_OBJS) $(LIB_DEPS)
	$(AT) echo Building lib/$(LIB_A)
	$(AT) ar rcs lib/$(LIB_A) $(LIB_OBJS)

lib: lib/libbela.so lib/libbela.a lib/libbelaextra.so lib/libbelaextra.a

LDFLAGS_SHARED_PROJECT=-shared -Wl,-Bsymbolic -Wl,-soname,$(LIB_PROJECT_SO)

$(LIB_PROJECT_SO_FULL): $(PROJECT_OBJS) $(LIBRARIES_OBJS)
	$(AT) echo 'Linking project shared library...'
# we filter-out %.h because they could be added by P_OBJS
	$(AT) $(CXX) $(SYNTAX_FLAG) $(BELA_LDFLAGS) $(LIBRARIES_LDFLAGS) $(LDFLAGS_SHARED_PROJECT) $(LDFLAGS) -pthread -o "$@" $(filter-out %.h,$^) $(LDLIBS) $(LIBRARIES_LDLIBS) $(BELA_LDLIBS)
	$(AT) echo ' ...done'
	$(AT) echo ' '

HEAVY_TMP_DIR=/tmp/heavy-bela/
HEAVY_SRC_TARGET_DIR=$(PROJECT_DIR)
HEAVY_SRC_FILES=$(HEAVY_TMP_DIR)/*.cpp $(HEAVY_TMP_DIR)/*.c $(HEAVY_TMP_DIR)/*.hpp $(HEAVY_TMP_DIR)/*.h
HEAVY_OBJ_TARGET_DIR=$(PROJECT_DIR)/build
HEAVY_OBJ_FILES=$(HEAVY_TMP_DIR)/*.o
heavy-unzip-archive: stop
	$(AT) [ -z "$(HEAVY_ARCHIVE)" ] && { echo "You should specify the path to the Heavy archive with HEAVY_ARCHIVE=" >&2; false; } || true
	$(AT) [ -f "$(HEAVY_ARCHIVE)" ] || { echo "File $(HEAVY_ARCHIVE) not found" >&2; false; }
	$(AT) rm -rf $(HEAVY_TMP_DIR)
	$(AT) mkdir -p $(HEAVY_TMP_DIR)
	$(AT) unzip -qq -d $(HEAVY_TMP_DIR) $(HEAVY_ARCHIVE) && rm -rf $(HEAVY_ARCHIVE)
# For each source file, check if it already exists at the destination. If it
# does not, or if it is `diff`erent, then mv the source file to the destination
# We do all of this instead of simply touching all the src and obj files so
# that we make sure that the prerequsites of `render.o` are not more recent
# than the target unless they actually have changed.
	$(AT) for file in $(HEAVY_SRC_FILES); do dest="$(HEAVY_SRC_TARGET_DIR)/`basename $$file`"; diff -q "$$file" "$$dest" 2>/dev/null || { mv "$$file" "$$dest"; touch "$$dest"; } ; done
# For each object file, move it to the destination and make sure it is older than the source
	$(AT) for file in $(HEAVY_OBJ_FILES); do touch "$$file"; mv "$$file" "$(HEAVY_OBJ_TARGET_DIR)"; done
# If there is no render.cpp, copy the default Heavy one
	$(AT) [ -f $(PROJECT_DIR)/render.cpp ] || { cp $(BASE_DIR)/scripts/hvresources/render.cpp $(PROJECT_DIR)/ 2> /dev/null || echo "No default render.cpp found on the board"; }

.PHONY: all clean distclean help projectclean nostartup startup startuploop debug run runfg runscreen runscreenfg stopstartup stoprunning stop idestart idestop idestartup idenostartup ideconnect connect update checkupdate updateunsafe csoundstart scsynthstart scsynthstop scsynthstartup scsynthnostartup scsynthconnect lib c
-include CustomMakefileBottom.in
