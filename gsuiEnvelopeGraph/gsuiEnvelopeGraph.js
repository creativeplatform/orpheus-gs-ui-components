"use strict";

class gsuiEnvelopeGraph extends gsui0ne {
	$attack = .25;
	$hold = .25;
	$decay = .25;
	$sustain = .8;
	$release = 1;
	$duration = 4;

	constructor() {
		super( {
			$cmpName: "gsuiEnvelopeGraph",
			$tagName: "gsui-envelope-graph",
			$elements: {
				$svg: "svg",
				$mainLine: ".gsuiEnvelopeGraph-mainLine",
				$attLine: ".gsuiEnvelopeGraph-line",
				$relLine: ".gsuiEnvelopeGraph-line + .gsuiEnvelopeGraph-line",
			},
		} );
		Object.seal( this );
	}

	// .........................................................................
	$firstTimeConnected() {
		this.resized();
	}

	// .........................................................................
	resized() {
		GSUsetViewBoxWH( this.$elements.$svg, this.clientWidth, this.clientHeight );
		this.$draw();
	}
	$draw() {
		if ( this.firstChild ) {
			const pts = gsuiEnvelopeGraph.#getPoints(
				this.clientWidth, this.clientHeight, this.$duration,
				this.$attack, this.$hold, this.$decay, this.$sustain, this.$release );

			GSUsetAttribute( this.$elements.$attLine, "points", pts.slice( 0, 8 ).join( " " ) );
			GSUsetAttribute( this.$elements.$relLine, "points", pts.slice( -4 ).join( " " ) );
			GSUsetAttribute( this.$elements.$mainLine, "points", pts.join( " " ) );
		}
	}
	static #getPoints( w, h, dur, att, hold, dec, sus, rel ) {
		const dur2 = dur !== "auto" ? dur : att + hold + dec + 1 + rel;
		const bpp = w / dur2;
		const attX = bpp * att;
		const holX = attX + bpp * hold;
		const decX = holX + bpp * dec;
		const susX = decX + bpp * ( dur === "auto" ? 1 : dur - att - hold - dec - rel );
		const relX = susX + bpp * rel;
		const susY = h * ( 1 - sus );

		return [
			0,    h,
			attX, 2,
			holX, 2,
			decX, susY + 2,
			susX, susY + 2,
			relX, h,
		];
	}
}

GSUdefineElement( "gsui-envelope-graph", gsuiEnvelopeGraph );
