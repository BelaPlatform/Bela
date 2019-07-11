/**
 * DataBuffer.h
 *
 * Basic class for holding byte buffers with type declaration.
 * Data is stored as bytes and can be retrieved raw or cast as int32 or float.
 *
 * Created on: June 2019
 *     Author: Adan L. Benito
 *
 **/
class DataBuffer
{
	private:
		// Buffer type: char (c), int32 (d), float (f)
		char _type;
		// Container for raw byte buffer
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

		/**
		 * Setup function for the buffer.
		 *
		 * @param type Character representing the type contained by the buffer.
		 * @param size Maximum size of the container. This is calculated assuming 32 bit floats & ints.
		 **/
		void setup(char type, unsigned int size)
		{
			setType(type);
			unsigned int bufferSize = (_type == 'c' ? size : size * sizeof(float));
			_buffer.resize(bufferSize);
		}

		/**
		 * Get number of elements in buffer.
		 *
		 * @return Number of elements in buffer.
		 **/
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
		/**
		 * Get number of bytes in buffer.
		 *
		 * @return Size of container.
		 **/
		unsigned int getNumBytes(){ return _buffer.size(); };
		/**
		 * Get maximum number of bytes that the buffer can hold.
		 *
		 * @return Container's capacity.
		 **/	
		unsigned int getCapacity(){ return _buffer.capacity(); };
		/**
		 * @return Buffer type.
		 **/
		char getType(){ return _type; };
		/**
		 * @return Pointer to container.
		 **/
		std::vector<char>* getBuffer() { return &_buffer; };
		/** 
		 * @return Pointer to raw byte buffer
		 **/
		char* getAsChar() { return _buffer.data(); };
		/**
		 * @return Pointer to buffer contents cast as int32
		 **/
		int32_t* getAsInt() { return (int32_t*) _buffer.data(); };
		/**
		 * @return Pointer to buffer contents cast as float
		 **/
		float* getAsFloat() { return (float*) _buffer.data(); };

};
