/****************************************************************************/
/*  AM57xx_PRU.cmd                                                          */
/*  Copyright (c) 2015  Texas Instruments Incorporated                      */
/*                                                                          */
/*    Description: This file is a linker command file that can be used for  */
/*                 linking PRU programs built with the C compiler and       */
/*                 the resulting .out file on an AM57xx device.             */
/****************************************************************************/

-cr								/* Link using C conventions */

/* Specify the System Memory Map */
MEMORY
{
      PAGE 0:
	PRU_IMEM		: org = 0x00000000 len = 0x00003000  /* 12kB PRU-ICSS1 Instruction RAM */

      PAGE 1:

	/* RAM */

	PRU_DMEM_0_1	: org = 0x00000000 len = 0x00002000 CREGISTER=24 /* 8kB PRU Data RAM 0_1 */
	PRU_DMEM_1_0	: org = 0x00002000 len = 0x00002000	CREGISTER=25 /* 8kB PRU Data RAM 1_0 */

	  PAGE 2:
	PRU_SHAREDMEM	: org = 0x00010000 len = 0x00008000 CREGISTER=28 /* 32kB Shared RAM */

	DDR			    : org = 0x80000000 len = 0x00010000	CREGISTER=31
	L3OCMC			: org = 0x40000000 len = 0x00010000	CREGISTER=30


	/* Peripherals */

	PRU_CFG			: org = 0x00026000 len = 0x00000120	CREGISTER=4
	PRU_ECAP		: org = 0x00030000 len = 0x00000060	CREGISTER=3
	PRU_IEP			: org = 0x0002E000 len = 0x0000031C	CREGISTER=26
	PRU_INTC		: org = 0x00020000 len = 0x00001504	CREGISTER=0
	PRU_UART		: org = 0x00028000 len = 0x00000038	CREGISTER=7

	MCASP3_DMA		: org = 0x46000000 len = 0x00000100	CREGISTER=8
	I2C3			: org = 0x48060000 len = 0x00000300	CREGISTER=5

	RSVD1			: org = 0x48040000 len = 0x0000005C	CREGISTER=1
	RSVD2			: org = 0x4802A000 len = 0x000000D8	CREGISTER=2
	RSVD6			: org = 0x48030000 len = 0x000001A4	CREGISTER=6
	RSVD9			: org = 0x4A100000 len = 0x0000128C	CREGISTER=9
	RSVD10			: org = 0x48318000 len = 0x00000100	CREGISTER=10
	RSVD11			: org = 0x48022000 len = 0x00000088	CREGISTER=11
	RSVD12			: org = 0x48024000 len = 0x00000088	CREGISTER=12
	RSVD13			: org = 0x48310000 len = 0x00000100	CREGISTER=13
	RSVD14			: org = 0x481CC000 len = 0x000001E8	CREGISTER=14
	RSVD15			: org = 0x481D0000 len = 0x000001E8	CREGISTER=15
	RSVD16			: org = 0x481A0000 len = 0x000001A4	CREGISTER=16
	RSVD17			: org = 0x4819C000 len = 0x000000D8	CREGISTER=17
	RSVD18			: org = 0x48300000 len = 0x000002C4	CREGISTER=18
	RSVD19			: org = 0x48302000 len = 0x000002C4	CREGISTER=19
	RSVD20			: org = 0x48304000 len = 0x000002C4	CREGISTER=20
	RSVD21			: org = 0x00032400 len = 0x00000100	CREGISTER=21
	RSVD22			: org = 0x480C8000 len = 0x00000140	CREGISTER=22
	RSVD23			: org = 0x480CA000 len = 0x00000880	CREGISTER=23
	RSVD27			: org = 0x00032000 len = 0x00000100	CREGISTER=27
	RSVD29			: org = 0x49000000 len = 0x00001098	CREGISTER=29
}

/* Specify the sections allocation into memory */
SECTIONS {
	/* Forces _c_int00 to the start of PRU IRAM. Not necessary when loading
	   an ELF file, but useful when loading a binary */
	.text:_c_int00*	>  0x0, PAGE 0

	.text		>  PRU_IMEM, PAGE 0
	.stack		>  PRU_DMEM_0_1, PAGE 1
	.bss		>  PRU_DMEM_0_1, PAGE 1
	.cio		>  PRU_DMEM_0_1, PAGE 1
	.data		>  PRU_DMEM_0_1, PAGE 1
	.switch		>  PRU_DMEM_0_1, PAGE 1
	.sysmem		>  PRU_DMEM_0_1, PAGE 1
	.cinit		>  PRU_DMEM_0_1, PAGE 1
	.rodata		>  PRU_DMEM_0_1, PAGE 1
	.rofardata	>  PRU_DMEM_0_1, PAGE 1
	.farbss		>  PRU_DMEM_0_1, PAGE 1
	.fardata	>  PRU_DMEM_0_1, PAGE 1

	.resource_table > PRU_DMEM_0_1, PAGE 1
	.init_pins	> PRU_DMEM_0_1, PAGE 1
}
