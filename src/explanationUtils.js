function accordion(element){
	element.click(function(){
		if($(this).hasClass('collapsed')){
			$(this).addClass('expanded');
			$(this).removeClass('collapsed');
			var data = $(this).parent().find('.item-body:first');
			if(data){
				data
				.removeClass('hidden')
				.addClass('show');
			}
		}
		else{
			$(this).removeClass('expanded');
			$(this).addClass('collapsed');
			var data = $(this).parent().find('.item-body:first');
			if(data){
				data
				.addClass('hidden')
				.removeClass('show');
			}
		}
	});		
};