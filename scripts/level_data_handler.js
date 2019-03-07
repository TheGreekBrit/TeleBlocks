const fs = require('fs');
const Rom = require('./Rom.js');
const Tools = require('./snes_util.js');

const LAYER_1_PTR_TABLE = 0x2E000;	//$05E000

function main() {
	const ROM = new Rom(process.argv[2]);
	ROM.events.on('rom_loaded', () => {
		console.log('rom file loaded');
		console.log('size',ROM.size);
		console.log(process.argv)
		//console.log('bytes:', ROM.read_bytes(process.argv[3], process.argv[4]));
		get_level_data(ROM, process.argv[3]);
	});
}

function get_level_data(ROM, level_number=0x106) {
	const level_data_ptr = get_level_data_ptr(ROM, level_number);
	console.log('ptr:', level_number, level_data_ptr);
	const level_header = ROM.read_bytes(5, level_data_ptr);
	console.log('level object header:', level_header);
	const level_objects = decompress_object_data(ROM, level_data_ptr+5);
	//console.log('level objects decompressed:', level_objects);
	level_objects.forEach(obj => {
		console.log('object number:', obj.object_number.toString(16));
		console.log('x_position:', obj.x_position.toString(16));
		console.log('y_position:', obj.y_position.toString(16));
	});
	console.log('total objects in level:', level_objects.length)
}

//@level_number: defaults to 0x106 (yoshi's island 2)
//indexes into $05E000
function get_level_data_ptr(ROM, level_number=0x106) {
	let level_offset = LAYER_1_PTR_TABLE+(level_number*3);
	console.log('ptr address:', level_offset.toString(16))
	let ptr_bytes = ROM.read_bytes(3, level_offset)
	console.log('ptr raw bytes:', ptr_bytes);
	let ptr_addr = Tools.toPc('0x' + [ptr_bytes[2].toString(16), ptr_bytes[1].toString(16), ptr_bytes[0].toString(16)].join(''));
	console.log('ptr_addr:', ptr_addr.toString(16));
	return ptr_addr;
}

function decompress_object_data(ROM, level_data) {
	let decompressed = [];
	// NBBYYYYY bbbbXXXX SSSSSSSS
	//level_data = layer 1 object data + 5
	for (let idx = 0; idx < 2048; idx += 3) {
		let new_screen_flag, object_number, x_position, y_position,
			raw_bytes = ROM.read_bytes(3, level_data+idx);
			byte1 = raw_bytes[0],		//NBBYYYYY
			byte2 = raw_bytes[1],		//bbbbXXXX
			settings = raw_bytes[2];	//SSSSSSSS

		// return if end of level data
		if (byte1 == 0xFF)
			return decompressed;

		console.log('raw object bytes:', byte1.toString(16), byte2.toString(16), settings.toString(16))

		// decompress level data
		new_screen_flag = (byte1 & 0b10000000) == 0b10000000;	//AND N-------
		object_number = (byte1 & 0b01100000) >> 1;				//AND -BB----- (object_number = --BB----)
		object_number = (byte2 >> 4) | object_number;	//AND bbbb---- (object_number = BBbbbb)
		
		//todo implement vertical level check
		//flip x/y values if vertical level
		//if (level_data.vertical_level_flag) {
		let vertical_level = false;
		if (vertical_level) {
			//vertical level
			x_position = byte1 & 0b00011111;					//AND ---XXXXX (byte1)
			y_position = byte2 & 0b00001111;					//AND ----YYYY (byte2)
		} else {
			//horizontal level
			x_position = byte2 & 0b00001111;					//AND ----XXXX (byte2)
			y_position = byte1 & 0b00011111;					//AND ---YYYYY (byte1)
		}

		decompressed.push({
			new_screen_flag: new_screen_flag,
			object_number: object_number,
			x_position: x_position,
			y_position: y_position,
			settings: settings
		});

	}
}

main();