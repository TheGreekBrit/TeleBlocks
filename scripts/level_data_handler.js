const fs = require('fs');
const Rom = require('./Rom.js');
const Tools = require('./snes_util.js');

const DEBUG = 2;

const LAYER_1_PTR_TABLE = 0x2E000;	//$05E000

/* USAGE:
 * node level_data_handler.js SMW.smc 0x106
 */
function main() {
	const ROM = new Rom(process.argv[2]);
	ROM.events.on('rom_loaded', () => {
		if (DEBUG >= 1) console.log('rom file loaded', ROM.data);
		if (DEBUG >= 1) console.log('size', ROM.size);
		if (DEBUG >= 1) console.log(process.argv);

		get_level_data(ROM, process.argv[3]);
	});
}

function get_level_data(ROM, level_number=0x106) {
	let level_data_ptr, level_header, level_objects;

	level_data_ptr = get_level_data_ptr(ROM, level_number);
	if (DEBUG >= 1) console.log('ptr:', level_number, level_data_ptr);
	
	level_header = ROM.read_bytes(5, level_data_ptr);
	if (DEBUG >= 1) console.log('level object header:', level_header);
	
	level_objects = decompress_object_data(ROM, level_data_ptr+5);

	if (DEBUG >= 1) print_decompressed(level_objects);
}

//@level_number: defaults to 0x106 (yoshi's island 2)
//indexes into $05E000
function get_level_data_ptr(ROM, level_number=0x106) {
	let level_offset, ptr_bytes, ptr_addr;
	if (DEBUG >= 1) console.log(ROM);

	level_offset = LAYER_1_PTR_TABLE+(level_number*3);
	if (DEBUG >= 1) console.log('ptr address:', level_offset.toString(16));

	ptr_bytes = ROM.read_bytes(3, level_offset);
	if (DEBUG >= 1) console.log('ptr raw bytes:', ptr_bytes);

	ptr_addr = Tools.toPc('0x' + [ptr_bytes[2].toString(16), ptr_bytes[1].toString(16), ptr_bytes[0].toString(16)].join(''));
	if (DEBUG >= 1) console.log('ptr_addr:', ptr_addr.toString(16));
	
	return ptr_addr;
}

function decompress_object_data(ROM, level_data) {
	let decompressed = [],
		current_screen = 0;
	// NBBYYYYY bbbbXXXX SSSSSSSS
	//level_data = layer 1 object data + 5
	for (let idx = 0; idx < 2048; idx += 3) {
		if (DEBUG >= 2) console.log('idx:', idx);
		let byte1, byte2, byte3, byte4,
			obj_data_addr = level_data + idx;

		const Obj = ROM.create_object(obj_data_addr, current_screen);

		if (DEBUG >= 2) console.log('reading data at:', Obj.pretty_address, Obj.bytes);

		if (Obj.newScreenFlag) {
            Obj.currentScreen = ++current_screen;
            // Obj.highXPos = screen_number;
            Obj.updateScreen();
        }

		byte1 = Obj.bytes[0];
		byte2 = Obj.bytes[1];
		byte3 = Obj.bytes[2];
		if (Obj.getSize() === 4) byte4 = Obj.bytes[3];

		// return if end of level data
		if (byte1 === 0xFF)
			return decompressed;

		//check extended
		if (Obj.extended) {
			//check screen exit
			if (Obj.isExit()) {
				Obj.screenNumber = byte1 & 0b00011111;
				Obj.secondaryExitFlag = (byte2 & 0b10) === 0b10;
				Obj.destination = ((byte2 & 1) << 8) | byte4;
				decompressed.push(Obj);
                idx++;		//adjust for 4-byte read
				if (DEBUG >= 2) console.log('bytes:', byte1.toString(16), byte2.toString(16), byte3.toString(16), byte4.toString(16));
				if (DEBUG >= 2) console.log();
				continue;
			} else if (byte3 === 1) {
                //screen jump
                Obj.screenNumber = byte1 & 0b00011111;
				current_screen = Obj.screenNumber;
				decompressed.push(Obj);
				if (DEBUG >= 1) console.log('bytes:', byte1.toString(16), byte2.toString(16), byte3.toString(16));
				if (DEBUG >= 1) console.log();
				continue;
			} else {
				//regular extended object
			}
		} else {
			//standard object
			//TODO add settings getter
			Obj.settings = byte3;	//SSSSSSSS
		}

		if (DEBUG >= 1) console.log('bytes:', byte1.toString(16), byte2.toString(16), byte3.toString(16));
		if (DEBUG >= 1) console.log();

		decompressed.push(Obj);
	}
}

function print_decompressed(decompressed_objects) {
	decompressed_objects.forEach(obj => {
		if (DEBUG >= 2) console.log('address:', obj.pretty_address, obj.bytes);
		switch (obj.type) {
			case 'standard':
			case 'extended':
				console.log(obj.type.toUpperCase() + ' OBJECT');
				console.log('obj:', obj.objectNumber.toString(16), obj.name);
				console.log('screen:', obj.currentScreen.toString(16));
				console.log('x:', obj.xPos.toString(16));
				console.log('y:', obj.yPos.toString(16));
				break;
			case 'exit':
				console.log('SCREEN EXIT');
				console.log('screen number:', obj.screenNumber.toString(16));
				console.log('secondary exit flag:', obj.secondaryExitFlag);
				console.log('destination / secondary exit id:', obj.destination.toString(16));
				break;
			case 'jump':
				console.log('SCREEN JUMP');
				console.log('screen number:', obj.screenNumber);
		}
		console.log();
	});

    console.log('total objects in level:', decompressed_objects.length)
}

main();