commit d323c5ea6f308013eea226ff4a18d1e0af84d71b
Author: henrix <henni19790@googlemail.com>
Date:   Tue Nov 28 01:24:21 2017 +0100

    Fixed channel order of analog IOs. Added toggle to switch between analog IO channels. Clean up.

diff --git a/pru_rtaudio.p b/pru_rtaudio.p
index 9522744..edc69af 100644
--- a/pru_rtaudio.p
+++ b/pru_rtaudio.p
@@ -1284,9 +1284,7 @@ HANDLE_INTERRUPT:
      PRU_ICSS_INTC_REG_READ_EXT INTC_REG_SECR1, r27
      QBBS MCASP_TX_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCASP_TX_INTR
      QBBS MCASP_RX_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCASP_RX_INTR
-     QBBS MCSPI_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCSPI_INTR
-
-     //TODO: Check for overruns / underruns here (e.g. every 8 blocks)
+     //QBBS MCSPI_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCSPI_INTR
 
      JMP EVENT_LOOP
 /* ########## INTERRUPT HANDLER END ########## */
@@ -1460,7 +1458,7 @@ MCASP_RX_INTR_RECEIVED: // mcasp_r_intr_pend
 	 MCASP_REG_READ_EXT MCASP_RFIFOSTS, r27
 	 QBEQ SKIP_AUDIO_RX_FRAME, r27, 0
 
-	 // TODO: Optimize by only using on operation to read data from McASP FIFO.
+	 // TODO: Optimize by only using single operation to read data from McASP FIFO.
 	 // Channels are swaped for master and slave codec to match correct channel order.
 	 MCASP_READ_FROM_DATAPORT r8, 32
      AND r0, r12, r17
@@ -1513,11 +1511,10 @@ SKIP_AUDIO_RX_FRAME:
 MCASP_RX_ISR_END:
 /* ########## McASP RX ISR END ########## */
 
+/* ########## PROCESS ANALOG AND DIGITAL BEGIN ########## */
 	 // Skip analog processing if SPI is disabled
      QBBC PROCESS_SPI_END, reg_flags, FLAG_BIT_USE_SPI
 
-/* ########## McSPI ISR BEGIN ########## */
-PROCESS_SPI_BEGIN:
      // Temporarily save register states in scratchpad to have enough space for SPI data
      // r0 - r3 are used for ADC data. r4 - r17 are used as temp registers
      // ATTENTION: Registers which store memory addresses should never be temporarily overwritten
@@ -1528,7 +1525,12 @@ PROCESS_SPI_BEGIN:
      ADD reg_dac_current, reg_dac_current, 8
 
      // DAC: transmit low word (first in little endian)
-     MOV r16, 2 // Write channel 0
+     QBBC ANALOG_CHANNEL_4, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
+     MOV r16, 0 // Write channel 0
+     JMP ANALOG_CHANNEL_4_END
+ANALOG_CHANNEL_4:
+     MOV r16, 4 // Write channel 4
+ANALOG_CHANNEL_4_END:
      MOV r17, 0xFFFF
      AND r4, r2, r17
      LSL r4, r4, AD5668_DATA_OFFSET
@@ -1540,7 +1542,6 @@ PROCESS_SPI_BEGIN:
      DAC_WRITE r4
 
      MOV r0, 0 // Initialize register for first two samples
-     MOV r16, 2 // Read channel 0 (can be deleted)
      LSL r16, r16, AD7699_CHANNEL_OFFSET
      MOV r17, AD7699_CFG_MASK
      OR r16, r16, r17
@@ -1549,7 +1550,12 @@ PROCESS_SPI_BEGIN:
      AND r0, r16, r17
 
 	 // DAC: transmit high word (second in little endian)
-	 MOV r16, 3 // Write channel 1
+     QBBC ANALOG_CHANNEL_5, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
+	 MOV r16, 1 // Write channel 1
+     JMP ANALOG_CHANNEL_5_END
+ANALOG_CHANNEL_5:
+     MOV r16, 5 // Write channel 5
+ANALOG_CHANNEL_5_END:
      LSR r4, r2, 16
      LSL r4, r4, AD5668_DATA_OFFSET
      MOV r5, (0x03 << AD5668_COMMAND_OFFSET)
@@ -1559,7 +1565,6 @@ PROCESS_SPI_BEGIN:
      OR r4, r4, r5
      DAC_WRITE r4     
 
-     MOV r16, 3 // Read channel 1 (can be deleted)
      LSL r16, r16, AD7699_CHANNEL_OFFSET
      MOV r17, AD7699_CFG_MASK
      OR r16, r16, r17
