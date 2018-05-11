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
