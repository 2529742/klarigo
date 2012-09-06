var templateEditor = {};

jQuery.extend(templateEditor,{
	create: function(){
		var dialogEl = $('<div id="template_editor">')
		.dialog({title:'Template Editor', width: '1000px'});
	},
	
	open: function(){
		if(jQuery('#template_editor').length == 0){
			this.create();
		}
		var dialogEl = $('#template_editor');
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