#pragma once
#include <vector>
#include <fstream>

/**
 * A class to read/write an EEPROM memory via i2c using the sysfs
 * interface provided by the 24cXXX class of drivers.
 *
 * The class maintains a copy in a memory buffer of the content of the
 * EEPROM, which is read during setup() and subsequent calls to read(), and
 * it assumes that no other program or device will write to the EEPROM in the
 * meantime. The user shall access the memory buffer using `[]`, `data()` and
 * `size()`, modify it as needed, and then call write() to actually write the
 * data to the hardware.
 */
class Eeprom {
public:
	/**
	 * Details about the EEPROM.
	 */
	struct Settings {
		/**
		 * The I2C bus number.
		 */
		unsigned int bus;
		/**
		 * The I2C address. These EEPROMs may have two adjacent
		 * addresses reserved. This must be the first of the two.
		 */
		char address;
		/**
		 * First byte to use. Set to `0` to read from the beginning.
		 * This is the base offset for all read() and write()
		 * operations on the object.
		 * Portions of the EEPROM outside the range
		 * `[offset, offset+min(maxLength, actualLength - offset))`
		 * are not read or written by the object at any point.
		 */
		unsigned int offset;
		/**
		 * Maximum number of bytes to use.
		 */
		unsigned int maxLength;
	};
	Eeprom() {};
	/**
	 * Creates the object. It calls setup() and if the latter
	 * fails it will throw an exception of type `std::runtime_error`.
	 */
	Eeprom(const Settings& settings);
	/**
	 * Sets up the object to access an EEPROM.
	 *
	 * @return 0 on success or an error code otherwise.
	 */
	int setup(const Settings& settings);
	/**
	 * Read the content of the EEPROM into the memory buffer.
	 *
	 * @param start the first byte to read.
	 * @param length how many bytes to read.
	 * @return 0 on success or an error code otherwise.
	 */
	int read(unsigned int start = 0, unsigned int length = -1);
	/**
	 * Write the content of the memory buffer to the EEPROM.
	 * If no arguments are passed, it will write the entire EEPROM.
	 *
	 * @param start the first byte to write.
	 * @param length how many bytes to write.
	 * @return 0 on success or an error code otherwise.
	 */
	int write(unsigned int start = 0, unsigned int length = -1);
	/**
	 * Verify whether the latest version of the memory buffer has been
	 * written to the EEPROM. This does not actually re-read the content
	 * of the EEPROM, so it will not detect changes performed by others.
	 *
	 * This internally performs a comparison between portions of memory of
	 * the size of the EEPROM, so it could be slow.
	 */
	bool isSynced();
	/**
	 * Access a R/W pointer to the memory buffer. The number of elements
	 * that are accessible is returned by size().
	 */
	char* data();
	const char* data() const;
	/**
	 * Return the size of the EEPROM (and of the memory buffer).
	 */
	size_t size() const;
	/**
	 * Access an element of the memory buffer. The number of elements
	 * that are accessible is returned by size().
	 */
	char& operator[](std::size_t idx)
	{
		return content[idx];
	}
	/**
	 * Access an element of the memory buffer. The number of elements
	 * that are accessible is returned by size().
	 */
	const char& operator[](std::size_t idx) const {
		return content[idx];
	}
private:
	int prepareToReadWrite(unsigned int start, unsigned int& length);
	std::vector<char> content;
	std::vector<char> writtenContent;
	std::fstream file;
	unsigned int offset;
};
