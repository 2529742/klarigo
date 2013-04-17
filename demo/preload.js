function loadSampleKB(){
<<<<<<< HEAD:preload.js
	var desc = 'It is a demo application that demonstrates features of VIE, a semantics interaction engine.';
	var purp = 'The article, which is used for the demo, contains annotated elements - entities. The VIE widget Image Search uses that annotations for querying images to the FLICKR image database.';
	var use = 'All the entities are highlighted in dark blue. You can click an entity to start image search. If any image will be found, it will be placed below the article.';
	var start = 'To start working with the application, choose the entity, for which you would like to find related images.';
=======
	var desc = 'It is a demo application, which demonstrates features of VIE - a semantics interaction engine.';
	var purp = 'The article, used for the demo, contains annotated elements - entities. The VIE widged uses that semantics for querying images to FLICKR image database.';
	var use = 'All entities are highlighted with dark blue. You can click an entity to start image search. If any image will be found, it will be placed below the article.';
	var start = 'To start working with the application choose the entity, for which you would like to find related images.';
>>>>>>> origin/master:demo/preload.js
	kbAPI.staticKB.addRecord({
		elementType: 'main',
		title: 'VIE Widget Image Search',
		description: desc,
		purpose: purp,
		use: use,
		start: start
	});
	
	desc = 'This annotated element represents an entity.';
<<<<<<< HEAD:preload.js
	purp = 'Hidden semantics allows to get more information about the entity, than it\'s shown in text. For example, the widget uses entity type (such as "Person", "Place") and its attributes to search for related images.';
=======
	purp = 'Hidded semantics allows to get more information about the entity, than it\'s shawn in text. For example, use entity type (such as "Person", "Place") and its attributes to search for related images.';
>>>>>>> origin/master:demo/preload.js
	use = 'You can click the entity to start image search. If any image will be found, it will be placed below the article.';
	kbAPI.staticKB.addRecord({
		elementType: 'annotated',
		title: 'an annotated text',
		description: desc,
		purpose: purp,
		use: use
	});
	
	kbAPI.staticKB.addRecord({
		elementType: 'result',
		title: 'a result',
<<<<<<< HEAD:preload.js
		description: 'This result is a thumbnail (a small version) of the image that has been found in the FLICKR image database.',
		purpose: 'The image is relevant to the clicked entity.',
		use: 'You can click it to open a full-sized version at the original location of the image.'
=======
		description: 'This result is a thumbnail (a small version) of the image that has been found in FLICKR image database.',
		purpose: 'The image is relevant to the clicked entity.',
		use: 'You can click it to open the full-sized version at the original location of the image.'
>>>>>>> origin/master:demo/preload.js
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
					[{value:'It is referenced to: <a href=',type:"manual"},{value:"metadata_about", type:"reference"},{value:'>',type:'manual'},{value:"metadata_about", type:"reference"},{value:'</a>', type:"manual"}]
				]
	});
	
	kbAPI.templates.addRecord({
		id: 'How_to_start',
<<<<<<< HEAD:preload.js
		label: 'How do I start?',
=======
		label: 'How to start?',
>>>>>>> origin/master:demo/preload.js
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
					[{value:'The following event(s) can be handled: ',type:'manual'},{type: 'reference',value: 'events'}]
				]
	});
	
	kbAPI.templates.addRecord({
		id: 'How_was_it_found',
		label: 'How was it found?',
		types : ["result"],
		category: "how",
		context: [
					[{value:'The following events sequence has been passed:',type:'manual'},{type: 'reference',value: 'trace'}]
				]
	});
<<<<<<< HEAD:preload.js
=======
	
	kbAPI.templates.addRecord({
	id: 'What_is_its_relevance',
	label: 'What is its relevance?',
	types : ["result"],
	category: "what",
	context: [
				[{value:'Its relevance is:',type:'manual'},{type: 'reference',value: 'relevance'}]
			]
	});
>>>>>>> origin/master:demo/preload.js
}