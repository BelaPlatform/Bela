import { should } from 'chai';
import * as mock from 'mock-fs';
import * as ide_settings from '../src/IDESettings';

should();

describe('IDESettingsManager', function(){
	describe('manage global IDE settings json file', function(){
		describe('#read', function(){
			before(function(){
				mock({ '/root/Bela/IDE/settings.json': JSON.stringify({'test_key': 'test_value'}) });
			});
			it('should return the IDE settings', async function(){
				let out = await ide_settings.read();
				out.should.deep.equal({'test_key': 'test_value'});
			});
			after(function(){
				mock.restore();
			});
		});

		describe('#set_setting', function(){
			before(function(){
				mock({ '/root/Bela/IDE/settings.json': JSON.stringify({'test_key': 'test_value'}) });
			});
			it('should set a setting in the IDE settings', async function(){
				await ide_settings.set_setting('new_key', 'new_value');
				let settings = await ide_settings.read();
				settings.new_key.should.equal('new_value');
				settings.test_key.should.equal('test_value');
			});
			after(function(){
				mock.restore();
			});
		});
	});
});
