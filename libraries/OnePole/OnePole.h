/*
 * Adapted from: http://www.earlevel.com/main/2012/12/15/a-one-pole-filter/
 *
 *	by: Adán L. Benito
 *	on: November 2018
 *	original code by Nigel Redmon
 * 
 */

class OnePole
{

	private:
		
		float _fc;
		float _fs;
		int _type;

		float a0, b1, ym1;
		
		void setType(int type);

		void setFc(float fc);

	public:
		OnePole();
		OnePole(float fc, float fs, int type);
		~OnePole();
		
		int setup(float fc, float fs, int type = LP);
		void cleanup();
		
		enum Type 
		{
			LP = 0,
			HP = 1
		};
		
		void setFilter(float fc, float fs, int type);
		
		float process(float input);
};
