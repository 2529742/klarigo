var templateEditor = {};

jQuery.extend(templateEditor,{
	create: function(){
		var dialogEl = $('<div id="template_editor">')
		.dialog({title:'Template editor', width: '1000px'});
	},
	
	open: function(){
		if(jQuery('#template_editor').length == 0){
			this.create();
		};
		var dialogEl = $('#template_editor');
		dialogEl.empty();
		this.render(dialogEl);
		dialogEl.dialog('open');
	},
	
	render: function(dialogEl){
		var self = this;
		var kbDiv = self.render_kb();
		var canvasDiv = self.render_canvas();
		dialogEl
		.append(kbDiv)
		.append(canvasDiv);
	},
	
	render_kb: function(){
		var kbDiv = $('<div class="explanation-template-editor-kb">');
		explanationEditor.render(kbDiv);
		return kbDiv;
	},
	
	render_canvas: function(){
		var canvasDiv = $('<div class="explanation-template-editor-canvas">');
		return canvasDiv;
	}
});