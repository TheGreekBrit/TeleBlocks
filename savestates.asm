!globalFreespace 	= $000000	; unused at present

!controller1Held 	= $15		; byetUDLR
!controller1New 	= $16		; newly pressed buttons

!controller2Held 	= $17		;\ axlr----
!controller2New		= $18		;/ unused

!saveButton 		= #$20		; select, controller 1
!loadButton 		= #$04		; down, controller 1

!oam 				= $0200		; 0x0200 bytes
!saveOAMAddr 		= #$9C7B	; ends at 9E7B
!saveOAMBank		= #$7f 		;

!playerXNext 		= $94		; 2 bytes
!saveXNext 			= $60		;

!playerYNext 		= $96		; 2 bytes
!saveYNext 			= $62		;

!spriteSlots 		= $14C8		; 12 bytes
!saveSpriteSlots 	= $0F5E		;

macro save_proc()
	pha : phx : phy
	phd : phb
	php
endmacro

macro restore_proc()
	plp
	plb : pld
	ply : plx : pla
endmacro

macro debug(val)
	%save_proc()
	rep #$10
	lda #$<val>
	sta $0d9c
	%restore_proc()
endmacro

;;;;;;;;;;;;
;   CODE   ;
;;;;;;;;;;;;
print pc," FREESPACE"

ControllerCheck:
;CheckSave:
	lda !controller1New
	and !saveButton
	bne Save
;CheckLoad:
	lda !controller1New
	and !loadButton
	bne Load
;Return:
	rts

Save:
	%debug(1)					; state = 1

	rep #$30					; A/X/Y 16-bit

	.saveOAM
		lda #$0220				;\ \ transfer size
		sta $4305				; |/
		ldx #$0200				; |\ source address
		stx $4302				; |/ 
		ldx !saveOAMAddr		; |\ dest address
		stx $2181				; |/ WRAM
								; |
		sep #$30				; | SAVE OAM TABLE TO RAM
								; |
		lda #$7e 				; |\ source bank
		sta $4304				; |/
		lda !saveOAMBank		; |\ dest bank
		sta $2183				; |/ WRAM
		lda #$80				; |\ dest is $2180
		sta $4301				; |/
		lda #$01				; |\ read two bytes (auto increment?)
		sta $4300				; |/
								; |
		sta $430b				;/ start transfer

	.saveSprites
		ldx #$0b				; 12 sprite slots
	.loopSpriteSlots
		lda !spriteSlots,x
		sta !saveSpriteSlots,x
		dex
		bpl .loopSpriteSlots
	
	rep #$30

	.savePlayerPosition
		lda !playerXNext
		sta !saveXNext
		lda !playerYNext
		sta !saveYNext

	sep #$30

	%debug(2)					; state = 2

	lda #$05					;\ play sound
	sta $1df9					;/
	rts

Load:
	%debug(3)					; state = 3

	rep #$30					; A/X/Y 16-bit

	.loadOAM
		lda #$0220				;\ \ transfer size
		sta $4305				; |/ 
		ldx !saveOAMAddr		; |\ source address
		stx $4302				; |/
		ldx #$0200				; |\ dest address
		stx $2181				; |/ WRAM
								; |
		sep #$30				; | LOAD OAM TABLE FROM RAM
								; |
		lda !saveOAMBank 		; |\ source bank
		sta $4304				; |/
		lda #$7e 				; |\ dest bank
		sta $2183				; |/ WRAM
		lda #$80				; |\ dest is $2180
		sta $4301				; |/
		lda #$01				; |\ read two bytes (auto increment?)
		sta $4300				; |/
								; |
		sta $430b				;/ start transfer

	.loadSprites
		ldx #$0b				; 12 sprite slots
	.loopSpriteSlots
		lda !saveSpriteSlots,x
		sta !spriteSlots,x
		dex
		bpl .loopSpriteSlots

	rep #$30

	.loadPlayerPosition
		lda !saveXNext
		sta !playerXNext
		lda !saveYNext
		sta !playerYNext

	sep #$30

	%debug(4)					; state = 4

	lda #$1c					;\ play sound
	sta $1df9					;/
	rts