var templateSet = window.templateSet;

templateSet = Backbone.Collection.extend({
	metadata_Model : Backbone.Model.extend({
		id:'metadata',
		element: '',
		label: '',
		metadata: {
			about:'',
			type:''
		}
	}),
	whatIsIt_Model : Backbone.Model.extend({
		id:'what_is_it',
		element: '',
		label: '',
		metadata: {
			about:'',
			type:''
		}
	})
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