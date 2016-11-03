class Gui
{
	private:
		gui_ws_setup();
		gui_ws_cleanup();
	public:
		Gui();
		~Gui();

		int setup();
		void cleanup();
}
