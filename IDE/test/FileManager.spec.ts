import { should } from 'chai';
import * as mock from 'mock-fs';
import * as file_manager from "../src/FileManager";
import * as util from '../src/utils';

should();

describe('FileManager', function(){

	describe('primitive file and directory manipulation', function() {
	
		describe('#read_file', function() {
			beforeEach(function(){
				mock({ test_file: 'test_content' });
			});
			it('should read a file', async function(){
				let data: string = await file_manager.read_file('test_file');
				data.should.equal('test_content');
			});
			it('should throw ENOENT if the file doesnt exist', async function(){
				let data: string = await file_manager.read_file('different_file')
					.catch( (e: NodeJS.ErrnoException) => {
						e.code.should.equal('ENOENT');
					});
			});
			afterEach(function(){
				mock.restore();
			});
		});

		describe('#read_file_raw', function() {
			var content: Buffer = Buffer.alloc(10, 'a');;
			before(function(){
				mock({ 'test_file': content });
			});
			it('should read a file', async function(){
				let data: Buffer = await file_manager.read_file_raw('test_file');
				data.should.deep.equal(content);
			});
		});

		describe('#write_file', function(){
			var content: string = 'this is still a test';
			before(function(){
				mock({});
			});
			it('should write a file', async function(){
				await file_manager.write_file('test_file', content);
				let data: string = await file_manager.read_file('test_file');
				data.should.equal(content);
			});
		});

		describe('#rename_file', function(){
			var content: string = 'yup, still a test';
			before(function(){
				mock({ 'test_file' : mock.file({content}) });
			});
			it('should rename a file', async function(){
				await file_manager.rename_file('test_file', 'other_file');
				let data: string= await file_manager.read_file('other_file');
				data.should.equal(content);
				await file_manager.read_file('test_file')
					.catch( e => e.code.should.equal('ENOENT') );
			});
		});

		describe('#delete_file', function(){
			var content: string = 'this is a test';
			before(function(){
				mock({ 
					'test_file' : mock.file({content}),
					'test_dir': {'test_file': 'test_content'}
				});
			});
			it('should delete a file', async function(){
				await file_manager.delete_file('test_file');
				let data: string = await file_manager.read_file('test_file')
					.catch( e => e.code.should.equal('ENOENT') );
			});
			it('should delete a directory', async function(){
				await file_manager.delete_file('test_dir');
				let data: string[] = await file_manager.read_directory('test_dir')
					.catch( e => e.code.should.equal('ENOENT') );
			});
		});

		describe('#read_directory', function(){
			let file_list: string[] = ['test_file1', 'test_file2', 'test_file3'];
			before(function(){
				let mock_dir: any = {};
				mock_dir[file_list[0]] = 'test';
				mock_dir[file_list[1]] = 'test';
				mock_dir[file_list[2]] = 'test';
				mock({ 'test_dir': mock_dir });
			});
			it('should return an array of the names of the files in a directory', async function(){
				let output: string[] = await file_manager.read_directory('test_dir');
				output.should.deep.equal(file_list);
			});
		});

		describe('#stat_file', function(){
			before(function(){
				mock({ 'test_file': 'test' });
			})
			it('should return an object with a size field and isDirectory method', async function(){
				let stat = await file_manager.stat_file('test_file');
				stat.size.should.be.a('Number');
				stat.isDirectory.should.be.a('Function');
				stat.isDirectory().should.equal(false);
			});
		});

		describe('copy_directory', function(){
			before(function(){
				mock({ 'test_dir': { 'test_file1': 'content1', 'test_subdir': {'test_file2': 'content2'} } });
			});
			it('should recursively copy the contents of one directory to another, creating the destination if neccesary', async function(){
				await file_manager.copy_directory('test_dir', 'dest_dir');
				let contents: util.File_Descriptor[] = await file_manager.deep_read_directory('dest_dir');
				contents.should.deep.equal([
						new util.File_Descriptor('test_file1', 8, undefined),
						new util.File_Descriptor('test_subdir', undefined, [
							new util.File_Descriptor('test_file2', 8, undefined)
						])
				]);
			});
		});

		describe('#is_binary', function(){
			beforeEach(function(){
				mock({ 'test_text': 'test', 'test_bin': new Buffer(100) });
			})
			it('should return true for a binary file', async function(){
				let result = await file_manager.is_binary('test_bin');
				(typeof result).should.equal('boolean');
				result.should.equal(true);
			});
			it('should return false for a non-binary file', async function(){
				let result = await file_manager.is_binary('test_text');
				(typeof result).should.equal('boolean');
				result.should.equal(false);
			});
		});

		describe('#make_symlink', function(){
			var content = 'test_content';
			beforeEach(function(){
				mock({ 'test_src': content });
			})
			it('should create a symlink', async function(){
				await file_manager.make_symlink('test_src', 'test_dir/test_dest');
				let data: string = await file_manager.read_file('test_dir/test_dest');
				data.should.equal(content);
			});
		});

		describe('#empty_directory', function(){
			before(function(){
				mock({ 'test_dir': {
					'test_dir2': { 'test_deep': 'content' },
					'test_file1': 'content',
					'test_file2': 'more_content'
					}
				});
			})
			it('should delete all files and directories in a direcory', async function(){
				await file_manager.empty_directory('test_dir');
				let file_list: string[] = await file_manager.read_directory('test_dir');
				file_list.should.deep.equal([]);
			});
		});

		describe('#read_json', function(){
			var test_obj = {'test_key': 'test_field'};
			before(function(){
				mock({'test_json': JSON.stringify(test_obj)});
			});
			it('should read and parse a JSON file', async function(){
				let output = await file_manager.read_json('test_json');
				output.should.deep.equal(test_obj);
			});
		});

		describe('#write_json', function(){
			var test_obj = {'test_key': 'test_field'};
			before(function(){
				mock({});
			})
			it('should stringify an object and write it to a json file', async function(){
				await file_manager.write_json('test_json', test_obj);
				let output: any = await file_manager.read_json('test_json');
				output.should.deep.equal(test_obj);
			});
		});
		
		describe('#directory_exists', function(){
			beforeEach(function(){
				mock({
					'test_dir': { 'test_subdir': { 'test_file': 'test_content' } }
				});
			});
			it('should return false if a directory does not exist', async function(){
				let output: boolean = await file_manager.directory_exists('wrong_dir/wrong_subdir');
				output.should.equal(false);
			});
			it('should return false if called on a file', async function(){
				let output: boolean = await file_manager.directory_exists('test_dir/test_subdir/test_file');
				output.should.equal(false);
			});
			it('should return true if a directory exists', async function(){
				let output: boolean = await file_manager.directory_exists('test_dir/test_subdir');
				output.should.equal(true);
			});
		});

		describe('#file_exists', function(){
			beforeEach(function(){
				mock({
					'test_dir': {'test_file': 'test_content'}
				});
			});
			it('should return true if the file exists', async function(){
				let out: boolean = await file_manager.file_exists('test_dir/test_file');
				out.should.equal(true);
			});
			it('should return false if the file does not exist', async function(){
				let out: boolean = await file_manager.file_exists('wrong_file');
				out.should.equal(false);
			});
			it('should return false if called on a directory', async function(){
				let out: boolean = await file_manager.file_exists('test_dir');
				out.should.equal(false);
			});
		});

		afterEach(function(){
			mock.restore();
		});
	});

	describe('Sophisticated file and directory manipulation', function(){

		describe('#deep_read_directory', function(){
			var root_content = [
				new util.File_Descriptor('dir1', undefined, [
					new util.File_Descriptor('dir2', undefined, [
						new util.File_Descriptor('file3', 6, undefined)
					]),
					new util.File_Descriptor('file2', 5, undefined)
				]),
				new util.File_Descriptor('file', 4, undefined)
			];
			before(function(){
				mock({ 
					'root': {
						'file': 'test',
						'dir1': {
							'file2': 'test2',
							'dir2': { 'file3': 'test33' }
						}
					}
				});
			});
			it('should recursively read the contents of a directory, returning an array of file descriptors', async function(){
				let output: util.File_Descriptor[] = await file_manager.deep_read_directory('root');
			//	console.dir(output, { depth: null });
				output.should.deep.equal(root_content);
			});
		});

		afterEach(function(){
			mock.restore();
		});
	});
});
