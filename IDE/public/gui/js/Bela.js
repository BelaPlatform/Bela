import BelaData from './BelaData.js'
import BelaControl from './BelaControl.js'

export default class Bela {
	constructor(ip=location.hostname) {
		let qs = new URLSearchParams(window.location.search);
		this.port = qs.has('wsPort') ? qs.get('wsPort') : 5555;
		let prefix = qs.has('wsPrefix') ? qs.get('wsPrefix') : 'gui_';
		let data = qs.has('wsData') ? qs.get('wsData') : prefix + 'data';
		let control = qs.has('wsControl') ? qs.get('wsControl') : prefix + 'control';
		this.addresses = {
			data: data,
			control: control,
		}
		this.ip = ip
		this.data    = new BelaData    (this.port, this.addresses.data,    this.ip)
		this.control = new BelaControl (this.port, this.addresses.control, this.ip)
	}
}
