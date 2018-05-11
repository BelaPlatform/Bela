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
	});
});
