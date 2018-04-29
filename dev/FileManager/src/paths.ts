export class paths {
	private static _Bela: string =		'/root/Bela/';
	private static _projects: string =	paths._Bela+'projects/';
	private static _examples: string =	paths._Bela+'examples/';
	private static _exampleTempProject: string =	paths._projects+'exampleTempProject/';
	private static _media: string =	paths._Bela+'IDE/public/media/';
	private static _templates: string =	paths._Bela+'IDE/templates/';
	static get Bela(): string { return this._Bela }
	static get projects(): string { return this._projects }
	static get examples(): string { return this._examples }
	static get exampleTempProject(): string { return this._exampleTempProject }
	static get media(): string { return this._media }
	static get templates(): string { return this._templates }
};
// var paths = new Paths();
// export Paths;
