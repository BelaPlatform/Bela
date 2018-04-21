import { should } from 'chai';
import * as mock from 'mock-fs';
import { FileManager } from "../src/FileManager";

should();


var fm: FileManager = new FileManager();

describe('FileManager', function(){

	describe('primitive file and directory manipulation', function() {
	
		describe('#read_file', function() {
			var content: string = 'this is a test';
			before(function(){
				var test_file: mock.File = mock.file({content});
				mock({ test_file });
			});
			it('should read a file', async function(){
				let data: string = await fm.read_file('test_file');
				data.should.equal(content);
			});
		});

		describe('#write_file', function(){
			var content: string = 'this is still a test';
			before(function(){
				mock({});
			});
			it('should write a file', async function(){
				await fm.write_file('test_file', content);
				let data: string = await fm.read_file('test_file');
				data.should.equal(content);
			});
		});

		describe('#rename_file', function(){
			var content: string = 'yup, still a test';
			before(function(){
				mock({ 'test_file' : mock.file({content}) });
			});
			it('should rename a file', async function(){
				await fm.rename_file('test_file', 'other_file');
				let data: string = await fm.read_file('other_file');
				data.should.equal(content);
				let data2: string = await fm.read_file('test_file')
					.catch( e => {
						e.code.should.equal('ENOENT');
					});
			});
		});

		describe('#delete_file', function(){
			var content: string = 'this is a test';
			before(function(){
				mock({ 'test_file' : mock.file({content}) });
			});
			it('should delete a file', async function(){
				await fm.delete_file('test_file');
				let data: string = await fm.read_file('test_file')
					.catch( e => {
						e.code.should.equal('ENOENT');
					});
			});
		});
			
		afterEach(function(){
			mock.restore();
		});
	});

	describe('Sophisticated file and directory manipulation', function(){

		describe('#save_file', function(){
			var content: string = 'this is a test';
			var file_name: string = 'test_file';
			var lockfile: string = '.lockfile';
			beforeEach(function(){
				mock({});
			});
			it('should save a file following vim\'s strategy to avoid data loss', async function(){
				await fm.save_file(file_name, content, lockfile);
				let data: string = await fm.read_file(file_name);
				data.should.equal(content);
			});
			it('should also work without using a lockfile', async function(){
				await fm.save_file(file_name, content);
				let data: string = await fm.read_file(file_name);
				data.should.equal(content);
			});
			afterEach(function(){
				mock.restore();
			});
		});
		afterEach(function(){
			mock.restore();
		});
	});
});
