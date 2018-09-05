#include <Bela.h>
int main(){
	BelaHw hw = Bela_detectHw();
	switch(hw)
	{
		case BelaHw_Bela:
			printf("Bela\n");
			break;
		case BelaHw_BelaMini:
			printf("BelaMini\n");
			break;
		case BelaHw_Salt:
			printf("Salt\n");
			break;
		case BelaHw_CtagFace:
			printf("CtagFace\n");
			break;
		case BelaHw_CtagBeast:
			printf("CtagBeast\n");
			break;
		case BelaHw_CtagFaceBela:
			printf("CtagFaceBela\n");
			break;
		case BelaHw_CtagBeastBela:
			printf("CtagBeastBela\n");
			break;
		case BelaHw_NoHw:
		default:
			printf("NoHardware\n");
			return 1;
	}
	return 0;
}

