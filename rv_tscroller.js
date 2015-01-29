/*
Don't use directly. Compile on http://closure-compiler.appspot.com/home
*/
if (window.jQuery && window.RVTS)
(function($){
if (RVTS.start>0) {
	var $f = $('.navigationBar A[rel=first]');
	$('#thumbnails').before( '<div id=rvtsUp style="text-align:center;font-size:120%;margin:10px"><a href="'+$f.attr("href")+'">'+$f.html()+'</a> | <a href="javascript:RVTS.loadUp()">'+RVTS.prevMsg+"</a></div>" );
}

RVTS = $.fn.extend( RVTS, {
loading: 0,
loadingUp: 0,
adjust: 0,

loadUp: function() {
	if (RVTS.loadingUp || RVTS.start <= 0) return;
	var newStart = RVTS.start-RVTS.perPage,
		reqCount = RVTS.perPage;
	if (newStart<0)
	{
		reqCount += newStart;
		newStart = 0;
	}
	var url = RVTS.ajaxUrlModel.replace('%start%', newStart).replace('%per%', reqCount);
	$('#ajaxLoader').show();
	RVTS.loadingUp = 1;
	$.ajax({
		type:'GET', dataType:'html', 'url': url,
		success: function(htm) {
			RVTS.start = newStart;

			var event = jQuery.Event( "RVTS_add" );
			$(window).trigger(event, [htm, false]);

			if (!event.isDefaultPrevented())
				RVTS.$thumbs.prepend(htm);

			if (RVTS.start<=0)
				$("#rvtsUp").remove();
		},
		complete: function() {
			RVTS.loadingUp = 0;
			RVTS.loading || $('#ajaxLoader').hide();
			$(window).trigger('RVTS_loaded', 0);
			if (typeof pwg_ajax_thumbnails_loader != 'undefined')
				pwg_ajax_thumbnails_loader();
			}
		});
},

doAutoScroll: function() {
	if (RVTS.loading || RVTS.next >= RVTS.total) return;
	var url = RVTS.ajaxUrlModel.replace('%start%', RVTS.next).replace('%per%', RVTS.perPage);
	if (RVTS.adjust) {
		url += '&adj=' + RVTS.adjust;
		RVTS.adjust=0;
	}
	$('#ajaxLoader').show();
	RVTS.loading = 1;
	$.ajax({
		type:'GET', dataType:'html', 'url': url,
		success: function(htm) {
			RVTS.next+=RVTS.perPage;
			var event = jQuery.Event( "RVTS_add" );
			$(window).trigger(event, [htm, true]);

			if (!event.isDefaultPrevented())
				RVTS.$thumbs.append(htm);
			if (RVTS.next-RVTS.start>500 && RVTS.total-RVTS.next>50) {
				RVTS.$thumbs.after(
					'<div style="text-align:center;font-size:180%;margin:0 0 20px"><a href="'
					+RVTS.urlModel.replace('%start%', RVTS.next)+'">'
					+RVTS.moreMsg.replace('%d', RVTS.total-RVTS.next)
					+'</a></div>');
				RVTS.total = 0;
			}
		},
		complete: function() {
			RVTS.loading = 0;
			RVTS.loadingUp || $('#ajaxLoader').hide();
			$(window).trigger('RVTS_loaded', 1);
			if (typeof pwg_ajax_thumbnails_loader != 'undefined')
				pwg_ajax_thumbnails_loader();
			}
		});
},

checkAutoScroll: function(evt) {
	var tBot=RVTS.$thumbs.position().top+RVTS.$thumbs.outerHeight()
		,wBot=$(window).scrollTop()+$(window).height();
	tBot -= !evt ? 0:100; //begin 100 pixels before end
	return tBot <= wBot ? (RVTS.doAutoScroll(),1) : 0;
},

engage: function() {
	var $w = $(window);
	RVTS.$thumbs = $('#thumbnails');
	RVTS.$thumbs.after('<div id="ajaxLoader" style="display:none;position:fixed;bottom:32px;right:1%;z-index:999"><img src="'+ RVTS.ajaxLoaderImage + '" width="128" height="15" alt="~"></div>');

	if ("#top" == window.location.hash)
		window.scrollTo(0,0);

	if ( RVTS.$thumbs.outerHeight() < $w.height() )
		RVTS.adjust = 1;
	else if ( RVTS.$thumbs.height() > 2*$w.height() )
		RVTS.adjust = -1;
	$w.on('scroll resize', RVTS.checkAutoScroll);
	if (RVTS.checkAutoScroll())
		window.setTimeout(RVTS.checkAutoScroll,1500);
}
} );//end extend

$(document).ready( function() {
	if ("#top" == window.location.hash)
		window.scrollTo(0,0);
	window.setTimeout(RVTS.engage,150);
});

if (window.history.replaceState) {
	var iniStart = RVTS.start;
	$(window).one("RVTS_loaded", function() {
		$(window).on("unload", function() {
				var threshold = Math.max(0, $(window).scrollTop() - 60),
					elts = RVTS.$thumbs.children("li");
				for (var i=0; i<elts.length; i++) {
					var offset = $(elts[i]).offset();
					if (offset.top >= threshold) {
						var start = RVTS.start+i,
							delta = start-iniStart;
						if (delta<0 || delta>=RVTS.perPage) {
							var url = start ? RVTS.urlModel.replace("%start%", start) : RVTS.urlModel.replace("/start-%start%", "");
							window.history.replaceState(null, "", url+ "#top");
						}
						break;
					}
				}
		});
	});
}
})(jQuery);