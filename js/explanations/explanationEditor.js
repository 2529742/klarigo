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
		.append('<button>add record</button>')
		staticKB.find('.item-body:first').append(add_button);

		
		var records = kbVIE.entities.models;
		var render_record = function(record){
			var card = $('<table class="item-body hidden">');
			var attrs = record.attributes;
			for(var a in attrs){
				var tr = jQuery('<tr class="explanation-record-attribute"></tr>');
				tr
				.append('<td>' + a.replace(/<|>/g,'') + '</td>')
				.append('<td><textarea>' + attrs[a] + '</textarea></td>')
				card.append(tr);
			};
			return card;
		};
		
		for(var i = 0; i< records.length; i++){
			var record = records[i];
			var card = render_record(record);
			var record_id = record.id? ('Record - ' + record.id.replace(/<|>/g,'')): 'Record';
			var record_div = $('<div class="explanation-record">');
			var record_header = $('<h5 class="item-header collapsed"><a href="#1">' + record_id + '</a></h5>');
			record_div.append(record_header);
			record_div.append(card);
			
			if(record.get('@type') =='<http://ontology.vie.js/explanation/static>'){
				var item_body = staticKB.find('.item-body:first');
				if(item_body){
					item_body.append(record_div);
				}
			}
			else if(record.get('@type') =='<http://ontology.vie.js/explanation/interface>'){
				var item_body = interfaceKB.find('.item-body:first');
				if(item_body){
					item_body.append(record_div);
				}
			}
			else if(record.get('@type') =='<http://ontology.vie.js/explanation/history>'){
				var item_body = historyKB.find('.item-body:first');
				if(item_body){
					item_body.append(record_div);
				}
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
	}
	
});