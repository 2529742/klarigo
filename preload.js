function loadSampleKB(){
	var desc = 'It is a demo application, which demonstrates features of VIE - a semantics interaction engine.';
	var purp = 'The article, used for the demo, contains annotated elements - entities. The VIE widged uses that semantics for querying images to FLICKR image database.';
	var use = 'All entities are highlighted with dark blue. You can click an entity to start image search. If any image will be found, it will be placed below the article.';
	var start = 'To start working with the application choose the entity, for which you would like to find related images.';
	kbAPI.staticKB.addRecord({
		elementType: 'main',
		title: 'VIE Widget Image Search',
		description: desc,
		purpose: purp,
		use: use,
		start: start
	});
	
	desc = 'This annotated element represents an entity.';
	purp = 'Hidded semantics allows to get more information about the entity, than it\'s shawn in text. For example, use entity type (such as "Person", "Place") and its attributes to search for related images.';
	use = 'You can click an entity to start image search. If any image will be found, it will be placed below the article.';
	kbAPI.staticKB.addRecord({
		elementType: 'annotated',
		title: 'Annotated text',
		description: desc,
		purpose: purp,
		use: use
	});
	
	kbAPI.templates.addRecord({
		id: 'What_is_it',
		label: 'What is it?',
		types : ["main","annotated","result"],
		category: "what",
		context: [
					[{value:'This is ', type: 'manual'},{value:'title',type:"reference"}],
					[{value:'description',type:"reference"}],
					[{value:'purpose',type:"reference"}],
					[{value:'use',type:"reference"}]
				]
	});
	
	kbAPI.templates.addRecord({
		id: 'What_data_are_stored_as_metadata',
		label: 'What data are stored as metadata?',
		types : ["annotated"],
		category: "what",
		context: [
					[{value:'The general view of the hidden markup is the following:',type:"manual"}],
					[{value:'This is annotated element of TYPE:',type:"manual"},{value:"metadata_type", type:"reference"}],
					[{value:'It is referenced to: <a href="',type:"manual"},{value:"metadata_about", type:"reference"},{value:'">',type:'manual'},{value:"metadata_about", type:"reference"},{value:'</a>', type:"manual"}]
				]
	});
	
	kbAPI.templates.addRecord({
		id: 'How_to_start',
		label: 'How to start?',
		types : ["main"],
		category: "how",
		context: [
					[{value:'start',type:"reference"}],
					[{value:'use',type:"reference"}]
				]
	});
	
	kbAPI.templates.addRecord({
		id: 'What_are_the_possible_actions',
		label: 'What are the possible actions?',
		types : ["main","annotated","result","results_set"],
		category: "what",
		context: [
					[{value:'The possible actions are: ',type:'manual'},{type: 'reference',value: 'events'}],
					[]
				]
	});
}