@Licenses = new Mongo.Collection("licenses")

@Schemas ?= {}

Schemas.License = new SimpleSchema
  identifier:
    type: String
    label: "Identifier"
  email:
  	type: String
  	label: "email"

Licenses.attachSchema(Schemas.License)

Licenses.allow
	insert: isAdmin
	update: isAdmin
	remove: isAdmin

