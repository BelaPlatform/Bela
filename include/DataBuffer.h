class DataBuffer
{
	private:
		char _type;
		std::vector<char> _buffer;

		void setType (char type)
	       	{
			if(type == 'c' || type == 'd' || type == 'f')
			{
				_type = type;
			}
			else
			{
				printf("Type unkown. Creatign byte (char) buffer.\n");
			}
		}
	public:
		DataBuffer(){};
		DataBuffer(char type, unsigned int size)
		{
			setup(type, size);
		}
		~DataBuffer(){};
		void cleanup();

		void setup(char type, unsigned int size)
		{
			setType(type);
			unsigned int bufferSize = (_type == 'c' ? size : size * sizeof(float));
			_buffer.resize(bufferSize);
		}

		unsigned int getNumElements()
	       	{
			return (_type == 'c' ? _buffer.size() : _buffer.size() / sizeof(float));
		}

		unsigned int getSize(){ return _buffer.size(); };
		unsigned int getCapacity(){ return _buffer.capacity(); };
		char getType(){ return _type; };
		std::vector<char>* getBuffer() { return &_buffer; };
		char* getAsChar() { return _buffer.data(); };
		int* getAsInt() { return (int*) _buffer.data(); };
		float* getAsFloat() { return (float*) _buffer.data(); };

};
