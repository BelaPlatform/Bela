// descriptor of a filesystem entry. directories have size undefined, files have children undefined
export class File_Descriptor {
	constructor(name: string, size: number|undefined = undefined, children: File_Descriptor[]|undefined = undefined){
		this.name = name;
		this.size = size;
		this.children = children;
	}
	private name: string;
	size: number | undefined = undefined;
	children: File_Descriptor[] | undefined = undefined;
}

export interface Init_Message{
	projects	: string[];
  examples	: File_Descriptor[];
  libraries	: File_Descriptor[];
	settings	: any;
	boot_project	: string;
	board_string	: string;
	xenomai_version	: string;
}

export interface Process_Status{
	checkingSyntax	: boolean;
	building	: boolean;
	buildProject	: string;
	running		: boolean;
	runProject	: string;
	syntaxError?	: string;
	buildLog?	: string;
	belaLog?	: string;
	belaLogErr?	: string;
}

export interface Backup_File_Stats{
	exists?:		boolean;
	filename?:		string;
	backup_filename?:	string;
	project?:		string;
}
