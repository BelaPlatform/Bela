#include "Eeprom.h"
#include <sstream>
#include <limits>
#include <stdexcept>

using namespace std;

Eeprom::Eeprom(const Settings& settings)
{
	int ret;
	if((ret = setup(settings)))
		throw runtime_error("Eeprom: could not open requested device, error " + to_string(ret));
}

int Eeprom::setup(const Settings& settings)
{
	ostringstream path;
	unsigned int bus = settings.bus;
	char address = settings.address;
	path << "/sys/class/i2c-dev/i2c-" << dec << bus << "/device/" << dec << bus <<  "-00" << hex << (unsigned)address << "/eeprom";
	file.open(path.str(), ios::in | ios::out | ios::binary);
	if(!file.is_open())
		return -1;
	unsigned int tryLength = min(settings.maxLength,
			(unsigned int)numeric_limits<streamsize>::max());
	offset = settings.offset;
	file.seekg(offset, ios_base::beg);
	if(!file.good())
		return -2;
	// find file size
	// https://stackoverflow.com/a/22986486/2958741
	file.ignore(tryLength);
	streamsize length = file.gcount();
	file.clear(); // Clear flags since ignore will have set eof.
	if(!length)
		return -3;
	content.resize(length);
	return read();
}

char* Eeprom::data()
{
	return content.data();
}

const char* Eeprom::data() const
{
	return content.data();
}

size_t Eeprom::size() const
{
	return content.size();
}

int Eeprom::read(unsigned int start, unsigned int length)
{
	if(prepareToReadWrite(start, length))
		return -1;
	file.read(content.data(), length);
	if(file.good())
		return 0;
	else
		return -1;
}

int Eeprom::write(unsigned int start, unsigned int length)
{
	if(prepareToReadWrite(start, length))
		return -1;
	file.write(content.data() + start, length);
	file.flush();
	if(file.good()) {
		writtenContent = content;
		return 0;
	} else {
		// an error occurred, try to clear it, and let the caller know about it so they can retry
		file.clear();
		return -1;
	}
}

int Eeprom::prepareToReadWrite(unsigned int start, unsigned int& length)
{
	if(start >= content.size())
		return -1;
	file.seekg(offset + start, ios_base::beg);
	length = min(content.size() - start, length);
	return 0;
}

bool Eeprom::isSynced()
{
	// assumes that no one else is changing the content of the eeprom
	return writtenContent == content;
}

#if 0
#undef NDEBUG
#include <assert.h>

static bool MemEqual(const char* const first, const char* const second, const size_t size)
{
	for(unsigned int n = 0; n < size; ++n)
		if(first[n] != second[n])
			return false;
	return true;

}
static bool EepromEqual(const Eeprom& first, const Eeprom& second)
{
	if(first.size() != second.size())
		return false;
	return MemEqual(first.data(), second.data(), first.size());
}

bool Eeprom::test()
{
	const int kEepromSize = 512;
	Eeprom::Settings settings {.bus = 2, .address = 0x50};
	for(unsigned int useSettingsOffset = 0; useSettingsOffset < 2; ++useSettingsOffset)
	{
		for(unsigned int offset = 0; offset < kEepromSize; offset += 175)
		{
			for(unsigned int maxLength = 21; maxLength < kEepromSize; maxLength *= 2)
			{
				if(maxLength > 2 * kEepromSize)
					break;
				settings.offset = 0;
				settings.maxLength = (unsigned int)-1;
				Eeprom full(settings);
				assert(kEepromSize == full.size());
				// start with a known non-zero state
				for(unsigned int n = 0; n < full.size(); ++n)
					full[n] = n % 256;
				full.write();
				Eeprom fullBak(settings);
				for(unsigned int n = 0; n < fullBak.size(); ++n)
					assert(fullBak[n] == (n % 256));
				if(!EepromEqual(full, fullBak))
					assert(EepromEqual(full, fullBak));

				unsigned int opOff;
				if(useSettingsOffset) {
					settings.offset = offset;
					settings.maxLength = maxLength;
					opOff = 0;
				} else {
					settings.offset = 0;
					settings.maxLength = maxLength + offset;
					opOff = offset;
				}

				Eeprom first(settings);
				assert(settings.maxLength >= first.size());
				if(useSettingsOffset) {
					if(settings.maxLength < first.size())
						assert(settings.offset + first.size() == kEepromSize);
				}
				// modify a portion of the EEPROM
				const char magic = 123;
				for(unsigned int n = 0 + opOff; n < first.size(); ++n)
					first[n] = magic;
				if(useSettingsOffset)
					first.write();
				else
					first.write(opOff);

				full.read();
				// verify that the change has been applied to that portion
				assert(MemEqual(first.data() + opOff, full.data() + offset, first.size() - opOff));
				for(unsigned int n = offset; n < first.size(); ++n)
					assert(full[n] == magic);
				// while the rest is unchanged
				assert(MemEqual(fullBak.data(), full.data(), first.offset));
				unsigned int off = first.offset + first.size();
				assert(MemEqual(fullBak.data() + off, full.data() + off, full.size() - off));
			}
		}
	}
	return true;
}
#endif
