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
/*What data are stored as metadata? explanation*/
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

/*What is it? explanation */
var witView = Backbone.View.extend({
	tagName : "div",
	className : "explanation",
	
	initialize : function() {
		this.render();
	    },
		
	render: function() {
		var model = this.model;
		var explHTML = '';
		var label = model.get('label');
		var title = model.get('title');
		var description = model.get('description');
		var purpose = model.get('purpose');
		var use = model.get('use');
		explHTML = '<b>'+ model.get('element').innerHTML + '</b><br/><br/>' + label + ' explanation.<br/></br/>' + 
			' This is '+ title + '<br/></br/>' + description + '<br/>' + purpose + '<br/>' + use;
		var $el = $(this.el);
		$el.append(explHTML);
  }

});

var htsView = Backbone.View.extend({
	tagName : "div",
	className : "explanation",
	
	initialize : function() {
		this.render();
	    },
		
	render: function() {
		var model = this.model;
		var explHTML = '';
		var label = model.get('label');
		var start = model.get('start');
		var use = model.get('use');
		explHTML = '<b>'+ model.get('element').innerHTML + '</b><br/><br/>' + label + ' explanation.<br/></br/>' + start + '<br/>' + use;
		var $el = $(this.el);
		$el.append(explHTML);
  }
});

var actionsView = Backbone.View.extend({
	tagName : "div",
	className : "explanation",
	
	initialize : function() {
		this.render();
	    },
		
	render: function() {
		var model = this.model;
		var explHTML = '';
		var label = model.get('label');
		var actions = model.get('events');
		actions = $.isArray(actions)? actions.join(','): actions;
		actions = actions? 'The possible actions are: ' + actions + '.': '';	
		explHTML = '<b>'+ model.get('element').innerHTML + '</b><br/><br/>' + label + ' explanation.<br/></br/>' + actions;
		var $el = $(this.el);
		$el.append(explHTML);
  }
});