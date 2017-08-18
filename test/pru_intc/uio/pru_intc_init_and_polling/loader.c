// Loads a PRU text.bin (and optionally data.bin) file,
// executes it, and waits for completion.
//
// Usage:
// $ ./loader text.bin [data.bin]
//
// Compile with:
// gcc -o loader loader.c -lprussdrv
//
// Based on https://credentiality2.blogspot.com/2015/09/beaglebone-pru-gpio-example.html

#include <stdio.h>
#include <stdlib.h>
#include <prussdrv.h>
#include <pruss_intc_mapping.h>

#define MY_PRUSS_INTC_INITDATA {   \
{ PRU0_PRU1_INTERRUPT, PRU1_PRU0_INTERRUPT, PRU0_ARM_INTERRUPT, PRU1_ARM_INTERRUPT, ARM_PRU0_INTERRUPT, ARM_PRU1_INTERRUPT, 54, 55, (char)-1  },  \
{ {PRU0_PRU1_INTERRUPT,CHANNEL1}, {PRU1_PRU0_INTERRUPT, CHANNEL0}, {PRU0_ARM_INTERRUPT,CHANNEL2}, {PRU1_ARM_INTERRUPT, CHANNEL3}, {ARM_PRU0_INTERRUPT, CHANNEL0}, {ARM_PRU1_INTERRUPT, CHANNEL1}, {54, CHANNEL0}, {55, CHANNEL0}, {-1,-1}},  \
 {  {CHANNEL0,PRU0}, {CHANNEL1, PRU1}, {CHANNEL2, PRU_EVTOUT0}, {CHANNEL3, PRU_EVTOUT1}, {-1,-1} },  \
 (PRU0_HOSTEN_MASK | PRU1_HOSTEN_MASK | PRU_EVTOUT0_HOSTEN_MASK | PRU_EVTOUT1_HOSTEN_MASK) /*Enable PRU0, PRU1, PRU_EVTOUT0 */ \
} \

int main(int argc, char **argv) {
  int i=0; 

  if (argc != 2 && argc != 3) {
    printf("Usage: %s loader text.bin [data.bin]\n", argv[0]);
    return 1;
  }

  prussdrv_init();
  if (prussdrv_open(PRU_EVTOUT_0) == -1) {
    printf("prussdrv_open() failed\n");
    return 1;
  }

  //tpruss_intc_initdata pruss_intc_initdata = MY_PRUSS_INTC_INITDATA;
  tpruss_intc_initdata pruss_intc_initdata = PRUSS_INTC_INITDATA;

  //pruss_intc_initdata.sysevt_to_channel_map
  prussdrv_pruintc_init(&pruss_intc_initdata);
  //pruss_intc_initdata.sysevts_enabled[54] = 54;
  //pruss_intc_initdata.sysevts_enabled[55] = 55;
  // TODO: Configure struct to, so that mapping is correct

  /*
  printf("event 55 to channel map: %d\n", prussdrv_get_event_to_channel_map(55));
  printf("channel 0 to host: %d\n", prussdrv_get_channel_to_host_map(0));
  printf("channel 0 to host: %d\n", prussdrv_get_channel_to_host_map(1));
  printf("event 55 to host map: %d\n", prussdrv_get_event_to_host_map(55));
  printf("sysevts enabled: %d\n", pruss_intc_initdata.sysevts_enabled[55]);
  */
  //printf("pruss_intc_initdata.host_enable_bitmask: 0x%x\n", pruss_intc_initdata.host_enable_bitmask);

  /*
  for (i=0; i < 10; i++)
    printf("channel %d mapped to host %d\n", i, prussdrv_get_channel_to_host_map(i));
  for (i=0; i < 64; i++)
    printf("system event %d mapped to channel %d\n", i, prussdrv_get_event_to_channel_map(i));
  for (i=0; i < 64; i++)
    printf("system event %d mapped to host %d\n", i, prussdrv_get_event_to_host_map(i));
  for (i=0; i < 64; i++)
    printf("system event %d enabled: %d\n", i, pruss_intc_initdata.sysevts_enabled[i]);
  */
  printf("system event 17 mapped to host %d\n", prussdrv_get_event_to_host_map(17));
  printf("system event 18 mapped to host %d\n", prussdrv_get_event_to_host_map(18)); 
  printf("system event 19 mapped to host %d\n", prussdrv_get_event_to_host_map(19));
  printf("system event 20 mapped to host %d\n", prussdrv_get_event_to_host_map(20)); 
  printf("system event 21 mapped to host %d\n", prussdrv_get_event_to_host_map(21));
  printf("system event 22 mapped to host %d\n", prussdrv_get_event_to_host_map(22)); 
  printf("system event 54 mapped to host %d\n", prussdrv_get_event_to_host_map(54));
  printf("system event 55 mapped to host %d\n", prussdrv_get_event_to_host_map(55));  

  printf("Executing program and waiting for termination\n");
  if (argc == 3) {
    if (prussdrv_load_datafile(0 /* PRU0 */, argv[2]) < 0) {
      fprintf(stderr, "Error loading %s\n", argv[2]);
      exit(-1);
    }
  }
  if (prussdrv_exec_program(0 /* PRU0 */, argv[1]) < 0) {
    fprintf(stderr, "Error loading %s\n", argv[1]);
    exit(-1);
  }

  // Wait for the PRU to let us know it's done
  printf("Waiting for interrupt on channel 2 (PRU_EVTOUT_0)\n");
  //prussdrv_pru_send_event(54); // arrives at PRU correctly (as well as event 55)
  prussdrv_pru_wait_event(PRU_EVTOUT_0);
  printf("Interrupt on channel 2 arrived\n");

  prussdrv_pru_disable(0 /* PRU0 */);
  prussdrv_exit();

  return 0;
}