@@ -1568,7 +1573,12 @@ PROCESS_SPI_BEGIN:
      OR r0, r0, r16
 
      // DAC: transmit low word (first in little endian)
-     MOV r16, 0 // Write channel 2
+     QBBC ANALOG_CHANNEL_6, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
+     MOV r16, 2 // Write channel 2
+     JMP ANALOG_CHANNEL_6_END
+ANALOG_CHANNEL_6:
+     MOV r16, 6 // Write channel 6
+ANALOG_CHANNEL_6_END:
      MOV r17, 0xFFFF
      AND r4, r3, r17
      LSL r4, r4, AD5668_DATA_OFFSET
@@ -1580,7 +1590,6 @@ PROCESS_SPI_BEGIN:
      DAC_WRITE r4
 
      MOV r1, 0 // Initialize register for next two samples
-     MOV r16, 0 // Read channel 2 (can be deleted)
      LSL r16, r16, AD7699_CHANNEL_OFFSET
      MOV r17, AD7699_CFG_MASK
      OR r16, r16, r17
@@ -1589,7 +1598,12 @@ PROCESS_SPI_BEGIN:
      AND r1, r16, r17
 
      // DAC: transmit high word (second in little endian)
-	 MOV r16, 1 // Write channel 3
+     QBBC ANALOG_CHANNEL_7, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
+	 MOV r16, 3 // Write channel 3
+     JMP ANALOG_CHANNEL_7_END
+ANALOG_CHANNEL_7:
+     MOV r16, 7 // Write channel 7
+ANALOG_CHANNEL_7_END:
      LSR r4, r3, 16
      LSL r4, r4, AD5668_DATA_OFFSET
      MOV r5, (0x03 << AD5668_COMMAND_OFFSET)
@@ -1599,7 +1613,6 @@ PROCESS_SPI_BEGIN:
      OR r4, r4, r5
      DAC_WRITE r4  
 
-     MOV r16, 1 // Read channel 3 (can be deleted)
      LSL r16, r16, AD7699_CHANNEL_OFFSET
      MOV r17, AD7699_CFG_MASK
      OR r16, r16, r17
@@ -1612,23 +1625,16 @@ PROCESS_SPI_BEGIN:
      ADD reg_adc_current, reg_adc_current, 8
 
      XIN SCRATCHPAD_ID_BANK0, r0, 72 // load back register states from scratchpad
-/*
-     //r27 is actually r27, so do not use r27 from here to ...
-     LBBO r27, reg_digital_current, 0, 4 
-     JAL r28.w0, DIGITAL // note that this is not called as a macro, but with JAL. r28 will contain the return address
-     SBBO r27, reg_digital_current, 0,   4 
-     //..here you can start using r27 again
 
-     ADD reg_digital_current, reg_digital_current, 4 //increment pointer
-*/
-     // Toggle flag to check on which SPI channels we are (i.e. ch0-ch3 or ch4-ch7)
+     // Toggle flag to check on which SPI channels (i.e. ch0-ch3 or ch4-ch7) we are, 
+     // if eight analog IO channels are used
+     QBNE PROCESS_SPI_END, reg_num_channels, 8
      XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCSPI_FIRST_FOUR_CH)
 
 PROCESS_SPI_END:
 
      // Skip digital processing if digital IOs are disabled
      QBBC PROCESS_DIGITAL_END, reg_flags, FLAG_BIT_USE_DIGITAL
-PROCESS_DIGITAL_BEGIN:
 
      //r27 is actually r27, so do not use r27 from here to ...
      LBBO r27, reg_digital_current, 0, 4 
@@ -1643,10 +1649,12 @@ PROCESS_DIGITAL_END:
 	 XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCASP_RX_FIRST_FRAME) // Toggle frame flag
 
      JMP EVENT_LOOP
-/* ########## McSPI ISR END ########## */
+/* ########## PROCESS ANALOG AND DIGITAL END ########## */
 
 
 /* ########## McSPI (analog) ISR BEGIN ########## */
+// This ISR is currently not used, but is probably useful in future (McSPI interrupts)
+/*
 MCSPI_INTR_RECEIVED: // SINTERRUPTN
      // Clear system event
      PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | PRU_SYS_EV_MCSPI_INTR)
@@ -1680,6 +1688,7 @@ MCSPI_INTR_RX1_FULL:
 	 //TODO: Handle rx1 full interrupt here
 
 	 JMP EVENT_LOOP
+*/
 /* ########## McSPI (analog) ISR END ########## */
 
 
