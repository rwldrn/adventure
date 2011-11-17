(function( window, $, _, Popcorn ) {

	// Adventure
	//	 [ jQuery, Popcorn, Underscore ]
	var Adventure = {
			// Initialize empty properties

			// Popcorn instance (set within Adventure.init())
			pop: null,

			// Track event data (set upon successful request)
			tracks: null,

			// Outcome keys and callbacks
			scenarios: null,

			// Program Initializer
			// Delegates all setup tasks.
			// Upon completion, should have created full game
	init: function( options ) {

		// Shorthand pointer back to Adventure object.
		var self = Adventure;

	    	// Initialize a popcorn instance by passing the
  			// specified media element's ID to Popcorn()
  			self.pop = Popcorn( options.mediaId );

  			// Localize the options.scenarios data property
  			self.scenarios = options.scenarios;

		// Create two promises to auto-run in parallel
		// e.g. listen() and getJSON() 
		var loadQueue = [
									// Load the video will resolve when video is playable
									$.Deferred( function(dfd){
										// Listen for the custom "canplayall" event hook
										// to be triggered. Similar to "canplaythrough",
										// the "canplayall" event fires when the video fires
										// "canplaythrough" for the _first_ _time_ _only_
										self.pop.listen( "canplayall", function() {
											dfd.resolve( self.pop );
										});

									}).promise(),
									
									// when events have been loaded in from the specified file
									$.Deferred( function(dfd){
										// Make a request for the track event data in the
										// specified file stored on the server
										$.getJSON( options.events, function( data ) {
											dfd.resolve( data );
										});
				
									}).promise()
								];

		// When both deferred objects have been resolved,
		// proceed to setting up the video's track events,
		// and cues
		$.when.apply( null, loadQueue )
		 .done( function( media, events ) {
				console.log( "Continue to movie setup", media, events );

				// Map an object of data properties to setup tasks
				// Create new setup completion deferreds for each
				var datas = {
							cues		: options.cues || { },
							tracks	: events			 || [ ],
							handlers: options.handlers
						},
						actions = [ ];

				// Iterate setup tasks and call each with correlated data
				_.forEach( self.setup, function( fn, key ) {

					actions.push( $.Deferred( function(dfd){
														// Call setup function
														// Set context to Popcorn instance
														// Pass correlated data as argument
														fn.call( media, datas[ key ], dfd, self );
					
														// If the expected setup data is actually empty,
														// we can premptively resolve the setup completion deferred
														if ( _.size( datas[ key ] ) === 0 ) {
															dfd.resolve();
														}
													}).promise() );
				});

				// When eventHandlers have been configured (`actions`), then 
				// Setup is complete, can run tests or play game
				$.when.apply( null, actions )
				 .done( function() {
						// Setup is complete
						console.log( "Ready for assertion tests" );

						self.pop.play();
						actions = [ ];
				});
		});
		
	},
			// Contains each of the program setup functions
			setup: {

					// Convert an array events into Popcorn Track Events
					tracks: function( events, deferred, self ) {
							// |this| context set to the Popcorn instance

							var length = _.size( events );

							// Iterate each event object, convert to Popcorn track event
							_.forEach( events, function( data, idx ) {

									// |this| context set to the Popcorn instance

									/*
									`data` object examples structure/shape

									{
											subtitle: {
													start: 6,
													end: 7,
													text: "Prompt with choices"
											}
									}
									*/
									var
									// Track event plugin
									plugin = _.keys( data )[ 0 ],

									// Track event options object
									options = _.values( data )[ 0 ];

									/*
									Register a new track event

									(Same as)
									popcorn.subtitle({
											start: 6,
											end: 7,
											text: "Prompt with choices"
									});
									*/
									this[ plugin ]( options );

									// If this is the last item in the set of track events
									if ( (idx + 1) === length ) {
											deferred.resolve();
									}
							// Pass popcorn instance as context
							}, this );
					},
					// Convert an object of time => function cues into Popcorn Cues
					cues: function( data, deferred, self ) {
							// |this| context set to the Popcorn instance

							var length = _.size( data ),
											idx = 0;

							_.forEach( data, function( fn, time ) {

									/*
									Register a new cue

									(Same as)
									popcorn.cue( 6, function() {

											// do stuff!

									});
									*/
									this.cue( +time, fn );

									// If this is the last item in the set of track events
									if ( (idx + 1) === length ) {
											deferred.resolve();
									}

									idx++;
							// Pass popcorn instance as context
							}, this);
					},

					// Miscellanous UI Event Handlers
					handlers: function( handlers, deferred, self ) {
							// |this| context set to the Popcorn instance

							var length = _.size( handlers ),
											idx = 0;

							_.forEach( handlers, function( delegate, selector ) {

									var $scope = $( selector );

									_.forEach( delegate, function( callback, eventAndSelector ) {
											// TODO: Parse "natural language" event and selector key
											// For now: cheat.
											var parts = eventAndSelector.split(" on ");

											parts.push( self, callback );

											/*
											parts will look like
											[
													"click",
													"[data-choice]",
													{
															a: function () {
															b: function () {
													},
													function ( event ) {
															// Squash default behaviour
															event.preventDefault();

															// Reference the clicked element
															var $this = $(this);

															console.log( $this.data("choice"), event.data.scenarios );
													}
											]
											*/

											// Uses jQuery 1.7's "on" api that auto-detects
											// bind or delegate calls by arg list
											$scope.on.apply( $scope, parts );

									});

									// If this is the last item in the set of track events
									if ( (idx + 1) === length ) {
											deferred.resolve();
									}

									idx++;
							// Pass popcorn instance as context
							}, this);
					}
			}
	};

	// Expose global Adventure function, when called will
	// return a new Adventure object instance
	window.Adventure = Adventure.init;

})( this, this.jQuery, this._, this.Popcorn );


$(function() {

	// When the DOM is ready, initialize the adventure.
	// Accepts video element id and adventure instructions
	Adventure({

			// ID Selector for media element
			mediaId: "#adventure-media",

			// Track Event source
			events: "adventure.json",

			// Custom program cues of time/cueHandlers
			// NOTE: |this| refers to the Popcorn instance object 
			cues: {
					0: function() {
								$(this.media).animate({
										opacity: 1
								}, "med");
						},

					6: function() {
								this.pause();
						},

					12: function() {
									this.play( 0.25 );
							},

					22: function() {
									$(this.media).animate({
											opacity: 0
									}, "med");
							}
			},

			scenarios: {
					a: function() {
									// jump to light-saber battle scene
									this.play( 13 );
							},
					
					b: function() {
									// continue to play from prompt point
									this.play();
							}
			},

			handlers: {
					"#adventure-world": {
							"click on [data-choice]": function( event ) {
									// Squash default behaviour
									event.preventDefault();

									event.data.scenarios[ $(this).data("choice") ].call( event.data.pop );
							}
					}
			}
	});
});