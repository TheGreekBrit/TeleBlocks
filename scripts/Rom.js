const EventEmitter = require('events');
const fs = require('fs');
class MyEmitter extends EventEmitter {}


class Rom {
	constructor(rom_path) {
		this.events = new MyEmitter();
		//this.data = fs.readFileSync(rom_path);
		fs.readFile(rom_path, (err, data) => {
			if (err) throw err;
			this.data = this.clobber_header(data);
			this.events.emit('rom_loaded')
		});
	}

	get size() { 
		return this.data.length;
	}

	read_bytes(num_bytes, addr=0x0) {
		return this.data.slice(addr, addr+num_bytes)
	}

	read_words(num_words, addr=0x0) {
		return this.data.readInt16LE(addr);
	}

	//read 3 byte addr
	read_longs(num_longs, addr=0x0) {

	}

	clobber_header(data) {
		return data.slice(0x200)
	}
}

module.exports = Rom;