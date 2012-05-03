window.templates = Backbone.Collection.extend({
});

var metadataModel = Backbone.Model.extend({
	element: '',
	label: '',
	id:'',
	metadata: {
		about:'',
		type:''
	}
});

var metadataView = Backbone.View.extend({
	tagName : "div",
	className : "explanation",
	
	initialize : function() {
		this.render();
	    },
		
	render: function() {
		var model = this.model;
		var explHTML = '';
		explHTML = model.get('element').innerHTML+'<br/><br/>' + model.get('label') + ' explanation.<br/></br/>' + 
			' This is annotated element of TYPE: <b>'+ model.get('metadata').type + '</b><br/></br/>' +
			' It is referenced to: <b><a href = "'+ model.get('metadata').about + '">' + model.get('metadata').about + '</a></b>.';
		var $el = $(this.el);
		$el.append(explHTML);
  }

});