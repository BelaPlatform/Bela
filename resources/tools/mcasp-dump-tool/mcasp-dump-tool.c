/*
 * devmem2.c: Simple program to read/write from/to any location in memory.
 *
 *  Copyright (C) 2000, Jan-Derk Bakker (J.D.Bakker@its.tudelft.nl)
 *
 *
 * This software has been developed for the LART computing board
 * (http://www.lart.tudelft.nl/). The development has been sponsored by
 * the Mobile MultiMedia Communications (http://www.mmc.tudelft.nl/)
 * and Ubiquitous Communications (http://www.ubicom.tudelft.nl/)
 * projects.
 *
 * The author can be reached at:
 *
 *  Jan-Derk Bakker
 *  Information and Communication Theory Group
 *  Faculty of Information Technology and Systems
 *  Delft University of Technology
 *  P.O. Box 5031
 *  2600 GA Delft
 *  The Netherlands
 *
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <signal.h>
#include <fcntl.h>
#include <ctype.h>
#include <termios.h>
#include <sys/types.h>
#include <sys/mman.h>


struct {
	unsigned int offset;
	const char* label;
} MCASP_REGS[] = {
	{ 0x00, "REV" },
	{ 0x04, "PWRIDLESYSCONFIG" },
	{ 0x10, "PFUNC" },
	{ 0x14, "PDIR" },
	{ 0x18, "PDOUT" },
	{ 0x1c, "PDIN" },
	{ 0x20, "PDCLR" },
	{ 0x30, "TLGC" },
	{ 0x34, "TLMR" },
	{ 0x44, "GBLCTL" },
	{ 0x48, "AMUTE" },
	{ 0x4c, "DLBCTL" },
	{ 0x50, "DITCTL" },
	{ 0x60, "GLBCTLR" },
	{ 0x64, "RMASK" },
	{ 0x68, "RFMT" },
	{ 0x6c, "AFSRCTL" },
	{ 0x70, "ACLKRCTL" },
	{ 0x74, "AHCLKRCTL" },
	{ 0x78, "RTDM" },
	{ 0x7c, "RINTCTL" },
	{ 0x80, "RSTAT" },
	{ 0x84, "RSLOT" },
	{ 0x88, "RCLKCHK" },
	{ 0x8c, "RCLKCHK" },
	{ 0xa0, "XGBLCTL" },
	{ 0xa4, "XMASK" },
	{ 0xa8, "XFMT" },
	{ 0xac, "AFSXCTL" },
	{ 0xb0, "ACLKXCTL" },
	{ 0xb4, "AHCLKXCTL" },
	{ 0xb8, "XTDM" },
	{ 0xbc, "XINTCTL" },
	{ 0xc0, "XSTAT" },
	{ 0xc4, "XSLOT" },
	{ 0xc8, "XCLKCHK" },
	{ 0xcc, "XEVTCTL" },
	{ 0x180, "SRCTL_0" },
	{ 0x184, "SRCTL_1" },
	{ 0x188, "SRCTL_2" },
	{ 0x18b, "SRCTL_3" },
	{ 0x190, "SRCTL_4" },
	{ 0x194, "SRCTL_5" },
	{ 0x1000, "WFIFOCTL" },
	{ 0x1008, "RFIFOCTL" },
};
  
#define FATAL do { fprintf(stderr, "Error at line %d, file %s (%d) [%s]\n", \
  __LINE__, __FILE__, errno, strerror(errno)); exit(1); } while(0)
 
#define MAP_SIZE 4096UL
#define MAP_MASK (MAP_SIZE - 1)

int main(int argc, char **argv) {
    int fd;
    void *map_base, *virt_addr; 
	unsigned int read_result, writeval;
	off_t target = 0x48038000;
	int access_type = 'w';
	int i = 0;

    if((fd = open("/dev/mem", O_RDWR | O_SYNC)) == -1) FATAL;
    
    /* Map one page */
    map_base = mmap(0, MAP_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, target & ~MAP_MASK);
    if(map_base == (void *) -1) FATAL;
    
    for (i=0; i < sizeof(MCASP_REGS) / sizeof(MCASP_REGS[0]); i++){
        virt_addr = map_base + ((target + MCASP_REGS[i].offset) & MAP_MASK);
        read_result = *((unsigned long *) virt_addr);
        printf("0x%X (%s): 0x%X\n", MCASP_REGS[i].offset, MCASP_REGS[i].label, read_result);
    }
    
    fflush(stdout);
	
	if(munmap(map_base, MAP_SIZE) == -1) FATAL;
    close(fd);
    
    return 0;
}
