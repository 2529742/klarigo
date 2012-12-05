var explanationBuilder = {};

jQuery.extend(explanationBuilder,{
	build: function(question,element){
		var elementID = $(element).attr('id');
		var interfaceRecord = kbAPI.interfaceKB.getRecord(elementID);
		var elementType = kbAPI.interfaceKB.getElementType(elementID);
		var staticRecord = kbAPI.staticKB.getRecord(elementType);
		var history = kbAPI.historyKB.getHistory(elementID);
		
		var attributes = [];
		var schemaAttr = kbAPI.staticKB.schema.attributes;
		for(var a in schemaAttr){
			if(schemaAttr[a] != '@type' && schemaAttr[a] != '@subject'){
				attributes.push(schemaAttr[a]);
			}
		};
		schemaAttr = kbAPI.interfaceKB.schema.attributes;
		for(var a in schemaAttr){
			if(schemaAttr[a] != '@type' && schemaAttr[a] != '@subject'){
				attributes.push(schemaAttr[a]);
			}
		};
		
		var explanationModel = Backbone.Model.extend({
				element: undefined,
				type: undefined,
				title: undefined,
				descr: undefined,
				type: undefined,
				type: undefined,
				type: undefined,
				type: undefined,
				type: undefined,
				element: '',
				label: '',
		});
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
	}
});
