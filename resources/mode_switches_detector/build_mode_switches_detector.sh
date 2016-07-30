#!/bin/bash

gcc mode_switches_detector.c -lxenomai -lnative -o  mode_switches_detector -I/usr/xenomai/include -L/usr/xenomai/lib
