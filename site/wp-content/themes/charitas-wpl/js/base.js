jQuery(document).ready(function($){
	"use strict";

	/* Mobile Menu */
	jQuery(document).ready(function () {
		jQuery('header nav.site-navigation').meanmenu();
	});

	/* Menu */
	// Following http://stackoverflow.com/questions/11512032/detect-if-dropdown-navigation-would-go-off-screen-and-reposition-it
	$( 'header nav.site-navigation li.menu-item-has-children' ).on('mouseenter mouseleave', function (e) {
		if (jQuery('ul.sub-menu', this).length) {
			var elm = jQuery('li:first', this);
			var off = elm.offset();
			var l = off.left;
			var w = elm.width();
			var docW = jQuery(window).width();

			var isEntirelyVisible = (l + w <= docW);

			if (!isEntirelyVisible) {
				$('ul.sub-menu', this).addClass('off-screen');
			} else {
				$('ul.sub-menu', this).removeClass('off-screen');
			}
		}
	});

	/* FitVids */
	jQuery(document).ready(function(){
		// Target your .container, .wrapper, .post, etc.
		jQuery(".WPlookLatestNews .image, iframe").fitVids();
	});


	jQuery('body').stellar({
		responsive: true,
		horizontalScrolling: false,
		verticalScrolling: true,
		parallaxBackgrounds: true,
		parallaxElements: true,
		hideDistantElements: true
	});

	/* Masonry */
	jQuery(window).load(function() {
		var jQuerycontainer = jQuery('.js-masonry');
		jQuerycontainer.imagesLoaded(function(){
			jQuerycontainer.masonry({
				itemSelector: '.candidate',
				columnWidth: 1,
				isAnimated: true,
				animationOptions: {
					duration: 750,
					easing: 'easeInOutCirc',
					queue: false
				}
			});

		});
	});

	/* Flex Slider Teaser */
	jQuery(window).load(function() {
		jQuery('.flexslider').flexslider({
			animation: "fade",
			animationLoop: true,
			pauseOnAction: true,
			pauseOnHover: true,
			controlNav: "thumbnails",
			start: function(slider) {
				jQuery( '.flexslider' ).removeClass('loading');
			}
		});
	});

	/* Featured News Slider */
	jQuery(window).ready(function() {
		jQuery('.flexslider-news').flexslider({
		controlNav: false,
		directionNav:true,
		animationLoop: true,
		animation: "fade",
		useCSS: true,
		smoothHeight: true,
		slideshow: false,
		slideshowSpeed:3000,		
		pauseOnAction: true,
		touch: true,
		animationSpeed: 900,
		start: function(slider) {
				jQuery( '.flexslider-news' ).removeClass('loading');
			}
		});
	});

	/* Gallery Posts Slider */
	jQuery(window).ready(function() {
		
		jQuery('#flexslider-gallery-carousel').flexslider({
			animation: "slide",
			controlNav: false,
			animationLoop: false,
			slideshow: true,
			itemWidth: 150,
			asNavFor: '.flexslider-gallery'
		});

		jQuery('.flexslider-gallery').flexslider({
			animation: "fade",
			controlNav: false,
			animationLoop: false,
			slideshow: false,
			sync: "#flexslider-gallery-carousel",
			start: function(slider) {
				jQuery( '.flexslider-gallery' ).removeClass('loading');
			}
		});

	});

	/* Toggle for Causes */
	jQuery(".donate_now").click(function () {
		jQuery(".paymend_detailes").toggle();
	});

	/* Toggle donate*/
	jQuery(".toggle-content-donation .expand-button").click(function() {
		jQuery(this).toggleClass('close').parent('div').find('.expand').slideToggle(250);
	});

	/* Toggle for Events */
	if( $( '.wplook-google-map' ).length > 0 ) {
		$( '.event-address' ).click(function () {
			$( '.event-map' ).toggle( function() {
				$( '.event-map .wplook-google-map' ).wplGoogleMaps();
			});
		}); 
	}

	/* Toggle for Share buttons */
	jQuery(".share-buttons").click(function () {
		jQuery(".share-items").toggle();
	});

	jQuery(".bookplace").click(function () {
		jQuery(".book-your-place").toggle('slow');
	});

	/* Stick the menu */   
	jQuery(function() {
		// grab the initial top offset of the navigation 
		var sticky_navigation_offset_top = jQuery('#sticky_navigation').offset().top+40;
		
		// our function that decides weather the navigation bar should have "fixed" css position or not.
		var sticky_navigation = function(){
			var scroll_top = jQuery(document).scrollTop(); // our current vertical position from the top
			
			// if we've scrolled more than the navigation, change its position to fixed to stick to top, otherwise change it back to relative
			if (scroll_top > sticky_navigation_offset_top) { 
				jQuery('#sticky_navigation').stop(true).animate({ 'padding':'5px 0;','min-height':'60px','opacity' : 0.99 }, 500);
				jQuery('#sticky_navigation').css({'position': 'fixed', 'top':0, 'left':0 });
			} else {
				jQuery('#sticky_navigation').stop(true).animate({ 'padding':'20px 0;','min-height':'60px', 'opacity' : 1}, 100);
				jQuery('#sticky_navigation').css({ 'position': 'relative' }); 
			}
		};
		
		sticky_navigation();

		jQuery(window).scroll(function() {
			sticky_navigation();
		});

	});


	/* Tabs */
	jQuery('.panes div').hide();
	jQuery(".tabs a:first").addClass("selected");
	jQuery(".tabs_table").each(function(){
			jQuery(this).find('.panes div:first').show();
			jQuery(this).find('a:first').addClass("selected");
	});
	jQuery('.tabs a').click(function(){
			var which = jQuery(this).attr("rel");
			jQuery(this).parents(".tabs_table").find(".selected").removeClass("selected");
			jQuery(this).addClass("selected");
			jQuery(this).parents(".tabs_table").find(".panes").find("div").hide();
			jQuery(this).parents(".tabs_table").find(".panes").find("#"+which).fadeIn(800);
	});

	/* Toggle */
	jQuery(".toggle-content .expand-button").click(function() {
		jQuery(this).toggleClass('close').parent('div').find('.expand').slideToggle(250);
	});

});

// Share buttons
function twwindows(object) {
	window.open( object, "twshare", "height=400,width=550,resizable=1,toolbar=0,menubar=0,status=0,location=0" ) 
}

function fbwindows(object) {
	window.open( object, "fbshare", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0" ) 
}

function pinwindows(object) {
	window.open( object, "pinshare", "height=270,width=630,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0" )
}
