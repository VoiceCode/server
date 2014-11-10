Meteor.startup ->
	# assigned super admin role to myself
	superAdmin = Meteor.users.findOne({"emails.0.address": "unboundmusic@me.com"})
	if superAdmin?
	  Roles.addUsersToRoles(superAdmin, ["admin"])