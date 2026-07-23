/**
 * Homepage hero FlexSlider init — runs independently of theme base.js
 * so Stellar/MeanMenu failures never leave the spinner stuck.
 */
(function ($) {
	"use strict";

	function revealHero($el) {
		$el.removeClass("loading");
		$el.find(".slides > li").css("display", "none");
		$el.find(".slides > li").first().css("display", "block").addClass("flex-active-slide");
	}

	function initHero() {
		var $sliders = $(".flexslider").not(".flexslider-news, .flexslider-gallery");
		if (!$sliders.length) {
			return;
		}

		$sliders.each(function () {
			var $el = $(this);
			if ($el.data("flexslider")) {
				$el.removeClass("loading");
				return;
			}
			if (typeof $.fn.flexslider !== "function") {
				revealHero($el);
				return;
			}
			try {
				$el.flexslider({
					animation: "fade",
					animationLoop: true,
					pauseOnAction: true,
					pauseOnHover: true,
					controlNav: "thumbnails",
					slideshow: true,
					start: function () {
						$el.removeClass("loading");
					},
				});
			} catch (err) {
				revealHero($el);
			}
		});

		// If start never fires, stop showing the spinner and force first slide.
		setTimeout(function () {
			$(".flexslider.loading").each(function () {
				revealHero($(this));
			});
			$(".flexslider").each(function () {
				var $el = $(this);
				if (!$el.find(".flex-active-slide").length) {
					revealHero($el);
				}
			});
		}, 1500);
	}

	function whenFlexsliderReady(cb) {
		var tries = 0;
		(function poll() {
			if (typeof $.fn.flexslider === "function" || tries > 60) {
				cb();
				return;
			}
			tries += 1;
			setTimeout(poll, 50);
		})();
	}

	$(function () {
		whenFlexsliderReady(initHero);
	});

	$(window).on("load", function () {
		whenFlexsliderReady(initHero);
	});
})(jQuery);
