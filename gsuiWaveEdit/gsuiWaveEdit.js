"use strict";

class gsuiWaveEdit extends gsui0ne {
	#waveNull = true;
	#waveSelected = null;
	#elWaves = this.getElementsByClassName( "gsuiWaveEdit-wavestep" );
	#elWavesSorted = [];
	#data = GSUgetModel( "wavetable" );
	#redrawWavesDeb = GSUthrottle( this.#redrawWaves.bind( this ), 100 );

	constructor() {
		super( {
			$cmpName: "gsuiWaveEdit",
			$tagName: "gsui-wave-edit",
			$elements: {
				$head: ".gsuiWaveEdit-head",
				$dotline: ".gsuiWaveEdit-graph gsui-dotline",
				$wtGraphWrap: ".gsuiWaveEdit-wt-graph",
				$wtGraph: "gsui-wavetable-graph",
				$scroll: ".gsuiWaveEdit-scroll",
				$waves: ".gsuiWaveEdit-waves",
				$wtDotline: ".gsuiWaveEdit-wtpos gsui-dotline",
			},
		} );
		Object.seal( this );
		this.$elements.$head.onclick = e => {
			switch ( e.target.dataset.action ) {
				case "back":
					this.$dispatch( "back" );
					break;
			}
		};
		this.$elements.$waves.onclick = e => {
			const act = e.target.dataset.action;

			if ( act ) {
				const w = e.target.closest( ".gsuiWaveEdit-wavestep" );

				this.#execWaveAction( w.dataset.id, act );
			}
		};
		GSUlistenEvents( this, {
			gsuiDotline: {
				input: GSUnoop,
				change: ( d, t ) => {
					const isWave = t.parentNode.classList.contains( "gsuiWaveEdit-graph" );

					this.$dispatch(
						isWave ? "changeWavetable" : "changeWavetableCurve",
						this.$change( this.#onchangeDotlines( d.args[ 0 ], isWave ? "wave" : "wtpos" ) )
					);
					this.#waveNull = false;
				},
			},
		} );
	}

	// .........................................................................
	$onresize( w ) {
		const dl = this.$elements.$dotline;
		const h2 = this.$elements.$scroll.clientHeight;
		const h3 = Math.min( h2, w / 3 );

		this.$elements.$scroll.style.left = `${ h3 }px`;
		this.$elements.$wtGraphWrap.style.width = `${ h3 }px`;

		const ratio = dl.clientWidth / dl.clientHeight;
		const wavesH = this.$elements.$waves.clientHeight - 4;

		this.$elements.$waves.style.fontSize = `${ ratio * wavesH }px`;
		this.#redrawWavesDeb();
	}
	#redrawWaves() {
		GSUforEach( this.#data.waves, ( w, wId ) => {
			const svg = this.#getWaveElement( wId ).querySelector( "gsui-dotlinesvg" );

			svg.$setSVGSize( svg.clientWidth, svg.clientHeight );
			svg.$setCurve( w.curve );
		} );
	}

	// .........................................................................
	$firstTimeConnected() {
		this.#addWave( "0", this.#data.waves[ 0 ] );
		this.#getWaveElement( "0" ).querySelector( "gsui-dotlinesvg" ).$setCurve( this.#data.waves[ 0 ].curve );
		this.#selectWave( "0" );
		this.$elements.$dotline.$change( this.#data.waves[ 0 ].curve );
		this.$elements.$wtGraph.$setWavetable( this.#data.waves );
		this.$elements.$wtGraph.$draw();
		this.$elements.$wtDotline.$change( this.#data.wtCurve );
	}
	$clear() {
		this.#waveNull = true;
		this.#waveSelected = "0";
		this.$elements.$dotline.$clear();
		this.#elWavesSorted.forEach( w => w.remove() );
		this.#data = {};
	}
	$change( obj ) {
		const wavesToUpdate = [];
		let toSelect = null;

		if ( !obj ) {
			return obj;
		}
		GSUforEach( obj.waves, ( w, wId ) => {
			if ( !w ) {
				this.#removeWave( wId );
			} else if ( !( wId in this.#data.waves ) ) {
				wavesToUpdate.push( wId );
				toSelect = wId;
				this.#addWave( wId, w );
			} else {
				if ( w.curve ) {
					wavesToUpdate.push( wId );
					if ( wId === this.#waveSelected ) {
						this.$elements.$dotline.$change( w.curve );
					}
				} else if ( "index" in w ) {
					this.#getWaveElement( wId ).dataset.index = w.index;
				}
			}
		} );
		if ( obj.wtCurve ) {
			this.$elements.$wtDotline.$change( obj.wtCurve );
		}
		GSUdiffAssign( this.#data, obj );
		if ( toSelect ) {
			this.#selectWave( toSelect );
		}
		wavesToUpdate.forEach( wId => {
			this.#getWaveElement( wId ).querySelector( "gsui-dotlinesvg" ).$setCurve( this.#data.waves[ wId ].curve );
		} );
		this.$elements.$wtGraph.$setWavetable( this.#data.waves );
		this.$elements.$wtGraph.$draw();
		return obj;
	}

	// .........................................................................
	#onchangeDotlines( crvObj, src ) {
		const obj = {};

		if ( this.#waveNull ) {
			GSUdeepAssign( obj, this.#data );
			if ( src === "wave" ) {
				GSUdeepAssign( obj.waves[ this.#waveSelected ].curve, crvObj );
			} else if ( src === "wtpos" ) {
				GSUdeepAssign( obj.wtCurve, crvObj );
			}
		} else {
			if ( src === "wave" ) {
				obj.waves = { [ this.#waveSelected ]: { curve: crvObj } };
			} else if ( src === "wtpos" ) {
				obj.wtCurve = crvObj;
			}
		}
		return obj;
	}

	// .........................................................................
	#updateSortWaves() {
		this.#elWavesSorted = Array.from( this.#elWaves ).sort( ( a, b ) => a.dataset.index - b.dataset.index );
		this.#elWavesSorted.forEach( ( w, i ) => {
			w.style.order = i;
			w.querySelector( ".gsuiWaveEdit-wavestep-num" ).textContent = i + 1;
		} );
	}
	#getWaveElement( wId ) {
		return this.#elWavesSorted.find( w => w.dataset.id === wId );
	}
	#getWaveOrder( wId ) {
		return this.#elWavesSorted.findIndex( w => wId === w.dataset.id );
	}

	// .........................................................................
	#execWaveAction( wId, act ) {
		switch ( act ) {
			case "select": this.#selectWave( wId ); break;
			case "clone":
				this.$dispatch( "changeWavetable", this.$change( this.#createCloneObj( wId ) ) );
				break;
			case "remove":
				if ( this.#elWavesSorted.length > 1 ) {
					this.$dispatch( "changeWavetable", this.$change( this.#createRemoveObj( wId ) ) );
				}
				break;
		}
	}
	#createCloneObj( wId ) {
		const elWaves = this.#elWavesSorted;
		const w = this.#data.waves[ wId ];
		const wNew = {
			index: 1,
			curve: GSUdeepCopy( w.curve ),
		};
		const waves = { [ GSUgetNewId( this.#data.waves ) ]: wNew };

		if ( elWaves.length > 1 ) {
			const wOrder = this.#getWaveOrder( wId );

			if ( wOrder < elWaves.length - 1 ) {
				wNew.index = GSUavg( w.index, elWaves[ wOrder + 1 ].dataset.index );
			} else {
				waves[ wId ] = { index: GSUavg( elWaves[ wOrder - 1 ].dataset.index, w.index ) };
			}
		}
		return { waves };
	}
	#createRemoveObj( wId ) {
		const elWaves = this.#elWavesSorted;
		const order = this.#getWaveOrder( wId );
		const waves = { [ wId ]: undefined };

		if ( order === 0 ) {
			waves[ elWaves[ 1 ].dataset.id ] = { index: 0 };
		} else if ( order === elWaves.length - 1 && elWaves.length > 2 ) {
			waves[ elWaves.at( -2 ).dataset.id ] = { index: 1 };
		}
		return { waves };
	}

	// .........................................................................
	#addWave( wId, w ) {
		const elW = GSUgetTemplate( "gsui-wave-edit-wavestep", wId, w.index );

		this.$elements.$waves.append( elW );
		this.#updateSortWaves();
		elW.querySelector( "gsui-dotlinesvg" ).$setSVGSize( 100, 50 );
		elW.querySelector( "gsui-dotlinesvg" ).$setDataBox( "0 -1 1 1" );
	}
	#removeWave( wId ) {
		const w = this.#getWaveElement( wId );

		w?.remove();
		if ( wId === this.#waveSelected ) {
			const order = this.#getWaveOrder( wId );
			const wNew = this.#elWavesSorted[ order + 1 ] || this.#elWavesSorted[ order - 1 ];

			if ( wNew ) {
				this.#selectWave( wNew.dataset.id );
			}
		}
		this.#updateSortWaves();
	}
	#selectWave( wId ) {
		if ( this.#waveSelected !== wId ) {
			const elW = this.#getWaveElement( wId );
			const elWsel = this.#getWaveElement( this.#waveSelected );

			if ( elWsel ) {
				delete elWsel.dataset.selected;
			}
			this.#waveSelected = wId;
			this.$elements.$wtGraph.$selectCurrentWave( wId );
			this.$elements.$wtGraph.$draw();
			this.$elements.$dotline.$clear();
			this.$elements.$dotline.$change( this.#data.waves[ wId ].curve );
			elW.dataset.selected = "";
			GSUscrollIntoViewX( elW, this.$elements.$scroll );
		}
	}
}

GSUdefineElement( "gsui-wave-edit", gsuiWaveEdit );
