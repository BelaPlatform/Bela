import { should } from 'chai';
import * as mock from 'mock-fs';
import {p_settings} from '../src/SettingsManager';

should();

describe('SettingsManager', function(){
	describe('manage project settings', function(){
		describe('#read', function(){
			var test_obj = {'test_key': 'test_field'};
			beforeEach(function(){
				mock({'/root/Bela/projects/test_project/settings.json': JSON.stringify(test_obj)});
			});
			it('should return a project\'s settings.json', async function(){
				let out = await p_settings.read('test_project');
				out.should.deep.equal(test_obj);
			});
			it('should create a default settings.json if one does not exist', async function(){
				let out = await p_settings.read('wrong_project');
				let out2 = await p_settings.read('wrong_project');
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
				await p_settings.write('test_project', test_obj);
				let out = await p_settings.read('test_project');
				test_obj.should.deep.equal(out);
			});
			after(function(){
				mock({});
			});
		});
	});
});
