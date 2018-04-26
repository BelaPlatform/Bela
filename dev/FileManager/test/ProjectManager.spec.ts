import { should } from 'chai';
import * as mock from 'mock-fs';
import { FileManager, File_Descriptor } from "../src/FileManager";
import { ProjectManager } from "../src/ProjectManager";
import {paths} from '../src/paths';

should();

var fm = new FileManager();
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
						'bin_small': new Buffer(100),
						'test_image.png': image,
						'test_wav.wav': wav
					}
				});
				await fm.make_symlink('/root/Bela/projects/test/test_image.png', '/root/Bela/IDE/public/media/old_symlink');
			});
			it('should open a file from a project', async function(){
				let output = await pm.openFile({currentProject, newFile});
				output.fileName.should.equal(newFile);
				output.fileData.should.equal(fileData);
				(typeof output.newFile).should.equal('undefined');
				output.fileType.should.equal(ext);
				output.readOnly.should.equal(false);
			});
			it('should reject files larger than 50 Mb', async function(){
				let output = await pm.openFile({currentProject, newFile: 'bin_large'});
				output.error.should.be.a('string');
				output.fileData.should.be.a('string');
				output.fileName.should.equal('bin_large');
				output.readOnly.should.equal(true);
				output.fileType.should.equal(0);
			});
			it('should reject binary files', async function(){
				let output = await pm.openFile({currentProject, newFile: 'bin_small'});
				output.error.should.be.a('string');
				output.fileData.should.be.a('string');
				output.fileName.should.equal('bin_small');
				output.readOnly.should.equal(true);
				output.fileType.should.equal(0);
			});
			it('should empty the media directory and symlink the file if it is an audio or image file', async function(){
				let output = await pm.openFile({currentProject, newFile: 'test_image.png'});
				let file_list = await fm.read_directory('/root/Bela/IDE/public/media');
				file_list.should.deep.equal(['test_image.png']);
				output.fileData.should.equal('');
				output.readOnly.should.equal(true);
				output.fileName.should.equal('test_image.png');
				output.fileType.should.equal('image/png');
				output = await pm.openFile({currentProject, newFile: 'test_wav.wav'});
				file_list = await fm.read_directory('/root/Bela/IDE/public/media');
				file_list.should.deep.equal(['test_wav.wav']);
				output.fileData.should.equal('');
				output.readOnly.should.equal(true);
				output.fileName.should.equal('test_wav.wav');
				output.fileType.should.equal('audio/x-wav');
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
				let data: any = {};
				data = await pm.listProjects(data);
				data.projectList.should.deep.equal(['test_project1', 'test_project2']);
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
				let data: any = {};
				data = await pm.listExamples(data);
				data.exampleList.should.deep.equal(output);
			});
		});
		afterEach(function(){
			mock.restore();
		})
	})
});
