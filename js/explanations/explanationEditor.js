var explanationEditor = {};

jQuery.extend(explanationEditor,{
	create: function(){
		var dialogEl = undefined;
		if(jQuery('#explanation_editor').length > 0){
			dialogEl = $('#explanation_editor');
		}
		else{
			dialogEl = $('<div id="explanation_editor">')
			.dialog({title:'Knowledge Base', width: '500px'});
		}
		dialogEl.dialog('open');		
	},
	
	open: function(){
		dialogEl = $('#explanation_editor');
		this.render(dialogEl);
		dialogEl.dialog('open');
	},
	
	render: function(dialogEl){
		var self = this;
		var list =  $('<ul>');
		var staticKB = $('<li id="staticKB"></li>')
		.append('<h5 class="item-header collapsed"><a href="#1">Static descriptive knowledge</a></h5>')
		.append('<div class="item-body hidden">');
		var interfaceKB = $('<li id="interfaceKB"></li>')
		.append('<h5 class="item-header collapsed"><a href="#1">Interface elements</a></h5>')
		.append('<div class="item-body hidden">');
		var historyKB = $('<li id="historyKB"></li>')
		.append('<h5 class="item-header collapsed"><a href="#1">Interaction history</a></h5>')
		.append('<div class="item-body hidden">');

		var add_button = $('<div class="explanation-editor-add">')
		.append('<button>add record</button>');
		add_button.click(function(){
			var add_dialog = $('<div>Please set the element type:<input id="record-type"></div>')
						.dialog({
							buttons:[
								{
									text: "OK",
									click: function(){
											var record = kbAPI.staticKB.newRecord($(this).find('input')[0].value);
											var record_div = self.render_record(record,kbAPI.staticKB,{addControls: true}).el;
											$('#staticKB').find('.item-body:first').append(record_div);
											$(this).dialog('close');	
									}
								},
								{
									text: "Cancel",
									click: function(){
										$(this).dialog('close');
									}
								}
							],
							title: "New record"
						});
			
		});
		staticKB.find('.item-body:first').append(add_button);

		var records = kbAPI.staticKB.getAll();
		for(var r in records){
			var record = records[r];
			var record_div = self.render_record(record,kbAPI.staticKB,{addControls: true}).el;
			var item_body = staticKB.find('.item-body:first');
			if(item_body){
				item_body.append(record_div);
			}
		}
		records = kbAPI.interfaceKB.getAll();
		for(var r in records){
			var record = records[r];
			var record_div = self.render_record(record,kbAPI.interfaceKB,{addControls: false}).el;
			var item_body = interfaceKB.find('.item-body:first');
			if(item_body){
				item_body.append(record_div);
			}
		}
		records = kbAPI.historyKB.getAll();
		for(var r in records){
			var record = records[r];
			var record_div = self.render_record(record,kbAPI.historyKB,{addControls: false}).el;
			var item_body = staticKB.find('.item-body:first');
			if(item_body){
				item_body.append(record_div);
			}
		}
		
		$('.item-header').livequery('click',function(){
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
		
		list
		.append(staticKB)
		.append(interfaceKB)
		.append(historyKB)
		.appendTo(dialogEl);
	},
	render_record: function(record, KB, options){
			options = options? options: {};
			var recordView = Backbone.View.extend({
				className: "explanation-record",
				initialize: function(){
					this.render();
				},
				render: function(){
					var view = this;
					var $el = $(this.el);
					var record_id = record.id? ('Record - ' + record.id.replace(/<|>/g,'')): 'Record';
					var record_header = $('<h5 class="item-header collapsed"><a href="#1">' + record_id + '</a></h5>');
					var delete_btn = $('<div class="explanation-record-delete ui-icon ui-icon-trash">del</div>');
					delete_btn.click(function(){
						var confirm_dialog = $('<div>Attention!!!<br/> The record will be deleted!<br/> Do you want to proceed?</div>')
						.dialog({
							buttons:[
								{
									text: "OK",
									click: function(){
											KB.removeRecord(record);
											$el.remove();
											$(this).dialog('close');	
									}
								},
								{
									text: "Cancel",
									click: function(){
										$(this).dialog('close');
									}
								}
							],
							dialogClass: "alert",
							title: "Attention!"
						});
					});
					$el.append(record_header);
					var ok_btn = $('<button class="explanation-record-save ui-button">Save changes</Button>')
					.css({'float':'left', 'margin-right':'10px'});
					ok_btn.click(function(){
						var confirm_dialog = $('<div><br/>Save changes?</div>')
						.dialog({
							buttons:[
								{
									text: "OK",
									click: function(){
											var attr_divs = $el.find('.explanation-record-attribute');
											attr_divs.each(function(){
												var attr = $(this).find('.explanation-record-attribute-label').text();
												var value = $(this).find('.explanation-record-attribute-value textarea')[0].value;
												record.setOrAdd(attr,value);
											});
											KB.updateRecord(record);
											$(this).dialog('close');	
									}
								},
								{
									text: "Cancel",
									click: function(){
										$(this).dialog('close');
									}
								}
							],
							dialogClass: "confirm",
							title: "Confirm"
						});
					});
					var card = $('<table class="item-body hidden">');
					var card_header = $('<tr></tr>')
					.append('<td>')
					.append($('<td class="explanation-record-header">').append(ok_btn).append(delete_btn));
					if(options.addControls){
						card.append(card_header);
					}
					var attrs = record.attributes;
					for(var a in attrs){
						var tr = jQuery('<tr class="explanation-record-attribute"></tr>');
						tr
						.append('<td class="explanation-record-attribute-label">' + a.replace(/<|>/g,'') + '</td>')
						.append('<td class="explanation-record-attribute-value"><textarea>' + attrs[a] + '</textarea></td>')
						card.append(tr);
					};
					$el.append(card);
				}
			});
			return new recordView({model:record});
		}
});