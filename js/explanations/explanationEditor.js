var explanationEditor = {};

jQuery.extend(explanationEditor,{
	create: function(){
		var dialogEl = undefined;
		if(jQuery('#explanation_editor').length > 0){
			dialogEl = $('#explanation_editor');
			dialogEl.dialog('open');
		}
		else{
			dialogEl = $('<div id="explanation_editor">')
			.dialog({title:'Knowledge Base', width: '500px'});
			this.render(dialogEl);
		}
		
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
			var id = kbAPI.staticKB.newRecord();
			var record = kbAPI.staticKB.getRecord(id);
			var record_div = self.render_record(record,{addControls: true});
			$('#staticKB').find('.item-body:first').append(record_div);
		});
		staticKB.find('.item-body:first').append(add_button);

		
		var records = kbAPI.getAll();
		
		
		for(var r in kbAPI.staticKB.getAll()){
			var record = records[r];
			var record_div = self.render_record(record,{addControls: true});
			var item_body = staticKB.find('.item-body:first');
			if(item_body){
				item_body.append(record_div);
			}
		}
		for(var r in kbAPI.interfaceKB.getAll()){
			var record = records[r];
			var record_div = self.render_record(record,{addControls: false});
			var item_body = interfaceKB.find('.item-body:first');
			if(item_body){
				item_body.append(record_div);
			}
		}
		for(var r in kbAPI.historyKB.getAll()){
			var record = records[r];
			var record_div = self.render_record(record);
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
	render_record: function(record, options){
			options = options? options: {};
			var record_div = $('<div class="explanation-record">');
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
									kbAPI.staticKB.removeRecord(record);
									record_div.remove();
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
			record_div.append(record_header);

			var card = $('<table class="item-body hidden">');
			var card_header = $('<tr></tr>')
			.append('<td>')
			.append($('<td class="explanation-record-header">').append(delete_btn));
			if(options.addControls){
				card.append(card_header);
			}
			var attrs = record.attributes;
			for(var a in attrs){
				var tr = jQuery('<tr class="explanation-record-attribute"></tr>');
				tr
				.append('<td>' + a.replace(/<|>/g,'') + '</td>')
				.append('<td><textarea>' + attrs[a] + '</textarea></td>')
				card.append(tr);
			};
			record_div.append(card);
			return record_div;
		}
});