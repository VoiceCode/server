Template.Licenses.helpers
	licenses: ->
		Licenses.find({})

Template.Licenses.events
	"click #createLicense": (event, template) ->
		value = template.find("#newLicense").value
		email = template.find("#email").value
		console.log(value)
		Licenses.insert
			identifier: value
			email: email