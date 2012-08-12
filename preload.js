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
}