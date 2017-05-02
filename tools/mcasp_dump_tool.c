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

#define MCASP_NUM_REG 37;

/* McASP register definitions */
#define DAVINCI_MCASP_PID_REG		0x00
#define DAVINCI_MCASP_PWREMUMGT_REG	0x04
#define DAVINCI_MCASP_PFUNC_REG		0x10
#define DAVINCI_MCASP_PDIR_REG		0x14
#define DAVINCI_MCASP_PDOUT_REG		0x18
#define DAVINCI_MCASP_PDSET_REG		0x1c
#define DAVINCI_MCASP_PDCLR_REG		0x20
#define DAVINCI_MCASP_TLGC_REG		0x30
#define DAVINCI_MCASP_TLMR_REG		0x34
#define DAVINCI_MCASP_GBLCTL_REG	0x44
#define DAVINCI_MCASP_AMUTE_REG		0x48
#define DAVINCI_MCASP_LBCTL_REG		0x4c
#define DAVINCI_MCASP_TXDITCTL_REG	0x50
#define DAVINCI_MCASP_GBLCTLR_REG	0x60
#define DAVINCI_MCASP_RXMASK_REG	0x64
#define DAVINCI_MCASP_RXFMT_REG		0x68
#define DAVINCI_MCASP_RXFMCTL_REG	0x6c
#define DAVINCI_MCASP_ACLKRCTL_REG	0x70
#define DAVINCI_MCASP_AHCLKRCTL_REG	0x74
#define DAVINCI_MCASP_RXTDM_REG		0x78
#define DAVINCI_MCASP_EVTCTLR_REG	0x7c
#define DAVINCI_MCASP_RXSTAT_REG	0x80
#define DAVINCI_MCASP_RXTDMSLOT_REG	0x84
#define DAVINCI_MCASP_RXCLKCHK_REG	0x88
#define DAVINCI_MCASP_REVTCTL_REG	0x8c
#define DAVINCI_MCASP_GBLCTLX_REG	0xa0
#define DAVINCI_MCASP_TXMASK_REG	0xa4
#define DAVINCI_MCASP_TXFMT_REG		0xa8
#define DAVINCI_MCASP_TXFMCTL_REG	0xac
#define DAVINCI_MCASP_ACLKXCTL_REG	0xb0
#define DAVINCI_MCASP_AHCLKXCTL_REG	0xb4
#define DAVINCI_MCASP_TXTDM_REG		0xb8
#define DAVINCI_MCASP_EVTCTLX_REG	0xbc
#define DAVINCI_MCASP_TXSTAT_REG	0xc0
#define DAVINCI_MCASP_TXTDMSLOT_REG	0xc4
#define DAVINCI_MCASP_TXCLKCHK_REG	0xc8
#define DAVINCI_MCASP_XEVTCTL_REG	0xcc

unsigned int MCASP_REGS[] = {
	DAVINCI_MCASP_PID_REG,
	DAVINCI_MCASP_PWREMUMGT_REG,
	DAVINCI_MCASP_PFUNC_REG,
	DAVINCI_MCASP_PDIR_REG,
	DAVINCI_MCASP_PDOUT_REG,
	DAVINCI_MCASP_PDSET_REG,
	DAVINCI_MCASP_PDCLR_REG,
	DAVINCI_MCASP_TLGC_REG,
	DAVINCI_MCASP_TLMR_REG,
	DAVINCI_MCASP_GBLCTL_REG,
	DAVINCI_MCASP_AMUTE_REG,
	DAVINCI_MCASP_LBCTL_REG,
	DAVINCI_MCASP_TXDITCTL_REG,
	DAVINCI_MCASP_GBLCTLR_REG,
	DAVINCI_MCASP_RXMASK_REG,
	DAVINCI_MCASP_RXFMT_REG,
	DAVINCI_MCASP_RXFMCTL_REG,
	DAVINCI_MCASP_ACLKRCTL_REG,
	DAVINCI_MCASP_AHCLKRCTL_REG,
	DAVINCI_MCASP_RXTDM_REG,
	DAVINCI_MCASP_EVTCTLR_REG,
	DAVINCI_MCASP_RXSTAT_REG,
	DAVINCI_MCASP_RXTDMSLOT_REG,
	DAVINCI_MCASP_RXCLKCHK_REG,
	DAVINCI_MCASP_REVTCTL_REG,
	DAVINCI_MCASP_GBLCTLX_REG,
	DAVINCI_MCASP_TXMASK_REG,
	DAVINCI_MCASP_TXFMT_REG,
	DAVINCI_MCASP_TXFMCTL_REG,
	DAVINCI_MCASP_ACLKXCTL_REG,
	DAVINCI_MCASP_AHCLKXCTL_REG,
	DAVINCI_MCASP_TXTDM_REG,
	DAVINCI_MCASP_EVTCTLX_REG,
	DAVINCI_MCASP_TXSTAT_REG,
	DAVINCI_MCASP_TXTDMSLOT_REG,
	DAVINCI_MCASP_TXCLKCHK_REG,
	DAVINCI_MCASP_XEVTCTL_REG
};
  
#define FATAL do { fprintf(stderr, "Error at line %d, file %s (%d) [%s]\n", \
  __LINE__, __FILE__, errno, strerror(errno)); exit(1); } while(0)
 
#define MAP_SIZE 4096UL
#define MAP_MASK (MAP_SIZE - 1)

int main(int argc, char **argv) {
    int fd;
    void *map_base, *virt_addr; 
	unsigned long read_result, writeval;
	off_t target = 0x48038000;
	int access_type = 'w';
	int i = 0;

    if((fd = open("/dev/mem", O_RDWR | O_SYNC)) == -1) FATAL;
    
    /* Map one page */
    map_base = mmap(0, MAP_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, target & ~MAP_MASK);
    if(map_base == (void *) -1) FATAL;
    
    for (i=0; i < 37; i++){
    	virt_addr = map_base + ((target + MCASP_REGS[i]) & MAP_MASK);
    	read_result = *((unsigned long *) virt_addr);
    	printf("Reg 0x%X: 0x%X\n", MCASP_REGS[i], read_result); 
    }
    
    fflush(stdout);
	
	if(munmap(map_base, MAP_SIZE) == -1) FATAL;
    close(fd);
    
    return 0;
}