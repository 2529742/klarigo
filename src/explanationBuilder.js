var explanationBuilder = {};
var explanationInstanceIDcounter = 0;

jQuery.extend(explanationBuilder,{
	build: function(question,element){
		var elementID = $(element).attr('id');
		var interfaceRecord = kbAPI.getRecord(elementID);
		var elementType = kbAPI.interfaceKB.getElementType(elementID);
		var staticRecord = kbAPI.getRecord(elementType);
		var history = kbAPI.historyKB.getHistory(elementID);
		
		explanationInstanceIDcounter++;
		var attributes = {
			'@type': '<http://ontology.vie.js/explanation/explanation>',
			'@subject': 'explanationInstanceID' + explanationInstanceIDcounter,
			label: question,
			id: elementID
		};
		
		var trace = [];
		if(history.length>0){
			var last_record = history[history.length-1];
			var history_record = last_record;
			var rootEventID = last_record.get('rootEvent');
			rootEventID = rootEventID.isEntity? rootEventID.getSubjectUri():rootEventID;
			var rootEvent = kbAPI.getRecord(rootEventID);
			do{
				if(history_record.get('eventType')=='ajax'){
					var query = history_record.get('query');
					query = (query.isEntity || query.isCollection)? query.models[0].attributes: query;
					var query_string = '';
					for(var q in query){
						if(q!='@type' && q!='@subject'){
							query_string = query_string + '<li>' + q.replace("http://schema.org/",'').replace(/[<>]/g,'') + ': ' + query[q] + '</li>';
						}
					}
					trace.push('<li>Ajax query with parameters: <ul>' + query_string + '</ul></li>');
				}
				else{
					var relatedElement = history_record.get('element')? $('#'+history_record.get('element'))[0].innerHTML: '';
					trace.push('<li><b>' + relatedElement + '</b> - ' + history_record.get('eventType') + '</li>');
				}
				rootEventID = history_record.get('rootEvent');
				rootEventID = rootEventID.isEntity? rootEventID.getSubjectUri(): rootEventID;
				history_record = rootEvent;
				rootEvent = kbAPI.getRecord(rootEventID);
				var IDcheck = rootEvent.get('rootEvent');
				IDcheck = IDcheck.isEntity? IDcheck.getSubjectUri(): IDcheck;
			}
			while(rootEventID != IDcheck)
			history_record = rootEvent;
			relatedElement = history_record.get('element')? $('#'+history_record.get('element'))[0].innerHTML: '';
			trace.push('<li><b>' + relatedElement + '</b> - ' + history_record.get('eventType') + '</li>');	
		}
		
		var trace_string = '';
		for(var i = trace.length-1; i>=0; i--){	
			trace_string = trace_string + trace[i];
		}
		attributes.trace = '<ul>' + trace_string + '</ul>';
		
		var schemaAttr = kbAPI.staticKB.schema.attributes;
		if(staticRecord){
			for(var a in schemaAttr){
				if(schemaAttr[a] != '@type' && schemaAttr[a] != '@subject'){
					var value = staticRecord.get(schemaAttr[a]);
					if(value){
						value = (value.isEntity)? value.getSubjectUri(): value;
					}
					attributes[schemaAttr[a]] = value;
				}
			}
		}
		schemaAttr = kbAPI.interfaceKB.schema.attributes;
		if(interfaceRecord){
			for(var a in schemaAttr){
				if(schemaAttr[a] != '@type' && schemaAttr[a] != '@subject'){
					var value = interfaceRecord.get(schemaAttr[a]);
					if(value){
						value = (value.isEntity)? value.getSubjectUri(): value;
					}
					attributes[schemaAttr[a]] = value;
				}
			}
		}
		var explanationModel = kbAPI.explanations.addRecord(attributes);
		return this.construct_explanation(explanationModel);
	},
	
	construct_explanation: function(model) {
		var explanation = $('<div>');
		var question = model.get('label');
		var explantionStructure = kbAPI.templates.getRecord('<'+question+'>');
		var element = $('#'+model.get('id'))[0];
		var label = explantionStructure.get('label');
		var context = explantionStructure.get('context');
		var contextHTML = '';
		if(context[0]){
			context = ($.isArray(context[0]))? context: [context];
		}
		for(var c in context){
			var line = context[c];
			var item = "";
			if($.isArray(line)){
				for(var i in line){
					var context_item = line[i];
					if(context_item.type == 'reference'){
						item = model.get(context_item.value);
						if(item){
							item = (item.isEntity)? item.getSubjectUri(): item;
							contextHTML = contextHTML + item;
						}
					}
					else{
						item = context_item.value;
						contextHTML = contextHTML + item;
					}
				}
			}
			else{
				item = model.get(line[i]);
				if(item){
					item = (item.isEntity)? item.getSubjectUri(): item;
					contextHTML = contextHTML + item;
				}
				else{
					contextHTML = contextHTML + line[i];
				}
			};
			contextHTML = contextHTML + '<br/>';
		}
		
		explanation.append('<b>'+ element.innerHTML + '</b><br/><br/>' + label + ' explanation.<br/></br/>' + contextHTML + '<div class="explanation-breakline">');
		
		//List other questions related to the element:
		var other_questions = $('<ul></ul>');
		var questions = get_elementRelated_questions(element.id);
		questions.splice(questions.indexOf(question),1);
		if(questions.length>0){
			explanation.append('<div style="margin: 10px;">This information might be also interesting:</div>');
		}
		render_questions(element,questions,other_questions);
		explanation.append(other_questions);
		
		return explanation;
  }
});
