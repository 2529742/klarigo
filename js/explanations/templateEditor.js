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
				var template = kbVIE.templates.newRecord(subject,type);
				self.new_template(template);
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
				self.open_template(name);
			});
			templates_list.append(t);
		});
		dialogEl.append(templates_list);
	},
	
	render_editor: function(dialogEl){
		var self = this;
		dialogEl.empty();
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
		var canvasDiv = $('<div class="explanation-template-editor-canvas">')
		.css({float:'left'});
		canvasDiv.append('<h4>Template</h4>');
		var label = $('<input class="explanation-template-label">')
		canvasDiv.append(label);
		var canvasField = $('<div class="explanation-template-editor-canvas-field">');
		for(var i=1; i<31; i++){
			var line = $('<div class="explanation-template-editor-canvas-field-line">')
			.droppable({
				drop: function(event, ui){
					var item = $('<div class="explanation-template-editor-canvas-field-line-item">');
					var entry = ui.draggable.clone()
					.removeClass()
					.css({
						left: '',
						top: '',
						'float': 'left'
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
					item.append(entry);
					var removeBtn = $('<div class="ui-icon ui-icon-circle-close" style="cursor:pointer;">');
					removeBtn.click(function(){
						entry.remove();
						$(this).remove();
					});
					item.append(removeBtn);
					$(this).append(item);					
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
				id: '<http://ontology.vie.js/explanation/template/'+label.replace(/ /g,'_')+'>',
				label: label
		};
		var context = [];
		var canvasField = $('.explanation-template-editor-canvas-field');
		canvasField.children().each(function(){
			var node = $(this);
			var value = node.text();
			if(value.length > 0){
				context.push(node.text());
			}
		});
		template_object.context = context;
		kbAPI.templates.addRecord(template_object);
		return template_object;
	},
	
	open_template: function(){
	},
	
	new_template: function(){
	
	}
	
});
