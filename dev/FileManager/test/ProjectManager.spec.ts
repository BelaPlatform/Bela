import { should } from 'chai';
import * as mock from 'mock-fs';
import { fm, File_Descriptor } from "../src/FileManager";
import { ProjectManager } from "../src/ProjectManager";
import {paths} from '../src/paths';

should();

var pm = new ProjectManager();

describe('ProjectManager', function(){

	describe('simple project management functions', function() {
	
		describe('#openFile', function() {
			var currentProject = 'test';
			var ext = 'cpp';
			var newFile = 'render.'+ext;
			var fileData = 'test_render_content';
			var image: Buffer;
			var wav: Buffer;
			beforeEach(async function(){
				image = await fm.read_file_raw('/root/FileManager/src/test_image.png');
				wav = await fm.read_file_raw('/root/FileManager/src/test_wav.wav');
				mock({
					'/root/Bela/projects/test' : {
						'render.cpp': fileData,
						'bin_large': new Buffer(50000001),
						'bin_small': new Buffer(10000),
						'test_image.png': image,
						'test_wav.wav': wav
					}
				});
				await fm.make_symlink('/root/Bela/projects/test/test_image.png', '/root/Bela/IDE/public/media/old_symlink');
			});
			it('should open a file from a project', async function(){
				let output: any = {currentProject, newFile};
				await pm.openFile(output);
				output.fileName.should.equal(newFile);
				output.fileData.should.equal(fileData);
				(typeof output.newFile).should.equal('undefined');
				output.fileType.should.equal(ext);
				output.readOnly.should.equal(false);
			});
			it('should reject files larger than 50 Mb', async function(){
				let output: any = {currentProject, newFile: 'bin_large'};
				await pm.openFile(output);
				output.error.should.be.a('string');
				output.fileData.should.be.a('string');
				output.fileName.should.equal('bin_large');
				output.readOnly.should.equal(true);
				output.fileType.should.equal(0);
			});
			it('should reject binary files', async function(){
				let output: any = {currentProject, newFile: 'bin_small'};
				await pm.openFile(output);
				output.error.should.be.a('string');
				output.fileData.should.be.a('string');
				output.fileName.should.equal('bin_small');
				output.readOnly.should.equal(true);
				output.fileType.should.equal(0);
			});
			it('should empty the media directory and symlink the file if it is an audio or image file', async function(){
				let output: any = {currentProject, newFile: 'test_image.png'};
				await pm.openFile(output);
				let file_list = await fm.read_directory('/root/Bela/IDE/public/media');
				file_list.should.deep.equal(['test_image.png']);
				output.fileData.should.equal('');
				output.readOnly.should.equal(true);
				output.fileName.should.equal('test_image.png');
				output.fileType.should.equal('image/png');
				let output2: any = {currentProject, newFile: 'test_wav.wav'};
				await pm.openFile(output2);
				file_list = await fm.read_directory('/root/Bela/IDE/public/media');
				file_list.should.deep.equal(['test_wav.wav']);
				output2.fileData.should.equal('');
				output2.readOnly.should.equal(true);
				output2.fileName.should.equal('test_wav.wav');
				output2.fileType.should.equal('audio/x-wav');
			});
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
				let data = await pm.listProjects();
				data.should.deep.equal(['test_project1', 'test_project2']);
			});
		});

		describe('#listExamples', function(){
			var output = [ new File_Descriptor(
				'test_category1', 
				undefined, 
				[new File_Descriptor(
					'test_example1',
					undefined,
					[new File_Descriptor(
						'test_file1',
						7,
						undefined
					)]
				)]
			), new File_Descriptor(
				'test_category2',
				undefined,
				[new File_Descriptor(
					'test_example2',
					undefined,
					[new File_Descriptor(
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
			it('should return an array of File_Descriptors describing the contents of the examples folder', async function(){
				let data = await pm.listExamples();
				data.should.deep.equal(output);
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
				await pm.openProject(out);
				out.fileName.should.equal('fender.cpp');
				out.CLArgs.should.deep.equal(CLArgs);
				out.fileData.should.equal(test_content);
				out.fileList.should.deep.equal([new File_Descriptor('fender.cpp', 4, undefined), new File_Descriptor('settings.json', 50, undefined)]);
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
				await pm.openExample(data);
				data.currentProject.should.equal('exampleTempProject');
				data.exampleName.should.equal('test_example');
				data.fileList.should.deep.equal([new File_Descriptor('render.cpp', 12, undefined)]);
				data.fileName.should.equal('render.cpp');
				data.CLArgs.should.be.a('object');
				let data2: any = {currentProject: 'exampleTempProject'};
				await pm.openProject(data2);
				data.fileData.should.equal(data2.fileData);
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
				await pm.newProject(data);
				(typeof data.newProject).should.equal('undefined');
				data.currentProject.should.equal('test_project');
				data.projectList.should.deep.equal(['test_project']);
				data.fileList.should.deep.equal([new File_Descriptor('render.cpp', 12, undefined)]);
				data.fileName.should.equal('render.cpp');
				data.CLArgs.should.be.a('object');
				data.fileData.should.equal('test_content');
				data.readOnly.should.equal(false);
				let data2: any = {currentProject: 'test_project'};
				await pm.openProject(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should fail gracefully if the project already exists', async function(){
				let data: any = {newProject: 'test_project', projectType: 'C'};
				await pm.newProject(data);
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
				await pm.saveAs(data);
				(typeof data.newProject).should.equal('undefined');
				data.currentProject.should.equal('test_dest');
				data.projectList.should.deep.equal(['test_dest', 'test_src', 'wrong_dir']);
				data.fileList.should.deep.equal([new File_Descriptor('render.cpp', 12, undefined)]);
				data.fileName.should.equal('render.cpp');
				data.fileData.should.equal('test_content');
				let data2: any = {currentProject: 'test_dest'};
				await pm.openProject(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should fail gracefully when the destination project exists', async function(){
				let data: any = {currentProject: 'test_src', newProject: 'wrong_dir'};
				await pm.saveAs(data);
				data.error.should.equal('failed, project wrong_dir already exists!');
				let data2: any = {currentProject: 'wrong_dir'};
				await pm.openProject(data2);
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
				await pm.deleteProject(data);
				data.currentProject.should.equal('test_project2');
				data.projectList.should.deep.equal(['test_project2']);
				data.fileName.should.equal('render.cpp');
				data.fileData.should.equal('test_content2');
			});
			it('should fail gracefully if there are no remaining projects to open', async function(){
				let data: any = {currentProject: 'test_project1'};
				await pm.deleteProject(data);
				data = {currentProject: 'test_project2'};
				await pm.deleteProject(data);
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
				await pm.cleanProject(data);
				data = {currentProject: 'test_project'};
				await pm.openProject(data);
				data.fileList.should.deep.equal([
					new File_Descriptor('build', undefined, []),
					new File_Descriptor('render.cpp', 12, undefined)
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
				await pm.newFile(data);
				data.fileName.should.equal('test_file');
				(typeof data.newFile).should.equal('undefined');
				data.fileData.should.equal('/***** test_file *****/\n');
				data.fileList.should.deep.equal([new File_Descriptor('old_file', 11, undefined), new File_Descriptor('test_file', 24, undefined)]);
				data.focus.should.deep.equal({line: 2, column: 1});
				data.readOnly.should.equal(false);
				let data2: any = {currentProject: 'test_project', 'newFile': 'test_file'};
				await pm.openFile(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should fail gracefully if the file already exists', async function(){
				let data: any = {currentProject: 'test_project', 'newFile': 'old_file'};
				await pm.newFile(data);
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
				await pm.uploadFile(data);
				data.fileName.should.equal('test_file');
				(typeof data.newFile).should.equal('undefined');
				data.fileData.should.equal('test_content');
				let data2: any = {currentProject: 'test_project', newFile: 'test_file'};
				await pm.openFile(data2);
				data.fileData.should.equal(data2.fileData);
			});
			it('should upload and open a new binary file', async function(){
				let fileData = Buffer.alloc(4100);
				let data: any = {currentProject: 'test_project', newFile: 'test_file', fileData, force: false};
				await pm.uploadFile(data);
				data.fileName.should.equal('test_file');
				(typeof data.newFile).should.equal('undefined');
				data.error.should.be.a('string');
				let readFile = await fm.read_file_raw('/root/Bela/projects/test_project/test_file');
				readFile.should.deep.equal(fileData);
			});
			it('should fail to overwrite a file without the force flag set', async function(){
				let fileData = 'test_content';
				let data: any = {currentProject: 'test_project', newFile: 'old_file', fileData, force: false};
				await pm.uploadFile(data);
				data.error.should.equal('failed, file old_file already exists!');
				(typeof data.fileData).should.equal('undefined');
				let data2: any = {currentProject: 'test_project', newFile: 'old_file'};
				await pm.openFile(data2);
				data2.fileData.should.equal('old_content');
			});
			it('should overwrite a file with the force flag set', async function(){
				let fileData = 'test_content';
				let data: any = {currentProject: 'test_project', newFile: 'old_file', fileData, force: true};
				await pm.uploadFile(data);
				data.fileName.should.equal('old_file');
				(typeof data.newFile).should.equal('undefined');
				data.fileData.should.equal('test_content');
				let data2: any = {currentProject: 'test_project', newFile: 'old_file'};
				await pm.openFile(data2);
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
				await pm.cleanFile('test_project', 'test.cpp');
				let files: File_Descriptor[] = await fm.deep_read_directory('/root/Bela/projects/test_project');
				files.should.deep.equal([new File_Descriptor('build', undefined, [new File_Descriptor('another.d', 8, undefined)])]);
			});
			it('should do nothing if passed a non-source file', async function(){
				await pm.cleanFile('test_project', 'another.bak.txt');
				let files: File_Descriptor[] = await fm.deep_read_directory('/root/Bela/projects/test_project');
				files.should.deep.equal([
					new File_Descriptor('build', undefined, [
						new File_Descriptor('another.d', 8, undefined),
						new File_Descriptor('test.d', 5, undefined),
						new File_Descriptor('test.o', 5, undefined)
					]),
					new File_Descriptor('test_project', 4100, undefined)
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
				await pm.renameFile(data);
				data.fileName.should.equal('new_file.cpp');
				data.fileData.should.equal('test_content');
				data.fileList.should.deep.equal([
					new File_Descriptor('new_file.cpp', 12, undefined),
					new File_Descriptor('old_file.cpp', 11, undefined)
				]);
			});
			it('should fail gracefully if the destination file exists', async function(){
				let data: any = {currentProject: 'test_project', fileName: 'test_file.cpp', newFile: 'old_file.cpp'};
				await pm.renameFile(data);
				data.error.should.equal('failed, file old_file.cpp already exists!');
				let fileList = await fm.deep_read_directory(paths.projects+'test_project');
				fileList.should.deep.equal([
					new File_Descriptor('old_file.cpp', 11, undefined),
					new File_Descriptor('test_file.cpp', 12, undefined),
					new File_Descriptor('test_project', 100, undefined)
				]);
			});
		});





		afterEach(function(){
			mock.restore();
		})
	})
});
