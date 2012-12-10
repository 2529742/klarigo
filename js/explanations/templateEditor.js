var templateEditor = {};

jQuery.extend(templateEditor,{
	create: function(){
		var dialogEl = $('<div id="template_editor">')
		.dialog({
			title:'Template editor', 
			width: '1000px',
			position: {my: 'left bottom',at: 'left'} 			
		});
		this.render_main(dialogEl);
	},
	
	open: function(){
		if(jQuery('#template_editor').length == 0){
			this.create();
		};
		var dialogEl = $('#template_editor');
		dialogEl.dialog('open');
	},
	
	render_main: function(dialogEl){
		var self = this;
		dialogEl.empty();
		//***** Add new template *****
		var template_types = {
			'what': {label: 'What..?'},
			'how': {label: 'How..?'},
			'why': {label:'Why..?'},
			'custom': {label:'Custom explanation:'}
		};
		var add_new = $('<ul>Add new template of type:</ul>');
		for(var type in template_types){
			var entry = $('<li>'+template_types[type].label+'</li>');
			if(type == 'custom'){
				entry.append($('<input style="float:right;">'));
			};
			var add_btn = $('<div class="ui-icon ui-icon-circle-plus" style="cursor:pointer;">');
			entry.append(add_btn);
			add_btn.click(function(){
				var templateObject = kbAPI.templates.newRecord();
				self.render_editor(dialogEl,templateObject);
			})
			entry.appendTo(add_new);
		};
		
		dialogEl.append(add_new);
		
		//***** Open existing templates *****
		var templates_list = $('<ul>Open template:</ul>');
		var templates = kbAPI.templates.getAll();
		$(templates).each(function(){
			var name = this.get('id');
			var t = $('<li style="cursor:pointer;">' + name + '</li>');
			t.click(function(){
				var id = '<'+$(this).text()+'>';
				var attributes = kbAPI.templates.schema.attributes;
				var template = kbAPI.templates.getRecord(id);
				var templateObject = {};
				for(var a in attributes){
					var attr = attributes[a];
					templateObject[attr] = template.get(attr);
				};
				self.render_editor(dialogEl,templateObject);
			});
			templates_list.append(t);
		});
		dialogEl.append(templates_list);
	},
	
	render_editor: function(dialogEl, templateObject){
		var self = this;
		dialogEl.empty();
		var kbDiv = self.render_kb();
		var canvasDiv = self.render_canvas(templateObject);
		
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
	
	render_canvas: function(templateObject){
		var self = this;
		var canvasDiv = $('<div class="explanation-template-editor-canvas">')
		.css({float:'left'})
		.append('<h4>Template</h4>');
		var label = $('<input class="explanation-template-label">')
		
		var canvasField = $('<div class="explanation-template-editor-canvas-field">');
		for(var i=1; i<31; i++){
			var line = $('<div class="explanation-template-editor-canvas-field-line">')
			.droppable({
				drop: function(event, ui){
					var entry = ui.draggable.clone()
					.removeClass()
					.css({
						left: '',
						top: '',
						'float': 'left'
					});
					var item = self.render_field_item(this,entry);
				}
			});
			var textInput = $('<input class="explanation-template-editor-canvas-field-line-input">')
			.css({
				height: '14px',
				border: 'none',
				'font-size': '12px'
			});
			
			line.append(textInput);
			canvasField.append(line);
		};
		
		var save_btn = $('<button>Save</button>')
		.click(function(){
			self.save_template();
		});		
		
		//Fill the field this template's context
		label.val(templateObject.label);
		canvasDiv
		.append(label)
		.append(save_btn);
		
		var context  = templateObject.context;
		for(var i = 0; i < context.length; i++){
			var context_entry = context[i];
			var line = canvasField.children()[i];
			for(var j in context_entry){
				var val = context_entry[j].value;
				var entry = (context_entry[j].type == "reference")? $('<h5>'+val+'</h5>'):$('<input class="explanation-template-editor-canvas-field-line-input" value="'+val+'">');
				entry.css({
					height: '14px',
					border: 'none',
					'font-size': '12px',
					'float': 'left'
				});
				self.render_field_item(line,entry); 			
			}

		};
		canvasField.appendTo(canvasDiv);
		
		return canvasDiv;
	},
	
	render_field_item: function(line,entry){
		var item = $('<div class="explanation-template-editor-canvas-field-line-item">');
		item
		.css({'float':'left'})
		.append(entry);
		var removeBtn = $('<div class="ui-icon ui-icon-circle-close" style="cursor:pointer;">');
		removeBtn.click(function(){
			item.remove();
		});
		item.append(removeBtn);
		
		var input = $(line).children().last();
		input.css({
			'width': 'auto'
		});
		
		//TODO: check if the input contains a text, then need to insert one blank input as last child
		item.insertBefore($(line).children().last());
	},
	
	render_controls: function(){
		var self = this;
		var controls_div = $('<div class="explanation-template-editor-canvas-controls">');
		
		var new_btn = $('<button>New</button>')
		.click(function(){
			self.new_template();
		})
		.appendTo(controls_div);
		
		var open_btn = $('<button>Open</button>')
		.click(function(){
			self.open_template();
		})
		.appendTo(controls_div);
		
		var save_btn = $('<button>Save</button>')
		.click(function(){
			var template_object = self.save_template();
		})
		.appendTo(controls_div);
		
		return controls_div;
	},
	
	save_template: function(){
		var label = $('.explanation-template-label').val();
		var template_object = {
				id: label.replace(/ /g,'_').replace('?',''),
				label: label
		};
		var context = [];
		var canvasField = $('.explanation-template-editor-canvas-field');
		canvasField.children().each(function(){
			var node = $(this);
			var type = node.is('input')? 'manual': 'reference';
			var value = node.text();
			if(value.length > 0){
				context.push({value: value, type: type});
			}
		});
		template_object.context = context;
		kbAPI.templates.addRecord(template_object);
		return template_object;
	}
	
	
});
