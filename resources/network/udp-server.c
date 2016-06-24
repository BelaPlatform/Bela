/* Creates a datagram server.  The port 
   number is passed as an argument.  This
   server runs forever */

#include <sys/types.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <string.h>
#include <netdb.h>
#include <stdio.h>

void error(const char *msg)
{
    perror(msg);
    exit(0);
}

int main(int argc, char *argv[])
{
   int sock, length, n;
   socklen_t fromlen;
   struct sockaddr_in server;
   struct sockaddr_in from;
   float buf[2048];
   int i=0;
   for(i=0; i<2048; i++){
     buf[i]=0;
   }
   if (argc < 2) {
      fprintf(stderr, "ERROR, no port provided\n");
      exit(0);
   }
   
   sock=socket(AF_INET, SOCK_DGRAM, 0);
   if (sock < 0) error("Opening socket");
   length = sizeof(server);
   bzero(&server,length);
   server.sin_family=AF_INET;
   server.sin_addr.s_addr=INADDR_ANY;
   server.sin_port=htons(atoi(argv[1]));
   if (bind(sock,(struct sockaddr *)&server,length)<0) 
       error("binding");
   fromlen = sizeof(struct sockaddr_in);
   while (1) {
       n = recvfrom(sock,buf,2048,0,(struct sockaddr *)&from,&fromlen);
       if (n < 0) error("recvfrom");
       printf("Received a datagram of size %d: \n", n);
       for(i=0; i<n/sizeof(float); i+=8)
	       printf("[%05d]: %+f, %+f, %+f, %+f, %+f, %+f, %+f, %+f\n",i,buf[0+i],buf[1+i],buf[2+i],buf[3+i],buf[4+i],buf[5+i],buf[6+i],buf[7+i]);
       n = sendto(sock,"Got your message\n",17,
                  0,(struct sockaddr *)&from,fromlen);
       if (n  < 0) error("sendto");
   }
   return 0;
 }

