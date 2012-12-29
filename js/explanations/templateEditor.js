var templateEditor = {};

jQuery.extend(templateEditor,{
	create: function(){
		var dialogEl = $('<div id="template_editor">')
		.dialog({
			title:'Template editor', 
			width: 'auto',
			position: {my: 'left bottom',at: 'left'},
			resizable: 'false'
		});
		this.render_main(dialogEl);
	},
	
	open: function(){
		if(jQuery('#template_editor').length == 0){
			this.create();
		};
		var dialogEl = $('#template_editor');
		this.render_main(dialogEl);
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
		var add_new = $('<ul class="ui-corner-all"></ul>')
		.css({
			padding: '10px 0px 10px 30px',
			'-webkit-box-shadow': 'rgba(0, 0, 0, 0.2) 0 2px 4px 0'
		});
		for(var type in template_types){
			var entry = $('<li  style="cursor:pointer;">');
			var label_div = $('<div class="ui-state-default ui-corner-all" style="width:190px; min-height: 20px; margin-bottom: 2px;">'+template_types[type].label+'</div>');
			entry.append(label_div);
			var add_btn = $('<div class="ui-icon ui-icon-plus">')
			.css({
				position: 'relative',
				left: '170px',
				'margin-top': '-20px'
			});
			label_div.append(add_btn);
			entry.click(function(){
				var templateObject = kbAPI.templates.newRecord();
				self.render_editor(dialogEl,templateObject);
			})
			entry.appendTo(add_new);
		};
		dialogEl.append('Add a new template of type:');
		dialogEl.append(add_new);
		
		//***** Open existing templates *****
		var templates_list = $('<ul class="ui-corner-all"></ul>')
		.css({
			padding: '10px 0px 10px 30px',
			'-webkit-box-shadow': 'rgba(0, 0, 0, 0.2) 0 2px 4px 0'
		});
		var templates = kbAPI.templates.getAll();
		$(templates).each(function(){
			var name = this.get('id');
			var t = $('<li style="cursor:pointer;text-decoration: underline;color: darkblue;">' + name + '</li>');
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
		
		dialogEl.append('Open a template:');
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
		
		var annotationsKB = $('<li id="explanation-template-editor-annotationsKB"></li>');
		var aKBh = $('<h5 class="item-header collapsed"><a href="#1">Annotations</a></h5>');
		accordion(aKBh);
		annotationsKB
		.append(aKBh)
		.append('<div class="item-body hidden">');
		
		attr = ["metadata_about","metadata_type"];
		item_body = annotationsKB.find(' .item-body:first');
		self.render_nodes(attr, item_body);
		
		list
		.append(staticKB)
		.append(interfaceKB)
		.append(historyKB)
		.append(annotationsKB)
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
		var label = $('<input class="explanation-template-editor-canvas-label">')
		
		var canvasField = $('<div class="explanation-template-editor-canvas-field">');
		for(var i=1; i<25; i++){
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
			var textInput = $('<input class="explanation-template-editor-canvas-field-line-input">');
			
			line.append(textInput);
			canvasField.append(line);
		};
		
		var save_btn = $('<button class="explanation-template-editor-canvas-save">Save</button>')
		.click(function(){
			self.save_template();
		});		
		
		//Fill the field this template's context
		label.val(templateObject.label);
		canvasDiv
		.append(label)
		.append(save_btn);
		
		var context  = templateObject.context;
		if(context[0]){
			context = ($.isArray(context[0]))? context: [context];
		}
		for(var i = 0; i < context.length; i++){
			var context_entry = context[i];
			var line = canvasField.children()[i];
			for(var j in context_entry){
				var val = context_entry[j].value;
				var width = (context_entry[j].type == "reference")? 'auto': val.length*7 + 'px';
				var entry = (context_entry[j].type == "reference")? $('<h5>'+val+'</h5>'):$('<input class="explanation-template-editor-canvas-field-line-input" value="'+val+'">');
				entry.css({
					height: '14px',
					border: 'none',
					'font-size': '12px',
					'float': 'left',
					width: width
				});
				self.render_field_item(line,entry); 			
			}

		};
		canvasField.appendTo(canvasDiv);
		
		return canvasDiv;
	},
	
	render_field_item: function(line,entry){
		var item = $('<div class="explanation-template-editor-canvas-field-line-item">');
		item.append(entry);
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
		if(input.val()){
			if(input.val().length>0){
				input.remove();
				$(line).append($('<input class="explanation-template-editor-canvas-field-line-input">'));
				this.render_field_item(line,input);
				item.insertBefore($(line).children().last());
			}
		}
		else{
			item.insertBefore($(line).children().last());
		}
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
			var line = $(this);
			var context_line = [];
			line.children().each(function(){
				var item = $(this);
				var node = item.hasClass('explanation-template-editor-canvas-field-line-input')? item[0]:item.children().first();
				var type = $(node).is('input')? 'manual': 'reference';
				var value = $(node).is('input')? $(node).val(): $(node).text();
				if(value.length > 0){
					context_line.push({value: value, type: type});
				}
			});	
			if(context_line.length > 0){
				context.push(context_line);
			}
		});
		template_object.context = context;
		if(kbAPI.templates.getRecord(template_object.id)){
			kbAPI.templates.updateRecord(template_object);
		}
		else{
			kbAPI.templates.addRecord(template_object);
		}
		return template_object;
	}
	
	
});
