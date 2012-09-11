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
		var kbSchema = $('<div class="explanation-template-editor-kb-schema">');
		kbDiv
		.append('<h4>KB Schema</h4>')
		.append(kbSchema);
		var self = this;
		var list =  $('<ul>');
		
		var staticKB = $('<li id="explanation-template-editor-staticKB"></li>');
		var sKBh = $('<h5 class="item-header collapsed"><a href="#1">Static descriptive knowledge</a></h5>');
		accordion(sKBh);
		staticKB
		.append(sKBh)
		.append('<div class="item-body hidden">');
		
		var attr = kbAPI.staticKB.schema.attributes;
		var item_body = staticKB.find(' .item-body:first');
		self.render_nodes(attr, item_body);
		
		var interfaceKB = $('<li id="explanation-template-editor-interfaceKB"></li>');
		var iKBh = $('<h5 class="item-header collapsed"><a href="#1">Interface elements</a></h5>');
		accordion(iKBh);
		interfaceKB
		.append(iKBh)
		.append('<div class="item-body hidden">');

		attr = kbAPI.interfaceKB.schema.attributes;
		item_body = interfaceKB.find(' .item-body:first');
		self.render_nodes(attr, item_body);
		
		var historyKB = $('<li id="explanation-template-editor-historyKB"></li>');
		var hKBh = $('<h5 class="item-header collapsed"><a href="#1">Interaction history</a></h5>');
		accordion(hKBh);
		historyKB
		.append(hKBh)
		.append('<div class="item-body hidden">');
		
		attr = kbAPI.historyKB.schema.attributes;
		item_body = historyKB.find(' .item-body:first');
		self.render_nodes(attr, item_body);
		
		list
		.append(staticKB)
		.append(interfaceKB)
		.append(historyKB)
		.appendTo(kbSchema);

		return kbDiv;
	},
	
	render_nodes: function(attr,body){
		for(var a in attr){
			var node = $('<div class="explanation-template-editor-KB-node">')
			.append('<h5>' + attr[a] + '</h5>')
			.draggable({
				stop: function(){
						$(this).css({
							left: '',
							top: ''
						});
					}
			});
			body.append(node);
		};
	},
	
	render_canvas: function(){
		var canvasDiv = $('<div class="explanation-template-editor-canvas">');
		canvasDiv.append('<h4>Template</h4>');
		var canvasField = $('<div class="explanation-template-editor-canvas-field">');
		for(var i=1; i<30; i++){
			var line = $('<span class="explanation-template-editor-canvas-field-line">')
			.droppable({
				drop: function(event, ui){
					var entry = ui.draggable.clone()
					.removeClass()
					.css({
						left: '',
						top: ''
					});
					var input = $(this).find('input');
					if(input.val().length>0){
						input.css({
							'float': 'left',
							'width': 'auto'
						}); 
					}
					else{
						$(this).empty();
					}
					$(this).append(entry);					
				}
			});
			var textInput = $('<input>')
			.css({
				height: '14px',
				width: '100%',
				border: 'none',
				'font-size': '12px'
			});
			line.append(textInput);
			canvasField.append(line);
		}
		canvasField
		.appendTo(canvasDiv);
		
		return canvasDiv;
	},
	
	save_template: function(){
		var template_object = {};
		var canvasField = $('.explanation-template-editor-canvas-field');
		
		return template_object;
	},
	
	open_template: function(){
	},
	
	new_template: function(){
	
	}
	
});
