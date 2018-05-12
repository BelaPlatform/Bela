import * as IDE from '../src/main';
import { should } from 'chai';

should();

describe('Top-level IDE functions', function(){
	describe('#get_xenomai_version', function(){
		it('should return the correct version string', async function(){
			let version: string = await IDE.get_xenomai_version();
			version.should.satisfy((ver: string) => (ver.includes('3.0.5') || ver.includes('2.6')));
		});
	});
});
