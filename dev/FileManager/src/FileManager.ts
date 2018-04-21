import * as fs from 'fs-extra-promise';

export class FileManager {
	constructor(){
		console.log('hi');
	}

	async write_file(file_path: string, data: string): Promise<void>{
		return await fs.outputFile(file_path, data);
	}
	async read_file(file_path: string): Promise<string>{
		return await fs.readFileAsync(file_path, 'utf8');
	}
}
