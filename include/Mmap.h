#pragma once
#include <sys/mman.h>
class Mmap
{
public:
	Mmap();
	~Mmap();

	/**
	 * Map a portion of memory.
	 *
	 * @param offset the memory offset to start the mapping at. There are
	 * no alignment requirements.
	 * @param size how many bytes to map.
	 * @return a pointer to the requested memory, or nullptr on failure.
	 */
	void* map(off_t offset, size_t size);

	/**
	 * Discard the existing mapping. This is called automatically by the
	 * destructor or when calling map().
	 */
	void unmap();

	/**
	 * Read the content of the memory at @p offset into @p value.
	 */
	template<typename T>
	static int read(off_t offset, T& value)
	{
		Mmap mmap;
		T* ptr = (T*)mmap.map(offset, sizeof(T));
		if(ptr) {
			value = ptr[0];
			return 0;
		} else
			return -1;

	}

	/**
	 * Write the content of @p value into the memory at @p offser.
	 */
	template<typename T>
	static int write(off_t offset, const T& value)
	{
		Mmap mmap;
		T* ptr = (T*)mmap.map(offset, sizeof(T));
		if(ptr) {
			ptr[0] = value;
			return 0;
		} else
			return -1;
	}
private:
	int fd;
	void* ptr;
	size_t size;
};

