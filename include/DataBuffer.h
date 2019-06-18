class DataBuffer 
{
	private:
		unsigned int _id;
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
				printf("Type for buffer %d unkown. Creatign byte (char) buffer.\n", _id);
			}
		}
	public:
		DataBuffer(){};
		DataBuffer(unsigned int id, char type, unsigned int size)
		{
			setup(id, type, size);
		}
		~DataBuffer(){};	
		void cleanup();
		
		void setup(unsigned int id, char type, unsigned int size)
		{
			_id = id;
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
		unsigned int getId(){ return _id; };
		char getType(){ return _type; };
		std::vector<char>* getBuffer() { return &_buffer; };
		char* getData() { return _buffer.data(); };
		
};
