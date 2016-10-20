# bela-cape-btn daemon for the bela-cape button.
#
# Adapted from:
# Copyright (C) 2016  Vilniaus Blokas UAB, http://blokas.io/pisound
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; version 2 of the
# License.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#

BINARY_DIR ?= /usr/local/bin

all: bela-cape-btn

bela-cape-btn: bela-cape-btn.c
	gcc bela-cape-btn.c -o bela-cape-btn

install: all 
#if test -e /etc/init.d/bela-cape-btn; then \
#	update-rc.d bela-cape-btn remove; \
#	/etc/init.d/bela-cape-btn stop; \
#fi
	@killall bela-cape-btn 2>/dev/null || true
	@cp bela-cape-btn $(BINARY_DIR)/
	@killall bela-cape-btn 2>/dev/null || true # just in case it is running in a for loop, now it should restart with the updated file

clean:
	rm -f bela-cape-btn

