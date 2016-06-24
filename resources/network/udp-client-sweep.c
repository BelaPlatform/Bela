/* UDP client in the internet domain */
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

void error(const char *);
int main(int argc, char *argv[])
{
   int sock, n;
   unsigned int length;
   struct sockaddr_in server, from;
   struct hostent *hp;
   char buffer[256];
   
   if (argc != 3) { printf("Usage: server port\n");
                    exit(1);
   }

   server.sin_family = AF_INET;
   hp = gethostbyname(argv[1]);
   if (hp==0) error("Unknown host");

   bcopy((char *)hp->h_addr, 
        (char *)&server.sin_addr,
         hp->h_length);
   server.sin_port = htons(atoi(argv[2]));
   length=sizeof(struct sockaddr_in);
   while (1){
     sock= socket(AF_INET, SOCK_DGRAM, 0);
     if (sock < 0) error("socket");
     bzero(buffer,256);
//     printf("Please enter the message: ");
//     fgets(buffer,255,stdin);
     double freq=50;
     while(1){
       freq*=1.001;
       if(freq>20000) freq=50;
       sprintf(buffer,"%.4f;",freq);
       n=sendto(sock,buffer,
            strlen(buffer),0,(const struct sockaddr *)&server,length);
       if (n < 0) error("Sendto");
       usleep(1000);
     }
   }
   close(sock);
   return 0;
}

void error(const char *msg)
{
    perror(msg);
    exit(0);
}
