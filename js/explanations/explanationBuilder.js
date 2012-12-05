var explanationBuilder = {};

jQuery.extend(explanationBuilder,{
	build: function(question,element){
		var elementID = $(element).attr('id');
		var interfaceRecord = kbAPI.getRecord(elementID);
		var elementType = kbAPI.interfaceKB.getElementType(elementID);
		var staticRecord = kbAPI.getRecord(elementType);
		var history = kbAPI.historyKB.getHistory(elementID);
		
		var attributes = {
			label: question,
			id: elementID
		};
		var schemaAttr = kbAPI.staticKB.schema.attributes;
		for(var a in schemaAttr){
			if(schemaAttr[a] != '@type' && schemaAttr[a] != '@subject'){
				attributes[schemaAttr[a]] = staticRecord.get(schemaAttr[a]);
			}
		};
		schemaAttr = kbAPI.interfaceKB.schema.attributes;
		for(var a in schemaAttr){
			if(schemaAttr[a] != '@type' && schemaAttr[a] != '@subject'){
				attributes[schemaAttr[a]] = interfaceRecord.get(schemaAttr[a]);
			}
		};
		var explanationModel = new Backbone.Model(attributes);
		
		var view = undefined;
		if(question == 'what_is_it'){
			view = new witView({model: explanationModel});
		}
		else if(question == 'metadata'){
			view = new metadataView({model: explanationModel});
		}
		else if(question == 'how_to_start'){
			view = new htsView({model: explanationModel});
		}
		else if(question == 'possible_actions'){
			view = new actionsView({model: explanationModel});
		}
		$('.explanation_block').empty();
		
		if(view){
			$('.explanation_block').append(view.el)
		}
	},
	
	
	build_: function(question,element){
			var model = Backbone.Model.extend({
				type:'metadata',
				element: '',
				label: '',
				metadata: {
					about:'',
					type:''
				}
			});
			
			var label = questions_mappings[question].label;

			var elementID = $(element).attr('id');
			var elementType = kbAPI.interfaceKB.getElementType(elementID);
			var staticRecord = kbAPI.staticKB.getRecord(elementType);
			var wit = new model({
				element: element,
				label: label,
				id: elementID,
				type: elementType,
				title: staticRecord.get('title'),
				description: staticRecord.get("description"),
				purpose: staticRecord.get("purpose"),
				use: staticRecord.get("use")
			});
			
			var metadata = new model({
				element: element,
				label: label,
				id: elementID,
				metadata: {
					about: $(element).attr('about'),
					type: $(element).attr('typeof')
				}
			});
			
			var hts = new model({
				element: element,
				label: label,
				id: elementID,
				type: elementType,
				title: staticRecord.get('title'),
				description: staticRecord.get("description"),
				purpose: staticRecord.get("purpose"),
				use: staticRecord.get("use"),
				start: staticRecord.get("start")
			});
			
			var actions = new model({
				element: element,
				label: label,
				id: elementID,
				type: elementType,
				title: staticRecord.get('title'),
				events: kbAPI.interfaceKB.getEvents(elementID)
			});
			var view = undefined;
			if(question == 'what_is_it'){
				view = new witView({model: wit});
			}
			else if(question == 'metadata'){
				view = new metadataView({model: metadata});
			}
			else if(question == 'how_to_start'){
				view = new htsView({model: hts});
			}
			else if(question == 'possible_actions'){
				view = new actionsView({model: actions});
			}
			$('.explanation_block').empty();
			
			if(view){
				$('.explanation_block').append(view.el)
			}
	},
	
	render: function(question,model) {
		var explHTML = '';
		var explantionStructure = kbAPI.templates.getRecord('<'+question+'>');
		var element = $('#'+model.get('id'))[0];
		var label = explantionStructure.get('label');
		var context = explantionStructure.get('context');
		var contextHTML = '';
		for(var c in context){
			var line = context[c];
			var item = "";
			if($.isArray(line)){
				for(var i in line){
					item = model.get(line[i]);
					if(item){
						contextHTML = contextHTML + item;
					}
					else{
						contextHTML = contextHTML + line[i];
					}
				}
			}
			else{
				item = model.get(line[i]);
				if(item){
					contextHTML = contextHTML + item;
				}
				else{
					contextHTML = contextHTML + line[i];
				}
			};
			contextHTML = contextHTML + '<br/>';
		}
		
		explHTML = '<b>'+ element.innerHTML + '</b><br/><br/>' + label + ' explanation.<br/></br/>' + contextHTML;
		
		$('.explanation_block').empty();
		$('.explanation_block').append(explHTML);
  }
});
