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
				printf("Type unkown. Creating byte (char) buffer.\n");
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
			if (_type == 'd')
			{
				return _buffer.size() / sizeof(int32_t);
			}
			else if (_type == 'f')
			{
				return _buffer.size() / sizeof(float);
			}
			else
			{
				return _buffer.size();
			}
		}

		unsigned int getNumBytes(){ return _buffer.size(); };
		unsigned int getCapacity(){ return _buffer.capacity(); };
		char getType(){ return _type; };
		std::vector<char>* getBuffer() { return &_buffer; };
		char* getAsChar() { return _buffer.data(); };
		int32_t* getAsInt() { return (int32_t*) _buffer.data(); };
		float* getAsFloat() { return (float*) _buffer.data(); };

};
