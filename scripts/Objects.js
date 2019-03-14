const Tools = require('./snes_util.js');
const ObjectList = require('./objects.json');

class Objects {
	constructor(rom, dataAddress, layer='1', screen=0) {
		this.rom 				= rom;
		this.address 			= dataAddress;
		this.pretty_address 	= Tools.toHex(Tools.toSnes(dataAddress), '$', 6);
		this.layer				= layer;
		this.currentScreen		= screen;

		this.bytes 				= this.rom.read_bytes(4, this.address);
		this.verticalLevel 		= this.isVerticalLevel();
        this.type 				= this.getType();

		this.objectNumber 		= this.getObjectNumber();
		if (this.isRegularObject()) {
            this.newScreenFlag	= this.isNewScreen();
            this.highXPos 		= this.getHighXPos();
            this.xPos 			= this.getXPos();
            this.yPos 			= this.getYPos();
        }
		this.extended 			= this.isExtended();
		this.size				= this.getSize();
        this.name				= this.getName();

		this.settings			= -1;
		this.screenNumber		= 0;
		this.secondaryExitFlag	= false;
		this.destination		= -1; 		//only applicable to screen exits
	}

	isExtended() {
		return (this.bytes[0] & 0b01100000) === 0 && (this.bytes[1] & 0b11110000) === 0;
	}

	//extended object 0
	isExit() {
		//console.log(this.isExtended(), this.bytes)
		return this.isExtended() && (this.bytes[2] === 0);
	}

	//extended object 1
	isJump() {
		return this.isExtended() && (this.bytes[2] === 1);
	}

	//TODO: implement this
    isVerticalLevel() {
        return false;
        //return (level.header[4] & 0b00110000) == 0b00010000
    }

    isRegularObject() {
		return this.type === 'standard' || this.type === 'extended';
	}

    isNewScreen() {
		if (this.isRegularObject() === false) return false;
        return (this.bytes[0] & 0b10000000) === 0b10000000;		//AND N-------
	}

    getObjectNumber() {
        let object_number = -1;
        switch (this.type) {
            case 'standard':
                object_number = (this.bytes[0] & 0b01100000) >> 1;		//AND -BB----- (object_number = --BB----)
                object_number = (this.bytes[1] >> 4) | object_number;	//AND bbbb---- (object_number = BBbbbb)
                return object_number;
            case 'extended':
                return this.bytes[2];
            case 'exit':
                return ((this.bytes[1] & 1) << 8) | this.bytes[3];
			default:
				return object_number;	// -1
        }
    }

    getSize() {
        let _size;
        if (this.isExit()) _size = 4;
        else _size = 3;
        //update this.bytes length to match this.size
        this.fixByteLength();

        return _size;
    }

	getType(address=this.dataAddress) {
		if (this.isExtended()) {
			if (this.isExit()) return 'exit';
			if (this.isJump()) return 'jump';
			return 'extended';
		} else return 'standard';
	}

	getName() {
        let name, fixedObjectNumber;
        switch (this.type) {
            case 'exit':
            case 'jump':
                return this.type;
            case 'standard':
                if (this.objectNumber > 0x3f)
                    return 'Unused';
                break;
            case 'extended':
                if (this.objectNumber > 0x97 || (this.objectNumber >= 0x02 && this.objectNumber <= 0x0f))
                    return 'Unused';
        }
		fixedObjectNumber = Tools.toHex(this.objectNumber, false, 2);
		//console.log(this.type,fixedObjectNumber);
		name = ObjectList[this.type][fixedObjectNumber.toString().toUpperCase()];
		//console.log(name);
		return name;
	}

	updateScreen() {
		if (this.currentScreen > this.highXPos) {
			//console.log('new screen!');
			this.highXPos = this.currentScreen;
			this.xPos = this.getXPos();
			this.yPos = this.getYPos();
		}
	}

    getHighXPos() {
		return this.currentScreen;
    }

	getXPos() {
		//console.log('highx:',this.highXPos, this.highXPos << 4, this.bytes[1]&0b1111)
		if (this.verticalLevel)
			return this.bytes[0] & 0b00011111;								//AND ---XXXXX (byte1)
		else
			return (this.highXPos << 4) | (this.bytes[1] & 0b00001111);		//AND ----XXXX (byte2)
	}

	getYPos() {
		if (this.verticalLevel)
			return (this.highXPos << 4) | (this.bytes[1] & 0b00001111);		//AND ----YYYY (byte2)
		else
			return this.bytes[0] & 0b00011111;								//AND ---YYYYY (byte1)
	}

    fixByteLength() {
        //adjust this.bytes to match size of the object
        this.bytes = this.bytes.slice(0, this.size);
    }

}

module.exports = Objects;