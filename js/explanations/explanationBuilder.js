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
		//Get data about hidden markup	
		if(elementType == 'annotated'){
			attributes.metadata_about = $(element).attr('about');
		
			if($(element).attr('typeof')){
				attributes.metadata_type = $(element).attr('typeof');
			}
		}
		
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
		for(var c in context){
			var line = context[c];
			var item = "";
			if($.isArray(line)){
				for(var i in line){
					var context_item = line[i];
					if(context_item.type == 'reference'){
						item = model.get(context_item.value);
						if(item){
							
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
