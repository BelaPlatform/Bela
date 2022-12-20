#pragma once
#include <vector>
#include <string>

/**
 * Utilities to manipulate strings.
 */
namespace StringUtils
{
	/**
	 * Split a string at a given separator.
	 */
	std::vector<std::string> split(const std::string& s, char delimiter, bool removeEmpty = false, unsigned int limit = 0);
	/**
	 * Remove leading and trailing spaces from a string.
	 */
	std::string trim(std::string const& str);
	/**
	 * Parses a string as a decimal or hex integer
	 */
	long long int parseAsInt(std::string const& str);
	/**
	 * Turns a vector of strings into a vector of `char*`, useful for
	 * generating `argv`, with the first element being a `nullptr`.
	 * Note: the pointers are _not_ `const char*`,
	 * because this is the way `argv` normally is. However, I don't think
	 * `getopt_long()` and the likes actually change the content of the
	 * memory locations.
	 *
	 * @param strings the vector of strings.
	 * @return a vector of `const char*`. Each element points to the memory
	 * allocated by each of the elements of @p strings, and is therefore
	 * only valid as long as the latter remains unchanged.
	 */
	std::vector<char*> makeArgv(std::vector<std::string>& strings);
}

/**
 * Utilities to perform file I/O.
 */
namespace IoUtils
{
	typedef enum {
		APPEND, ///< When opening a file for writing, append to the existing content of the file.
		TRUNCATE, ///<When opening a file for writing, truncate the existing content of the file.
	} Mode;
	/**
	 * Check if path exists.
	 */
	bool pathExists(const std::string& path);
	/**
	 * Open a file for output.
	 */
	std::ofstream openOutput(const std::string& path, Mode mode = TRUNCATE);
	/**
	 * Write a string to a file.
	 */
	int writeTextFile(const std::string& path, const std::string& content, Mode mode = TRUNCATE);
	/**
	 * Read a text file as a string.
	 */
	std::string readTextFile(const std::string& path);
}

/**
 * Utilities to read and write config files with one `KEY=VALUE` pair per lin.
 */
namespace ConfigFileUtils {
	/**
	 * Read the value corresponding to \p key from \p path.
	 *
	 * @param path path to the file to read from.
	 * @param key the key to find.
	 * @return The read value, or an empty string if the \p key was not found.
	 */
	std::string readValue(const std::string& path, const std::string& key);
	/**
	 * Read the value corresponding to \p key from the string in \p str.
	 *
	 * @param str the string the parse.
	 * @param key the key to find.
	 * @return The read value, or an empty string if the \p key was not found.
	 */
	std::string readValueFromString(const std::string& str, const std::string& key);
	/**
	 * Write the key-value pair to \p path.
	 *
	 * @param path path to the file to write.
	 * @param key the key
	 * @param value the value
	 * @param mode whether to truncate or append to the path.
	 * @return 0 on success, or an error code otherwise.
	 */
	int writeValue(const std::string& file, const std::string& key, const std::string& value, IoUtils::Mode mode = IoUtils::TRUNCATE);
}

/**
 * Utilities to manipulate pinmux via bone-pinmux-helper
 */
namespace PinmuxUtils
{
	/**
	 * Check whether the current state of @param pin matches @param desiredState.
	 */
	bool check(const std::string& pin, const std::string& desiredState);
	/**
	 * Check the current state of @param pin
	 */
	std::string get(const std::string& pin);
	/**
	 * Set the state of @param pin
	 */
	void set(const std::string& pin, const std::string& desiredState);
}
