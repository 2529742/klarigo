var templateEditor = {};

jQuery.extend(templateEditor,{
	create: function(){
		var dialogEl = undefined;
		if(jQuery('#template_editor').length > 0){
			dialogEl = $('#template_editor');
		}
		else{
			dialogEl = $('<div id="template_editor">')
			.dialog({title:'Template Editor', width: '1000px'});
		}
		dialogEl.dialog('open');		
	},
	
	open: function(){
		dialogEl = $('#template_editor');
		this.render(dialogEl);
		dialogEl.dialog('open');
	},
	
	render: function(dialogEl){
		var self = this;
		var list =  $('<ul>');
		
		list
		.appendTo(dialogEl);
	}
});