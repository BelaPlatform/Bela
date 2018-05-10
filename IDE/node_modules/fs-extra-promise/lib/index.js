/* --------------------
 * fs-extra-promise
 * ------------------*/

'use strict';

// Modules
const fs = require('fs-extra'),
	Promise = require('bluebird');

// Exports

/**
 * Factory to create promisified version of fs-extra.
 * Adds promisified methods for all async methods.
 * e.g. `fs.readFile(path, cb)` becomes `fs.readFileAsync(path)`
 * All original methods of `fs` and `fs-extra` modules are left untouched.
 * NB does not mutate `fs-extra` module - returns a new instance with extra methods added.
 *
 * @param {Object} fs - `fs-extra` module
 * @param {Object} Promise - Bluebird implementation to use
 * @returns {Object} - `fsExtra` with promisified methods added
 */
const factory = function(fs, Promise) {
	// Clone fs-extra
	const fsOriginal = fs;
	fs = {};
	for (let methodName in fsOriginal) {
		fs[methodName] = fsOriginal[methodName];
	}

	// Extend fs with isDirectory and isDirectorySync methods
	fs.isDirectory = (path, callback) => {
		fs.stat(path, (err, stats) => {
			if (err) {
				callback(err);
			} else {
				callback(null, stats.isDirectory());
			}
		});
	};

	fs.isDirectorySync = path => fs.statSync(path).isDirectory();

	// Promisify all methods
	// (except those ending with 'Sync', classes and various methods which do not use a callback)
	for (let methodName in fs) {
		let method = fs[methodName];

		if (typeof method != 'function') continue;
		if (methodName.slice(-4) == 'Sync') continue;
		if (methodName.match(/^[A-Z]/)) continue;
		if (['exists', 'watch', 'watchFile', 'unwatchFile', 'createReadStream', 'createWriteStream'].indexOf(methodName) != -1) continue;

		fs[methodName + 'Async'] = Promise.promisify(method);
	}

	// Create fs.existsAsync()
	// fs.exists() is asynchronous but does not call callback with usual node (err, result) signature - uses just (result)
	fs.existsAsync = path => new Promise(resolve => fs.exists(path, resolve));

	// Use methods to set Promise used internally (e.g. could use bluebird-extra module)
	// and version of `fs-extra` being promisified

	/**
	 * Returns new instance of `fs-extra-promise` using the Promise implementation provided.
	 * @param {Object} Promise - Promise implementation to use
	 * @returns {Object} - Promisified `fs-extra`
	 */
	fs.usePromise = Promise => factory(fsOriginal, Promise);

	/**
	 * Returns new instance of `fs-extra-promise` using the `fs` implementation provided.
	 * @param {Object} fs - Version of `fs-extra` to use
	 * @returns {Object} - Promisified `fs-extra`
	 */
	fs.useFs = fs => factory(fs, Promise);

	// Return fs
	return fs;
};

// Export fs promisified with bluebird
module.exports = factory(fs, Promise);
