var templateSet = new Backbone.Collection([
	new Backbone.Model({
		id:'metadata',
		element: '',
		label: '',
		metadata: {
			about:'',
			type:''
		}
	}),
	new Backbone.Model({
		id:'what_is_it',
		element: '',
		label: '',
		metadata: {
			about:'',
			type:''
		}
	})
]);

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
			' The general view of the hidden markup is the following:<br/><br/>' + model.get('element').outerHTML.replace('<','&lt;').replace('>','&gt;') + ' <br/></br/>' + 
			' This is annotated element of TYPE: <b>'+ model.get('metadata').type + '</b><br/></br/>' +
			' It is referenced to: <b><a href = "'+ model.get('metadata').about + '">' + model.get('metadata').about + '</a></b>.';
		var $el = $(this.el);
		$el.append(explHTML);
  }

});

var witView = Backbone.View.extend({
	tagName : "div",
	className : "explanation",
	
	initialize : function() {
		this.render();
	    },
		
	render: function() {
		var model = this.model;
		var explHTML = '';
		explHTML = model.get('element').innerHTML+'<br/><br/>' + model.get('label') + ' explanation.<br/></br/>' + 
			' This is '+ model.get('title') + '</b><br/></br/>' + model.get('desc') + model.get('use');
		var $el = $(this.el);
		$el.append(explHTML);
  }

});