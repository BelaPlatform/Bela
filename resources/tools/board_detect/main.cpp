#include <Bela.h>

int main(){
	BelaHw hw = Bela_detectHw();
	switch(hw)
	{
		case BelaHw_BelaCape:
			printf("Bela\n");
			break;
		case BelaHw_BelaMiniCape:
			printf("BelaMini\n");
			break;
		case BelaHw_BelaModular:
			printf("Salt\n");
			break;
		case BelaHw_CtagFace:
			printf("CtagFace\n");
			break;
		case BelaHw_CtagBeast:
			printf("CtagBeast\n");
			break;
		case BelaHw_CtagFaceBelaCape:
			printf("CtagFaceBela\n");
			break;
		case BelaHw_CtagBeastBelaCape:
			printf("CtagBeastNela\n");
			break;
		case BelaHw_NoHw:
		default:
			printf("NoHardware\n");
			return 1;
	}
	return 0;
}
