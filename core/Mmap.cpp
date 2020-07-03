#include "../include/Mmap.h"
#include <unistd.h>
#include <fcntl.h>
#include <stdexcept>

Mmap::Mmap() :
ptr(nullptr),
size(0)
{
	fd = ::open("/dev/mem", O_RDWR);
	if(fd < 0)
		throw std::runtime_error("Unable to map /dev/mem\n");
}

Mmap::~Mmap()
{
	unmap();
	::close(fd);
}

void* Mmap::map(off_t offset, size_t size)
{
	long unit = sysconf(_SC_PAGE_SIZE);
	off_t remainder = offset % unit;
	off_t base = offset - remainder;
	unmap();
	this->size = size;
	ptr = mmap(0, size + remainder, PROT_READ | PROT_WRITE, MAP_SHARED, fd, base);
	if(MAP_FAILED == ptr) {
		return ptr = nullptr;
	}
	return ((char*)ptr + remainder);
}

void Mmap::unmap()
{
	munmap(ptr, size);
}
