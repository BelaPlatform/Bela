import { should } from 'chai';
import * as mock from 'mock-fs';
import * as file_manager from "../src/FileManager";
import * as project_manager from "../src/ProjectManager";
import * as util from '../src/utils';

should();

describe('ProjectManager', function(){

	describe('simple project management functions', function() {
	
		describe('#openFile', function() {
			var currentProject = 'test';
			var ext = 'cpp';
			var newFile = 'render.'+ext;
			var fileData = 'test_render_content';
			beforeEach(async function(){
				mock({
					'/root/Bela/projects/test' : {
						'render.cpp': fileData,
						'bin_large': new Buffer(50000001),
						'bin_small': new Buffer(10000)
					}
				});
			});
			it('should open a file from a project', async function(){
				let output: any = {currentProject, newFile};
				await project_manager.openFile(output);
				output.fileName.should.equal(newFile);
				output.fileData.should.equal(fileData);
				(typeof output.newFile).should.equal('undefined');
				output.fileType.should.equal(ext);
				output.readOnly.should.equal(false);
			});
			it('should fail gracefully if the file doesn\'t exist', async function(){
				let output: any = {currentProject, newFile: 'notafile.file'};
				await project_manager.openFile(output);
				output.fileName.should.equal('notafile.file');
				output.fileData.should.equal('Error opening file. Please open a different file to continue');
				(typeof output.newFile).should.equal('undefined');
				output.fileType.should.equal(0);
				output.readOnly.should.equal(true);
				output.error.should.be.a('string');
			});
			it('should reject files larger than 50 Mb', async function(){
				let output: any = {currentProject, newFile: 'bin_large'};
				await project_manager.openFile(output);
				output.error.should.be.a('string');
				output.fileData.should.be.a('string');
				output.fileName.should.equal('bin_large');
				output.readOnly.should.equal(true);
				output.fileType.should.equal(0);
			});
			it('should reject binary files', async function(){
				let output: any = {currentProject, newFile: 'bin_small'};
				await project_manager.openFile(output);
				output.error.should.be.a('string');
				output.fileData.should.be.a('string');
				output.fileName.should.equal('bin_small');
				output.readOnly.should.equal(true);
				output.fileType.should.equal(0);
			});
		/*	it('should empty the media directory and symlink the file if it is an audio or image file', async function(){
				let output: any = {currentProject, newFile: 'test_image.png'};
				await project_manager.openFile(output);
				let file_list = await file_manager.read_directory('/root/Bela/IDE/public/media');
				file_list.should.deep.equal(['test_image.png']);
				output.fileData.should.equal('');
				output.readOnly.should.equal(true);
				output.fileName.should.equal('test_image.png');
				output.fileType.should.equal('image/png');
				let output2: any = {currentProject, newFile: 'test_wav.wav'};
				await project_manager.openFile(output2);
				file_list = await file_manager.read_directory('/root/Bela/IDE/public/media');
				file_list.should.deep.equal(['test_wav.wav']);
				output2.fileData.should.equal('');
				output2.readOnly.should.equal(true);
				output2.fileName.should.equal('test_wav.wav');
				output2.fileType.should.equal('audio/x-wav');
			}); */
			afterEach(function(){
				mock.restore();
			});
		});

		describe('#listProjects', function(){
			before(function(){
				mock({
					'/root/Bela/projects': {
						'test_project1': { 'test_file1': 'content' },
						'test_project2': { 'test_file2': 'content' }
					}
				});
			})
			it('should return an array of strings containing the names of the projects in the projects folder', async function(){
				let data = await project_manager.listProjects();
				data.should.deep.equal(['test_project1', 'test_project2']);
			});
		});

		describe('#listExamples', function(){
			var output = [ new util.File_Descriptor(
				'test_category1', 
				undefined, 
				[new util.File_Descriptor(
					'test_example1',
					undefined,
					[new util.File_Descriptor(
						'test_file1',
						7,
						undefined
					)]
				)]
			), new util.File_Descriptor(
				'test_category2',
				undefined,
				[new util.File_Descriptor(
					'test_example2',
					undefined,
					[new util.File_Descriptor(
						'test_file2',
						7,
						undefined
					)]
				)]
			)];
			before(function(){
				mock({
					'/root/Bela/examples': {
						'test_category1': { 
							'test_example1': {
								'test_file1': 'content'
							}
						},
						'test_category2': { 
							'test_example2': {
								'test_file2': 'content'
							}
						}
					}
				});
			})
			it('should return an array of util.File_Descriptors describing the contents of the examples folder', async function(){
				let data = await project_manager.listExamples();
				data.should.deep.equal([
					{
						name: 'test_category1',
						children: ['test_example1']
					},
					{
						name: 'test_category2',
						children: ['test_example2']
					}
				]);
			});
		});

		describe('#openProject', function(){
			var test_content = 'ohai';
			var CLArgs = {'key': 'field'};
			before(function(){
				mock({
					'/root/Bela/projects/test_project': {
						'settings.json': JSON.stringify({'fileName': 'fender.cpp', CLArgs }),
						'fender.cpp': test_content
					}
				});
			});
			it('should open a project', async function(){
				let out: any = {currentProject: 'test_project'};
				await project_manager.openProject(out);
				out.fileName.should.equal('fender.cpp');
				out.CLArgs.should.deep.equal(CLArgs);
				out.fileData.should.equal(test_content);
				out.fileList.should.deep.equal([new util.File_Descriptor('fender.cpp', 4, undefined), new util.File_Descriptor('settings.json', 50, undefined)]);
			});
		});

		describe('#openExample', function(){
			before(function(){
				mock({
					'/root/Bela/examples/01-basics/test_example': {
						'render.cpp': 'test_content'
					}
				});
			});
			it('should copy the chosen example to projects/exampleTempProject and open it', async function(){
				let data: any = {currentProject: '01-basics/test_example'};
				await project_manager.openExample(data);
				data.currentProject.should.equal('exampleTempProject');
				data.exampleName.should.equal('test_example');
				data.fileList.should.deep.equal([new util.File_Descriptor('render.cpp', 12, undefined)]);
				data.fileName.should.equal('render.cpp');
				data.CLArgs.should.be.a('object');
				let data2: any = {currentProject: 'exampleTempProject'};
				await project_manager.openProject(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should open an example without a render.cpp and with a _main* without error', async function(){
				await file_manager.delete_file('/root/Bela/examples/01-basics/test_example/render.cpp');
				await file_manager.write_file('/root/Bela/examples/01-basics/test_example/_main.anything', 'other_content');
				let data: any = {currentProject: '01-basics/test_example'};
				await project_manager.openExample(data);
				(typeof data.error).should.equal('undefined');
				data.fileName.should.equal('_main.anything');
				data.fileData.should.equal('other_content');
			});
		});

		describe('#newProject', function(){
			before(function(){
				mock({
					'/root/Bela/IDE/templates/C': {'render.cpp': 'test_content'}
				});
			});
			it('should create a new C project', async function(){
				let data: any = {newProject: 'test_project', projectType: 'C'};
				await project_manager.newProject(data);
				(typeof data.newProject).should.equal('undefined');
				data.currentProject.should.equal('test_project');
				data.projectList.should.deep.equal(['test_project']);
				data.fileList.should.deep.equal([new util.File_Descriptor('render.cpp', 12, undefined)]);
				data.fileName.should.equal('render.cpp');
				data.CLArgs.should.be.a('object');
				data.fileData.should.equal('test_content');
				data.readOnly.should.equal(false);
				let data2: any = {currentProject: 'test_project'};
				await project_manager.openProject(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should fail gracefully if the project already exists', async function(){
				let data: any = {newProject: 'test_project', projectType: 'C'};
				await project_manager.newProject(data);
				data.error.should.equal('failed, project test_project already exists!');
			});
			after(function(){
				mock.restore();
			});
		});

		describe('#saveAs', function(){
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_src': {'render.cpp': 'test_content'},
					'/root/Bela/projects/wrong_dir': {'render.cpp': 'wrong_content'}
				});
			});
			it('should duplicate a project and open the copy', async function(){
				let data: any = {currentProject: 'test_src', newProject: 'test_dest'};
				await project_manager.saveAs(data);
				(typeof data.newProject).should.equal('undefined');
				data.currentProject.should.equal('test_dest');
				data.projectList.should.deep.equal(['test_dest', 'test_src', 'wrong_dir']);
				data.fileList.should.deep.equal([new util.File_Descriptor('render.cpp', 12, undefined)]);
				data.fileName.should.equal('render.cpp');
				data.fileData.should.equal('test_content');
				let data2: any = {currentProject: 'test_dest'};
				await project_manager.openProject(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should fail gracefully when the destination project exists', async function(){
				let data: any = {currentProject: 'test_src', newProject: 'wrong_dir'};
				await project_manager.saveAs(data);
				data.error.should.equal('failed, project wrong_dir already exists!');
				let data2: any = {currentProject: 'wrong_dir'};
				await project_manager.openProject(data2);
				data2.fileName.should.equal('render.cpp');
				data2.fileData.should.equal('wrong_content');
			});
		});

		describe('#deleteProject', function(){
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_project1': {'render.cpp': 'test_content1'},
					'/root/Bela/projects/test_project2': {'render.cpp': 'test_content2'}
				});
			});
			it('should delete a project and open any remaining project', async function(){
				let data: any = {currentProject: 'test_project1'};
				await project_manager.deleteProject(data);
				data.currentProject.should.equal('test_project2');
				data.projectList.should.deep.equal(['test_project2']);
				data.fileName.should.equal('render.cpp');
				data.fileData.should.equal('test_content2');
			});
			it('should fail gracefully if there are no remaining projects to open', async function(){
				let data: any = {currentProject: 'test_project1'};
				await project_manager.deleteProject(data);
				data = {currentProject: 'test_project2'};
				await project_manager.deleteProject(data);
				data.currentProject.should.equal('');
				data.readOnly.should.equal(true);
				data.fileData.should.equal('please create a new project to continue');
			});
		});

		describe('#cleanProject', function(){
			before(function(){
				mock({
					'/root/Bela/projects/test_project': {
						'build': {'test.o': 'test', 'test.d': 'test'},
						'test_project': Buffer.alloc(4100),
						'render.cpp': 'test_content'
					}
				});
			});
			it('should clear the contents of the project\'s build directory, and delete the binary', async function(){
				let data: any = {currentProject: 'test_project'};
				await project_manager.cleanProject(data);
				data = {currentProject: 'test_project'};
				await project_manager.openProject(data);
				data.fileList.should.deep.equal([
					new util.File_Descriptor('build', undefined, []),
					new util.File_Descriptor('render.cpp', 12, undefined)
				]);
			});
		});

		describe('#newFile', function(){
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_project': {'old_file': 'old_content'}
				});
			});
			it('should create a new file in the current project, and open it', async function(){
				let data: any = {currentProject: 'test_project', 'newFile': 'test_file'};
				await project_manager.newFile(data);
				data.fileName.should.equal('test_file');
				(typeof data.newFile).should.equal('undefined');
				data.fileData.should.equal('/***** test_file *****/\n');
				data.fileList.should.deep.equal([new util.File_Descriptor('old_file', 11, undefined), new util.File_Descriptor('test_file', 24, undefined)]);
				data.focus.should.deep.equal({line: 2, column: 1});
				data.readOnly.should.equal(false);
				let data2: any = {currentProject: 'test_project', 'newFile': 'test_file'};
				await project_manager.openFile(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should fail gracefully if the file already exists', async function(){
				let data: any = {currentProject: 'test_project', 'newFile': 'old_file'};
				await project_manager.newFile(data);
				data.error.should.equal('failed, file old_file already exists!');
			});
		});

		describe('#uploadFile', function(){
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_project': {'old_file': 'old_content'}
				});
			});
			it('should upload and open a new text file', async function(){
				let fileData = 'test_content';
				let data: any = {currentProject: 'test_project', newFile: 'test_file', fileData, force: false};
				await project_manager.uploadFile(data);
				data.fileName.should.equal('test_file');
				(typeof data.newFile).should.equal('undefined');
				data.fileData.should.equal('test_content');
				let data2: any = {currentProject: 'test_project', newFile: 'test_file'};
				await project_manager.openFile(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should upload and open a new binary file', async function(){
				let fileData = Buffer.alloc(4100);
				let data: any = {currentProject: 'test_project', newFile: 'test_file', fileData, force: false};
				await project_manager.uploadFile(data);
				data.fileName.should.equal('test_file');
				(typeof data.newFile).should.equal('undefined');
				data.error.should.be.a('string');
				let readFile = await file_manager.read_file_raw('/root/Bela/projects/test_project/test_file');
				readFile.should.deep.equal(fileData);
			});
			it('should fail to overwrite a file without the force flag set', async function(){
				let fileData = 'test_content';
				let data: any = {currentProject: 'test_project', newFile: 'old_file', fileData, force: false};
				await project_manager.uploadFile(data);
				data.error.should.equal('failed, file old_file already exists!');
				(typeof data.fileData).should.equal('undefined');
				let data2: any = {currentProject: 'test_project', newFile: 'old_file'};
				await project_manager.openFile(data2);
				data2.fileData.should.equal('old_content');
			});
			it('should overwrite a file with the force flag set', async function(){
				let fileData = 'test_content';
				let data: any = {currentProject: 'test_project', newFile: 'old_file', fileData, force: true};
				await project_manager.uploadFile(data);
				data.fileName.should.equal('old_file');
				(typeof data.newFile).should.equal('undefined');
				data.fileData.should.equal('test_content');
				let data2: any = {currentProject: 'test_project', newFile: 'old_file'};
				await project_manager.openFile(data2);
				data2.fileData.should.equal('test_content');
			});
		});

		describe('#cleanFile', function(){
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_project': {
						'build': {'test.d': 'testd', 'test.o': 'testo', 'another.d': 'anotherd'},
						'test_project': Buffer.alloc(4100)
					}
				});
			});
			it('should delete the related build files and binary if passed a source file', async function(){
				await project_manager.cleanFile('test_project', 'test.cpp');
				let files: util.File_Descriptor[] = await file_manager.deep_read_directory('/root/Bela/projects/test_project');
				files.should.deep.equal([new util.File_Descriptor('build', undefined, [new util.File_Descriptor('another.d', 8, undefined)])]);
			});
			it('should do nothing if passed a non-source file', async function(){
				await project_manager.cleanFile('test_project', 'another.bak.txt');
				let files: util.File_Descriptor[] = await file_manager.deep_read_directory('/root/Bela/projects/test_project');
				files.should.deep.equal([
					new util.File_Descriptor('build', undefined, [
						new util.File_Descriptor('another.d', 8, undefined),
						new util.File_Descriptor('test.d', 5, undefined),
						new util.File_Descriptor('test.o', 5, undefined)
					]),
					new util.File_Descriptor('test_project', 4100, undefined)
				]);
			});
		});

		describe('#renameFile', function(){
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_project': {
						'test_file.cpp': 'test_content',
						'old_file.cpp': 'old_content',
						'test_project': Buffer.alloc(100)
					}
				});
			});
			it('should rename a source file, and remove the binary', async function(){
				let data: any = {currentProject: 'test_project', fileName: 'test_file.cpp', newFile: 'new_file.cpp'};
				await project_manager.renameFile(data);
				data.fileName.should.equal('new_file.cpp');
				data.fileData.should.equal('test_content');
				data.fileList.should.deep.equal([
					new util.File_Descriptor('new_file.cpp', 12, undefined),
					new util.File_Descriptor('old_file.cpp', 11, undefined)
				]);
			});
			it('should fail gracefully if the destination file exists', async function(){
				let data: any = {currentProject: 'test_project', fileName: 'test_file.cpp', newFile: 'old_file.cpp'};
				await project_manager.renameFile(data);
				data.error.should.equal('failed, file old_file.cpp already exists!');
				let fileList = await file_manager.deep_read_directory('/root/Bela/projects/test_project');
				fileList.should.deep.equal([
					new util.File_Descriptor('old_file.cpp', 11, undefined),
					new util.File_Descriptor('test_file.cpp', 12, undefined),
					new util.File_Descriptor('test_project', 100, undefined)
				]);
			});
		});

		describe('#deleteFile', function(){
			before(function(){
				mock({
					'/root/Bela/projects/test_project': {
						'render.cpp': 'test_content',
						'test_project': Buffer.alloc(100)
					}
				});
			});
			it('should delete a file along with the binary and build files', async function(){
				let data: any = {currentProject: 'test_project', fileName: 'render.cpp'};
				await project_manager.deleteFile(data);
				data.fileName.should.equal('');
				data.readOnly.should.equal(true);
				data.fileData.should.equal('File deleted - open another file to continue');
				data.fileList.should.deep.equal([]);
			});
		});






		afterEach(function(){
			mock.restore();
		})
	})
});
