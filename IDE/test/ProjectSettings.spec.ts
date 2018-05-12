import { should } from 'chai';
import * as mock from 'mock-fs';
import * as project_settings from '../src/ProjectSettings';

should();

describe('ProjectSettingsManager', function(){
	describe('manage project settings json file', function(){
		describe('#read', function(){
			var test_obj = {'test_key': 'test_field'};
			beforeEach(function(){
				mock({'/root/Bela/projects/test_project/settings.json': JSON.stringify(test_obj)});
			});
			it('should return a project\'s settings.json', async function(){
				let out = await project_settings.read('test_project');
				out.should.deep.equal(test_obj);
			});
			it('should create a default settings.json if one does not exist', async function(){
				let out = await project_settings.read('wrong_project');
				let out2 = await project_settings.read('wrong_project');
				out2.should.deep.equal(out);
				out.fileName.should.equal('render.cpp');
				out.CLArgs.should.be.a('object');
			});
			afterEach(function(){
				mock.restore();
			});
		});
		describe('#write', function(){
			var test_obj = {'test_key': 'test_field'};
			before(function(){
				mock({});
			});
			it('should write a project\'s settings.json', async function(){
				await project_settings.write('test_project', test_obj);
				let out = await project_settings.read('test_project');
				test_obj.should.deep.equal(out);
			});
			after(function(){
				mock.restore();
			});
		});
	});
	describe('manage project settings', function(){
		describe('#setCLArg', function(){
			before(function(){
				mock({ '/root/Bela/projects/test_project/settings.json': JSON.stringify({ CLArgs: {'old_key': 'old_value'} }) });
			});
			it('should set a single command line argument', async function(){
				let settings = await project_settings.setCLArg({
					currentProject: 'test_project', 
					key: 'key', 
					value: 'value'
				});
				settings.CLArgs['old_key'].should.equal('old_value');
				settings.CLArgs['key'].should.equal('value');
			});
			after(function(){
				mock.restore();
			});
		});
		describe('#restoreDefaultCLArgs', function(){
			before(function(){
				mock({ '/root/Bela/projects/test_project/settings.json': JSON.stringify({ fileName: 'test_file', CLArgs: {'-p': '2'} }) });
			});
			it('should restore a projects command-line arguments to the defauts without modifying the fileName field in the settings', async function(){
				let settings = await project_settings.restoreDefaultCLArgs({currentProject: 'test_project'});
				settings.fileName.should.equal('test_file');
				settings.CLArgs['-p'].should.equal('16');
			});
			after(function(){
				mock.restore();
			})
		});
	});
});
