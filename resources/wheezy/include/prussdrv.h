/*
 * prussdrv.h
 *
 * Describes PRUSS userspace driver for Industrial Communications
 *
 * Copyright (C) 2010 Texas Instruments Incorporated - http://www.ti.com/
 *
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions
 *  are met:
 *
 *    Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 *    Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the
 *    distribution.
 *
 *    Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 *  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 *  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 *  A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 *  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 *  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 *  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 *  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 *  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 *  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 *  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
*/

/*
 * ============================================================================
 * Copyright (c) Texas Instruments Inc 2010-11
 *
 * Use of this software is controlled by the terms and conditions found in the
 * license agreement under which this software has been supplied or provided.
 * ============================================================================
*/

#ifndef _PRUSSDRV_H
#define _PRUSSDRV_H

#include <sys/types.h>

#if defined (__cplusplus)
extern "C" {
#endif

#define NUM_PRU_HOSTIRQS        8
#define NUM_PRU_HOSTS          10
#define NUM_PRU_CHANNELS       10
#define NUM_PRU_SYS_EVTS       64

#define PRUSS0_PRU0_DATARAM     0
#define PRUSS0_PRU1_DATARAM     1
#define PRUSS0_PRU0_IRAM        2
#define PRUSS0_PRU1_IRAM        3

#define PRUSS_V1                1 // AM18XX
#define PRUSS_V2                2 // AM33XX

//Available in AM33xx series - begin
#define PRUSS0_SHARED_DATARAM   4
#define	PRUSS0_CFG              5
#define	PRUSS0_UART             6
#define	PRUSS0_IEP              7
#define	PRUSS0_ECAP             8
#define	PRUSS0_MII_RT           9
#define	PRUSS0_MDIO            10
//Available in AM33xx series - end

#define PRU_EVTOUT_0            0
#define PRU_EVTOUT_1            1
#define PRU_EVTOUT_2            2
#define PRU_EVTOUT_3            3
#define PRU_EVTOUT_4            4
#define PRU_EVTOUT_5            5
#define PRU_EVTOUT_6            6
#define PRU_EVTOUT_7            7

    typedef struct __sysevt_to_channel_map {
        short sysevt;
        short channel;
    } tsysevt_to_channel_map;
    typedef struct __channel_to_host_map {
        short channel;
        short host;
    } tchannel_to_host_map;
    typedef struct __pruss_intc_initdata {
        //Enabled SYSEVTs - Range:0..63
        //{-1} indicates end of list
        char sysevts_enabled[NUM_PRU_SYS_EVTS];
        //SysEvt to Channel map. SYSEVTs - Range:0..63 Channels -Range: 0..9
        //{-1, -1} indicates end of list
        tsysevt_to_channel_map sysevt_to_channel_map[NUM_PRU_SYS_EVTS];
        //Channel to Host map.Channels -Range: 0..9  HOSTs - Range:0..9
        //{-1, -1} indicates end of list
        tchannel_to_host_map channel_to_host_map[NUM_PRU_CHANNELS];
        //10-bit mask - Enable Host0-Host9 {Host0/1:PRU0/1, Host2..9 : PRUEVT_OUT0..7}
        unsigned int host_enable_bitmask;
    } tpruss_intc_initdata;

    int prussdrv_init(void);

    int prussdrv_open(unsigned int host_interrupt);

    /** Return version of PRU.  This must be called after prussdrv_open. */
    int prussdrv_version();

    /** Return string description of PRU version. */
    const char* prussdrv_strversion(int version);

    int prussdrv_pru_reset(unsigned int prunum);

    int prussdrv_pru_disable(unsigned int prunum);

    int prussdrv_pru_enable(unsigned int prunum);
    int prussdrv_pru_enable_at(unsigned int prunum, size_t addr);

    int prussdrv_pru_write_memory(unsigned int pru_ram_id,
                                  unsigned int wordoffset,
                                  const unsigned int *memarea,
                                  unsigned int bytelength);

    int prussdrv_pruintc_init(const tpruss_intc_initdata *prussintc_init_data);

    /** Find and return the channel a specified event is mapped to.
     * Note that this only searches for the first channel mapped and will not
     * detect error cases where an event is mapped erroneously to multiple
     * channels.
     * @return channel-number to which a system event is mapped.
     * @return -1 for no mapping found
     */
    short prussdrv_get_event_to_channel_map( unsigned int eventnum );

    /** Find and return the host interrupt line a specified channel is mapped
     * to.  Note that this only searches for the first host interrupt line
     * mapped and will not detect error cases where a channel is mapped
     * erroneously to multiple host interrupt lines.
     * @return host-interrupt-line to which a channel is mapped.
     * @return -1 for no mapping found
     */
    short prussdrv_get_channel_to_host_map( unsigned int channel );

    /** Find and return the host interrupt line a specified event is mapped
     * to.  This first finds the intermediate channel and then the host.
     * @return host-interrupt-line to which a system event is mapped.
     * @return -1 for no mapping found
     */
    short prussdrv_get_event_to_host_map( unsigned int eventnum );

    int prussdrv_map_l3mem(void **address);

    int prussdrv_map_extmem(void **address);

    unsigned int prussdrv_extmem_size(void);

    int prussdrv_map_prumem(unsigned int pru_ram_id, void **address);

    int prussdrv_map_peripheral_io(unsigned int per_id, void **address);

    unsigned int prussdrv_get_phys_addr(const void *address);

    void *prussdrv_get_virt_addr(unsigned int phyaddr);

    /** Wait for the specified host interrupt.
     * @return the number of times the event has happened. */
    unsigned int prussdrv_pru_wait_event(unsigned int host_interrupt);

    int prussdrv_pru_event_fd(unsigned int host_interrupt);

    int prussdrv_pru_send_event(unsigned int eventnum);

    /** Clear the specified event and re-enable the host interrupt. */
    int prussdrv_pru_clear_event(unsigned int host_interrupt,
                                 unsigned int sysevent);

    int prussdrv_pru_send_wait_clear_event(unsigned int send_eventnum,
                                           unsigned int host_interrupt,
                                           unsigned int ack_eventnum);

    int prussdrv_exit(void);

    int prussdrv_exec_program(int prunum, const char *filename);
    int prussdrv_exec_program_at(int prunum, const char *filename, size_t addr);

    int prussdrv_exec_code(int prunum, const unsigned int *code, int codelen);
    int prussdrv_exec_code_at(int prunum, const unsigned int *code, int codelen, size_t addr);
    int prussdrv_load_data(int prunum, const unsigned int *code, int codelen);
    int prussdrv_load_datafile(int prunum, const char *filename);

#if defined (__cplusplus)
}
#endif
#endif
